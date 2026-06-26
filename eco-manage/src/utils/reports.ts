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
    const { student, classObj, school, template, grades, attendance, term, rank, totalStudents } = data;
    const doc = new jsPDF();
    const isNursery = classObj.level === 'MATERNELLE';

    const primaryColor = template?.primary_color || school.primary_color;
    const secondaryColor = template?.secondary_color || school.secondary_color;
    const primary = primaryColor ? hexToRgb(primaryColor) : [30, 41, 59];
    const secondary = secondaryColor ? hexToRgb(secondaryColor) : [245, 158, 11];

    let validatedGrades = data.ignoreValidation ? grades : grades.filter((g: any) => g.validated === 1);
    
    let termSequences: any[] = [];
    try {
        if (school.term_structure) {
            const ts = JSON.parse(school.term_structure);
            const currentTerm = ts.find((t: any) => t.term_id?.toString() === term?.toString());
            if (currentTerm && currentTerm.sequences) {
                termSequences = currentTerm.sequences;
            }
        }
    } catch(e) {}

    // Aggregate by subject for term averaging
    const subjectGradesMap: Record<number, any> = {};
    validatedGrades.forEach((g: any) => {
        const subId = g.subject_id;
        if (!subjectGradesMap[subId]) {
            subjectGradesMap[subId] = {
                ...g,
                scores: [],
                letter_scores: []
            };
        }
        if (g.score !== null && g.score !== undefined) {
            subjectGradesMap[subId].scores.push({ score: g.score, month: g.month });
        }
        if (g.letter_score) {
            subjectGradesMap[subId].letter_scores.push(g.letter_score);
        }
    });

    validatedGrades = Object.values(subjectGradesMap).map((sg: any) => {
        let totalWeight = 0;
        let weightedSum = 0;
        sg.scores.forEach((sObj: any) => {
            const seqConfig = termSequences.find(s => s.id?.toString() === sObj.month?.toString());
            const weight = seqConfig && seqConfig.weight !== undefined ? Number(seqConfig.weight) : 1;
            weightedSum += sObj.score * weight;
            totalWeight += weight;
        });

        const avgScore = totalWeight > 0 ? (weightedSum / totalWeight) : 0;
        const letterScore = sg.letter_scores.length > 0 ? sg.letter_scores[sg.letter_scores.length - 1] : sg.letter_score;
        return {
            ...sg,
            score: avgScore,
            letter_score: letterScore
        };
    });

    const isEn = i18n.language.startsWith('en');

    // --- Watermark (Centered, all pages) ---
    const addWatermark = () => {
        if (template?.watermark_image) {
            try {
                // If possible, set opacity via GState if needed, but usually watermarks are already lightened.
                doc.setGState(new (doc as any).GState({opacity: 0.15}));
                doc.addImage(template.watermark_image, 'PNG', 35, 70, 140, 140, undefined, 'FAST');
                doc.setGState(new (doc as any).GState({opacity: 1}));
            } catch (err) {
                console.error("Failed to add watermark", err);
            }
        }
    };

    // Add watermark for first page
    addWatermark();

    // --- Header Section ---
    let startY = 20;
    if (template?.header_image) {
        try {
            doc.addImage(template.header_image, 'JPEG', 0, 0, 210, 45, undefined, 'FAST');
            startY = 50;
        } catch (err) {
            console.error("Failed to add header image", err);
        }
    } else {
        // Fallback Top Bilingual Header
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
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
        if (school.bp) {
            doc.text(`BP: ${school.bp}`, 105, 43, { align: 'center' });
        }
        doc.setDrawColor(200, 200, 200);
        doc.line(20, 48, 190, 48);
        startY = 55;
    }

    // --- Title ---
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    let evaluationPeriods: any[] = [];
    try {
        if (school.evaluation_periods) evaluationPeriods = JSON.parse(school.evaluation_periods);
    } catch (e) {}
    
    let termTitle = '';
    if (typeof term === 'string') {
        termTitle = term.toUpperCase();
    } else {
        const found = evaluationPeriods.find((ep: any) => ep.id === term);
        termTitle = found ? found.name.toUpperCase() : (isEn ? `TERM ${term}` : `PÉRIODE ${term}`);
    }
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(isEn ? 'REPORT CARD' : 'BULLETIN DE NOTES', 105, startY, { align: 'center' });
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(termTitle, 105, startY + 7, { align: 'center' });

    // --- Student Info Box ---
    startY += 12;
    doc.setDrawColor(primary[0], primary[1], primary[2]);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, startY, 170, 30, 3, 3, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? 'FULL NAME:' : 'NOM ET PRÉNOM:', 25, startY + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(`${student.last_name} ${student.first_name}`, 80, startY + 7);

    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? 'REG. NUMBER:' : 'MATRICULE:', 25, startY + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(student.matricule, 80, startY + 14);

    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? 'CLASS:' : 'CLASSE:', 25, startY + 21);
    doc.setFont('helvetica', 'normal');
    doc.text(`${classObj.name}${classObj.code ? ' (' + classObj.code + ')' : ''}`, 80, startY + 21);

    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? 'SCHOOL YEAR:' : 'ANNÉE SCOLAIRE:', 120, startY + 7);
    doc.setFont('helvetica', 'normal');
    doc.text(`${new Date().getFullYear() - 1}/${new Date().getFullYear()}`, 185, startY + 7, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text('SECTION:', 120, startY + 14);
    doc.setFont('helvetica', 'normal');
    doc.text(classObj.section, 185, startY + 14, { align: 'right' });

    // --- Grades Table ---
    startY += 35;
    const tableHeaders = isNursery
        ? [[isEn ? 'SUBJECT / DOMAIN' : 'MATIÈRE / DOMAINE', isEn ? 'RATING' : 'ÉVALUATION', 'OBSERVATION']]
        : [[isEn ? 'SUBJECT' : 'MATIÈRE', 'NOTE/20', 'COEF', 'TOTAL', isEn ? 'APPRECIATION' : 'APPRÉCIATION']];

    const tableBody: any[] = [];
    
    if (validatedGrades.length === 0) {
        tableBody.push([{ 
            content: isEn ? 'NO VALIDATED GRADES FOUND (DRAFT MODE)' : 'AUCUNE NOTE VALIDÉE (MODE BROUILLON)', 
            colSpan: isNursery ? 3 : 5, 
            styles: { halign: 'center', textColor: [200, 50, 50], fontStyle: 'bold', fillColor: [255, 240, 240] } 
        }]);
    } else {
        const groupedGrades: Record<string, any[]> = {};
        validatedGrades.forEach((g: any) => {
            const domain = g.domain || (isEn ? 'GENERAL SUBJECTS' : 'MATIÈRES GÉNÉRALES');
            if (!groupedGrades[domain]) groupedGrades[domain] = [];
            groupedGrades[domain].push(g);
        });

        Object.keys(groupedGrades).forEach(domain => {
            tableBody.push([{ 
                content: domain.toUpperCase(), 
                colSpan: isNursery ? 3 : 5, 
                styles: { fillColor: [240, 245, 250], textColor: [30, 41, 59], fontStyle: 'bold', halign: 'left' } 
            }]);

            let domainTotalPoints = 0;
            let domainTotalCoef = 0;

            groupedGrades[domain].forEach(g => {
                if (isNursery) {
                    const app = getNurseryAppreciation(g.score);
                    tableBody.push([g.subjectName, app.label, app.remark]);
                } else {
                    domainTotalPoints += (g.score * g.coefficient);
                    domainTotalCoef += g.coefficient;
                    tableBody.push([
                        g.subjectName,
                        g.score.toFixed(2),
                        g.coefficient,
                        (g.score * g.coefficient).toFixed(2),
                        getPrimaryAppreciation(g.score)
                    ]);
                }
            });

            if (!isNursery) {
                const domainAvg = domainTotalCoef > 0 ? (domainTotalPoints / domainTotalCoef) : 0;
                tableBody.push([{ 
                    content: isEn ? `Subtotal ${domain}` : `Sous-total ${domain}`, 
                    styles: { fontStyle: 'italic', halign: 'right' } 
                }, 
                { content: domainAvg.toFixed(2), styles: { fontStyle: 'bold', halign: 'center' } }, 
                { content: domainTotalCoef.toString(), styles: { fontStyle: 'bold', halign: 'center' } }, 
                { content: domainTotalPoints.toFixed(2), styles: { fontStyle: 'bold', halign: 'center' } }, 
                '']);
            }
        });
    }

    (doc as any).autoTable({
        startY: startY,
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
        },
        margin: { top: 40, bottom: 40 }, // Prevent overlap with header/footer
        didDrawPage: function (data: any) {
            // Draw watermark on additional pages
            if (data.pageNumber > 1) {
                addWatermark();
            }
        }
    });

    // --- Summary & Performance ---
    let finalY = (doc as any).lastAutoTable.finalY + 5;
    
    const overflowThreshold = template?.footer_image ? 200 : 230;
    if (finalY > overflowThreshold) {
        doc.addPage();
        addWatermark();
        finalY = 20;
    }

    doc.setDrawColor(primary[0], primary[1], primary[2]);
    doc.rect(20, finalY, 170, 30);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(isEn ? 'PERFORMANCE SUMMARY' : 'RÉSUMÉ DES PERFORMANCES', 25, finalY + 6);
    doc.line(25, finalY + 8, 110, finalY + 8);

    const totalAbsence = attendance.reduce((acc: number, cur: any) => acc + (cur.hours_absent || 0), 0);
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.text(isEn ? `Absences: ${totalAbsence} Hours` : `Absences: ${totalAbsence} Heures`, 25, finalY + 15);
    doc.text(isEn ? `Conduct: ${calculateAttendanceObservations(totalAbsence)}` : `Conduite: ${calculateAttendanceObservations(totalAbsence)}`, 25, finalY + 22);

    if (!isNursery && validatedGrades.length > 0) {
        const totalPoints = validatedGrades.reduce((acc: number, g: any) => acc + (g.score * g.coefficient), 0);
        const totalCoef = validatedGrades.reduce((acc: number, g: any) => acc + g.coefficient, 0);
        const average = totalPoints / (totalCoef || 1);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(isEn ? `AVERAGE: ${average.toFixed(2)} / 20` : `MOYENNE: ${average.toFixed(2)} / 20`, 120, finalY + 15);
        doc.text(isEn ? `RANK: ${rank || '--'} / ${totalStudents || '--'}` : `RANG: ${rank || '--'} / ${totalStudents || '--'}`, 120, finalY + 22);

        const decision = average >= 10 
            ? (isEn ? 'SATISFACTORY WORK' : 'TRAVAIL SATISFAISANT') 
            : (isEn ? 'SUSTAINED EFFORTS REQUIRED' : 'EFFORTS SOUTENUS REQUIS');
        doc.text(isEn ? `DECISION: ${decision}` : `DÉCISION: ${decision}`, 25, finalY + 28);
    } else if (!isNursery) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(isEn ? `AVERAGE: -- / 20` : `MOYENNE: -- / 20`, 120, finalY + 15);
        doc.text(isEn ? `RANK: -- / ${totalStudents || '--'}` : `RANG: -- / ${totalStudents || '--'}`, 120, finalY + 22);
        doc.text(isEn ? `DECISION: PENDING VALIDATION` : `DÉCISION: EN ATTENTE DE VALIDATION`, 25, finalY + 28);
    }

    // --- Footer Section (Signatures) ---
    const sigY = finalY + 40;
    
    if (template?.footer_image) {
        try {
            // Draw custom footer (signatures/stamps)
            doc.addImage(template.footer_image, 'JPEG', 0, 297 - 45, 210, 45, undefined, 'FAST');
        } catch (err) {
            console.error("Failed to add footer image", err);
        }
    } else {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primary[0], primary[1], primary[2]);
        const sigLeftStr = school.bulletin_sig_left || (isEn ? 'TEACHER' : "L'ENSEIGNANT (TEACHER)");
        const sigMiddleStr = school.bulletin_sig_middle || (isEn ? 'PARENT / GUARDIAN' : 'PARENT / GUARDIAN');
        const sigRightStr = school.bulletin_sig_right || (isEn ? 'HEADMASTER' : 'LE DIRECTEUR (HEADMASTER)');
        doc.text(sigLeftStr, 25, sigY);
        doc.text(sigMiddleStr, 85, sigY);
        doc.text(sigRightStr, 140, sigY);
    }

    // --- System Footer ---
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'italic');
    doc.text(`${i18n.t('generated_by_footer')} ${new Date().toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, 105, 292, { align: 'center' });

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
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.text(school?.header_french || "MINISTÈRE DE L'ÉDUCATION DE BASE", 20, 18);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);

        doc.text('REPUBLIC OF CAMEROON', 190, 10, { align: 'right' });
        doc.text('Peace - Work - Fatherland', 190, 14, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.text(school?.header_english || "MINISTRY OF BASIC EDUCATION", 190, 18, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);

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

    if (payment.depositor_name) {
        doc.setFont('helvetica', 'bold');
        doc.text(isEn ? 'DEPOSITOR:' : 'DÉPOSANT:', 20, startY + 44);
        doc.setFont('helvetica', 'normal');
        doc.text(payment.depositor_name, 65, startY + 44);
    }

    const safeNum = (num: number) => num.toLocaleString('en-US').replace(/,/g, ' ');

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(isEn ? `AMOUNT PAID: ${safeNum(payment.amount)} FCFA` : `MONTANT PAYÉ: ${safeNum(payment.amount)} FCFA`, 20, startY + 50);
    doc.text(isEn ? `PURPOSE: ${payment.payment_type.toUpperCase()}` : `MOTIF: ${payment.payment_type.toUpperCase()}`, 20, startY + 58);

    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? 'FINANCIAL STATUS:' : 'SITUATION FINANCIÈRE:', 20, startY + 74);
    doc.setFont('helvetica', 'normal');
    doc.text(isEn ? `Total Due: ${safeNum(financials.totalDue)} FCFA` : `Total dû: ${safeNum(financials.totalDue)} FCFA`, 30, startY + 82);
    doc.text(isEn ? `Total Paid: ${safeNum(financials.totalPaid)} FCFA` : `Total versé: ${safeNum(financials.totalPaid)} FCFA`, 30, startY + 89);
    doc.text(isEn ? `Balance: ${safeNum(financials.balance)} FCFA` : `Reste à payer: ${safeNum(financials.balance)} FCFA`, 30, startY + 96);

    const paymentStatus = financials.balance <= 0 ? (isEn ? 'FULL PAYMENT' : 'RÈGLEMENT TOTAL') : (isEn ? 'PARTIAL PAYMENT / ADVANCE' : 'AVANCE');
    const statusColor = financials.balance <= 0 ? [34, 197, 94] : [245, 158, 11]; // Green for full, Orange for partial
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(paymentStatus, 20, startY + 110);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    const bursarSigTitle = isEn ? "Bursar Signature" : "Signature de l'Économe";
    doc.text(school?.receipt_sig_title || bursarSigTitle, 190, startY + 120, { align: 'right' });

    doc.save(`Recu_${payment.receipt_number}.pdf`);
};

export const generateRegistrationSheet = (student: any, school?: any) => {
    const doc = new jsPDF();
    const isEn = i18n.language.startsWith('en');
    const primary = school?.primary_color ? hexToRgb(school.primary_color) : [30, 41, 59];

    // School header
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('RÉPUBLIQUE DU CAMEROUN', 20, 10);
    doc.text('Paix - Travail - Patrie', 20, 14);
    doc.text(school?.header_french || "MINISTÈRE DE L'ÉDUCATION DE BASE", 20, 18);
    doc.text('REPUBLIC OF CAMEROON', 190, 10, { align: 'right' });
    doc.text('Peace - Work - Fatherland', 190, 14, { align: 'right' });
    doc.text(school?.header_english || "MINISTRY OF BASIC EDUCATION", 190, 18, { align: 'right' });
    doc.setFontSize(14);
    doc.text((school?.name || 'ÉTABLISSEMENT').toUpperCase(), 105, 30, { align: 'center' });
    doc.setFontSize(8);
    doc.text(school?.address || '', 105, 36, { align: 'center' });

    // Title
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? 'STUDENT REGISTRATION SHEET' : "FICHE D'INSCRIPTION DE L'ÉLÈVE", 105, 55, { align: 'center' });
    doc.setDrawColor(primary[0], primary[1], primary[2]);
    doc.line(40, 58, 170, 58);

    // Student info
    const fields = [
        { label: isEn ? 'REG NUMBER' : 'MATRICULE', value: student.matricule },
        { label: isEn ? 'LAST NAME' : 'NOM', value: student.last_name },
        { label: isEn ? 'FIRST NAME' : 'PRÉNOM', value: student.first_name },
        { label: isEn ? 'DATE OF BIRTH' : 'DATE DE NAISSANCE', value: student.birth_date || 'N/A' },
        { label: isEn ? 'PLACE OF BIRTH' : 'LIEU DE NAISSANCE', value: student.birth_place || 'N/A' },
        { label: isEn ? 'GENDER' : 'GENRE', value: student.gender === 'M' ? (isEn ? 'Male' : 'Masculin') : student.gender === 'F' ? (isEn ? 'Female' : 'Féminin') : 'N/A' },
        { label: isEn ? 'CLASS' : 'CLASSE', value: student.className || '' },
        { label: 'SECTION', value: student.section || '' },
        { label: isEn ? 'PARENT NAME' : 'NOM DU PARENT', value: student.parent_name || 'N/A' },
        { label: isEn ? 'PARENT CONTACT' : 'CONTACT PARENT', value: student.parent_contact || '' },
        { label: isEn ? 'EMERGENCY CONTACT' : "CONTACT D'URGENCE", value: student.emergency_contact || 'N/A' },
        { label: isEn ? 'NEIGHBORHOOD' : 'QUARTIER', value: student.neighborhood || 'N/A' },
        { label: isEn ? 'MEDICAL INFO' : 'INFOS MÉDICALES', value: student.medical_info || 'RAS' },
    ];

    let y = 70;
    doc.setFontSize(10);
    fields.forEach(f => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(80, 80, 80);
        doc.text(f.label + ' :', 25, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(String(f.value), 90, y);
        doc.setDrawColor(220, 220, 220);
        doc.line(25, y + 3, 185, y + 3);
        y += 12;
    });

    // Footer
    y += 15;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(isEn ? 'Parent Signature' : 'Signature du Parent', 40, y, { align: 'center' });
    doc.text(isEn ? 'School Administration' : "L'Administration", 170, y, { align: 'center' });
    doc.line(15, y + 15, 65, y + 15);
    doc.line(145, y + 15, 195, y + 15);

    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(`${isEn ? 'Generated by Eco-Manage on' : 'Généré par Eco-Manage le'} ${new Date().toLocaleDateString(isEn ? 'en-US' : 'fr-FR')}`, 105, 285, { align: 'center' });

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
    doc.text(data.generalAverage ? `${data.generalAverage} / 20` : "N/A", 145, 50);

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
            data.classAverages?.[c.id] ?? "N/A",
            data.classSuccessRates?.[c.id] ? `${data.classSuccessRates[c.id]} %` : "N/A"
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
    doc.text(school?.header_french || "MINISTÈRE DE L'ÉDUCATION DE BASE", 50, 23, { align: 'center' });
    doc.text(school?.header_english || "MINISTRY OF BASIC EDUCATION", 247, 23, { align: 'center' });

    // School Name and Info
    doc.setFontSize(22);
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(school?.name?.toUpperCase() || (isEn ? "ECO-MANAGE SCHOOL" : "ECO-MANAGE ECOLE"), 148, 55, { align: 'center' });
    
    if (school?.motto) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.setFont('helvetica', 'italic');
        doc.text(`« ${school.motto} »`, 148, 62, { align: 'center' });
    }
    
    if (school?.address || school?.bp) {
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.setFont('helvetica', 'normal');
        doc.text(`${school.address || ''} ${school.bp ? ` - BP: ${school.bp}` : ''}`.trim(), 148, school?.motto ? 67 : 62, { align: 'center' });
    }

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
    doc.text(isEn ? `Done at ${school?.address || 'Yaoundé'}, on ${certificateDate}` : `Fait à ${school?.address || 'Yaoundé'}, le ${certificateDate}`, 148, 160, { align: 'center' });

    // Signatures
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(school?.bulletin_sig_left || (isEn ? "Main Teacher" : "L'Enseignant principal"), 40, 180);
    doc.text(school?.bulletin_sig_right || (isEn ? "School Principal" : "Le Directeur de l'Établissement"), 195, 180);

    doc.save(isEn ? `Certificate_${studentName.replace(/[\s]+/g, '_')}.pdf` : `Certificat_${studentName.replace(/[\s]+/g, '_')}.pdf`);
};

export const generateClassReportCards = (data: {
    classObj: any;
    school: any;
    term: any;
    studentsData: any[];
    ignoreValidation?: boolean;
    isAnnual?: boolean;
    template?: any;
}) => {
    const { classObj, school, term, studentsData, ignoreValidation, isAnnual, template } = data;
    const doc = new jsPDF();
    const isNursery = classObj.level === 'MATERNELLE';
    const isEn = i18n.language?.startsWith('en') ?? false;
    const primaryColor = template?.primary_color || school.primary_color;
    const secondaryColor = template?.secondary_color || school.secondary_color;
    const primary = primaryColor ? hexToRgb(primaryColor) : [30, 41, 59];
    const secondary = secondaryColor ? hexToRgb(secondaryColor) : [245, 158, 11];

    const addWatermarkBulk = () => {
        if (template?.watermark_image) {
            try {
                doc.setGState(new (doc as any).GState({opacity: 0.15}));
                doc.addImage(template.watermark_image, 'PNG', 35, 70, 140, 140, undefined, 'FAST');
                doc.setGState(new (doc as any).GState({opacity: 1}));
            } catch (e) {}
        }
    };

    studentsData.forEach((sData, index) => {
        const { student, grades, attendance, rank, totalStudents, validGrades, termAverages, termsArray, average: annualAvg } = sData;
        let validatedGrades = isAnnual ? validGrades : (ignoreValidation ? grades : grades.filter((g: any) => g.validated === 1));

        let termSequences: any[] = [];
        try {
            if (school.term_structure) {
                const ts = JSON.parse(school.term_structure);
                const currentTerm = ts.find((t: any) => t.term_id?.toString() === term?.toString());
                if (currentTerm && currentTerm.sequences) {
                    termSequences = currentTerm.sequences;
                }
            }
        } catch(e) {}

        if (!isAnnual) {
            const subjectGradesMap: Record<number, any> = {};
            validatedGrades.forEach((g: any) => {
                const subId = g.subject_id;
                if (!subjectGradesMap[subId]) {
                    subjectGradesMap[subId] = {
                        ...g,
                        scores: [],
                        letter_scores: []
                    };
                }
                if (g.score !== null && g.score !== undefined) {
                    subjectGradesMap[subId].scores.push({ score: g.score, month: g.month });
                }
                if (g.letter_score) {
                    subjectGradesMap[subId].letter_scores.push(g.letter_score);
                }
            });

            validatedGrades = Object.values(subjectGradesMap).map((sg: any) => {
                let totalWeight = 0;
                let weightedSum = 0;
                sg.scores.forEach((sObj: any) => {
                    const seqConfig = termSequences.find(s => s.id?.toString() === sObj.month?.toString());
                    const weight = seqConfig && seqConfig.weight !== undefined ? Number(seqConfig.weight) : 1;
                    weightedSum += sObj.score * weight;
                    totalWeight += weight;
                });

                const avgScore = totalWeight > 0 ? (weightedSum / totalWeight) : 0;
                const letterScore = sg.letter_scores.length > 0 ? sg.letter_scores[sg.letter_scores.length - 1] : sg.letter_score;
                return {
                    ...sg,
                    score: avgScore,
                    letter_score: letterScore
                };
            });
        }

        if (index > 0) {
            doc.addPage();
        }
        addWatermarkBulk();

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
            drawText(`${classObj.name}${classObj.code ? ' (' + classObj.code + ')' : ''}`, 'class', 80, 94, 9);
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

            let subjectsMap: Record<string, any> = {};
            if (isAnnual && validatedGrades) {
                validatedGrades.forEach((g: any) => {
                    if (!subjectsMap[g.subjectName]) {
                        subjectsMap[g.subjectName] = { 
                            name: g.subjectName, 
                            coef: g.coefficient, 
                            terms: {}, 
                            totalScore: 0, 
                            count: 0 
                        };
                    }
                    subjectsMap[g.subjectName].terms[g.term] = g.score;
                    subjectsMap[g.subjectName].totalScore += g.score;
                    subjectsMap[g.subjectName].count++;
                });
            }

            const tableHeaders = isAnnual 
                ? [[isEn ? 'SUBJECT' : 'MATIÈRE', ...(termsArray || []).map((t: number) => `T${t}`), 'MOY/20', 'COEF', 'TOTAL', isEn ? 'APPRECIATION' : 'APPRÉCIATION']]
                : (isNursery
                    ? [[isEn ? 'SUBJECT / DOMAIN' : 'MATIÈRE / DOMAINE (SUBJECT / DOMAIN)', isEn ? 'RATING' : 'ÉVALUATION (RATING)', 'OBSERVATION']]
                    : [[isEn ? 'SUBJECT' : 'MATIÈRE (SUBJECT)', 'NOTE/20', 'COEF', 'TOTAL', isEn ? 'APPRECIATION' : 'APPRÉCIATION']]);

            const tableBody = isAnnual
                ? Object.values(subjectsMap).map((sub: any) => {
                    const avg = sub.totalScore / sub.count;
                    const termsScores = (termsArray || []).map((t: number) => sub.terms[t] !== undefined ? sub.terms[t].toFixed(2) : '-');
                    return [sub.name, ...termsScores, avg.toFixed(2), sub.coef, (avg * sub.coef).toFixed(2), getPrimaryAppreciation(avg)];
                })
                : validatedGrades.map((g: any) => {
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
            let bulkStartY = 20;
            if (template?.header_image) {
                try {
                    doc.addImage(template.header_image, 'JPEG', 0, 0, 210, 45, undefined, 'FAST');
                    bulkStartY = 50;
                } catch(e) {}
            }

            if (!template?.header_image) {
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
            }

            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            let evaluationPeriods: any[] = [];
            try {
                if (school.evaluation_periods) evaluationPeriods = JSON.parse(school.evaluation_periods);
            } catch (e) {}
            
            let termTitle = isAnnual ? (isEn ? 'ANNUAL REPORT CARD' : 'BULLETIN ANNUEL') : '';
            if (!isAnnual) {
                if (typeof term === 'string') {
                    termTitle = term.toUpperCase();
                } else {
                    const found = evaluationPeriods.find((ep: any) => ep.id === term);
                    termTitle = found ? found.name.toUpperCase() : (isEn ? `TERM ${term}` : `PÉRIODE ${term}`);
                }
            }
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
            doc.text(`${classObj.name}${classObj.code ? ' (' + classObj.code + ')' : ''}`, 80, 94);

            doc.setFont('helvetica', 'bold');
            doc.text(isEn ? 'SCHOOL YEAR:' : 'ANNÉE SCOLAIRE:', 120, 80);
            doc.setFont('helvetica', 'normal');
            doc.text(`${new Date().getFullYear() - 1}/${new Date().getFullYear()}`, 175, 80, { align: 'right' });

            doc.setFont('helvetica', 'bold');
            doc.text('SECTION:', 120, 87);
            doc.setFont('helvetica', 'normal');
            doc.text(classObj.section, 175, 87, { align: 'right' });

            let subjectsMap: Record<string, any> = {};
            if (isAnnual && validatedGrades) {
                validatedGrades.forEach((g: any) => {
                    if (!subjectsMap[g.subjectName]) {
                        subjectsMap[g.subjectName] = { 
                            name: g.subjectName, 
                            coef: g.coefficient, 
                            terms: {}, 
                            totalScore: 0, 
                            count: 0 
                        };
                    }
                    subjectsMap[g.subjectName].terms[g.term] = g.score;
                    subjectsMap[g.subjectName].totalScore += g.score;
                    subjectsMap[g.subjectName].count++;
                });
            }

            const tableHeaders = isAnnual 
                ? [[isEn ? 'SUBJECT' : 'MATIÈRE', ...(termsArray || []).map((t: number) => `T${t}`), 'MOY/20', 'COEF', 'TOTAL', isEn ? 'APPRECIATION' : 'APPRÉCIATION']]
                : (isNursery
                    ? [[isEn ? 'SUBJECT / DOMAIN' : 'MATIÈRE / DOMAINE (SUBJECT / DOMAIN)', isEn ? 'RATING' : 'ÉVALUATION (RATING)', 'OBSERVATION']]
                    : [[isEn ? 'SUBJECT' : 'MATIÈRE (SUBJECT)', 'NOTE/20', 'COEF', 'TOTAL', isEn ? 'APPRECIATION' : 'APPRÉCIATION']]);

            const tableBody = isAnnual
                ? Object.values(subjectsMap).map((sub: any) => {
                    const avg = sub.totalScore / sub.count;
                    const termsScores = (termsArray || []).map((t: number) => sub.terms[t] !== undefined ? sub.terms[t].toFixed(2) : '-');
                    return [sub.name, ...termsScores, avg.toFixed(2), sub.coef, (avg * sub.coef).toFixed(2), getPrimaryAppreciation(avg)];
                })
                : validatedGrades.map((g: any) => {
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
                margin: { bottom: template?.footer_image ? 55 : 40 },
                columnStyles: {
                    0: { cellWidth: 70 },
                    1: { halign: 'center' },
                    2: { halign: 'center' },
                    3: { halign: 'center' },
                    4: { cellWidth: 40 }
                }
            });

            let finalY = (doc as any).lastAutoTable.finalY + 10;
            const bulkOverflow = template?.footer_image ? 200 : 230;
            if (finalY > bulkOverflow) {
                doc.addPage();
                addWatermarkBulk();
                finalY = 20;
            }
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

            if (isAnnual && annualAvg !== null && annualAvg !== undefined) {
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(isEn ? `ANNUAL AVG: ${annualAvg.toFixed(2)} / 20` : `MOY. ANNUELLE: ${annualAvg.toFixed(2)} / 20`, 120, finalY + 16);
                doc.text(isEn ? `RANK: ${rank || '--'} / ${totalStudents || '--'}` : `RANG: ${rank || '--'} / ${totalStudents || '--'}`, 120, finalY + 23);
                const decision = annualAvg >= 10 
                    ? (isEn ? 'PROMOTED TO NEXT CLASS' : 'ADMIS(E) EN CLASSE SUPÉRIEURE') 
                    : (isEn ? 'REPEATS THE CLASS' : 'REDOUBLE LA CLASSE');
                doc.text(isEn ? `DECISION: ${decision}` : `DÉCISION: ${decision}`, 120, finalY + 30);
            } else if (!isNursery && validatedGrades.length > 0) {
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

            if (template?.footer_image) {
                try { doc.addImage(template.footer_image, 'JPEG', 0, 255, 210, 42, undefined, 'FAST'); } catch(e) {}
            } else {
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
            }

            doc.setFontSize(7);
            doc.setTextColor(120, 120, 120);
            doc.setFont('helvetica', 'italic');
            doc.text(`${i18n.t('generated_by_footer')} ${new Date().toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} - ${i18n.t('official_doc_footer')}`, 105, 285, { align: 'center' });
        }
    });

    doc.save(`Bulletins_Classe_${classObj.name.replace(/[\s/]+/g, '_')}_T${term}.pdf`);
};

export const generateAttendanceReport = (data: { records: any[], className: string, periodText: string, school?: any }) => {
    const { records, className, periodText, school } = data;
    const doc = new jsPDF();
    const isEn = i18n.language.startsWith('en');
    const primary = school?.primary_color ? hexToRgb(school.primary_color) : [30, 41, 59];
    const secondary = school?.secondary_color ? hexToRgb(school.secondary_color) : [245, 158, 11];

    // Header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(school?.header_french || "MINISTÈRE DE L'ÉDUCATION DE BASE\nRÉPUBLIQUE DU CAMEROUN", 14, 15);
    doc.text(school?.header_english || "MINISTRY OF BASIC EDUCATION\nREPUBLIC OF CAMEROON", 196, 15, { align: 'right' });

    doc.setFontSize(16);
    doc.setTextColor(secondary[0], secondary[1], secondary[2]);
    doc.text(school?.name?.toUpperCase() || "COMPLEXE SCOLAIRE BILINGUE ECO-MANAGE", 105, 30, { align: 'center' });

    // Title
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(14, 40, 182, 10, 'F');
    const titleText = isEn ? `ATTENDANCE LIST - CLASS ${className}` : `LISTE DE PRÉSENCE - CLASSE ${className}`;
    doc.text(titleText, 105, 47, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text(periodText.toUpperCase(), 105, 56, { align: 'center' });

    // Aggregate records by student ID
    const studentStats: Record<number, { firstName: string, lastName: string, matricule: string, totalAbsenceHours: number }> = {};
    records.forEach(r => {
        if (!studentStats[r.student_id]) {
            studentStats[r.student_id] = {
                firstName: r.first_name,
                lastName: r.last_name,
                matricule: r.matricule,
                totalAbsenceHours: 0
            };
        }
        studentStats[r.student_id].totalAbsenceHours += (r.hours_absent || 0);
    });

    const tableData = Object.values(studentStats)
        .sort((a, b) => a.lastName.localeCompare(b.lastName))
        .map(s => [
            s.matricule,
            `${s.lastName.toUpperCase()} ${s.firstName}`,
            s.totalAbsenceHours > 0 ? `${s.totalAbsenceHours} h` : (isEn ? 'Present' : 'Présent(e)')
        ]);

    (doc as any).autoTable({
        startY: 65,
        head: [[
            isEn ? 'MATRICULE' : 'MATRICULE',
            isEn ? 'STUDENT NAME' : 'NOMS & PRÉNOMS',
            isEn ? 'ABSENCE (HOURS)' : 'ABSENCE (HEURES)'
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: primary,
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        styles: {
            font: 'helvetica',
            fontSize: 10,
            cellPadding: 5
        },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 100 },
            2: { cellWidth: 42, halign: 'center' }
        }
    });

    const finalY = (doc as any).lastAutoTable.finalY || 100;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    
    doc.text(school?.bulletin_sig_left || (isEn ? 'The Teacher' : "L'Enseignant(e)"), 30, finalY + 20);
    doc.text(school?.bulletin_sig_right || (isEn ? 'Administration' : "L'Administration"), 150, finalY + 20);

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`${i18n.t('generated_by_footer')} ${new Date().toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, 105, 285, { align: 'center' });

    doc.save(`Presences_${className.replace(/[\s/]+/g, '_')}_${new Date().getTime()}.pdf`);
};

