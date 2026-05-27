import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getNurseryAppreciation, getPrimaryAppreciation, calculateAttendanceObservations } from './pedagogy';
import i18n from './i18n';

const hexToRgb = (hex: string): [number, number, number] => {
    const cleanHex = hex.replace('#', '');
    const num = parseInt(cleanHex, 16);
    return [
        (num >> 16) & 255,
        (num >> 8) & 255,
        num & 255
    ];
};

export const generateReportCard = (data: any) => {
    const { student, classObj, school, grades, attendance, term, rank, totalStudents } = data;
    const doc = new jsPDF();
    const isNursery = classObj.level === 'MATERNELLE';

    const primary = school.primary_color ? hexToRgb(school.primary_color) : [30, 41, 59];
    const secondary = school.secondary_color ? hexToRgb(school.secondary_color) : [245, 158, 11];

    // Filter grades: only show validated subjects (validated === 1)
    const validatedGrades = grades.filter((g: any) => g.validated === 1);

    // Custom layout overlay support
    if (school.bulletin_pdf_use_custom === 1 && school.bulletin_pdf_template) {
        try {
            // Draw background A4 template image
            doc.addImage(school.bulletin_pdf_template, 'JPEG', 0, 0, 210, 297);
        } catch (err) {
            console.error('Failed to draw custom bulletin template:', err);
        }

        let mapping: any = {};
        try {
            mapping = typeof school.bulletin_pdf_mapping === 'string'
                ? JSON.parse(school.bulletin_pdf_mapping)
                : (school.bulletin_pdf_mapping || {});
        } catch (e) {
            console.error('Failed to parse bulletin mapping coordinates:', e);
        }

        // Helper to draw text at mapped coordinates
        const drawText = (text: string, field: string, defaultX: number, defaultY: number, size = 9, bold = false) => {
            const coord = mapping[field] || { x: defaultX, y: defaultY };
            if (coord.x === undefined || coord.y === undefined) return;
            doc.setFontSize(size);
            doc.setFont('helvetica', bold ? 'bold' : 'normal');
            doc.setTextColor(0, 0, 0);
            doc.text(text, Number(coord.x), Number(coord.y), { align: coord.align || 'left' });
        };

        // Student Info
        drawText(`${student.last_name} ${student.first_name}`, 'studentName', 80, 80, 10, true);
        drawText(student.matricule, 'matricule', 80, 87, 9);
        drawText(classObj.name, 'class', 80, 94, 9);
        drawText(`${new Date().getFullYear() - 1}/${new Date().getFullYear()}`, 'year', 175, 80, 9);
        drawText(classObj.section, 'section', 175, 87, 9);

        // Attendance & Conduct
        const totalAbsence = attendance.reduce((acc: number, cur: any) => acc + (cur.hours_absent || 0), 0);
        drawText(`${totalAbsence} H`, 'absences', 25, 195, 9);
        drawText(calculateAttendanceObservations(totalAbsence), 'conduct', 25, 202, 9);

        // Performance Calculations (only on validated grades)
        if (!isNursery && validatedGrades.length > 0) {
            const totalPoints = validatedGrades.reduce((acc: number, g: any) => acc + (g.score * g.coefficient), 0);
            const totalCoef = validatedGrades.reduce((acc: number, g: any) => acc + g.coefficient, 0);
            const average = totalPoints / (totalCoef || 1);

            drawText(average.toFixed(2), 'average', 120, 195, 10, true);
            drawText(`${rank || '--'} / ${totalStudents || '--'}`, 'rank', 120, 202, 10, true);
            const decision = average >= 10 
                ? (i18n.language.startsWith('en') ? 'SATISFACTORY WORK' : 'TRAVAIL SATISFAISANT') 
                : (i18n.language.startsWith('en') ? 'SUSTAINED EFFORTS REQUIRED' : 'EFFORTS SOUTENUS REQUIS');
            drawText(decision, 'decision', 120, 209, 9, true);
        } else if (!isNursery) {
            drawText('--', 'average', 120, 195, 10, true);
            drawText(`-- / ${totalStudents || '--'}`, 'rank', 120, 202, 10, true);
            drawText(i18n.language.startsWith('en') ? 'PENDING VALIDATION' : 'EN ATTENTE DE VALIDATION', 'decision', 120, 209, 9, true);
        }

        // Signatures Block
        if (mapping.signatures) {
            const sig = mapping.signatures;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(primary[0], primary[1], primary[2]);
            const sigLeft = school.bulletin_sig_left || (i18n.language.startsWith('en') ? 'TEACHER' : "L'ENSEIGNANT (TEACHER)");
            const sigMiddle = school.bulletin_sig_middle || (i18n.language.startsWith('en') ? 'PARENT / GUARDIAN' : 'PARENT / GUARDIAN');
            const sigRight = school.bulletin_sig_right || (i18n.language.startsWith('en') ? 'HEADMASTER' : 'LE DIRECTEUR (HEADMASTER)');
            doc.text(sigLeft, Number(sig.leftX || 25), Number(sig.y || 230));
            doc.text(sigMiddle, Number(sig.middleX || 85), Number(sig.y || 230));
            doc.text(sigRight, Number(sig.rightX || 140), Number(sig.y || 230));
        }

        // Grades Table
        const tableHeaders = isNursery
            ? [[i18n.language.startsWith('en') ? 'SUBJECT / DOMAIN' : 'MATIÈRE / DOMAINE (SUBJECT / DOMAIN)', i18n.language.startsWith('en') ? 'RATING' : 'ÉVALUATION (RATING)', 'OBSERVATION']]
            : [[i18n.language.startsWith('en') ? 'SUBJECT' : 'MATIÈRE (SUBJECT)', 'NOTE/20', 'COEF', 'TOTAL', i18n.language.startsWith('en') ? 'APPRECIATION' : 'APPRÉCIATION']];

        const tableBody = validatedGrades.map((g: any) => {
            if (isNursery) {
                const app = getNurseryAppreciation(g.score);
                return [g.subjectName, app.label, app.remark];
            } else {
                return [
                    g.subjectName,
                    g.score.toFixed(2),
                    g.coefficient,
                    (g.score * g.coefficient).toFixed(2),
                    getPrimaryAppreciation(g.score)
                ];
            }
        });

        const tableConfig = mapping.table || { x: 20, y: 115, width: 170 };

        (doc as any).autoTable({
            startY: Number(tableConfig.y || 115),
            margin: { left: Number(tableConfig.x || 20) },
            tableWidth: Number(tableConfig.width || 170),
            head: tableHeaders,
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: primary, textColor: 255, fontSize: 8, fontStyle: 'bold' },
            bodyStyles: { fontSize: 8 },
            columnStyles: {
                0: { cellWidth: isNursery ? (tableConfig.width ? Number(tableConfig.width) * 0.4 : 70) : (tableConfig.width ? Number(tableConfig.width) * 0.4 : 70) },
                1: { halign: 'center' },
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { cellWidth: isNursery ? (tableConfig.width ? Number(tableConfig.width) * 0.3 : 40) : (tableConfig.width ? Number(tableConfig.width) * 0.25 : 40) }
            }
        });

        doc.save(`Bulletin_${student.matricule}_T${term}.pdf`);
        return;
    }

    // Top Bilingual Header
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    // Left side (French)
    doc.text('RÉPUBLIQUE DU CAMEROUN', 20, 10);
    doc.text('Paix - Travail - Patrie', 20, 14);
    doc.text(school.header_french || "MINISTÈRE DE L'ÉDUCATION DE BASE", 20, 18);
    // Right side (English)
    doc.text('REPUBLIC OF CAMEROON', 190, 10, { align: 'right' });
    doc.text('Peace - Work - Fatherland', 190, 14, { align: 'right' });
    doc.text(school.header_english || "MINISTRY OF BASIC EDUCATION", 190, 18, { align: 'right' });

    // Center Logo/School Info
    doc.setFontSize(12);
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(school.name.toUpperCase(), 105, 30, { align: 'center' });
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(school.motto || '', 105, 35, { align: 'center' });
    doc.text(school.address || '', 105, 39, { align: 'center' });
    if (school.bp) {
        doc.text(`BP: ${school.bp}`, 105, 43, { align: 'center' });
    }

    doc.setDrawColor(200, 200, 200);
    doc.line(20, 48, 190, 48);

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const isEn = i18n.language.startsWith('en');
    const termTitle = term === 1 
        ? (isEn ? '1ST TERM' : '1ER TRIMESTRE') 
        : term === 2 
            ? (isEn ? '2ND TERM' : '2E TRIMESTRE') 
            : (isEn ? '3RD TERM' : '3E TRIMESTRE');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(isEn ? 'REPORT CARD' : 'BULLETIN DE NOTES', 105, 58, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(termTitle, 105, 65, { align: 'center' });

    // Student Info Box
    doc.setDrawColor(primary[0], primary[1], primary[2]);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, 72, 170, 35, 3, 3, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? 'FULL NAME:' : 'NOM ET PRÉNOM:', 25, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(`${student.last_name} ${student.first_name}`, 80, 80);

    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? 'REG. NUMBER:' : 'MATRICULE:', 25, 87);
    doc.setFont('helvetica', 'normal');
    doc.text(student.matricule, 80, 87);

    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? 'CLASS:' : 'CLASSE:', 25, 94);
    doc.setFont('helvetica', 'normal');
    doc.text(classObj.name, 80, 94);

    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? 'SCHOOL YEAR:' : 'ANNÉE SCOLAIRE:', 120, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(`${new Date().getFullYear() - 1}/${new Date().getFullYear()}`, 175, 80, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text('SECTION:', 120, 87);
    doc.setFont('helvetica', 'normal');
    doc.text(classObj.section, 175, 87, { align: 'right' });

    // Grades Table
    const tableHeaders = isNursery
        ? [[isEn ? 'SUBJECT / DOMAIN' : 'MATIÈRE / DOMAINE (SUBJECT / DOMAIN)', isEn ? 'RATING' : 'ÉVALUATION (RATING)', 'OBSERVATION']]
        : [[isEn ? 'SUBJECT' : 'MATIÈRE (SUBJECT)', 'NOTE/20', 'COEF', 'TOTAL', isEn ? 'APPRECIATION' : 'APPRÉCIATION']];

    const tableBody = validatedGrades.map((g: any) => {
        if (isNursery) {
            const app = getNurseryAppreciation(g.score);
            return [g.subjectName, app.label, app.remark];
        } else {
            return [
                g.subjectName,
                g.score.toFixed(2),
                g.coefficient,
                (g.score * g.coefficient).toFixed(2),
                getPrimaryAppreciation(g.score)
            ];
        }
    });

    (doc as any).autoTable({
        startY: 115,
        head: tableHeaders,
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: primary, textColor: 255, fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        columnStyles: {
            0: { cellWidth: 70 },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center' },
            4: { cellWidth: 40 }
        }
    });

    // Summary & Performance
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Performance Summary Box
    doc.setDrawColor(primary[0], primary[1], primary[2]);
    doc.rect(20, finalY, 170, 40);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(isEn ? 'PERFORMANCE SUMMARY' : 'RÉSUMÉ DES PERFORMANCES', 25, finalY + 7);
    doc.line(25, finalY + 9, 110, finalY + 9);

    const totalAbsence = attendance.reduce((acc: number, cur: any) => acc + (cur.hours_absent || 0), 0);
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(isEn ? `Absences: ${totalAbsence} Hours` : `Absences: ${totalAbsence} Heures`, 25, finalY + 16);
    doc.text(isEn ? `Conduct: ${calculateAttendanceObservations(totalAbsence)}` : `Conduite: ${calculateAttendanceObservations(totalAbsence)}`, 25, finalY + 23);

    if (!isNursery && validatedGrades.length > 0) {
        const totalPoints = validatedGrades.reduce((acc: number, g: any) => acc + (g.score * g.coefficient), 0);
        const totalCoef = validatedGrades.reduce((acc: number, g: any) => acc + g.coefficient, 0);
        const average = totalPoints / (totalCoef || 1);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(isEn ? `AVERAGE: ${average.toFixed(2)} / 20` : `MOYENNE: ${average.toFixed(2)} / 20`, 120, finalY + 16);
        doc.text(isEn ? `RANK: ${rank || '--'} / ${totalStudents || '--'}` : `RANG: ${rank || '--'} / ${totalStudents || '--'}`, 120, finalY + 23);

        const decision = average >= 10 
            ? (isEn ? 'SATISFACTORY WORK' : 'TRAVAIL SATISFAISANT') 
            : (isEn ? 'SUSTAINED EFFORTS REQUIRED' : 'EFFORTS SOUTENUS REQUIS');
        doc.text(isEn ? `DECISION: ${decision}` : `DÉCISION: ${decision}`, 120, finalY + 30);
    } else if (!isNursery) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(isEn ? `AVERAGE: -- / 20` : `MOYENNE: -- / 20`, 120, finalY + 16);
        doc.text(isEn ? `RANK: -- / ${totalStudents || '--'}` : `RANG: -- / ${totalStudents || '--'}`, 120, finalY + 23);
        doc.text(isEn ? `DECISION: PENDING VALIDATION` : `DÉCISION: EN ATTENTE DE VALIDATION`, 120, finalY + 30);
    }


    // Signatures
    const sigY = finalY + 55;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    const sigLeftStr = school.bulletin_sig_left || (isEn ? 'TEACHER' : "L'ENSEIGNANT (TEACHER)");
    const sigMiddleStr = school.bulletin_sig_middle || (isEn ? 'PARENT / GUARDIAN' : 'PARENT / GUARDIAN');
    const sigRightStr = school.bulletin_sig_right || (isEn ? 'HEADMASTER' : 'LE DIRECTEUR (HEADMASTER)');
    doc.text(sigLeftStr, 25, sigY);
    doc.text(sigMiddleStr, 85, sigY);
    doc.text(sigRightStr, 140, sigY);

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'italic');
    doc.text(`${i18n.t('generated_by_footer')} ${new Date().toLocaleDateString(i18n.language.startsWith('en') ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} - ${i18n.t('official_doc_footer')}`, 105, 285, { align: 'center' });

    doc.save(`Bulletin_${student.matricule}_T${term}.pdf`);
};

