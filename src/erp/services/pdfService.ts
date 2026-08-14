import PDFDocument from 'pdfkit';
import { IAdmissionApplication } from '../../model/erpModels/admissionApplication';
import https from 'https';
import http from 'http';

// Helper to fetch image as buffer
const fetchImageBuffer = (url: string): Promise<Buffer> => {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                // Follow redirect
                fetchImageBuffer(res.headers.location).then(resolve).catch(reject);
                return;
            }
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
        }).on('error', reject);
    });
};

// ─── DOTTED LINE FILL ────────────────────────────────────────────────
// Draws dotted underline after a value, filling remaining space
const dottedFill = (doc: PDFKit.PDFDocument, x: number, y: number, endX: number) => {
    doc.save();
    doc.fontSize(9).font('Helvetica').fillColor('#666666');
    let dotX = x;
    while (dotX < endX) {
        doc.text('.', dotX, y, { lineBreak: false });
        dotX += 3.5;
    }
    doc.restore();
};

// ─── PRIMARY FORM (Class 1–10) ──────────────────────────────────────
const generatePrimaryPdf = async (doc: PDFKit.PDFDocument, app: IAdmissionApplication) => {
    const leftMargin = 55;
    const rightMargin = 540;
    const colonX = 260;  // where the colon ":" sits
    const valueX = 270;  // where values start after ":"
    let y = 0;

    // ═══════════════════════════════════════════════════════════════
    //  HEADER
    // ═══════════════════════════════════════════════════════════════

    // School name block
    y = 50;
    doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000');
    doc.text('GREEN VIEW PUBLIC SCHOOL', 0, y, { align: 'center', width: 595 });

    y += 22;
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text('DADH', 0, y, { align: 'center', width: 595 });

    y += 18;
    doc.font('Helvetica').fontSize(9);
    doc.text('Teh. Palampur, Distt. Kangra (H.P.)', 0, y, { align: 'center', width: 595 });

    y += 14;
    doc.font('Helvetica').fontSize(8);
    doc.text('Off.: 01894252115   M.: 9816521168', 0, y, { align: 'center', width: 595 });

    // Form No
    y += 4;
    doc.font('Helvetica').fontSize(8).fillColor('#000000');
    doc.text(`Form No. ${app.applicationId || ''}`, leftMargin, y - 10);

    // ─── APPLICATION FOR REGISTRATION TITLE ──────────────────────
    y += 22;
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000');
    doc.text('APPLICATION FOR REGISTRATION', 0, y, { align: 'center', width: 595 });

    y += 22;
    doc.font('Helvetica-Bold').fontSize(12);
    doc.text(`SESSION ${app.sessionYear || '20__-20__'}`, 0, y, { align: 'center', width: 595 });

    // ─── PASSPORT PHOTO BOX ─────────────────────────────────────
    const photoBoxX = 430;
    const photoBoxY = 130;
    const photoBoxW = 90;
    const photoBoxH = 105;

    if (app.photoUrl) {
        try {
            const imgBuffer = await fetchImageBuffer(app.photoUrl);
            doc.image(imgBuffer, photoBoxX + 2, photoBoxY + 2, { width: photoBoxW - 4, height: photoBoxH - 4 });
            doc.rect(photoBoxX, photoBoxY, photoBoxW, photoBoxH).lineWidth(0.8).strokeColor('#000000').stroke();
        } catch (e) {
            // If image fails, draw empty box with text
            doc.rect(photoBoxX, photoBoxY, photoBoxW, photoBoxH).lineWidth(0.8).strokeColor('#000000').stroke();
            doc.font('Helvetica').fontSize(7).fillColor('#666666');
            doc.text('Paste Passport Size', photoBoxX + 5, photoBoxY + 35, { width: photoBoxW - 10, align: 'center' });
            doc.text('Photograph', photoBoxX + 5, photoBoxY + 46, { width: photoBoxW - 10, align: 'center' });
        }
    } else {
        doc.rect(photoBoxX, photoBoxY, photoBoxW, photoBoxH).lineWidth(0.8).strokeColor('#000000').stroke();
        doc.font('Helvetica').fontSize(7).fillColor('#666666');
        doc.text('Paste Passport Size', photoBoxX + 5, photoBoxY + 35, { width: photoBoxW - 10, align: 'center' });
        doc.text('Photograph', photoBoxX + 5, photoBoxY + 46, { width: photoBoxW - 10, align: 'center' });
    }

    // ═══════════════════════════════════════════════════════════════
    //  FORM FIELDS
    // ═══════════════════════════════════════════════════════════════
    doc.fillColor('#000000');
    y = 185;
    const lineHeight = 20;
    const subLineHeight = 16;

    // Helper to draw a numbered row with label, colon, and filled value
    const drawField = (num: string, label: string, value: string | undefined, yPos: number, indent?: number) => {
        const xStart = (indent || 0) + leftMargin;
        doc.font('Helvetica').fontSize(10).fillColor('#000000');
        doc.text(`${num}`, xStart, yPos, { lineBreak: false });
        const labelX = xStart + (num ? 18 : 0);
        doc.text(label, labelX, yPos, { lineBreak: false });

        // Colon
        doc.text(':', colonX, yPos, { lineBreak: false });

        // Value
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000');
        const valText = value || '';
        doc.text(valText, valueX, yPos, { lineBreak: false });

        // Dotted fill after value
        const valWidth = doc.widthOfString(valText);
        dottedFill(doc, valueX + valWidth + 4, yPos, rightMargin);
    };

    // 1. Name of the student (In Block Letters)
    drawField('1.', 'Name of the student', app.studentName?.toUpperCase(), y);
    y += subLineHeight;
    doc.font('Helvetica').fontSize(8).fillColor('#666666');
    doc.text('(In Block Letters)', leftMargin + 18, y);
    doc.fillColor('#000000');
    y += lineHeight - 2;

    // 2. Father's Name
    drawField('2.', "Father's Name", app.fatherName, y);
    y += lineHeight;

    // 3. Mother's Name
    drawField('3.', "Mother's Name", app.motherName, y);
    y += lineHeight;

    // 4. Sex
    const sexVal = app.sex || '';
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    doc.text('4.', leftMargin, y, { lineBreak: false });
    doc.text('Sex', leftMargin + 18, y, { lineBreak: false });
    doc.text(':', colonX, y, { lineBreak: false });

    // Male / Female with checkbox-style marking
    const maleX = valueX;
    const femaleX = valueX + 80;
    if (sexVal.toLowerCase() === 'male') {
        doc.font('Helvetica-Bold').text('✓ Male', maleX, y, { lineBreak: false });
        doc.font('Helvetica').text(' / Female', maleX + 42, y, { lineBreak: false });
    } else if (sexVal.toLowerCase() === 'female') {
        doc.font('Helvetica').text('Male / ', maleX, y, { lineBreak: false });
        doc.font('Helvetica-Bold').text('✓ Female', maleX + 38, y, { lineBreak: false });
    } else {
        doc.font('Helvetica').text('Male / Female', maleX, y, { lineBreak: false });
    }
    y += lineHeight;

    // 5. Date of Birth
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    doc.text('5.', leftMargin, y, { lineBreak: false });
    doc.text('Date of Birth (Authentic proof must be attached)', leftMargin + 18, y, { lineBreak: false });
    y += subLineHeight;

    // 5a) in figures
    const dobDate = app.dateOfBirth ? new Date(app.dateOfBirth) : null;
    const dobFigures = dobDate ? dobDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
    doc.font('Helvetica').fontSize(10);
    doc.text('a) in figures', leftMargin + 30, y, { lineBreak: false });
    doc.text(':', colonX, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(dobFigures, valueX, y, { lineBreak: false });
    const figW = doc.widthOfString(dobFigures);
    dottedFill(doc, valueX + figW + 4, y, rightMargin);
    y += subLineHeight;

    // 5b) in words
    const dobWords = dobDate ? dobDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    doc.font('Helvetica').fontSize(10);
    doc.text('b) in words', leftMargin + 30, y, { lineBreak: false });
    doc.text(':', colonX, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(dobWords, valueX, y, { lineBreak: false });
    const wordsW = doc.widthOfString(dobWords);
    dottedFill(doc, valueX + wordsW + 4, y, rightMargin);
    y += lineHeight;

    // 6. Mother Tongue
    drawField('6.', 'Mother Tongue', app.motherTongue, y);
    y += lineHeight;

    // 7. Religion
    drawField('7.', 'Religion', app.religion, y);
    y += lineHeight;

    // 8. Category
    const cat = (app.socialCategory || '').toUpperCase();
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    doc.text('8.', leftMargin, y, { lineBreak: false });
    doc.text('Category (Authentic proof must be attached)', leftMargin + 18, y, { lineBreak: false });
    y += subLineHeight;
    // Gen / OBC / SC / ST with the right one marked
    const categories = ['Gen', 'OBC', 'SC', 'ST'];
    let catX = leftMargin + 30;
    categories.forEach((c) => {
        const isMatch = cat.includes(c.toUpperCase()) || (c === 'Gen' && cat.includes('GENERAL'));
        if (isMatch) {
            doc.font('Helvetica-Bold').text(`✓ ${c}`, catX, y, { lineBreak: false });
        } else {
            doc.font('Helvetica').text(`${c} ........`, catX, y, { lineBreak: false });
        }
        catX += 80;
    });
    y += lineHeight;

    // 9. Class to which admission is sought
    drawField('9.', 'Class to which admission is sought', app.appliedClass, y);
    y += lineHeight;

    // 10. Previous school attended
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    doc.text('10.', leftMargin, y, { lineBreak: false });
    doc.text('Previous school attended', leftMargin + 22, y, { lineBreak: false });
    y += subLineHeight;

    // 10a) Name of the School
    doc.font('Helvetica').fontSize(10);
    doc.text('(a) Name of the School', leftMargin + 30, y, { lineBreak: false });
    doc.text(':', colonX, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.prevSchoolName || '', valueX, y, { lineBreak: false });
    const schoolW = doc.widthOfString(app.prevSchoolName || '');
    dottedFill(doc, valueX + schoolW + 4, y, rightMargin);
    y += subLineHeight;

    // 10b) Medium of Instruction
    doc.font('Helvetica').fontSize(10);
    doc.text('(b) Medium of Instruction', leftMargin + 30, y, { lineBreak: false });
    doc.text(':', colonX, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.prevSchoolMedium || '', valueX, y, { lineBreak: false });
    const medW = doc.widthOfString(app.prevSchoolMedium || '');
    dottedFill(doc, valueX + medW + 4, y, rightMargin);
    y += lineHeight;

    // 11. Hobbies
    drawField('11.', 'Hobbies', app.hobbies, y);
    y += lineHeight;

    // 12. Interest in games
    drawField('12.', 'Interest in games', app.interestInGames, y);
    y += lineHeight;

    // 13. (a) Name of Father/Mother/Guardian
    doc.font('Helvetica').fontSize(10).fillColor('#000000');
    doc.text('13.', leftMargin, y, { lineBreak: false });
    doc.text('(a) Name of Father/Mother/Guardian', leftMargin + 22, y, { lineBreak: false });
    doc.text(':', colonX, y, { lineBreak: false });
    const guardianVal = app.guardianName || app.fatherName || '';
    doc.font('Helvetica-Bold').text(guardianVal, valueX, y, { lineBreak: false });
    const guardW = doc.widthOfString(guardianVal);
    dottedFill(doc, valueX + guardW + 4, y, rightMargin);
    y += subLineHeight;

    // 13. (b) Occupation
    doc.font('Helvetica').fontSize(10);
    doc.text('(b) Occupation', leftMargin + 30, y, { lineBreak: false });
    doc.text(':', colonX, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.fatherOccupation || '', valueX, y, { lineBreak: false });
    const occW = doc.widthOfString(app.fatherOccupation || '');
    dottedFill(doc, valueX + occW + 4, y, rightMargin);
    y += lineHeight;

    // 14. Present address with pin code
    drawField('14.', 'Present address with pin code', app.address, y);
    y += lineHeight + 4;

    // 15. Permanent Address
    drawField('15.', 'Permanent Address', app.address, y);
    y += lineHeight + 4;

    // 16. Telephone No. if any
    const phone = app.fatherMobile || app.motherMobile || app.guardianMobile || '';
    drawField('16.', 'Telephone No. if any', phone, y);
    y += lineHeight + 8;

    // ═══════════════════════════════════════════════════════════════
    //  DECLARATION
    // ═══════════════════════════════════════════════════════════════
    doc.moveTo(leftMargin, y).lineTo(rightMargin, y).lineWidth(0.5).strokeColor('#000000').stroke();
    y += 12;

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000');
    doc.text('DECLARATION', 0, y, { align: 'center', width: 595 });
    y += 22;

    doc.font('Helvetica').fontSize(9).fillColor('#000000');
    const parentName = app.guardianName || app.fatherName || '';
    const studentName = app.studentName || '';
    doc.text(
        `I, ${parentName}, Father/Mother/Guardian of ${studentName}, solemnly declare that the above information regarding my son/daughter/ward are true to the best of my knowledge.`,
        leftMargin, y, { width: rightMargin - leftMargin, align: 'justify', lineGap: 4 }
    );

    y = doc.y + 25;

    // Dated and Signature
    doc.font('Helvetica').fontSize(9);
    doc.text('Dated ................................', leftMargin, y);
    doc.text('..............................................................', 330, y);
    y += 14;
    doc.font('Helvetica').fontSize(8);
    doc.text('Signature of Parent/Guardian', 360, y);
};

// ─── SENIOR FORM (Class 11–12) — Exact replica of physical form ─────
const generateSeniorPdf = async (doc: PDFKit.PDFDocument, app: IAdmissionApplication) => {
    const L = 50;       // left margin
    const R = 545;      // right margin
    const W = R - L;    // usable width
    let y = 0;

    // Underline helper
    const uline = (x1: number, x2: number, yy: number) => {
        doc.moveTo(x1, yy + 12).lineTo(x2, yy + 12).lineWidth(0.5).strokeColor('#000000').stroke();
    };

    // Field with underline: label then value underlined
    const fieldLine = (label: string, value: string | undefined, x: number, yy: number, lineEnd: number) => {
        doc.font('Helvetica').fontSize(9).fillColor('#000000');
        doc.text(label, x, yy, { lineBreak: false });
        const labelW = doc.widthOfString(label);
        const valX = x + labelW + 2;
        doc.font('Helvetica-Bold').fontSize(9);
        doc.text(value || '', valX, yy, { lineBreak: false });
        uline(valX, lineEnd, yy);
    };

    // ═══════════════════════════════════════════════════════════════
    //  PAGE 1
    // ═══════════════════════════════════════════════════════════════

    // Roll No. Allowed (top right)
    y = 40;
    doc.font('Helvetica').fontSize(8).fillColor('#000000');
    doc.text('Roll . No. Allowed...............', 380, y);

    // School Title
    y = 55;
    doc.font('Helvetica-Bold').fontSize(14).fillColor('#000000');
    doc.text('GREEN VIEW SENIOR SECONDARY SCHOOL  DADH', 0, y, { align: 'center', width: 595 });

    y += 20;
    doc.font('Helvetica').fontSize(9);
    const sessionYear = app.sessionYear || '20__-20__';
    const parts = sessionYear.split('-');
    doc.text(`Admission Form -${parts[0] || '20__'} - ${parts[1] || '20__'}`, 0, y, { align: 'center', width: 595 });

    y += 16;
    doc.text('Provisional /regular', 0, y, { align: 'center', width: 595 });

    // Provisional / Date / Sign lines
    y += 22;
    fieldLine('Provisional', app.isProvisional ? 'Yes' : 'No', L, y, 250);
    y += 18;
    fieldLine('Date', new Date(app.createdAt).toLocaleDateString('en-IN'), L, y, 250);
    y += 18;
    fieldLine('Sign', '', L, y, 250);

    // ─── PHOTO BOX (right side) ─────────────────────────────────
    const photoX = 460;
    const photoY = 100;
    const photoW = 80;
    const photoH = 95;
    if (app.photoUrl) {
        try {
            const imgBuf = await fetchImageBuffer(app.photoUrl);
            doc.image(imgBuf, photoX + 2, photoY + 2, { width: photoW - 4, height: photoH - 4 });
        } catch (e) { /* skip */ }
    }
    doc.rect(photoX, photoY, photoW, photoH).lineWidth(0.8).strokeColor('#000000').stroke();

    // ─── CLASS / STREAM CHECKBOXES ──────────────────────────────
    y += 22;
    const isClass11 = (app.appliedClass || '').includes('11') || (app.appliedClass || '').includes('+1');
    const isClass12 = (app.appliedClass || '').includes('12') || (app.appliedClass || '').includes('+2');
    const stream = (app.stream || '').toLowerCase();

    doc.font('Helvetica').fontSize(9);
    // Class +1 checkbox
    doc.text('Class +1', L, y, { lineBreak: false });
    doc.rect(L + 48, y - 1, 12, 12).lineWidth(0.5).stroke();
    if (isClass11) { doc.font('Helvetica-Bold').text('✓', L + 50, y - 1, { lineBreak: false }); }

    // +2 checkbox
    doc.font('Helvetica').fontSize(9);
    doc.text('+2', L + 75, y, { lineBreak: false });
    doc.rect(L + 90, y - 1, 12, 12).lineWidth(0.5).stroke();
    if (isClass12) { doc.font('Helvetica-Bold').text('✓', L + 92, y - 1, { lineBreak: false }); }

    // Stream checkboxes
    doc.font('Helvetica').fontSize(9);
    doc.text('Stream –Science', L + 120, y, { lineBreak: false });
    doc.rect(L + 210, y - 1, 12, 12).lineWidth(0.5).stroke();
    if (stream.includes('science')) { doc.font('Helvetica-Bold').text('✓', L + 212, y - 1, { lineBreak: false }); }

    doc.font('Helvetica').fontSize(9);
    doc.text('Comm.', L + 235, y, { lineBreak: false });
    doc.rect(L + 270, y - 1, 12, 12).lineWidth(0.5).stroke();
    if (stream.includes('comm')) { doc.font('Helvetica-Bold').text('✓', L + 272, y - 1, { lineBreak: false }); }

    doc.font('Helvetica').fontSize(9);
    doc.text('Arts', L + 295, y, { lineBreak: false });
    doc.rect(L + 315, y - 1, 12, 12).lineWidth(0.5).stroke();
    if (stream.includes('art') || stream.includes('humanities')) { doc.font('Helvetica-Bold').text('✓', L + 317, y - 1, { lineBreak: false }); }

    // ─── SUBJECTS LINE ──────────────────────────────────────────
    y += 22;
    doc.font('Helvetica').fontSize(9).fillColor('#000000');
    const subs = app.selectedSubjects || [];
    doc.text('Subject', L, y, { lineBreak: false });
    let subX = L + 50;
    for (let i = 0; i < 5; i++) {
        const subVal = subs[i] || '';
        doc.font('Helvetica-Bold').fontSize(8.5);
        doc.text(`${i + 1}. ${subVal}`, subX, y, { lineBreak: false });
        uline(subX + 10, subX + 85, y);
        subX += 90;
    }

    // ─── NAME ───────────────────────────────────────────────────
    y += 22;
    doc.font('Helvetica').fontSize(9);
    doc.text('Name ( in English)', L, y, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text(app.studentName || '', L + 105, y, { lineBreak: false });
    uline(L + 105, 280, y);
    doc.font('Helvetica').fontSize(8).text('(in Hindi)', 285, y, { lineBreak: false });
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text(app.studentNameHindi || '', 330, y, { lineBreak: false });
    uline(330, 440, y);
    doc.font('Helvetica').fontSize(7).text('(in capital letters)', 445, y, { lineBreak: false });

    // ─── FATHER / MOTHER / GUARDIAN with Mob No ──────────────────
    y += 20;
    doc.font('Helvetica').fontSize(9);
    doc.text("Father's Name", L, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.fatherName || '', L + 90, y, { lineBreak: false });
    uline(L + 90, 310, y);
    doc.font('Helvetica').fontSize(9).text('Mob. No', 320, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.fatherMobile || '', 370, y, { lineBreak: false });
    uline(370, R, y);

    y += 18;
    doc.font('Helvetica').fontSize(9);
    doc.text("Mother's Name", L, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.motherName || '', L + 90, y, { lineBreak: false });
    uline(L + 90, 310, y);
    doc.font('Helvetica').fontSize(9).text('Mob. No', 320, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.motherMobile || '', 370, y, { lineBreak: false });
    uline(370, R, y);

    y += 18;
    doc.font('Helvetica').fontSize(9);
    doc.text("Guardian's Name (if applicable):", L, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.guardianName || '', L + 175, y, { lineBreak: false });
    uline(L + 175, 310, y);
    doc.font('Helvetica').fontSize(9).text('Mob.No', 320, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.guardianMobile || '', 370, y, { lineBreak: false });
    uline(370, R, y);

    // ─── DOB ────────────────────────────────────────────────────
    y += 20;
    const dob = app.dateOfBirth ? new Date(app.dateOfBirth) : null;
    const dobFig = dob ? `${dob.getDate().toString().padStart(2, '0')} / ${(dob.getMonth() + 1).toString().padStart(2, '0')} / ${dob.getFullYear()}` : '';
    const dobWords = dob ? dob.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    doc.font('Helvetica').fontSize(9);
    doc.text('Date of Birth(in figure)', L, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(dobFig, L + 130, y, { lineBreak: false });
    uline(L + 130, 280, y);
    doc.font('Helvetica').fontSize(9).text('(in Words)', 290, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(dobWords, 345, y, { lineBreak: false });
    uline(345, R, y);

    // ─── AADHAAR ────────────────────────────────────────────────
    y += 20;
    fieldLine('Aadhaar No. of the student', app.aadhaarNumber, L, y, R);

    // ─── CATEGORY ───────────────────────────────────────────────
    y += 20;
    const cat = (app.socialCategory || '').toUpperCase();
    doc.font('Helvetica').fontSize(9);
    doc.text('Category(tick) ', L, y, { lineBreak: false });
    const cats = ['General', 'SC', 'ST', 'OBC'];
    let catX = L + 85;
    cats.forEach(c => {
        const match = cat.includes(c.toUpperCase());
        if (match) { doc.font('Helvetica-Bold').text(`✓${c}`, catX, y, { lineBreak: false }); }
        else { doc.font('Helvetica').text(`${c}/`, catX, y, { lineBreak: false }); }
        catX += 45;
    });
    doc.font('Helvetica').fontSize(8).text('(Attach certificate)', catX + 10, y, { lineBreak: false });
    doc.font('Helvetica').fontSize(9).text('IRDP', catX + 100, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.bplStatus ? 'Yes' : 'No', catX + 130, y, { lineBreak: false });

    // ─── OCCUPATION / INCOME ────────────────────────────────────
    y += 20;
    doc.font('Helvetica').fontSize(9);
    doc.text("Father's/ Guardian's occupation", L, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.fatherOccupation || '', L + 180, y, { lineBreak: false });
    uline(L + 180, 310, y);
    doc.font('Helvetica').fontSize(9).text('Annual income:', 320, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.annualIncome || '', 400, y, { lineBreak: false });
    uline(400, R, y);

    // ─── PAN / UDISE ────────────────────────────────────────────
    y += 20;
    fieldLine('UDISE PEN No. of student', app.panNumber, L, y, R);

    // ─── BANK DETAILS ───────────────────────────────────────────
    y += 22;
    doc.font('Helvetica').fontSize(9);
    doc.text('Bank Account No.', L, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.bankAccountNo || '', L + 100, y, { lineBreak: false });
    uline(L + 100, 250, y);
    doc.font('Helvetica').fontSize(9).text('Bank and Branch', 260, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(`${app.bankName || ''} ${app.bankBranch || ''}`, 355, y, { lineBreak: false });
    uline(355, 440, y);
    doc.font('Helvetica').fontSize(9).text('IFSC', 450, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.ifscCode || '', 475, y, { lineBreak: false });
    uline(475, R, y);

    // ─── ADDRESS ────────────────────────────────────────────────
    y += 20;
    doc.font('Helvetica').fontSize(9);
    doc.text('Permanent Address  Village', L, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.village || '', L + 150, y, { lineBreak: false });
    uline(L + 150, 270, y);
    doc.font('Helvetica').fontSize(9).text('P.O', 280, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.postOffice || '', 300, y, { lineBreak: false });
    uline(300, 390, y);
    doc.font('Helvetica').fontSize(9).text('Tehsil', 400, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.tehsil || '', 435, y, { lineBreak: false });
    uline(435, R, y);

    y += 18;
    doc.font('Helvetica').fontSize(9);
    doc.text('Distt:-', L, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.district || '', L + 40, y, { lineBreak: false });
    uline(L + 40, 200, y);
    doc.font('Helvetica').fontSize(9).text('State', 210, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.state || '', 240, y, { lineBreak: false });
    uline(240, 380, y);
    doc.font('Helvetica').fontSize(9).text('PIN', 390, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.pinCode || '', 415, y, { lineBreak: false });
    uline(415, R, y);

    // ═══════════════════════════════════════════════════════════════
    //  ACADEMIC RECORD TABLE
    // ═══════════════════════════════════════════════════════════════
    y += 28;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
    doc.text('Academic Record', L, y);
    y += 18;

    // Table columns
    const cols = [
        { header: 'Name of\nExam', w: 60 },
        { header: 'Year', w: 40 },
        { header: 'Institution', w: 75 },
        { header: 'Board', w: 50 },
        { header: 'Roll\nNo', w: 40 },
        { header: 'Result\nPass/Fail', w: 50 },
        { header: 'Subjects', w: 50 },
        { header: 'Max\nMarks', w: 40 },
        { header: 'Marks\nObtained', w: 45 },
        { header: 'Percentage', w: 50 },
    ];

    const tableX = L;
    const rowH = 28;
    const headerH = 32;

    // Draw header
    let cx = tableX;
    doc.font('Helvetica-Bold').fontSize(7);
    cols.forEach(col => {
        doc.rect(cx, y, col.w, headerH).lineWidth(0.5).stroke();
        doc.text(col.header, cx + 2, y + 3, { width: col.w - 4, align: 'center' });
        cx += col.w;
    });
    y += headerH;

    // Data rows
    const exams = app.previousExams || [];
    const examLabels = ['Matric', '10+1'];

    for (let i = 0; i < 2; i++) {
        cx = tableX;
        const exam = exams[i];
        const rowData = [
            examLabels[i],
            exam?.passingYear || '',
            exam?.school || '',
            exam?.boardName || '',
            exam?.rollNumber || '',
            exam?.result || '',
            '',
            exam?.maxMarks?.toString() || '',
            exam?.marksObtained?.toString() || '',
            exam?.percentage?.toString() || ''
        ];

        doc.font('Helvetica').fontSize(7);
        cols.forEach((col, j) => {
            doc.rect(cx, y, col.w, rowH).lineWidth(0.5).stroke();
            doc.font(j === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(7);
            doc.text(rowData[j], cx + 2, y + 8, { width: col.w - 4, align: 'center' });
            cx += col.w;
        });
        y += rowH;
    }

    // ─── SPORTS / ACTIVITIES ────────────────────────────────────
    y += 14;
    doc.font('Helvetica').fontSize(9).fillColor('#000000');
    doc.text('Details of Participation in Sports / other Activities', L, y, { lineBreak: false });
    doc.font('Helvetica-Bold').text(app.extracurricular || '', L + 280, y, { lineBreak: false });
    uline(L + 280, R, y);
    y += 16;
    doc.font('Helvetica').fontSize(9).text('Level', L, y, { lineBreak: false });
    uline(L + 30, R, y);

    // ═══════════════════════════════════════════════════════════════
    //  PAGE 2 — DECLARATION
    // ═══════════════════════════════════════════════════════════════
    doc.addPage();
    y = 50;

    doc.font('Helvetica-Bold').fontSize(12).fillColor('#000000');
    doc.text('DECLARATION', 0, y, { align: 'center', width: 595 });
    y += 20;

    doc.font('Helvetica').fontSize(8.5).fillColor('#000000');
    doc.text(
        'I/We hereby declare to abide by all the rules and regulations of the school,(which is a NO-INTROXICATION ZONE), HP Board of school education and other Government intrusions and declare that I will not be involved in any activities that goes against the discipline of the institution. I understand that admission will automatically be cancelled if/ my ward fail to pay necessary dues to remain absent without authorization and if found to be indulged in any in toxicities, drugs related activities or anti social activities disciplinary action will be taken against me/my wards.',
        L, y, { width: W, align: 'justify', lineGap: 3 }
    );
    y = doc.y + 12;

    doc.font('Helvetica').fontSize(9);
    doc.text('I solemnly declare that all the facts stated above are correct.', 0, y, { align: 'center', width: 595 });
    y += 25;

    doc.text('Date:', L, y);
    doc.text('Signature of student', 380, y);
    y += 25;
    doc.text('Signature of parent/Guardians', 350, y);

    // ─── RECOMMENDATION ─────────────────────────────────────────
    y += 30;
    doc.moveTo(L, y).lineTo(R, y).lineWidth(0.5).stroke();
    y += 10;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('Recommendation by admission committee', L, y);
    y += 14;
    doc.font('Helvetica').fontSize(8.5);
    doc.text('Certified that above particulars have been verified and the student is recommended for admission.', L, y, { width: W });
    y += 22;

    doc.text('(1)Signature..................', L, y, { lineBreak: false });
    doc.text('(2)Signature......................', L + 170, y, { lineBreak: false });
    doc.text('(3)Signature......................', L + 350, y, { lineBreak: false });
    y += 18;
    doc.text('Name', L + 20, y, { lineBreak: false });
    doc.text('Name', L + 200, y, { lineBreak: false });
    doc.text('Name', L + 380, y, { lineBreak: false });

    y += 22;
    doc.text('Roll No. Issued', L, y, { lineBreak: false });
    uline(L + 85, 220, y);
    doc.text('Fee collected', 230, y, { lineBreak: false });
    uline(310, 400, y);
    doc.text('Receipt Number', 410, y, { lineBreak: false });
    uline(500, R, y);
    y += 18;
    doc.text('Signature of the office clerk', 350, y);

    // ─── DATES ──────────────────────────────────────────────────
    y += 25;
    doc.text('Date of Provisional admission...........................', L, y);
    y += 16;
    doc.text('Date of final admission...........................', L, y);

    // ─── NOTE ───────────────────────────────────────────────────
    y += 25;
    doc.moveTo(L, y).lineTo(R, y).lineWidth(0.5).stroke();
    y += 10;
    doc.font('Helvetica').fontSize(8.5);
    doc.text('Note: Attach following documents(attached photocopies)', L, y);
    y += 14;
    const docs = [
        'School Leaving Certificate',
        'Metric Certificate/Result of Previous Class',
        'Character certificate',
        'Category certificate (if applicable)',
        'Aadhaar Card copy',
        'Bank Passbook copy'
    ];
    docs.forEach((d, i) => {
        doc.text(`${i + 1}. ${d}`, L, y);
        y += 13;
    });

    y += 10;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Principal', 400, y);
    y += 14;
    doc.font('Helvetica').fontSize(9);
    doc.text('Stamp/Signature', 400, y);

    // ─── SUBJECT COMBINATION ────────────────────────────────────
    y += 30;
    doc.moveTo(L, y).lineTo(R, y).lineWidth(0.3).stroke();
    y += 10;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#000000');
    doc.text('SUBJECT COMBINATION', 0, y, { align: 'center', width: 595 });
    y += 20;

    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('SCIENCE STREAM:>', L, y);
    y += 14;
    doc.font('Helvetica').fontSize(8.5);
    doc.text('Compulsory Subjects:    1.English    2. Physics    3.Chemistry    4.Math/Biology', L, y, { width: W });
    y += 13;
    doc.text('Optional Subjects:- Computer science/Physical education/Healthcare/Telecom.', L, y, { width: W });

    y += 20;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('COMMERCE STREAM:-', L, y);
    y += 14;
    doc.font('Helvetica').fontSize(8.5);
    doc.text('Compulsory subjects :-English    2 . Accountancy    3. Business studies    4.Economics', L, y, { width: W });
    y += 13;
    doc.text('Optional Subjects:-Computer science/physical education/Healthcare/Telecom.', L, y, { width: W });

    y += 20;
    doc.font('Helvetica-Bold').fontSize(9);
    doc.text('ARTS STREAM :>', L, y);
    y += 14;
    doc.font('Helvetica').fontSize(8.5);
    doc.text('Compulsory subjects :- 1. English    2.Math/History    3.Economics /Hindi    4. Political science/Geography', L, y, { width: W });
    y += 13;
    doc.text('Optional Subjects :-Computer Science /Physical education /Healthcare /Telecom.', L, y, { width: W });
};

// ═══════════════════════════════════════════════════════════════════
//  MAIN EXPORT
// ═══════════════════════════════════════════════════════════════════
export const generateApplicationPdf = async (application: IAdmissionApplication): Promise<Buffer> => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margins: { top: 40, bottom: 40, left: 40, right: 40 } });
            const chunks: Buffer[] = [];

            doc.on('data', (chunk: Buffer) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));

            const isPrimary = application.applicationType === 'primary';

            if (isPrimary) {
                await generatePrimaryPdf(doc, application);
            } else {
                await generateSeniorPdf(doc, application);
            }

            // Footer
            doc.font('Helvetica').fontSize(6).fillColor('#999999');
            doc.text('This is a computer-generated document. Green View Public School.', 40, 790, { align: 'center', width: 515 });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};