export const generateParentsListReport = async (parents: any[], schoolInfo: any, title: string) => {
    const doc = new jsPDF('p', 'pt', 'a4');
    let yPos = 40;
    const BRAND_COLOR: [number, number, number] = schoolInfo?.primary_color ? hexToRgb(schoolInfo.primary_color) : [245, 158, 11];
    const TEXT_COLOR: [number, number, number] = [51, 65, 85];
    const LIGHT_BG: [number, number, number] = [248, 250, 252];

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(BRAND_COLOR[0], BRAND_COLOR[1], BRAND_COLOR[2]);
    doc.text(schoolInfo?.name || "ECO-MANAGE", 40, yPos);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(TEXT_COLOR[0], TEXT_COLOR[1], TEXT_COLOR[2]);
    yPos += 15;
    if (schoolInfo?.address) {
        doc.text(schoolInfo.address, 40, yPos);
        yPos += 15;
    }
    if (schoolInfo?.phone) {
        doc.text("Tel: " + schoolInfo.phone, 40, yPos);
    }

    yPos += 40;

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(2, 6, 23);
    doc.text(title, doc.internal.pageSize.getWidth() / 2, yPos, { align: "center" });
    yPos += 30;

    // Table
    const tableColumn = ["Nom du Parent", "Contact", "Enfant(s) rattaché(s)", "Classe", "Cycle / Section"];
    const tableRows: any[] = [];

    parents.forEach(p => {
        tableRows.push([
            p.parent_name || "Non renseigné",
            p.parent_contact || "N/A",
            `${p.first_name} ${p.last_name}`,
            p.class_name,
            `${p.cycle} / ${p.section}`
        ]);
    });

    (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: yPos,
        theme: "grid",
        headStyles: {
            fillColor: BRAND_COLOR,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            halign: "center"
        },
        bodyStyles: {
            textColor: TEXT_COLOR,
            fontSize: 9
        },
        alternateRowStyles: {
            fillColor: LIGHT_BG
        },
        margin: { top: 40, right: 40, bottom: 40, left: 40 }
    });

    const safeTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    doc.save(`repertoire_parents_${safeTitle}.pdf`);
};