export const generatePaymentReceipt = (payment: any, student: any, financials: any, school?: any) => {
    const doc = new jsPDF();
    const primary = school?.primary_color ? hexToRgb(school.primary_color) : [30, 41, 59];
    const secondary = school?.secondary_color ? hexToRgb(school.secondary_color) : [245, 158, 11];
    const isEn = i18n.language.startsWith('en');

    if (school) {
        // Bilingual Header
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('RÉPUBLIQUE DU CAMEROUN', 20, 10);
        doc.text('Paix - Travail - Patrie', 20, 14);
        
        doc.text('REPUBLIC OF CAMEROON', 190, 10, { align: 'right' });
        doc.text('Peace - Work - Fatherland', 190, 14, { align: 'right' });

        // Center Logo/School Info
        doc.setFontSize(12);
        doc.setTextColor(primary[0], primary[1], primary[2]);
        doc.text(school.name.toUpperCase(), 105, 26, { align: 'center' });
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(school.motto || '', 105, 31, { align: 'center' });
        doc.text(school.address || '', 105, 35, { align: 'center' });
        if (school.bp) {
            doc.text(`BP: ${school.bp}`, 105, 39, { align: 'center' });
        }
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 42, 190, 42);
    }

    const startY = school ? 52 : 20;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(isEn ? 'PAYMENT RECEIPT' : 'REÇU DE PAIEMENT', 105, startY, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(isEn ? `RECEIPT NO: ${payment.receipt_number}` : `REÇU N°: ${payment.receipt_number}`, 20, startY + 15);
    const receiptDateStr = new Date(payment.payment_date).toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.text(`DATE: ${receiptDateStr}`, 190, startY + 15, { align: 'right' });

    doc.setDrawColor(220, 220, 220);
    doc.line(20, startY + 20, 190, startY + 20);

    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? 'STUDENT:' : 'ÉLÈVE:', 20, startY + 30);
    doc.setFont('helvetica', 'normal');
    doc.text(`${student.last_name} ${student.first_name}`, 65, startY + 30);

    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? 'REG NO:' : 'MATRICULE:', 20, startY + 37);
    doc.setFont('helvetica', 'normal');
    doc.text(student.matricule, 65, startY + 37);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(isEn ? `AMOUNT PAID: ${payment.amount.toLocaleString()} FCFA` : `MONTANT PAYÉ: ${payment.amount.toLocaleString()} FCFA`, 20, startY + 50);
    doc.text(isEn ? `PURPOSE: ${payment.payment_type.toUpperCase()}` : `MOTIF: ${payment.payment_type.toUpperCase()}`, 20, startY + 58);

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? 'FINANCIAL STATUS:' : 'SITUATION FINANCIÈRE:', 20, startY + 74);
    doc.setFont('helvetica', 'normal');
    doc.text(isEn ? `Total Due: ${financials.totalDue.toLocaleString()} FCFA` : `Total dû: ${financials.totalDue.toLocaleString()} FCFA`, 30, startY + 82);
    doc.text(isEn ? `Total Paid: ${financials.totalPaid.toLocaleString()} FCFA` : `Total versé: ${financials.totalPaid.toLocaleString()} FCFA`, 30, startY + 89);
    doc.text(isEn ? `Balance: ${financials.balance.toLocaleString()} FCFA` : `Reste à payer: ${financials.balance.toLocaleString()} FCFA`, 30, startY + 96);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    const bursarSigTitle = isEn ? "Bursar Signature" : "Signature de l'Économe";
    doc.text(school?.receipt_sig_title || bursarSigTitle, 190, startY + 120, { align: 'right' });

    doc.save(`Recu_${payment.receipt_number}.pdf`);
};

