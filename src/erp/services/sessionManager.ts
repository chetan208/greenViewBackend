import Session from '../../model/erpModels/session';
import cron from 'node-cron';

export const ensureCurrentSession = async (): Promise<void> => {
    try {
        const now = new Date();
        const currentMonth = now.getMonth(); // 0 is January, 11 is December
        let startYear = now.getFullYear();

        // If before April (Jan, Feb, Mar), the academic year started in the previous calendar year
        if (currentMonth < 3) {
            startYear = startYear - 1;
        }

        const endYearStr = (startYear + 1).toString().slice(-2);
        // Format: "YYYY-YY", e.g., "2026-27"
        const currentSessionString = `${startYear}-${endYearStr}`;

        // Check if this session already exists
        const existingSession = await Session.findOne({ year: currentSessionString });

        if (!existingSession) {
            // New session does not exist, let's create it and make it active
            // First, deactivate all existing sessions
            await Session.updateMany({}, { isActive: false });

            // Create the new session
            const newSession = new Session({
                year: currentSessionString,
                isActive: true,
                admissionsOpen: false // Default to false
            });

            await newSession.save();
            console.log(`[Session Manager] Automatically created and activated new session: ${currentSessionString}`);
        } else {
            // If it exists but no session is active, activate it (failsafe)
            const activeSession = await Session.findOne({ isActive: true });
            if (!activeSession) {
                existingSession.isActive = true;
                await existingSession.save();
                console.log(`[Session Manager] Activated existing session: ${currentSessionString}`);
            }
        }
    } catch (error) {
        console.error('[Session Manager] Error ensuring current session:', error);
    }
};

export const initSessionCron = () => {
    // Run at 00:00 (midnight) every day on April 1st
    // The cron expression for midnight on April 1st is '0 0 1 4 *'
    // But running it daily at midnight is also fine and lightweight
    cron.schedule('0 0 * * *', async () => {
        console.log('[Session Manager] Running daily session check...');
        await ensureCurrentSession();
    });
};