export const generateSchedulePdf = (data: any) => {
    const { school, title, subtitle, columns, rows } = data;
    const doc = new jsPDF('landscape');
    
    let yPos = 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(school?.name?.toUpperCase() || 'ECO-MANAGE', 148, yPos, { align: 'center' });
    yPos += 10;
    doc.setFontSize(12);
    doc.text(title.toUpperCase(), 148, yPos, { align: 'center' });
    yPos += 10;
    
    if (subtitle) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(subtitle.toUpperCase(), 148, yPos, { align: 'center' });
        yPos += 10;
    } else {
        yPos += 5;
    }

    const schedulePrimary = school?.primary_color ? hexToRgb(school.primary_color) : [30, 41, 59];

    (doc as any).autoTable({
        head: [columns],
        body: rows,
        startY: yPos,
        theme: 'grid',
        headStyles: {
            fillColor: schedulePrimary,
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            halign: 'center'
        },
        bodyStyles: {
            textColor: [51, 65, 85],
            fontSize: 9,
            halign: 'center',
            valign: 'middle'
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        },
        styles: {
            cellPadding: 4,
            lineWidth: 0.1,
            lineColor: [203, 213, 225]
        }
    });

    const safeTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    doc.save(`${safeTitle}.pdf`);
};

export const generateExamSchedulePdf = (data: any) => {
    const { school, title, columns, rows } = data;
    const doc = new jsPDF();
    const examPrimary = school?.primary_color ? hexToRgb(school.primary_color) : [30, 41, 59];

    let yPos = 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(school?.name?.toUpperCase() || 'ECO-MANAGE', 105, yPos, { align: 'center' });
    yPos += 10;
    doc.setFontSize(12);
    doc.text(title.toUpperCase(), 105, yPos, { align: 'center' });
    yPos += 15;

    (doc as any).autoTable({
        head: [columns],
        body: rows,
        startY: yPos,
        theme: 'grid',
        headStyles: {
            fillColor: examPrimary,
            textColor: [255, 255, 255],
            fontStyle: 'bold'
        },
        bodyStyles: {
            textColor: [51, 65, 85],
            fontSize: 10
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        }
    });

    const safeTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    doc.save(`${safeTitle}.pdf`);
};