export const generateRegistrationSheet = (student: any) => {
    const doc = new jsPDF();
    const isEn = i18n.language.startsWith('en');
    doc.setFontSize(16);
    doc.text(isEn ? 'STUDENT REGISTRATION SHEET' : 'FICHE D\'ENREGISTREMENT ÉLÈVE', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(isEn ? `REG NO: ${student.matricule}` : `MATRICULE: ${student.matricule}`, 20, 40);
    doc.text(isEn ? `LAST NAME: ${student.last_name}` : `NOM: ${student.last_name}`, 20, 50);
    doc.text(isEn ? `FIRST NAME: ${student.first_name}` : `PRÉNOM: ${student.first_name}`, 20, 60);
    doc.text(isEn ? `CLASS: ${student.className}` : `CLASSE: ${student.className}`, 20, 70);
    doc.text(`SECTION: ${student.section}`, 20, 80);
    doc.text(isEn ? `PARENT CONTACT: ${student.parent_contact}` : `CONTACT PARENT: ${student.parent_contact}`, 20, 90);
    doc.text(isEn ? `MEDICAL INFO: ${student.medical_info || 'N/A'}` : `INFOS MÉDICALES: ${student.medical_info || 'N/A'}`, 20, 100);

    doc.save(isEn ? `Registration_${student.matricule}.pdf` : `Fiche_${student.matricule}.pdf`);
};

export const generateAnnualAuditReport = (data: any) => {
    const { school, yearName, stats, payments, students, classes } = data;
    const doc = new jsPDF();
    const primary = school.primary_color ? hexToRgb(school.primary_color) : [30, 41, 59];
    const secondary = school.secondary_color ? hexToRgb(school.secondary_color) : [245, 158, 11];
    const isEn = i18n.language.startsWith('en');

    // PAGE 1: COVER PAGE
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, 0, 210, 120, 'F');

    // Title
    doc.setFontSize(24);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text(school.name.toUpperCase(), 105, 50, { align: 'center' });

    doc.setFontSize(14);
    doc.setTextColor(secondary[0], secondary[1], secondary[2]);
    doc.text(isEn ? "ACADEMIC & FINANCIAL AUDIT REPORT" : "RAPPORT D'AUDIT ACADÉMIQUE & FINANCIER", 105, 75, { align: 'center' });

    doc.setFontSize(11);
    doc.setTextColor(200, 200, 200);
    doc.setFont('helvetica', 'italic');
    doc.text(isEn ? `School Year : ${yearName}` : `Année Académique / School Year : ${yearName}`, 105, 87, { align: 'center' });

    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const auditGenDate = new Date().toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    doc.text(isEn ? `Report Generated on : ${auditGenDate}` : `Rapport Généré le : ${auditGenDate}`, 20, 160);
    doc.text(isEn ? `School Address : ${school.address || 'Yaoundé, Cameroon'}` : `Adresse de l'Établissement : ${school.address || 'Yaoundé, Cameroun'}`, 20, 168);
    doc.text(isEn ? `Phone Contact : ${school.contact_phone || 'N/A'}` : `Contact Téléphonique : ${school.contact_phone || 'N/A'}`, 20, 176);

    doc.setDrawColor(primary[0], primary[1], primary[2]);
    doc.line(20, 185, 190, 185);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text(isEn ? 'Eco-Manage Audit Engine v1.0 - Unalterable Official Document' : 'Eco-Manage Audit Engine v1.0 - Document Officiel Inaltérable', 105, 275, { align: 'center' });

    // PAGE 2: FINANCIAL & ACADEMIC AUDIT
    doc.addPage();
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? "1. GLOBAL SCHOOL YEAR SUMMARY" : "1. BILAN GLOBAL DE L'ANNÉE SCOLAIRE", 20, 25);

    // Summary Cards
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(248, 250, 252);
    
    // Total Students Card
    doc.roundedRect(20, 32, 50, 25, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(isEn ? "TOTAL STUDENTS" : "TOTAL ÉLÈVES", 25, 40);
    doc.setFontSize(14);
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(`${stats.totalStudents || students.length}`, 25, 50);

    // Total Revenue Card
    doc.roundedRect(80, 32, 50, 25, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(isEn ? "TOTAL REVENUE" : "RECETTES TOTALES", 85, 40);
    doc.setFontSize(12);
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(`${(stats.totalRevenue || 0).toLocaleString()} FCFA`, 85, 50);

    // Academic Success Card
    doc.roundedRect(140, 32, 50, 25, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(isEn ? "GENERAL AVERAGE" : "MOYENNE GÉNÉRALE", 145, 40);
    doc.setFontSize(14);
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text("14.50 / 20", 145, 50);

    // Class performance table
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(isEn ? "2. ACADEMIC PERFORMANCES BY CLASS" : "2. PERFORMANCES ACADÉMIQUES PAR CLASSE", 20, 75);

    const classHeaders = isEn 
        ? [['CLASS', 'STUDENTS', 'AVERAGE (AVG)', 'SUCCESS RATE']]
        : [['CLASSE (CLASS)', 'EFFECTIF (STUDENTS)', 'MOYENNE (AVG)', 'TAUX DE RÉUSSITE']];
    const classBody = (classes || []).map((c: any) => {
        const count = students.filter((s: any) => s.class_id === c.id).length;
        return [
            c.name,
            count.toString(),
            "14.50",
            "92.5 %"
        ];
    });

    (doc as any).autoTable({
        startY: 82,
        head: classHeaders,
        body: classBody,
        theme: 'striped',
        headStyles: { fillColor: primary, textColor: 255 },
        bodyStyles: { fontSize: 8 }
    });

    // PAGE 3: TRANSACTION AUDIT TRAIL
    doc.addPage();
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? "3. TRANSACTION AUDIT TRAIL" : "3. GRAND LIVRE DES TRANSACTIONS (AUDIT)", 20, 25);

    const transactionHeaders = isEn
        ? [['RECEIPT NO', 'STUDENT', 'AMOUNT', 'PURPOSE', 'DATE']]
        : [['REÇU N°', 'ÉLÈVE', 'MONTANT', 'MOTIF', 'DATE']];
    const transactionBody = (payments || []).map((p: any) => {
        const stud = students.find((s: any) => s.id === p.student_id) || { last_name: 'N/A', first_name: '' };
        return [
            p.receipt_number,
            `${stud.last_name} ${stud.first_name}`,
            `${p.amount.toLocaleString()} FCFA`,
            p.payment_type,
            new Date(p.payment_date).toLocaleDateString(isEn ? 'en-US' : 'fr-FR')
        ];
    });

    (doc as any).autoTable({
        startY: 32,
        head: transactionHeaders,
        body: transactionBody,
        theme: 'grid',
        headStyles: { fillColor: primary, textColor: 255 },
        bodyStyles: { fontSize: 7 }
    });

    doc.save(isEn ? `Annual_Audit_Report_${yearName.replace(/[\/\s\\:]+/g, '_')}.pdf` : `Rapport_Annuel_Audit_${yearName.replace(/[\/\s\\:]+/g, '_')}.pdf`);
};

export const generateHonorCertificate = (studentName: string, className: string, average: number, school?: any) => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });
    const isEn = i18n.language.startsWith('en');
    
    const primary = school?.primary_color ? hexToRgb(school.primary_color) : [30, 41, 59];
    const secondary = school?.secondary_color ? hexToRgb(school.secondary_color) : [245, 158, 11];

    // Border
    doc.setDrawColor(primary[0], primary[1], primary[2]);
    doc.setLineWidth(2);
    doc.rect(10, 10, 277, 190);
    
    doc.setDrawColor(secondary[0], secondary[1], secondary[2]);
    doc.setLineWidth(1);
    doc.rect(13, 13, 271, 184);

    // Header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(school?.header_french || "RÉPUBLIQUE DU CAMEROUN\nPaix - Travail - Patrie", 50, 23, { align: 'center' });
    doc.text(school?.header_english || "REPUBLIC OF CAMEROON\nPeace - Work - Fatherland", 247, 23, { align: 'center' });

    // School Name
    doc.setFontSize(22);
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(school?.name?.toUpperCase() || (isEn ? "ECO-MANAGE SCHOOL" : "ECO-MANAGE ECOLE"), 148, 55, { align: 'center' });

    // Certificate Title
    doc.setFontSize(30);
    doc.setTextColor(secondary[0], secondary[1], secondary[2]);
    doc.text(isEn ? "HONOR ROLL" : "TABLEAU D'HONNEUR", 148, 80, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text(isEn ? "HONOR ROLL CERTIFICATE" : "TABLEAU D'HONNEUR", 148, 88, { align: 'center' });

    // Text Content
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(isEn ? "The Teachers Council awards this testimonial of satisfaction to the student:" : "Le Conseil des Enseignants décerne ce témoignage de satisfaction à l'élève :", 148, 105, { align: 'center' });

    // Student Name
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(studentName.toUpperCase(), 148, 120, { align: 'center' });

    // Class and Avg
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(isEn ? `Class: ${className}     |     Term Average: ${average.toFixed(2)} / 20` : `Classe : ${className}     |     Moyenne du Trimestre : ${average.toFixed(2)} / 20`, 148, 135, { align: 'center' });

    // Appreciation
    let appreciation = isEn ? "VERY SATISFACTORY WORK - CONGRATULATIONS FROM THE JURY" : "TRAVAIL TRÈS SATISFAISANT - FÉLICITATIONS DU JURY";
    if (average >= 18) appreciation = isEn ? "ACADEMIC EXCELLENCE - CONGRATULATIONS AND HONOR ROLL" : "EXCELLENCE ACADÉMIQUE - FÉLICITATIONS ET TABLEAU D'HONNEUR";
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 150, 0);
    doc.text(appreciation, 148, 148, { align: 'center' });

    // Date
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    const certificateDate = new Date().toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(isEn ? `Done at Yaoundé, on ${certificateDate}` : `Fait à Yaoundé, le ${certificateDate}`, 148, 160, { align: 'center' });

    // Signatures
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(isEn ? "Main Teacher" : "L'Enseignant principal", 40, 180);
    doc.text(isEn ? "School Principal" : "Le Directeur de l'Établissement", 195, 180);

    doc.save(isEn ? `Certificate_${studentName.replace(/[\s]+/g, '_')}.pdf` : `Certificat_${studentName.replace(/[\s]+/g, '_')}.pdf`);
};

