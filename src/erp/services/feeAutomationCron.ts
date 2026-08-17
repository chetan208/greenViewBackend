import cron from 'node-cron';
import Session from '../../model/erpModels/session';
import Student from '../../model/erpModels/user';
import StudentSession from '../../model/erpModels/studentSession';
import Class from '../../model/erpModels/class';
import FeeStructure from '../../model/erpModels/feeStructure';
import FeeAutomationSetting from '../../model/erpModels/feeAutomationSetting';
import FeeAutomationLog from '../../model/erpModels/feeAutomationLog';
import { sendWhatsAppMessage } from './whatsappService';
import { generateFeeStructuresForSession } from './feeService';

export const runFeeAutomation = async (ignoreWindow = false) => {
    try {
        console.log(`--- Fee Automation Cron Started (ignoreWindow: ${ignoreWindow}) ---`);
        
        let settings = await FeeAutomationSetting.findById('singleton');
        if (!settings) {
            settings = await FeeAutomationSetting.create({});
        }

        if (!ignoreWindow && !settings.isEnabled) {
            console.log('Fee automation is disabled.');
            return;
        }

        const today = new Date();
        const currentDay = today.getDate();
        const dayDiff = currentDay - settings.startDay;
        
        if (!ignoreWindow && (dayDiff < 0 || dayDiff >= settings.windowDays)) {
            console.log(`Current day ${currentDay} is outside the active window.`);
            return;
        }

        const activeSession = await Session.findOne({ isActive: true });
        if (!activeSession) {
            console.log('No active session found.');
            return;
        }

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const currentMonthStr = `${monthNames[today.getMonth()]}-${today.getFullYear()}`;
        
        const totalStudents = await StudentSession.countDocuments({ sessionId: activeSession._id });
        if (totalStudents === 0) {
            console.log('No students found for active session.');
            return;
        }

        const logs = await FeeAutomationLog.find({ monthStr: currentMonthStr });
        const processedIds = new Set(logs.map(l => l.studentSessionId.toString()));

        const allStudentSessions = await StudentSession.find({ sessionId: activeSession._id })
            .populate('userId')
            .populate('classId');

        const pendingStudents = allStudentSessions.filter(s => !processedIds.has(s._id.toString()));

        let numberToProcessToday = 0;
        if (ignoreWindow) {
            numberToProcessToday = pendingStudents.length;
        } else {
            const alreadyProcessed = processedIds.size;
            const expectedProcessedCount = Math.ceil(totalStudents * ((dayDiff + 1) / settings.windowDays));
            numberToProcessToday = expectedProcessedCount - alreadyProcessed;
        }

        if (numberToProcessToday <= 0) {
            console.log(`Already processed expected quota. Total so far: ${processedIds.size}/${totalStudents}`);
            return;
        }

        console.log(`Processing up to ${numberToProcessToday} students.`);
        const processCount = Math.min(numberToProcessToday, pendingStudents.length);

        for (let i = 0; i < processCount; i++) {
            const studentSession: any = pendingStudents[i];
            const user: any = studentSession.userId;
            const classObj: any = studentSession.classId;
            
            try {
                if (!user || !user.phone || !user.studentProfile) continue;

                console.log(`\n👉 Processing student: ${user.name} (SessionID: ${studentSession._id})`);
                
                // Ensure fee structure exists for current month (handled by generateFeeStructuresForSession internally if not exist)
                await generateFeeStructuresForSession(studentSession, classObj.className, 0, 0);

                const allPendingFees = await FeeStructure.find({
                    studentId: user._id,
                    sessionId: activeSession._id,
                    status: { $in: ["PENDING", "PARTIALLY_PAID"] }
                });

                if (allPendingFees.length > 0) {
                    const parentName = user.studentProfile.fatherName || "Parent";
                    let totalDues = 0;
                    let breakdownMsg = "";

                    for (const pendingFee of allPendingFees) {
                        const total = pendingFee.total || 0;
                        const paid = (pendingFee as any).amountPaid || 0;
                        const rem = Math.round((total - paid) * 100) / 100;
                        
                        if (rem > 0) {
                            totalDues += rem;
                            breakdownMsg += `• ${pendingFee.month}: Rs. ${rem}\n`;
                        }
                    }

                    if (totalDues > 0) {
                        let msg = `Dear ${parentName},\n\nThis is a gentle reminder regarding the fee for ${user.name} (${classObj.className}).\n\n`;
                        
                        if (allPendingFees.length === 1 && allPendingFees[0].month === currentMonthStr) {
                            msg += `The fee for the current month (${currentMonthStr}) has been generated. The remaining amount is Rs. ${totalDues}.\n\n`;
                        } else {
                            msg += `You have outstanding dues of Rs. ${totalDues}. Here is the month-by-month breakdown:\n\n${breakdownMsg}\n`;
                        }
                        
                        msg += `Please clear the dues at your earliest convenience.\n\nRegards,\nGreen View Administration`;
                        
                        console.log(`  - 🚀 Sending WhatsApp message to: ${user.phone}`);
                        const sendResult = await sendWhatsAppMessage(user.phone, msg);
                        
                        if (sendResult.success) {
                            console.log(`  - ✅ WhatsApp message sent! Waiting 10 seconds for rate limit...`);
                            await new Promise(resolve => setTimeout(resolve, 10000));
                        } else {
                            console.log(`  - ❌ Message sending failed: ${sendResult.error}`);
                        }
                    }
                }

                await FeeAutomationLog.create({
                    studentSessionId: studentSession._id,
                    monthStr: currentMonthStr,
                    status: "PROCESSED"
                });
                
            } catch (err) {
                console.error(`Error processing automation for student ${user?.name}:`, err);
            }
        }

        console.log('--- Fee Automation Cron Finished ---');
    } catch (error) {
        console.error("Error in fee automation cron:", error);
    }
};

export const initFeeAutomationCron = () => {
    // Run every day at 10:00 AM
    cron.schedule('0 10 * * *', () => {
        runFeeAutomation().catch(console.error);
    });
};