export const generateStudentsListReport = (data: { students: any[], classes: any[], school?: any, title?: string }) => {
    const { students, classes, school, title } = data;
    const doc = new jsPDF();
    const isEn = i18n.language?.startsWith('en') ?? false;
    const primary = school?.primary_color ? hexToRgb(school.primary_color) : [30, 41, 59];
    
    let yPos = 20;
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(school?.name?.toUpperCase() || 'ECO-MANAGE', 105, yPos, { align: 'center' });
    yPos += 10;
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    const reportTitle = title || (isEn ? "STUDENTS LIST" : "LISTE DES ÉLÈVES");
    doc.text(reportTitle.toUpperCase(), 105, yPos, { align: 'center' });
    yPos += 15;

    const headers = isEn 
        ? [['REG. NUMBER', 'FULL NAME', 'GENDER', 'CLASS', 'SECTION']]
        : [['MATRICULE', 'NOM ET PRÉNOM', 'GENRE', 'CLASSE', 'SECTION']];

    const rows = students.map(s => {
        const classObj = classes.find(c => c.id === s.class_id);
        return [
            s.matricule,
            `${s.last_name} ${s.first_name}`.trim(),
            s.gender,
            classObj ? classObj.name : 'N/A',
            s.section
        ];
    });

    (doc as any).autoTable({
        head: headers,
        body: rows,
        startY: yPos,
        theme: 'striped',
        headStyles: {
            fillColor: primary,
            textColor: 255,
            fontStyle: 'bold'
        },
        bodyStyles: {
            textColor: [51, 65, 85],
            fontSize: 9
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]
        }
    });

    const safeTitle = reportTitle.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, "_").toLowerCase().replace(/_+/g, "_").replace(/_$/, "");
    doc.save(`${safeTitle}.pdf`);
};