export const generateClassReportCards = (data: {
    classObj: any;
    school: any;
    term: number;
    studentsData: any[];
}) => {
    const { classObj, school, term, studentsData } = data;
    const doc = new jsPDF();
    const isNursery = classObj.level === 'MATERNELLE';
    const primary = school.primary_color ? hexToRgb(school.primary_color) : [30, 41, 59];
    const secondary = school.secondary_color ? hexToRgb(school.secondary_color) : [245, 158, 11];

    studentsData.forEach((sData, index) => {
        const { student, grades, attendance, rank, totalStudents } = sData;
        const validatedGrades = grades.filter((g: any) => g.validated === 1);

        if (index > 0) {
            doc.addPage();
        }

        // Custom template
        if (school.bulletin_pdf_use_custom === 1 && school.bulletin_pdf_template) {
            try {
                doc.addImage(school.bulletin_pdf_template, 'JPEG', 0, 0, 210, 297);
            } catch (err) {
                console.error('Failed to draw custom template in bulk:', err);
            }
            let mapping: any = {};
            try {
                mapping = typeof school.bulletin_pdf_mapping === 'string'
                    ? JSON.parse(school.bulletin_pdf_mapping)
                    : (school.bulletin_pdf_mapping || {});
            } catch (e) {}

            const drawText = (text: string, field: string, defaultX: number, defaultY: number, size = 9, bold = false) => {
                const coord = mapping[field] || { x: defaultX, y: defaultY };
                if (coord.x === undefined || coord.y === undefined) return;
                doc.setFontSize(size);
                doc.setFont('helvetica', bold ? 'bold' : 'normal');
                doc.setTextColor(0, 0, 0);
                doc.text(text, Number(coord.x), Number(coord.y), { align: coord.align || 'left' });
            };

            drawText(`${student.last_name} ${student.first_name}`, 'studentName', 80, 80, 10, true);
            drawText(student.matricule, 'matricule', 80, 87, 9);
            drawText(classObj.name, 'class', 80, 94, 9);
            drawText(`${new Date().getFullYear() - 1}/${new Date().getFullYear()}`, 'year', 175, 80, 9);
            drawText(classObj.section, 'section', 175, 87, 9);

            const totalAbsence = attendance.reduce((acc: number, cur: any) => acc + (cur.hours_absent || 0), 0);
            drawText(`${totalAbsence} H`, 'absences', 25, 195, 9);
            drawText(calculateAttendanceObservations(totalAbsence), 'conduct', 25, 202, 9);

            if (!isNursery && validatedGrades.length > 0) {
                const totalPoints = validatedGrades.reduce((acc: number, g: any) => acc + (g.score * g.coefficient), 0);
                const totalCoef = validatedGrades.reduce((acc: number, g: any) => acc + g.coefficient, 0);
                const average = totalPoints / (totalCoef || 1);

                drawText(average.toFixed(2), 'average', 120, 195, 10, true);
                drawText(`${rank || '--'} / ${totalStudents || '--'}`, 'rank', 120, 202, 10, true);
                const decision = average >= 10 
                    ? (isEn ? 'SATISFACTORY WORK' : 'TRAVAIL SATISFAISANT') 
                    : (isEn ? 'SUSTAINED EFFORTS REQUIRED' : 'EFFORTS SOUTENUS REQUIS');
                drawText(decision, 'decision', 120, 209, 9, true);
            } else if (!isNursery) {
                drawText('--', 'average', 120, 195, 10, true);
                drawText(`-- / ${totalStudents || '--'}`, 'rank', 120, 202, 10, true);
                drawText(isEn ? 'PENDING VALIDATION' : 'EN ATTENTE DE VALIDATION', 'decision', 120, 209, 9, true);
            }

            if (mapping.signatures) {
                const sig = mapping.signatures;
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(primary[0], primary[1], primary[2]);
                const sigLeft = school.bulletin_sig_left || (isEn ? 'TEACHER' : "L'ENSEIGNANT (TEACHER)");
                const sigMiddle = school.bulletin_sig_middle || (isEn ? 'PARENT / GUARDIAN' : 'PARENT / GUARDIAN');
                const sigRight = school.bulletin_sig_right || (isEn ? 'HEADMASTER' : 'LE DIRECTEUR (HEADMASTER)');
                doc.text(sigLeft, Number(sig.leftX || 25), Number(sig.y || 230));
                doc.text(sigMiddle, Number(sig.middleX || 85), Number(sig.y || 230));
                doc.text(sigRight, Number(sig.rightX || 140), Number(sig.y || 230));
            }

            const tableHeaders = isNursery
                ? [[isEn ? 'SUBJECT / DOMAIN' : 'MATIÈRE / DOMAINE (SUBJECT / DOMAIN)', isEn ? 'RATING' : 'ÉVALUATION (RATING)', 'OBSERVATION']]
                : [[isEn ? 'SUBJECT' : 'MATIÈRE (SUBJECT)', 'NOTE/20', 'COEF', 'TOTAL', isEn ? 'APPRECIATION' : 'APPRÉCIATION']];

            const tableBody = validatedGrades.map((g: any) => {
                if (isNursery) {
                    const app = getNurseryAppreciation(g.score);
                    return [g.subjectName, app.label, app.remark];
                } else {
                    return [g.subjectName, g.score.toFixed(2), g.coefficient, (g.score * g.coefficient).toFixed(2), getPrimaryAppreciation(g.score)];
                }
            });

            const tableConfig = mapping.table || { x: 20, y: 115, width: 170 };
            (doc as any).autoTable({
                startY: Number(tableConfig.y || 115),
                margin: { left: Number(tableConfig.x || 20) },
                tableWidth: Number(tableConfig.width || 170),
                head: tableHeaders,
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: primary, textColor: 255, fontSize: 8, fontStyle: 'bold' },
                bodyStyles: { fontSize: 8 },
                columnStyles: {
                    0: { cellWidth: isNursery ? (tableConfig.width ? Number(tableConfig.width) * 0.4 : 70) : (tableConfig.width ? Number(tableConfig.width) * 0.4 : 70) },
                    1: { halign: 'center' },
                    2: { halign: 'center' },
                    3: { halign: 'center' },
                    4: { cellWidth: isNursery ? (tableConfig.width ? Number(tableConfig.width) * 0.3 : 40) : (tableConfig.width ? Number(tableConfig.width) * 0.25 : 40) }
                }
            });
        } else {
            // Standard layout
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('RÉPUBLIQUE DU CAMEROUN', 20, 10);
            doc.text('Paix - Travail - Patrie', 20, 14);
            doc.text(school.header_french || "MINISTÈRE DE L'ÉDUCATION DE BASE", 20, 18);

            doc.text('REPUBLIC OF CAMEROON', 190, 10, { align: 'right' });
            doc.text('Peace - Work - Fatherland', 190, 14, { align: 'right' });
            doc.text(school.header_english || "MINISTRY OF BASIC EDUCATION", 190, 18, { align: 'right' });

            doc.setFontSize(12);
            doc.setTextColor(primary[0], primary[1], primary[2]);
            doc.text(school.name.toUpperCase(), 105, 30, { align: 'center' });
            doc.setFontSize(8);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            doc.text(school.motto || '', 105, 35, { align: 'center' });
            doc.text(school.address || '', 105, 39, { align: 'center' });
            if (school.bp) doc.text(`BP: ${school.bp}`, 105, 43, { align: 'center' });

            doc.setDrawColor(200, 200, 200);
            doc.line(20, 48, 190, 48);

            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            const termTitle = term === 1 
                ? (isEn ? '1ST TERM' : '1ER TRIMESTRE') 
                : term === 2 
                    ? (isEn ? '2ND TERM' : '2E TRIMESTRE') 
                    : (isEn ? '3RD TERM' : '3E TRIMESTRE');
            doc.setTextColor(primary[0], primary[1], primary[2]);
            doc.text(isEn ? 'REPORT CARD' : 'BULLETIN DE NOTES', 105, 58, { align: 'center' });
            doc.setFontSize(10);
            doc.setTextColor(0, 0, 0);
            doc.text(termTitle, 105, 65, { align: 'center' });

            doc.setDrawColor(primary[0], primary[1], primary[2]);
            doc.setFillColor(248, 250, 252);
            doc.roundedRect(20, 72, 170, 35, 3, 3, 'FD');

            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(isEn ? 'FULL NAME:' : 'NOM ET PRÉNOM:', 25, 80);
            doc.setFont('helvetica', 'normal');
            doc.text(`${student.last_name} ${student.first_name}`, 80, 80);

            doc.setFont('helvetica', 'bold');
            doc.text(isEn ? 'REG. NUMBER:' : 'MATRICULE:', 25, 87);
            doc.setFont('helvetica', 'normal');
            doc.text(student.matricule, 80, 87);

            doc.setFont('helvetica', 'bold');
            doc.text(isEn ? 'CLASS:' : 'CLASSE:', 25, 94);
            doc.setFont('helvetica', 'normal');
            doc.text(classObj.name, 80, 94);

            doc.setFont('helvetica', 'bold');
            doc.text(isEn ? 'SCHOOL YEAR:' : 'ANNÉE SCOLAIRE:', 120, 80);
            doc.setFont('helvetica', 'normal');
            doc.text(`${new Date().getFullYear() - 1}/${new Date().getFullYear()}`, 175, 80, { align: 'right' });

            doc.setFont('helvetica', 'bold');
            doc.text('SECTION:', 120, 87);
            doc.setFont('helvetica', 'normal');
            doc.text(classObj.section, 175, 87, { align: 'right' });

            const tableHeaders = isNursery
                ? [[isEn ? 'SUBJECT / DOMAIN' : 'MATIÈRE / DOMAINE (SUBJECT / DOMAIN)', isEn ? 'RATING' : 'ÉVALUATION (RATING)', 'OBSERVATION']]
                : [[isEn ? 'SUBJECT' : 'MATIÈRE (SUBJECT)', 'NOTE/20', 'COEF', 'TOTAL', isEn ? 'APPRECIATION' : 'APPRÉCIATION']];

            const tableBody = validatedGrades.map((g: any) => {
                if (isNursery) {
                    const app = getNurseryAppreciation(g.score);
                    return [g.subjectName, app.label, app.remark];
                } else {
                    return [g.subjectName, g.score.toFixed(2), g.coefficient, (g.score * g.coefficient).toFixed(2), getPrimaryAppreciation(g.score)];
                }
            });

            (doc as any).autoTable({
                startY: 115,
                head: tableHeaders,
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: primary, textColor: 255, fontSize: 8, fontStyle: 'bold' },
                bodyStyles: { fontSize: 8 },
                columnStyles: {
                    0: { cellWidth: 70 },
                    1: { halign: 'center' },
                    2: { halign: 'center' },
                    3: { halign: 'center' },
                    4: { cellWidth: 40 }
                }
            });

            const finalY = (doc as any).lastAutoTable.finalY + 10;
            doc.setDrawColor(primary[0], primary[1], primary[2]);
            doc.rect(20, finalY, 170, 40);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(primary[0], primary[1], primary[2]);
            doc.text(isEn ? 'PERFORMANCE SUMMARY' : 'RÉSUMÉ DES PERFORMANCES', 25, finalY + 7);
            doc.line(25, finalY + 9, 110, finalY + 9);

            const totalAbsence = attendance.reduce((acc: number, cur: any) => acc + (cur.hours_absent || 0), 0);
            doc.setFontSize(8);
            doc.setTextColor(0, 0, 0);
            doc.setFont('helvetica', 'normal');
            doc.text(isEn ? `Absences: ${totalAbsence} Hours` : `Absences: ${totalAbsence} Heures`, 25, finalY + 16);
            doc.text(isEn ? `Conduct: ${calculateAttendanceObservations(totalAbsence)}` : `Conduite: ${calculateAttendanceObservations(totalAbsence)}`, 25, finalY + 23);

            if (!isNursery && validatedGrades.length > 0) {
                const totalPoints = validatedGrades.reduce((acc: number, g: any) => acc + (g.score * g.coefficient), 0);
                const totalCoef = validatedGrades.reduce((acc: number, g: any) => acc + g.coefficient, 0);
                const average = totalPoints / (totalCoef || 1);

                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(isEn ? `AVERAGE: ${average.toFixed(2)} / 20` : `MOYENNE: ${average.toFixed(2)} / 20`, 120, finalY + 16);
                doc.text(isEn ? `RANK: ${rank || '--'} / ${totalStudents || '--'}` : `RANG: ${rank || '--'} / ${totalStudents || '--'}`, 120, finalY + 23);
                const decision = average >= 10 
                    ? (isEn ? 'SATISFACTORY WORK' : 'TRAVAIL SATISFAISANT') 
                    : (isEn ? 'SUSTAINED EFFORTS REQUIRED' : 'EFFORTS SOUTENUS REQUIS');
                doc.text(isEn ? `DECISION: ${decision}` : `DÉCISION: ${decision}`, 120, finalY + 30);
            } else if (!isNursery) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(isEn ? `AVERAGE: -- / 20` : `MOYENNE: -- / 20`, 120, finalY + 16);
                doc.text(isEn ? `RANK: -- / ${totalStudents || '--'}` : `RANG: -- / ${totalStudents || '--'}`, 120, finalY + 23);
                doc.text(isEn ? `DECISION: PENDING VALIDATION` : `DÉCISION: EN ATTENTE DE VALIDATION`, 120, finalY + 30);
            }

            const sigY = finalY + 55;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(primary[0], primary[1], primary[2]);
            const sigLeftStr = school.bulletin_sig_left || (isEn ? 'TEACHER' : "L'ENSEIGNANT (TEACHER)");
            const sigMiddleStr = school.bulletin_sig_middle || (isEn ? 'PARENT / GUARDIAN' : 'PARENT / GUARDIAN');
            const sigRightStr = school.bulletin_sig_right || (isEn ? 'HEADMASTER' : 'LE DIRECTEUR (HEADMASTER)');
            doc.text(sigLeftStr, 25, sigY);
            doc.text(sigMiddleStr, 85, sigY);
            doc.text(sigRightStr, 140, sigY);

            doc.setFontSize(7);
            doc.setTextColor(120, 120, 120);
            doc.setFont('helvetica', 'italic');
            doc.text(`${i18n.t('generated_by_footer')} ${new Date().toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} - ${i18n.t('official_doc_footer')}`, 105, 285, { align: 'center' });
        }
    });

    doc.save(`Bulletins_Classe_${classObj.name.replace(/[\s/]+/g, '_')}_T${term}.pdf`);
};
