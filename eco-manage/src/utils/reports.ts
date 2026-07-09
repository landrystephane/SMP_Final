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
    const { student, classObj, school, template, grades, attendance, term, rank, totalStudents, classAverage, firstAverage, lastAverage } = data;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const isNursery = classObj.level === 'MATERNELLE';
    const pageW = 210;
    const pageH = 297;
    const mL = 10;
    const mR = 10;
    const contentW = pageW - mL - mR; // 190mm

    const primaryColor = template?.primary_color || school?.primary_color;
    const primary: [number, number, number] = primaryColor ? hexToRgb(primaryColor) : [30, 41, 59];
    const isEn = i18n.language.startsWith('en');

    // --- Grade aggregation ---
    let validatedGrades: any[] = data.ignoreValidation ? grades : grades.filter((g: any) => g.validated === 1);
    let termSequences: any[] = [];
    try {
        if (school?.term_structure) {
            const ts = JSON.parse(school.term_structure);
            const ct = ts.find((t: any) => t.term_id?.toString() === term?.toString());
            if (ct?.sequences) termSequences = ct.sequences;
        }
    } catch (e) {}

    const subjectGradesMap: Record<number, any> = {};
    validatedGrades.forEach((g: any) => {
        const sid = g.subject_id;
        if (!subjectGradesMap[sid]) subjectGradesMap[sid] = { ...g, scores: [], letter_scores: [] };
        if (g.score != null) subjectGradesMap[sid].scores.push({ score: g.score, month: g.month });
        if (g.letter_score) subjectGradesMap[sid].letter_scores.push(g.letter_score);
    });
    validatedGrades = Object.values(subjectGradesMap).map((sg: any) => {
        let tw = 0, ws = 0;
        sg.scores.forEach((s: any) => {
            const seq = termSequences.find((q: any) => q.id?.toString() === s.month?.toString());
            const w = seq?.weight !== undefined ? Number(seq.weight) : 1;
            ws += s.score * w; tw += w;
        });
        return { ...sg, score: tw > 0 ? ws / tw : 0, letter_score: sg.letter_scores[sg.letter_scores.length - 1] ?? sg.letter_score };
    });

    // --- Watermark ---
    if (template?.watermark_image) {
        try {
            doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
            doc.addImage(template.watermark_image, 'PNG', 35, 80, 140, 140, undefined, 'FAST');
            doc.setGState(new (doc as any).GState({ opacity: 1 }));
        } catch (e) {}
    }

    let curY = 5;

    // --- Header ---
    if (template?.header_image) {
        try {
            doc.addImage(template.header_image, 'JPEG', 0, 0, 210, 38, undefined, 'FAST');
            curY = 41;
        } catch (e) {}
    } else {
        doc.setFontSize(6.5); doc.setTextColor(0, 0, 0);
        const headerTopY = curY;

        // Left: French state info only
        doc.setFont('helvetica', 'bold');
        doc.text('RÉPUBLIQUE DU CAMEROUN', mL, headerTopY + 4);
        doc.setFont('helvetica', 'italic');
        doc.text('Paix - Travail - Patrie', mL, headerTopY + 8);
        doc.setFont('helvetica', 'normal');
        doc.text("MINISTÈRE DE L'ÉDUCATION DE BASE", mL, headerTopY + 12);

        // Right: English state info only
        doc.setFont('helvetica', 'bold');
        doc.text('REPUBLIC OF CAMEROON', pageW - mR, headerTopY + 4, { align: 'right' });
        doc.setFont('helvetica', 'italic');
        doc.text('Peace - Work - Fatherland', pageW - mR, headerTopY + 8, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text('MINISTRY OF BASIC EDUCATION', pageW - mR, headerTopY + 12, { align: 'right' });

        // Center: Logo (bigger — 30x30)
        if (school?.logo) {
            try {
                const ext = school.logo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                doc.addImage(school.logo, ext, pageW / 2 - 15, headerTopY, 30, 30, undefined, 'FAST');
            } catch (e) {}
        }
        curY = headerTopY + 32;

        // School name + address + motto centered below logo
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
        doc.text((school?.name || '').toUpperCase(), pageW / 2, curY, { align: 'center' });
        curY += 4;
        if (school?.address) {
            doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
            doc.text(school.address, pageW / 2, curY, { align: 'center' });
            curY += 4;
        }
        doc.setFontSize(7); doc.setFont('helvetica', 'italic');
        doc.text(school?.motto || 'Paix - Travail - Patrie', pageW / 2, curY, { align: 'center' });
        curY += 5;
    }

    // Separator line
    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.4);
    doc.line(mL, curY, pageW - mR, curY);
    curY += 3;

    // --- Title: BULLETIN TRIMESTRIEL N°X  [month right-aligned same line] ---
    const termNum = typeof term === 'number' ? term : (parseInt(String(term).split('_')[0]) || 1);
    doc.setFontSize(11); doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(`BULLETIN TRIMESTRIEL N°${termNum}`, pageW / 2, curY + 5, { align: 'center' });

    const monthYear = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(monthYear.charAt(0).toUpperCase() + monthYear.slice(1), pageW - mR, curY + 5, { align: 'right' });
    doc.setTextColor(0, 0, 0);
    curY += 10;

    // --- Student Info Grid (3 rows, bordered) ---
    const rowH = 7;
    const gridTotalH = rowH * 3;
    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
    doc.rect(mL, curY, contentW, gridTotalH);
    doc.line(mL, curY + rowH, pageW - mR, curY + rowH);
    doc.line(mL, curY + 2 * rowH, pageW - mR, curY + 2 * rowH);

    const drawInfoCell = (x: number, y: number, w: number, label: string, value: string, hasBorderRight: boolean) => {
        if (hasBorderRight) doc.line(x + w, y, x + w, y + rowH);
        doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
        doc.text(label, x + 1.5, y + 4.5);
        const lw = doc.getTextWidth(label);
        doc.setFont('helvetica', 'normal');
        doc.text(value || '--', x + 1.5 + lw, y + 4.5);
    };

    const syear = `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`;
    const fullName = `${student.last_name || ''} ${student.first_name || ''}`.trim();
    const dob = student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('fr-FR') : '--';
    const sex = student.gender === 'M' ? 'Masculin' : student.gender === 'F' ? 'Féminin' : '--';

    // Row 1: Année Scolaire | Nom et Prénom
    const r1c1 = 55;
    drawInfoCell(mL, curY, r1c1, 'Année Scolaire : ', syear, true);
    drawInfoCell(mL + r1c1, curY, contentW - r1c1, 'Nom et Prénom : ', fullName, false);

    // Row 2: Effectif | Date de Naissance | Sexe
    const r2c1 = 36, r2c2 = 65;
    drawInfoCell(mL, curY + rowH, r2c1, 'Effectif : ', totalStudents?.toString() || '--', true);
    drawInfoCell(mL + r2c1, curY + rowH, r2c2, 'Date de Naissance : ', dob, true);
    drawInfoCell(mL + r2c1 + r2c2, curY + rowH, contentW - r2c1 - r2c2, 'Sexe : ', sex, false);

    // Row 3: Matricule | Classe | Enseignant(e)
    const r3c1 = 50, r3c2 = 55;
    drawInfoCell(mL, curY + 2 * rowH, r3c1, 'Matricule : ', student.matricule || '--', true);
    drawInfoCell(mL + r3c1, curY + 2 * rowH, r3c2, 'Classe : ', classObj.name || '--', true);
    const teacherGender = classObj.teacher_gender;
    const isEnSection = classObj.section === 'ANGLOPHONE';
    const teacherPrefix = teacherGender
        ? (isEnSection ? (teacherGender === 'M' ? 'Mr ' : 'Mrs ') : (teacherGender === 'M' ? 'M. ' : 'Mme '))
        : (isEnSection ? '' : '');
    const teacherDisplay = classObj.teacher_name ? `${teacherPrefix}${classObj.teacher_name}` : '--';
    drawInfoCell(mL + r3c1 + r3c2, curY + 2 * rowH, contentW - r3c1 - r3c2, isEnSection ? 'Teacher : ' : 'Enseignant(e) : ', teacherDisplay, false);

    curY += gridTotalH + 3;

    // --- Grades Table ---
    const groupedGrades: Record<string, any[]> = {};
    validatedGrades.forEach((g: any) => {
        const domain = g.domain || (isEn ? 'GENERAL SUBJECTS' : 'MATIÈRES GÉNÉRALES');
        if (!groupedGrades[domain]) groupedGrades[domain] = [];
        groupedGrades[domain].push(g);
    });

    // Auto-scale font & padding based on row count
    const totalRows = validatedGrades.length + 3 + 1; // data + 3 summary + 1 header
    let fs = 8, cp = { top: 2, right: 2, bottom: 2, left: 2 };
    if (totalRows > 16) { fs = 7.5; cp = { top: 1.5, right: 2, bottom: 1.5, left: 2 }; }
    if (totalRows > 22) { fs = 7;   cp = { top: 1.2, right: 1.5, bottom: 1.2, left: 1.5 }; }
    if (totalRows > 28) { fs = 6.5; cp = { top: 0.8, right: 1, bottom: 0.8, left: 1 }; }
    if (totalRows > 36) { fs = 6;   cp = { top: 0.5, right: 1, bottom: 0.5, left: 1 }; }
    if (totalRows > 44) { fs = 5.5; cp = { top: 0.3, right: 0.8, bottom: 0.3, left: 0.8 }; }

    let grandTP = 0, grandTC = 0, grandMax = 0;
    const tableBody: any[] = [];

    if (validatedGrades.length === 0) {
        tableBody.push([{
            content: 'AUCUNE NOTE VALIDÉE (MODE BROUILLON)',
            colSpan: isNursery ? 6 : 7,
            styles: { halign: 'center', textColor: [200, 50, 50], fontStyle: 'bold' }
        }]);
    } else {
        Object.entries(groupedGrades).forEach(([domain, subjects]) => {
            let domainTP = 0, domainTC = 0, domainMax = 0;
            subjects.forEach((g: any, idx: number) => {
                const row: any[] = [];
                if (idx === 0) {
                    row.push({
                        content: domain.toUpperCase(),
                        rowSpan: subjects.length,
                        styles: { fontStyle: 'bold', halign: 'center', valign: 'middle', fillColor: [235, 242, 252], textColor: primary }
                    });
                }
                if (isNursery) {
                    const app = getNurseryAppreciation(g.score);
                    row.push(g.subjectName || g.name || '--');
                    row.push({ content: g.letter_score || app.label || '--', styles: { halign: 'center' } });
                    row.push({ content: '', styles: { halign: 'center' } });
                    row.push({ content: '', styles: { halign: 'center' } });
                    row.push('');
                } else {
                    const score = Number(g.score) || 0;
                    const coef  = Number(g.coefficient) || 1;
                    const total = score * coef;
                    grandTP += total; grandTC += coef; grandMax += 20 * coef;
                    domainTP += total; domainTC += coef; domainMax += 20 * coef;
                    row.push(g.subjectName || g.name || '--');
                    row.push({ content: score.toFixed(2), styles: { halign: 'center' } });
                    row.push({ content: coef.toString(), styles: { halign: 'center' } });
                    row.push({ content: total.toFixed(2), styles: { halign: 'center' } });
                    row.push({ content: getPrimaryAppreciation(score), styles: { halign: 'center', fontSize: fs - 0.5 } });
                    row.push('');
                }
                tableBody.push(row);
            });
            // Sous-total par domaine (primaire uniquement)
            if (!isNursery && subjects.length > 1) {
                const subFill = [220, 230, 245];
                tableBody.push([
                    { content: 'Sous-total', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: subFill, fontSize: fs - 0.5 } },
                    { content: '', styles: { fillColor: subFill } },
                    { content: domainTC.toString(), styles: { halign: 'center', fontStyle: 'bold', fillColor: subFill, fontSize: fs - 0.5 } },
                    { content: `${domainTP.toFixed(2)} / ${domainMax}`, styles: { halign: 'center', fontStyle: 'bold', fillColor: subFill, fontSize: fs - 0.5 } },
                    { content: '', styles: { fillColor: subFill } },
                    { content: '', styles: { fillColor: subFill } }
                ]);
            }
        });

        if (!isNursery) {
            const avg = grandTC > 0 ? grandTP / grandTC : 0;
            const summaryFill = [228, 240, 255];
            tableBody.push([
                { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: summaryFill } },
                { content: '', styles: { fillColor: summaryFill } },
                { content: grandTC.toString(), styles: { halign: 'center', fontStyle: 'bold', fillColor: summaryFill } },
                { content: `${grandTP.toFixed(2)} / ${grandMax}`, styles: { halign: 'center', fontStyle: 'bold', fillColor: summaryFill } },
                { content: '', styles: { fillColor: summaryFill } },
                { content: '', styles: { fillColor: summaryFill } }
            ]);
            tableBody.push([
                { content: 'MOYENNE', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: summaryFill } },
                { content: avg.toFixed(2), styles: { halign: 'center', fontStyle: 'bold', fillColor: summaryFill } },
                { content: '', styles: { fillColor: summaryFill } },
                { content: '/ 20', styles: { halign: 'center', fillColor: summaryFill } },
                { content: isEn ? getPrimaryAppreciation(avg) : '', styles: { halign: 'center', fontStyle: 'bold', fillColor: summaryFill } },
                { content: '', styles: { fillColor: summaryFill } }
            ]);
            tableBody.push([
                { content: 'RANG', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: summaryFill } },
                { content: `${rank || '--'} / ${totalStudents || '--'}`, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: summaryFill } },
                { content: '', styles: { fillColor: summaryFill } },
                { content: '', styles: { fillColor: summaryFill } },
                { content: '', styles: { fillColor: summaryFill } }
            ]);
        }
    }

    // Column widths — primary: 7 cols total 190mm, nursery: 6 cols total 190mm
    const primaryCols = { 0: { cellWidth: 22 }, 1: { cellWidth: 50 }, 2: { halign: 'center', cellWidth: 18 }, 3: { halign: 'center', cellWidth: 12 }, 4: { halign: 'center', cellWidth: 18 }, 5: { halign: 'center', cellWidth: 28 }, 6: { cellWidth: 42 } };
    const nurseryCols = { 0: { cellWidth: 25 }, 1: { cellWidth: 60 }, 2: { halign: 'center', cellWidth: 22 }, 3: { halign: 'center', cellWidth: 15 }, 4: { halign: 'center', cellWidth: 28 }, 5: { cellWidth: 40 } };

    (doc as any).autoTable({
        startY: curY,
        head: [isNursery
            ? ['DOMAINE', 'ACTIVITÉS', 'ÉVALUATION', 'TOTAL', 'APPRÉCIATION', 'OBSERVATION']
            : ['DOMAINE', 'ACTIVITÉS / MATIÈRE', 'NOTE/20', 'COEF', 'TOTAL', 'APPRÉCIATION', 'OBSERVATION']],
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: primary, textColor: [255, 255, 255], fontSize: fs, fontStyle: 'bold', cellPadding: cp },
        bodyStyles: { fontSize: fs, cellPadding: cp },
        columnStyles: isNursery ? nurseryCols : primaryCols,
        margin: { left: mL, right: mR },
        pageBreak: 'avoid'
    });

    let finalY = (doc as any).lastAutoTable.finalY + 3;

    // --- Stats row (5 cells) ---
    const totalAbs = (attendance || []).reduce((a: number, c: any) => a + (c.hours_absent || 0), 0);
    const statsW = contentW / 5;
    const statsH = 11;
    const calcAvg = grandTC > 0 ? grandTP / grandTC : 0;
    const decision = calcAvg >= 10 ? 'ADMIS(E)' : (calcAvg > 0 ? 'AVERTISSEMENT' : '--');

    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
    doc.rect(mL, finalY, contentW, statsH);
    [
        { label: 'Moy. du premier',   value: firstAverage  !== undefined ? (firstAverage  as number).toFixed(2) : '--' },
        { label: 'Moy. de la classe', value: classAverage  !== undefined ? (classAverage  as number).toFixed(2) : '--' },
        { label: 'Décision',          value: validatedGrades.length > 0 ? decision : '--' },
        { label: 'Effectif',          value: totalStudents?.toString() || '--' },
        { label: 'Moy. du dernier',   value: lastAverage   !== undefined ? (lastAverage   as number).toFixed(2) : '--' }
    ].forEach(({ label, value }, i) => {
        if (i > 0) doc.line(mL + i * statsW, finalY, mL + i * statsW, finalY + statsH);
        doc.setFontSize(5.8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80);
        doc.text(label, mL + i * statsW + statsW / 2, finalY + 3.5, { align: 'center' });
        doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
        doc.text(value, mL + i * statsW + statsW / 2, finalY + 8.5, { align: 'center' });
    });
    finalY += statsH + 3;

    // Absences note (compact, inline)
    doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
    doc.text(`Absences : ${totalAbs} h   —   Conduite : ${calculateAttendanceObservations(totalAbs)}`, mL, finalY + 4);
    finalY += 8;

    // --- Observation globale ---
    const obsH = 18;
    doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
    doc.rect(mL, finalY, contentW, obsH);
    doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
    doc.text(isEn ? 'GENERAL OBSERVATION :' : 'OBSERVATION GÉNÉRALE :', mL + 2, finalY + 4);
    doc.line(mL + 2, finalY + 7, pageW - mR - 2, finalY + 7);
    doc.line(mL + 2, finalY + 12, pageW - mR - 2, finalY + 12);
    finalY += obsH + 3;

    // --- Signatures (3 columns, bordered) ---
    if (template?.footer_image) {
        try {
            doc.addImage(template.footer_image, 'JPEG', 0, pageH - 45, 210, 45, undefined, 'FAST');
        } catch (e) {}
    } else {
        const sigH = 13;
        const sig3W = contentW / 3;
        doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
        doc.rect(mL, finalY, contentW, sigH);
        doc.line(mL + sig3W, finalY, mL + sig3W, finalY + sigH);
        doc.line(mL + 2 * sig3W, finalY, mL + 2 * sig3W, finalY + sigH);
        [
            school?.bulletin_sig_middle || 'VISA DU PARENT',
            school?.bulletin_sig_left   || "VISA DE L'ENSEIGNANT(E)",
            school?.bulletin_sig_right  || 'VISA DU DIRECTEUR'
        ].forEach((label, i) => {
            doc.setFontSize(7); doc.setFont('helvetica', 'bold');
            doc.setTextColor(primary[0], primary[1], primary[2]);
            doc.text(label, mL + i * sig3W + sig3W / 2, finalY + 4.5, { align: 'center' });
        });
        finalY += sigH + 3;

        // --- Appreciation legend (classes utilisant le système A/EC/NA) ---
        const usesLetterGrading = isNursery || validatedGrades.some((g: any) => g.letter_score);
        if (usesLetterGrading) {
            doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
            doc.text('APPRÉCIATIONS : ', mL, finalY + 4);
            doc.setFont('helvetica', 'normal');
            doc.text('A = Acquis     ECA = En cours d\'acquisition     NA = Non-Acquis', mL + doc.getTextWidth('APPRÉCIATIONS : '), finalY + 4);
        }
    }

    // --- System footer ---
    doc.setFontSize(5.5); doc.setTextColor(160, 160, 160); doc.setFont('helvetica', 'italic');
    doc.text(
        `Généré par ${school?.name || ''} le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`,
        pageW / 2, pageH - 3, { align: 'center' }
    );

    doc.save(`Bulletin_${student.matricule}_T${term}.pdf`);
};

export const generatePaymentReceipt = (payment: any, student: any, financials: any, school?: any) => {
    const doc = new jsPDF();
    const primary = school?.primary_color ? hexToRgb(school.primary_color) : [30, 41, 59];
    const isEn = i18n.language.startsWith('en');
    const safeNum = (num: number) => num.toLocaleString('en-US').replace(/,/g, ' ');

    const drawReceiptBlock = (baseY: number, copyLabel: string) => {
        if (school) {
            doc.setFontSize(6);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            doc.text('RÉPUBLIQUE DU CAMEROUN', 20, baseY + 4);
            doc.text('REPUBLIC OF CAMEROON', 190, baseY + 4, { align: 'right' });
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(5.5);
            doc.text('Paix - Travail - Patrie', 20, baseY + 7.5);
            doc.text('Peace - Work - Fatherland', 190, baseY + 7.5, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            doc.text(school?.header_french || "MINISTÈRE DE L'ÉDUCATION DE BASE", 20, baseY + 11);
            doc.text(school?.header_english || "MINISTRY OF BASIC EDUCATION", 190, baseY + 11, { align: 'right' });

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(primary[0], primary[1], primary[2]);
            doc.text(school.name.toUpperCase(), 105, baseY + 11, { align: 'center' });
            doc.setFontSize(7);
            doc.setTextColor(80, 80, 80);
            doc.setFont('helvetica', 'normal');
            const addrLine = `${school.address || ''}${school.bp ? ` - BP: ${school.bp}` : ''}`.trim();
            if (addrLine) doc.text(addrLine, 105, baseY + 16, { align: 'center' });
        }

        const titleY = baseY + (school ? 24 : 6);
        doc.setFontSize(5.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150, 150, 150);
        doc.text(copyLabel, 190, titleY - 4, { align: 'right' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primary[0], primary[1], primary[2]);
        doc.text(isEn ? 'PAYMENT RECEIPT' : 'REÇU DE PAIEMENT', 105, titleY, { align: 'center' });

        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(isEn ? `RECEIPT NO: ${payment.receipt_number}` : `REÇU N°: ${payment.receipt_number}`, 20, titleY + 6);
        const receiptDateStr = new Date(payment.payment_date).toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
        doc.text(`DATE: ${receiptDateStr}`, 190, titleY + 6, { align: 'right' });

        doc.setDrawColor(220, 220, 220);
        doc.line(20, titleY + 9, 190, titleY + 9);

        doc.setFont('helvetica', 'bold');
        doc.text(isEn ? 'STUDENT:' : 'ÉLÈVE:', 20, titleY + 15);
        doc.setFont('helvetica', 'normal');
        doc.text(`${student.last_name} ${student.first_name}`, 50, titleY + 15);
        doc.setFont('helvetica', 'bold');
        doc.text(isEn ? 'REG NO:' : 'MATRICULE:', 110, titleY + 15);
        doc.setFont('helvetica', 'normal');
        doc.text(student.matricule, 140, titleY + 15);

        if (payment.depositor_name) {
            doc.setFont('helvetica', 'bold');
            doc.text(isEn ? 'DEPOSITOR:' : 'DÉPOSANT:', 20, titleY + 20);
            doc.setFont('helvetica', 'normal');
            doc.text(payment.depositor_name, 50, titleY + 20);
        }

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primary[0], primary[1], primary[2]);
        doc.text(isEn ? `AMOUNT PAID: ${safeNum(payment.amount)} FCFA` : `MONTANT PAYÉ: ${safeNum(payment.amount)} FCFA`, 20, titleY + 28);
        const purposeLabel = payment.installment_name ? `${payment.payment_type.toUpperCase()} - ${payment.installment_name.toUpperCase()}` : payment.payment_type.toUpperCase();
        doc.setFontSize(8);
        doc.text(isEn ? `PURPOSE: ${purposeLabel}` : `MOTIF: ${purposeLabel}`, 110, titleY + 28);

        // Montants spécifiques à la tranche si disponibles, sinon totaux généraux
        const instDue: number | null = (payment as any).installment_due ?? null;
        const instPaidBefore: number = (payment as any).installment_paid_before ?? 0;
        const instPaidNow: number = payment.amount;
        const instRemaining: number = instDue !== null ? Math.max(0, instDue - instPaidBefore - instPaidNow) : financials.balance;

        const displayDue = instDue !== null ? instDue : financials.totalDue;
        const displayRemaining = instDue !== null ? instRemaining : financials.balance;

        doc.setFontSize(7.5);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(isEn ? `Due: ${safeNum(displayDue)}` : `Dû: ${safeNum(displayDue)}`, 20, titleY + 35);
        doc.text(isEn ? `Paid: ${safeNum(instPaidNow)}` : `Versé: ${safeNum(instPaidNow)}`, 80, titleY + 35);
        doc.text(isEn ? `Balance: ${safeNum(displayRemaining)} FCFA` : `Reste: ${safeNum(displayRemaining)} FCFA`, 140, titleY + 35);

        const installmentLabel = payment.installment_name ? ` - ${payment.installment_name.toUpperCase()}` : '';
        let paymentStatus: string;
        let statusColor: number[];
        if (financials.balance <= 0) {
            paymentStatus = isEn ? 'FULL PAYMENT' : 'RÈGLEMENT TOTAL';
            statusColor = [34, 197, 94];
        } else if (instDue !== null && instRemaining <= 0) {
            paymentStatus = isEn ? `BALANCE${installmentLabel}` : `SOLDE${installmentLabel}`;
            statusColor = [34, 197, 94];
        } else {
            paymentStatus = isEn ? `ADVANCE${installmentLabel}` : `AVANCE${installmentLabel}`;
            statusColor = [245, 158, 11];
        }
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.text(paymentStatus, 20, titleY + 43);

        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primary[0], primary[1], primary[2]);
        const bursarSigTitle = isEn ? "Bursar Signature" : "Signature de l'Économe";
        doc.text(school?.receipt_sig_title || bursarSigTitle, 190, titleY + 43, { align: 'right' });

        doc.setDrawColor(primary[0], primary[1], primary[2]);
        doc.setLineWidth(0.3);
        doc.rect(15, baseY - 4, 180, (titleY + 48) - (baseY - 4));
    };

    drawReceiptBlock(8, isEn ? 'PARENT COPY' : 'COPIE PARENT');

    doc.setDrawColor(150, 150, 150);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(15, 148, 195, 148);
    doc.setLineDashPattern([], 0);
    doc.setFontSize(6);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'italic');
    doc.text(isEn ? '✂ - - - - - - - - - - - - - - - - CUT HERE - - - - - - - - - - - - - - - - ✂' : '✂ - - - - - - - - - - - - - - - - COUPER ICI - - - - - - - - - - - - - - - - ✂', 105, 148.5, { align: 'center' });

    drawReceiptBlock(154, isEn ? 'SCHOOL COPY' : 'COPIE ÉCOLE');

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
    doc.text(`${isEn ? 'Generated by' : 'Généré par'} ${school?.name || ''} ${isEn ? 'on' : 'le'} ${new Date().toLocaleDateString(isEn ? 'en-US' : 'fr-FR')}`, 105, 285, { align: 'center' });

    doc.save(isEn ? `Registration_${student.matricule}.pdf` : `Fiche_${student.matricule}.pdf`);
};

export const generateAnnualAuditReport = (data: any) => {
    const { school, yearName, stats, payments, students, classes } = data;
    const doc = new jsPDF();
    const primary = school.primary_color ? hexToRgb(school.primary_color) : [30, 41, 59];
    const secondary = school.secondary_color ? hexToRgb(school.secondary_color) : [245, 158, 11];
    const isEn = i18n.language.startsWith('en');

    // PAGE 1: COVER PAGE
    const fmtCover = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

    // --- Bilingual Header ---
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('RÉPUBLIQUE DU CAMEROUN', 20, 12);
    doc.text('REPUBLIC OF CAMEROON', 190, 12, { align: 'right' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text('Paix - Travail - Patrie', 20, 16);
    doc.text('Peace - Work - Fatherland', 190, 16, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(school.header_french || "MINISTÈRE DE L'ÉDUCATION DE BASE", 20, 21);
    doc.text(school.header_english || "MINISTRY OF BASIC EDUCATION", 190, 21, { align: 'right' });

    // Thin separator under header
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(20, 25, 190, 25);

    // --- School Name ---
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(school.name.toUpperCase(), 105, 42, { align: 'center' });

    // --- School address, BP, phone ---
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const addressParts: string[] = [];
    if (school.address) addressParts.push(school.address);
    if (school.bp) addressParts.push(`BP: ${school.bp}`);
    if (school.contact_phone) addressParts.push(`Tél: ${school.contact_phone}`);
    if (addressParts.length > 0) {
        doc.text(addressParts.join('  -  '), 105, 50, { align: 'center' });
    }

    // --- Horizontal separator ---
    doc.setDrawColor(primary[0], primary[1], primary[2]);
    doc.setLineWidth(0.8);
    doc.line(30, 58, 180, 58);

    // --- Title ---
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(secondary[0], secondary[1], secondary[2]);
    doc.text(isEn ? "ACADEMIC & FINANCIAL AUDIT REPORT" : "RAPPORT D'AUDIT ACADÉMIQUE & FINANCIER", 105, 80, { align: 'center' });

    // --- Year ---
    doc.setFontSize(13);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(isEn ? `School Year: ${yearName}` : `Année Scolaire ${yearName}`, 105, 92, { align: 'center' });

    // --- Summary Box ---
    const boxX = 40;
    const boxY = 110;
    const boxW = 130;
    const boxH = 72;

    // Box background
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(primary[0], primary[1], primary[2]);
    doc.setLineWidth(0.5);
    doc.roundedRect(boxX, boxY, boxW, boxH, 3, 3, 'FD');

    // Box title bar
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.roundedRect(boxX, boxY, boxW, 12, 3, 3, 'F');
    // Cover bottom corners of the title bar
    doc.rect(boxX, boxY + 9, boxW, 3, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(isEn ? 'KEY METRICS' : 'INDICATEURS CLÉS', 105, boxY + 8, { align: 'center' });

    // Metrics rows
    const totalRev = stats.totalRevenue || 0;
    const totalExp = stats.totalExpenses || 0;
    const balance = totalRev - totalExp;
    const rowStartY = boxY + 22;
    const rowH = 13;

    const metrics = [
        { label: isEn ? 'Total Students' : 'Total Élèves', value: `${stats.totalStudents || students.length}` },
        { label: isEn ? 'Total Revenue' : 'Total Recettes', value: `${fmtCover(totalRev)} FCFA` },
        { label: isEn ? 'Total Expenses' : 'Total Dépenses', value: `${fmtCover(totalExp)} FCFA` },
        { label: isEn ? 'Balance' : 'Solde', value: `${fmtCover(balance)} FCFA` }
    ];

    metrics.forEach((m, i) => {
        const y = rowStartY + i * rowH;
        // Alternating row shading
        if (i % 2 === 1) {
            doc.setFillColor(240, 242, 245);
            doc.rect(boxX + 1, y - 5, boxW - 2, rowH, 'F');
        }
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(80, 80, 80);
        doc.text(m.label, boxX + 8, y);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 30);
        doc.text(m.value, boxX + boxW - 8, y, { align: 'right' });
    });

    // --- Generated date and footer ---
    const auditGenDate = new Date().toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(isEn ? `Generated on: ${auditGenDate}` : `Généré le: ${auditGenDate}`, 105, 210, { align: 'center' });

    // Footer line
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(30, 268, 180, 268);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(140, 140, 140);
    doc.text(isEn ? 'Eco-Manage Audit Engine v1.0 - Unalterable Official Document' : 'Eco-Manage Audit Engine v1.0 - Document Officiel Inaltérable', 105, 273, { align: 'center' });

    // PAGE 2: FINANCIAL & ACADEMIC AUDIT
    doc.addPage();
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? "1. GLOBAL SCHOOL YEAR SUMMARY" : "1. BILAN GLOBAL DE L'ANNÉE SCOLAIRE", 20, 25);

    // Summary Cards
    const fmtNum = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

    // Total Students Card
    doc.setDrawColor(200, 200, 200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, 32, 50, 25, 2, 2, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(isEn ? "TOTAL STUDENTS" : "TOTAL ÉLÈVES", 25, 40);
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text(`${stats.totalStudents || students.length}`, 25, 52);

    // Total Revenue Card
    doc.setFillColor(secondary[0], secondary[1], secondary[2]);
    doc.roundedRect(80, 32, 55, 25, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(isEn ? "TOTAL REVENUE" : "RECETTES TOTALES", 85, 40);
    doc.setFontSize(12);
    doc.text(`${fmtNum(stats.totalRevenue || 0)} FCFA`, 85, 52);

    // Academic Success Card
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.roundedRect(145, 32, 45, 25, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(isEn ? "GENERAL AVG" : "MOYENNE GÉN.", 150, 40);
    doc.setFontSize(14);
    doc.text(data.generalAverage ? `${data.generalAverage} / 20` : "N/A", 150, 52);

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
            `${fmtNum(p.amount)} FCFA`,
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

// Returns the French ordinal suffix form, e.g. 1 -> "1er", 2 -> "2ème", 3 -> "3ème"
const formatRankFr = (n: number): string => (n === 1 ? `${n}er` : `${n}ème`);

// Returns the English ordinal suffix form, e.g. 1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th"
const formatRankEn = (n: number): string => {
    const mod100 = n % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
    switch (n % 10) {
        case 1: return `${n}st`;
        case 2: return `${n}nd`;
        case 3: return `${n}rd`;
        default: return `${n}th`;
    }
};

// Computes the rank (1-based, standard competition ranking - ties share the same rank)
// of each student within a list, sorted descending by average.
export const computeClassRanks = (students: { avg: number }[]): number[] => {
    const sortedAverages = [...students.map(s => s.avg)].sort((a, b) => b - a);
    return students.map(s => sortedAverages.indexOf(s.avg) + 1);
};

export const generateHonorCertificate = (studentName: string, className: string, average: number, school?: any, options?: { rank?: number; totalStudents?: number; template?: any }) => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });
    const isEn = i18n.language.startsWith('en');
    const { rank, totalStudents, template } = options || {};

    const primaryColor = template?.primary_color || school?.primary_color;
    const secondaryColor = template?.secondary_color || school?.secondary_color;
    const primary = primaryColor ? hexToRgb(primaryColor) : [30, 41, 59];
    const secondary = secondaryColor ? hexToRgb(secondaryColor) : [245, 158, 11];
    const titleText = school?.honor_title_text || (isEn ? "HONOR ROLL" : "TABLEAU D'HONNEUR");

    // Border
    doc.setDrawColor(primary[0], primary[1], primary[2]);
    doc.setLineWidth(2);
    doc.rect(10, 10, 277, 190);
    
    doc.setDrawColor(secondary[0], secondary[1], secondary[2]);
    doc.setLineWidth(1);
    doc.rect(13, 13, 271, 184);

    // Header
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('RÉPUBLIQUE DU CAMEROUN', 50, 18, { align: 'center' });
    doc.text('REPUBLIC OF CAMEROON', 247, 18, { align: 'center' });
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('Paix - Travail - Patrie', 50, 22, { align: 'center' });
    doc.text('Peace - Work - Fatherland', 247, 22, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(school?.header_french || "MINISTÈRE DE L'ÉDUCATION DE BASE", 50, 27, { align: 'center' });
    doc.text(school?.header_english || "MINISTRY OF BASIC EDUCATION", 247, 27, { align: 'center' });

    // School Name and Info
    doc.setFontSize(22);
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(school?.name?.toUpperCase() || '', 148, 55, { align: 'center' });
    
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
    doc.text(titleText.toUpperCase(), 148, 80, { align: 'center' });
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text(isEn ? "HONOR ROLL CERTIFICATE" : "CERTIFICAT DE TABLEAU D'HONNEUR", 148, 88, { align: 'center' });

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

    // Rank
    if (rank && totalStudents) {
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primary[0], primary[1], primary[2]);
        const rankText = isEn
            ? `Rank: ${formatRankEn(rank)} out of ${totalStudents} students`
            : `Rang : ${formatRankFr(rank)} sur ${totalStudents} élèves`;
        doc.text(rankText, 148, 143, { align: 'center' });
    }

    // Appreciation
    let appreciation = isEn ? "VERY SATISFACTORY WORK - CONGRATULATIONS FROM THE JURY" : "TRAVAIL TRÈS SATISFAISANT - FÉLICITATIONS DU JURY";
    if (average >= 18) appreciation = isEn ? "ACADEMIC EXCELLENCE - CONGRATULATIONS AND HONOR ROLL" : "EXCELLENCE ACADÉMIQUE - FÉLICITATIONS ET TABLEAU D'HONNEUR";
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 150, 0);
    doc.text(appreciation, 148, 154, { align: 'center' });

    // Date
    doc.setFontSize(11);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    const certificateDate = new Date().toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    doc.text(isEn ? `Done at ${school?.address || 'Yaoundé'}, on ${certificateDate}` : `Fait à ${school?.address || 'Yaoundé'}, le ${certificateDate}`, 148, 165, { align: 'center' });

    // Signatures
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(school?.bulletin_sig_left || (isEn ? "Main Teacher" : "L'Enseignant principal"), 40, 185);
    doc.text(school?.bulletin_sig_right || (isEn ? "School Principal" : "Le Directeur de l'Établissement"), 195, 185);

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

    // Pre-pass: compute class-level averages for the stats bar
    const preAverages = studentsData.map(sd => {
        if (isAnnual) return typeof sd.average === 'number' ? sd.average : 0;
        const vg = ignoreValidation ? sd.grades : sd.grades.filter((g: any) => g.validated === 1);
        const tp = vg.reduce((a: number, g: any) => a + ((Number(g.score) || 0) * (Number(g.coefficient) || 1)), 0);
        const tc = vg.reduce((a: number, g: any) => a + (Number(g.coefficient) || 1), 0);
        return tc > 0 ? tp / tc : 0;
    }).sort((a: number, b: number) => b - a);
    const classAvgVal = preAverages.length > 0 ? preAverages.reduce((a: number, b: number) => a + b, 0) / preAverages.length : undefined;
    const firstAvg = preAverages[0];
    const lastAvg = preAverages[preAverages.length - 1];

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
            // ── New Cameroonian bulletin layout ──────────────────────────────
            const pageW = 210, pageH = 297, mL = 10, mR = 10, cW = 190;
            let curY = 5;

            // Header
            if (template?.header_image) {
                try { doc.addImage(template.header_image, 'JPEG', 0, 0, 210, 38, undefined, 'FAST'); curY = 41; } catch(e) {}
            } else {
                doc.setFontSize(6.5); doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', 'bold');
                doc.text('RÉPUBLIQUE DU CAMEROUN', mL, curY + 4);
                doc.setFont('helvetica', 'italic');
                doc.text('Paix - Travail - Patrie', mL, curY + 8);
                doc.setFont('helvetica', 'normal');
                doc.text(school.header_french || "MINISTÈRE DE L'ÉDUCATION DE BASE", mL, curY + 12);
                doc.setFont('helvetica', 'bold');
                doc.text((school.name || '').toUpperCase(), mL, curY + 20);
                doc.setFont('helvetica', 'normal');
                if (school.address) doc.text(school.address, mL, curY + 24);

                doc.setFont('helvetica', 'bold');
                doc.text('REPUBLIC OF CAMEROON', pageW - mR, curY + 4, { align: 'right' });
                doc.setFont('helvetica', 'italic');
                doc.text('Peace - Work - Fatherland', pageW - mR, curY + 8, { align: 'right' });
                doc.setFont('helvetica', 'normal');
                doc.text(school.header_english || 'MINISTRY OF BASIC EDUCATION', pageW - mR, curY + 12, { align: 'right' });
                doc.setFont('helvetica', 'bold');
                doc.text((school.name || '').toUpperCase(), pageW - mR, curY + 20, { align: 'right' });
                doc.setFont('helvetica', 'normal');
                if (school.address) doc.text(school.address, pageW - mR, curY + 24, { align: 'right' });

                if (school.logo) {
                    try {
                        const ext = school.logo.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                        doc.addImage(school.logo, ext, pageW / 2 - 10, curY + 1, 20, 20, undefined, 'FAST');
                    } catch(e) {}
                }
                curY += 27;
                if (school.motto) {
                    doc.setFontSize(7); doc.setFont('helvetica', 'italic');
                    doc.text(school.motto, pageW / 2, curY, { align: 'center' });
                    curY += 5;
                }
            }

            doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.4);
            doc.line(mL, curY, pageW - mR, curY);
            curY += 3;

            // Title
            const termNum = typeof term === 'number' ? term : (parseInt(String(term).split('_')[0]) || 1);
            const titleStr = isAnnual ? (isEn ? 'ANNUAL REPORT CARD' : 'BULLETIN ANNUEL') : `BULLETIN TRIMESTRIEL N°${termNum}`;
            doc.setFontSize(11); doc.setFont('helvetica', 'bold');
            doc.setTextColor(primary[0], primary[1], primary[2]);
            doc.text(titleStr, pageW / 2, curY + 5, { align: 'center' });
            const monthYear = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
            doc.setFontSize(7.5); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
            doc.text(monthYear.charAt(0).toUpperCase() + monthYear.slice(1), pageW - mR, curY + 5, { align: 'right' });
            doc.setTextColor(0, 0, 0);
            curY += 10;

            // Student info grid (3 rows, bordered)
            const rowH = 7, gridTotalH = rowH * 3;
            doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
            doc.rect(mL, curY, cW, gridTotalH);
            doc.line(mL, curY + rowH, pageW - mR, curY + rowH);
            doc.line(mL, curY + 2 * rowH, pageW - mR, curY + 2 * rowH);

            const drawBulkInfoCell = (x: number, y: number, w: number, label: string, value: string, hasBorderRight: boolean) => {
                if (hasBorderRight) doc.line(x + w, y, x + w, y + rowH);
                doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
                doc.text(label, x + 1.5, y + 4.5);
                const lw = doc.getTextWidth(label);
                doc.setFont('helvetica', 'normal');
                doc.text(value || '--', x + 1.5 + lw, y + 4.5);
            };

            const syear = `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`;
            const fullName = `${student.last_name || ''} ${student.first_name || ''}`.trim();
            const dob = student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString('fr-FR') : '--';
            const sex = student.gender === 'M' ? 'Masculin' : student.gender === 'F' ? 'Féminin' : '--';

            const r1c1 = 55;
            drawBulkInfoCell(mL, curY, r1c1, 'Année Scolaire : ', syear, true);
            drawBulkInfoCell(mL + r1c1, curY, cW - r1c1, 'Nom et Prénom : ', fullName, false);
            const r2c1 = 36, r2c2 = 65;
            drawBulkInfoCell(mL, curY + rowH, r2c1, 'Effectif : ', (totalStudents || '--').toString(), true);
            drawBulkInfoCell(mL + r2c1, curY + rowH, r2c2, 'Date de Naissance : ', dob, true);
            drawBulkInfoCell(mL + r2c1 + r2c2, curY + rowH, cW - r2c1 - r2c2, 'Sexe : ', sex, false);
            const r3c1 = 50, r3c2 = 55;
            drawBulkInfoCell(mL, curY + 2 * rowH, r3c1, 'Matricule : ', student.matricule || '--', true);
            drawBulkInfoCell(mL + r3c1, curY + 2 * rowH, r3c2, 'Classe : ', classObj.name || '--', true);
            drawBulkInfoCell(mL + r3c1 + r3c2, curY + 2 * rowH, cW - r3c1 - r3c2, 'Enseignant(e) : ', classObj.teacher_name || '--', false);
            curY += gridTotalH + 3;

            // Grades table
            let grandTP = 0, grandTC = 0, grandMax = 0;
            const tableBody: any[] = [];

            if (isAnnual) {
                // Annual: subject | T1 | T2 | ... | MOY | COEF | TOTAL | APPRÉCIATION
                const subjectsMapAnn: Record<string, any> = {};
                validatedGrades.forEach((g: any) => {
                    if (!subjectsMapAnn[g.subjectName]) subjectsMapAnn[g.subjectName] = { name: g.subjectName, coef: g.coefficient, terms: {}, totalScore: 0, count: 0 };
                    subjectsMapAnn[g.subjectName].terms[g.term] = g.score;
                    subjectsMapAnn[g.subjectName].totalScore += g.score;
                    subjectsMapAnn[g.subjectName].count++;
                });
                Object.values(subjectsMapAnn).forEach((sub: any) => {
                    const avg = sub.count > 0 ? sub.totalScore / sub.count : 0;
                    const coef = Number(sub.coef) || 1;
                    grandTP += avg * coef; grandTC += coef; grandMax += 20 * coef;
                    const termsScores = (termsArray || []).map((t: number) => sub.terms[t] !== undefined ? (sub.terms[t] as number).toFixed(2) : '-');
                    tableBody.push([sub.name, ...termsScores, avg.toFixed(2), coef, (avg * coef).toFixed(2), getPrimaryAppreciation(avg)]);
                });
                if (tableBody.length > 0) {
                    const annAvgCalc = grandTC > 0 ? grandTP / grandTC : 0;
                    const sf = [228, 240, 255];
                    tableBody.push([{ content: 'RANG', colSpan: 1, styles: { fontStyle: 'bold', halign: 'right', fillColor: sf } },
                        ...(termsArray||[]).map(() => ({ content: '', styles: { fillColor: sf } })),
                        { content: `${rank||'--'} / ${totalStudents||'--'}`, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: sf } },
                        { content: '', styles: { fillColor: sf } }, { content: '', styles: { fillColor: sf } }]);
                    tableBody.push([{ content: 'MOYENNE ANNUELLE', colSpan: 1, styles: { fontStyle: 'bold', halign: 'right', fillColor: sf } },
                        ...(termsArray||[]).map(() => ({ content: '', styles: { fillColor: sf } })),
                        { content: annAvgCalc.toFixed(2), styles: { halign: 'center', fontStyle: 'bold', fillColor: sf } },
                        { content: grandTC.toString(), styles: { halign: 'center', fillColor: sf } },
                        { content: grandTP.toFixed(2), styles: { halign: 'center', fontStyle: 'bold', fillColor: sf } },
                        { content: getPrimaryAppreciation(annAvgCalc), styles: { halign: 'center', fontStyle: 'bold', fillColor: sf } }]);
                }
                (doc as any).autoTable({
                    startY: curY,
                    head: [[isEn ? 'SUBJECT' : 'MATIÈRE', ...(termsArray||[]).map((t: number) => `T${t}`), 'MOY/20', 'COEF', 'TOTAL', isEn ? 'APPRECIATION' : 'APPRÉCIATION']],
                    body: tableBody,
                    theme: 'grid',
                    headStyles: { fillColor: primary, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
                    bodyStyles: { fontSize: 8 },
                    margin: { left: mL, right: mR },
                    pageBreak: 'avoid'
                });
            } else {
                // Trimestrial: domain-grouped with rowSpan
                const groupedGrades: Record<string, any[]> = {};
                validatedGrades.forEach((g: any) => {
                    const domain = g.domain || (isEn ? 'GENERAL SUBJECTS' : 'MATIÈRES GÉNÉRALES');
                    if (!groupedGrades[domain]) groupedGrades[domain] = [];
                    groupedGrades[domain].push(g);
                });

                const totalRows = validatedGrades.length + 3 + 1;
                let fs = 8, cp: any = { top: 2, right: 2, bottom: 2, left: 2 };
                if (totalRows > 16) { fs = 7.5; cp = { top: 1.5, right: 2, bottom: 1.5, left: 2 }; }
                if (totalRows > 22) { fs = 7;   cp = { top: 1.2, right: 1.5, bottom: 1.2, left: 1.5 }; }
                if (totalRows > 28) { fs = 6.5; cp = { top: 0.8, right: 1, bottom: 0.8, left: 1 }; }
                if (totalRows > 36) { fs = 6;   cp = { top: 0.5, right: 1, bottom: 0.5, left: 1 }; }
                if (totalRows > 44) { fs = 5.5; cp = { top: 0.3, right: 0.8, bottom: 0.3, left: 0.8 }; }

                if (validatedGrades.length === 0) {
                    tableBody.push([{ content: 'AUCUNE NOTE VALIDÉE', colSpan: isNursery ? 6 : 7, styles: { halign: 'center', textColor: [200, 50, 50], fontStyle: 'bold' } }]);
                } else {
                    Object.entries(groupedGrades).forEach(([domain, subjects]) => {
                        subjects.forEach((g: any, idx: number) => {
                            const row: any[] = [];
                            if (idx === 0) {
                                row.push({ content: domain.toUpperCase(), rowSpan: subjects.length, styles: { fontStyle: 'bold', halign: 'center', valign: 'middle', fillColor: [235, 242, 252], textColor: primary } });
                            }
                            if (isNursery) {
                                const app = getNurseryAppreciation(g.score);
                                row.push(g.subjectName || g.name || '--');
                                row.push({ content: app.label || '--', styles: { halign: 'center' } });
                                row.push({ content: '', styles: { halign: 'center' } });
                                row.push({ content: app.remark || '--', styles: { halign: 'center', fontSize: fs - 0.5 } });
                                row.push('');
                            } else {
                                const score = Number(g.score) || 0, coef = Number(g.coefficient) || 1, total = score * coef;
                                grandTP += total; grandTC += coef; grandMax += 20 * coef;
                                row.push(g.subjectName || g.name || '--');
                                row.push({ content: score.toFixed(2), styles: { halign: 'center' } });
                                row.push({ content: coef.toString(), styles: { halign: 'center' } });
                                row.push({ content: total.toFixed(2), styles: { halign: 'center' } });
                                row.push({ content: getPrimaryAppreciation(score), styles: { halign: 'center', fontSize: fs - 0.5 } });
                                row.push('');
                            }
                            tableBody.push(row);
                        });
                    });

                    if (!isNursery) {
                        const avg = grandTC > 0 ? grandTP / grandTC : 0;
                        const sf = [228, 240, 255];
                        tableBody.push([
                            { content: 'TOTAL', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: sf } },
                            { content: '', styles: { fillColor: sf } },
                            { content: grandTC.toString(), styles: { halign: 'center', fontStyle: 'bold', fillColor: sf } },
                            { content: `${grandTP.toFixed(2)} / ${grandMax}`, styles: { halign: 'center', fontStyle: 'bold', fillColor: sf } },
                            { content: '', styles: { fillColor: sf } },
                            { content: '', styles: { fillColor: sf } }
                        ]);
                        tableBody.push([
                            { content: 'MOYENNE', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: sf } },
                            { content: avg.toFixed(2), styles: { halign: 'center', fontStyle: 'bold', fillColor: sf } },
                            { content: '', styles: { fillColor: sf } },
                            { content: '/ 20', styles: { halign: 'center', fillColor: sf } },
                            { content: getPrimaryAppreciation(avg), styles: { halign: 'center', fontStyle: 'bold', fillColor: sf } },
                            { content: '', styles: { fillColor: sf } }
                        ]);
                        tableBody.push([
                            { content: 'RANG', colSpan: 2, styles: { fontStyle: 'bold', halign: 'right', fillColor: sf } },
                            { content: `${rank || '--'} / ${totalStudents || '--'}`, colSpan: 2, styles: { halign: 'center', fontStyle: 'bold', fillColor: sf } },
                            { content: '', styles: { fillColor: sf } },
                            { content: '', styles: { fillColor: sf } },
                            { content: '', styles: { fillColor: sf } }
                        ]);
                    }
                }

                const primaryCols = { 0: { cellWidth: 22 }, 1: { cellWidth: 50 }, 2: { halign: 'center', cellWidth: 18 }, 3: { halign: 'center', cellWidth: 12 }, 4: { halign: 'center', cellWidth: 18 }, 5: { halign: 'center', cellWidth: 28 }, 6: { cellWidth: 42 } };
                const nurseryCols = { 0: { cellWidth: 25 }, 1: { cellWidth: 60 }, 2: { halign: 'center', cellWidth: 22 }, 3: { halign: 'center', cellWidth: 15 }, 4: { halign: 'center', cellWidth: 28 }, 5: { cellWidth: 40 } };

                (doc as any).autoTable({
                    startY: curY,
                    head: [isNursery
                        ? ['DOMAINE', 'ACTIVITÉS', 'ÉVALUATION', 'TOTAL', 'APPRÉCIATION', 'OBSERVATION']
                        : ['DOMAINE', 'ACTIVITÉS / MATIÈRE', 'NOTE/20', 'COEF', 'TOTAL', 'APPRÉCIATION', 'OBSERVATION']],
                    body: tableBody,
                    theme: 'grid',
                    headStyles: { fillColor: primary, textColor: [255, 255, 255], fontSize: fs, fontStyle: 'bold', cellPadding: cp },
                    bodyStyles: { fontSize: fs, cellPadding: cp },
                    columnStyles: isNursery ? nurseryCols : primaryCols,
                    margin: { left: mL, right: mR },
                    pageBreak: 'avoid'
                });
            }

            let finalY = (doc as any).lastAutoTable.finalY + 3;

            // Stats bar (5 cells)
            const totalAbsence = (attendance || []).reduce((acc: number, cur: any) => acc + (cur.hours_absent || 0), 0);
            const statsBarW = cW / 5;
            const statsH = 11;
            const calcAvg = grandTC > 0 ? grandTP / grandTC : (isAnnual && typeof annualAvg === 'number' ? annualAvg : 0);
            const decision = calcAvg >= 10 ? (isAnnual ? 'ADMIS(E) EN SUP.' : 'ADMIS(E)') : (calcAvg > 0 ? 'AVERTISSEMENT' : '--');

            doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
            doc.rect(mL, finalY, cW, statsH);
            [
                { label: 'Moy. du premier',   value: firstAvg !== undefined ? (firstAvg as number).toFixed(2) : '--' },
                { label: 'Moy. de la classe', value: classAvgVal !== undefined ? (classAvgVal as number).toFixed(2) : '--' },
                { label: 'Décision',          value: validatedGrades.length > 0 || isAnnual ? decision : '--' },
                { label: 'Effectif',          value: (totalStudents || '--').toString() },
                { label: 'Moy. du dernier',   value: lastAvg !== undefined ? (lastAvg as number).toFixed(2) : '--' }
            ].forEach(({ label, value }, i) => {
                if (i > 0) doc.line(mL + i * statsBarW, finalY, mL + i * statsBarW, finalY + statsH);
                doc.setFontSize(5.8); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80);
                doc.text(label, mL + i * statsBarW + statsBarW / 2, finalY + 3.5, { align: 'center' });
                doc.setFontSize(8); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
                doc.text(value, mL + i * statsBarW + statsBarW / 2, finalY + 8.5, { align: 'center' });
            });
            finalY += statsH + 3;

            doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(60, 60, 60);
            doc.text(`Absences : ${totalAbsence} h   —   Conduite : ${calculateAttendanceObservations(totalAbsence)}`, mL, finalY + 4);
            finalY += 8;

            // Signatures (3 columns, bordered)
            if (template?.footer_image) {
                try { doc.addImage(template.footer_image, 'JPEG', 0, pageH - 45, 210, 45, undefined, 'FAST'); } catch(e) {}
            } else {
                const sigH = 13, sig3W = cW / 3;
                doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.3);
                doc.rect(mL, finalY, cW, sigH);
                doc.line(mL + sig3W, finalY, mL + sig3W, finalY + sigH);
                doc.line(mL + 2 * sig3W, finalY, mL + 2 * sig3W, finalY + sigH);
                [
                    school.bulletin_sig_middle || 'VISA DU PARENT',
                    school.bulletin_sig_left   || "VISA DE L'ENSEIGNANT(E)",
                    school.bulletin_sig_right  || 'VISA DU DIRECTEUR'
                ].forEach((label, i) => {
                    doc.setFontSize(7); doc.setFont('helvetica', 'bold');
                    doc.setTextColor(primary[0], primary[1], primary[2]);
                    doc.text(label, mL + i * sig3W + sig3W / 2, finalY + 4.5, { align: 'center' });
                });
                finalY += sigH + 3;
                doc.setFontSize(6.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(0, 0, 0);
                doc.text('APPRÉCIATIONS : ', mL, finalY + 4);
                doc.setFont('helvetica', 'normal');
                doc.text("A = Acquis     EC = En cours d'acquisition     NA = Non-Acquis", mL + doc.getTextWidth('APPRÉCIATIONS : '), finalY + 4);
            }

            doc.setFontSize(5.5); doc.setTextColor(160, 160, 160); doc.setFont('helvetica', 'italic');
            doc.text(
                `Généré par ${school?.name || ''} le ${new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`,
                pageW / 2, pageH - 3, { align: 'center' }
            );
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
    doc.text(school?.name?.toUpperCase() || '', 105, 30, { align: 'center' });

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
    doc.text(`${i18n.t('generated_by_footer')} ${school?.name || ''} ${isEn ? 'on' : 'le'} ${new Date().toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`, 105, 285, { align: 'center' });

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
    doc.text(schoolInfo?.name || '', 40, yPos);

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
    const isEn = i18n.language.startsWith('en');
    const primary = school?.primary_color ? hexToRgb(school.primary_color) : [30, 41, 59];

    // School header
    doc.setFillColor(primary[0], primary[1], primary[2]);
    doc.rect(0, 0, 297, 30, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('RÉPUBLIQUE DU CAMEROUN', 20, 8);
    doc.text('Paix - Travail - Patrie', 20, 12);
    doc.text(school?.header_french || "MINISTÈRE DE L'ÉDUCATION DE BASE", 20, 16);
    doc.text('REPUBLIC OF CAMEROON', 277, 8, { align: 'right' });
    doc.text('Peace - Work - Fatherland', 277, 12, { align: 'right' });
    doc.text(school?.header_english || "MINISTRY OF BASIC EDUCATION", 277, 16, { align: 'right' });
    doc.setFontSize(12);
    doc.text((school?.name || '').toUpperCase(), 148, 24, { align: 'center' });

    let yPos = 38;
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), 148, yPos, { align: 'center' });
    yPos += 8;

    if (subtitle) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(subtitle.toUpperCase(), 148, yPos, { align: 'center' });
        yPos += 8;
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

    doc.setFillColor(examPrimary[0], examPrimary[1], examPrimary[2]);
    doc.rect(0, 0, 210, 35, 'F');
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('RÉPUBLIQUE DU CAMEROUN', 20, 8);
    doc.text('Paix - Travail - Patrie', 20, 12);
    doc.text(school?.header_french || "MINISTÈRE DE L'ÉDUCATION DE BASE", 20, 16);
    doc.text('REPUBLIC OF CAMEROON', 190, 8, { align: 'right' });
    doc.text('Peace - Work - Fatherland', 190, 12, { align: 'right' });
    doc.text(school?.header_english || "MINISTRY OF BASIC EDUCATION", 190, 16, { align: 'right' });
    doc.setFontSize(12);
    doc.text((school?.name || '').toUpperCase(), 105, 26, { align: 'center' });
    doc.setFontSize(8);
    doc.text(school?.address || '', 105, 32, { align: 'center' });

    let yPos = 42;
    doc.setTextColor(examPrimary[0], examPrimary[1], examPrimary[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), 105, yPos, { align: 'center' });
    yPos += 12;

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
    doc.text(school?.name?.toUpperCase() || '', 105, yPos, { align: 'center' });
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

export const generateFinancialStatement = (data: {
    student: any;
    payments: any[];
    tuitionConfig: { totalFee: number; registrationFee: number; transportFee: number; examFee: number };
    classInstallments: { id: number; name: string; amountDue: number }[];
    school?: any;
    currency?: string;
}) => {
    const { student, payments, tuitionConfig, classInstallments, school, currency = 'FCFA' } = data;
    const doc = new jsPDF();
    const isEn = i18n.language?.startsWith('en') ?? false;
    const primary: [number, number, number] = school?.primary_color ? hexToRgb(school.primary_color) : [30, 41, 59];
    const secondary: [number, number, number] = school?.secondary_color ? hexToRgb(school.secondary_color) : [245, 158, 11];
    const fmtNum = (n: number) => Math.round(n).toLocaleString('en-US').replace(/,/g, ' ');
    const fmtDate = (d: string) => {
        if (!d) return '-';
        try { return new Date(d).toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
        catch { return d; }
    };

    // === School header ===
    let y = 8;
    if (school) {
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        doc.text('R\u00c9PUBLIQUE DU CAMEROUN', 20, y);
        doc.text('REPUBLIC OF CAMEROON', 190, y, { align: 'right' });
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(5.5);
        doc.text('Paix - Travail - Patrie', 20, y + 3.5);
        doc.text('Peace - Work - Fatherland', 190, y + 3.5, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.text(school.header_french || "MINIST\u00c8RE DE L'\u00c9DUCATION DE BASE", 20, y + 7);
        doc.text(school.header_english || "MINISTRY OF BASIC EDUCATION", 190, y + 7, { align: 'right' });
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primary[0], primary[1], primary[2]);
        doc.text(school.name.toUpperCase(), 105, y + 7, { align: 'center' });
        doc.setFontSize(7);
        doc.setTextColor(80, 80, 80);
        doc.setFont('helvetica', 'normal');
        const addrLine = `${school.address || ''}${school.bp ? ` - BP: ${school.bp}` : ''}`.trim();
        if (addrLine) doc.text(addrLine, 105, y + 12, { align: 'center' });
        y += 22;
    }

    // === Title ===
    y += 3;
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(isEn ? 'COMPREHENSIVE FINANCIAL STATEMENT' : 'RELEV\u00c9 FINANCIER COMPLET', 105, y, { align: 'center' });
    y += 5;
    const now = new Date();
    const dateStr = now.toLocaleDateString(isEn ? 'en-US' : 'fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString(isEn ? 'en-US' : 'fr-FR', { hour: '2-digit', minute: '2-digit' });
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(130, 130, 130);
    doc.text(`${isEn ? 'Generated on' : 'G\u00e9n\u00e9r\u00e9 le'} ${dateStr} ${isEn ? 'at' : '\u00e0'} ${timeStr}`, 105, y, { align: 'center' });
    y += 5;
    doc.setDrawColor(primary[0], primary[1], primary[2]);
    doc.setLineWidth(0.5);
    doc.line(15, y, 195, y);
    y += 6;

    // === Student info block ===
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(isEn ? 'STUDENT:' : '\u00c9L\u00c8VE:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${(student.last_name || '').toUpperCase()} ${student.first_name || ''}`, 48, y);
    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? 'CLASS:' : 'CLASSE:', 120, y);
    doc.setFont('helvetica', 'normal');
    doc.text(student.className || '', 145, y);
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? 'REG. NO:' : 'MATRICULE:', 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(student.matricule || '', 48, y);
    doc.setFont('helvetica', 'bold');
    doc.text(isEn ? 'PARENT:' : 'PARENT:', 120, y);
    doc.setFont('helvetica', 'normal');
    doc.text(student.parent_name || '-', 145, y);
    y += 5;
    if (student.parent_contact) {
        doc.setFont('helvetica', 'bold');
        doc.text(isEn ? 'CONTACT:' : 'CONTACT:', 120, y);
        doc.setFont('helvetica', 'normal');
        doc.text(student.parent_contact, 145, y);
    }
    y += 5;

    // === Financial computations ===
    const scholarship = student.scholarship_reduction || 0;
    const netPension = Math.max(0, (tuitionConfig.totalFee || 0) - scholarship);
    const inscriptionDue = tuitionConfig.registrationFee || 0;
    const transportDue = student.has_transport ? (tuitionConfig.transportFee || 0) : 0;
    const examDue = student.has_exam ? (tuitionConfig.examFee || 0) : 0;
    const totalDue = netPension + inscriptionDue + transportDue + examDue;
    const totalPaid = payments.reduce((a: number, p: any) => a + (p.amount || 0), 0);
    const balance = totalDue - totalPaid;

    // Installment allocation (sequential, same logic as Finance.tsx getStudentFinancials)
    const combinedTuitionPaid = payments
        .filter((p: any) => p.payment_type === 'Scolarit\u00e9' || p.payment_type === 'Inscription')
        .reduce((a: number, p: any) => a + (p.amount || 0), 0);
    let remaining = combinedTuitionPaid;
    const inscPaid = Math.min(inscriptionDue, remaining);
    remaining -= inscPaid;
    const installmentRowData = classInstallments.map((inst: any) => {
        const paid = Math.min(inst.amountDue, remaining);
        remaining -= paid;
        return { name: inst.name, due: inst.amountDue, paid, balance: inst.amountDue - paid };
    });
    const installmentBalances = [Math.max(0, inscriptionDue - inscPaid), ...installmentRowData.map((r: any) => r.balance)];

    // === Status badge ===
    const statusLabel = student.has_moratoire === 1
        ? (isEn ? 'MORATOIRE GRANTED' : 'MORATOIRE ACCORD\u00c9')
        : balance <= 0
        ? (isEn ? 'FULLY SETTLED' : 'SOLD\u00c9')
        : (isEn ? 'IN PROGRESS' : 'EN COURS');
    const statusBg: [number, number, number] = student.has_moratoire === 1
        ? [245, 158, 11]
        : balance <= 0
        ? [34, 197, 94]
        : [239, 68, 68];
    doc.setFillColor(statusBg[0], statusBg[1], statusBg[2]);
    doc.roundedRect(15, y, 55, 8, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(statusLabel, 42.5, y + 5.5, { align: 'center' });
    if (student.has_moratoire === 1) {
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(100, 100, 100);
        doc.text(isEn ? 'Payment spread authorized \u2014 late payments permitted' : 'Paiement \u00e9chelonn\u00e9 autoris\u00e9 \u2014 arri\u00e9r\u00e9s tol\u00e9r\u00e9s', 75, y + 5.5);
    }
    y += 12;

    // === SECTION 1: Fee Summary ===
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(15, y, 195, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    doc.text(isEn ? '1.  FEE SUMMARY' : '1.  R\u00c9CAPITULATIF DES FRAIS', 15, y);
    y += 4;

    const feeDetailRows: any[] = [
        [isEn ? 'Gross tuition fee' : 'Frais de scolarit\u00e9 bruts', `${fmtNum(tuitionConfig.totalFee || 0)} ${currency}`, 'normal'],
        ...(scholarship > 0 ? [[isEn ? 'Scholarship reduction' : 'R\u00e9duction de scolarit\u00e9', `- ${fmtNum(scholarship)} ${currency}`, 'reduction']] : []),
        [isEn ? 'Net tuition fee' : 'Frais de scolarit\u00e9 nets', `${fmtNum(netPension)} ${currency}`, 'normal'],
        [isEn ? 'Registration fee' : "Frais d'inscription", `${fmtNum(inscriptionDue)} ${currency}`, 'normal'],
        ...(transportDue > 0 ? [[isEn ? 'Transport fee' : 'Frais de transport', `${fmtNum(transportDue)} ${currency}`, 'normal']] : []),
        ...(examDue > 0 ? [[isEn ? 'Exam fee' : "Frais d'examen", `${fmtNum(examDue)} ${currency}`, 'normal']] : []),
    ];

    (doc as any).autoTable({
        body: feeDetailRows.map(r => [r[0], r[1]]),
        startY: y,
        theme: 'plain',
        columnStyles: { 0: { halign: 'left', cellWidth: 135 }, 1: { halign: 'right', cellWidth: 45 } },
        bodyStyles: { textColor: [51, 65, 85], fontSize: 8.5 },
        margin: { left: 15, right: 15 },
        didParseCell: (data: any) => {
            const tag = feeDetailRows[data.row.index]?.[2];
            if (tag === 'reduction') data.cell.styles.textColor = [34, 197, 94];
        }
    });
    y = (doc as any).lastAutoTable.finalY + 2;

    // Totals block
    (doc as any).autoTable({
        body: [
            [isEn ? 'TOTAL DUE' : 'TOTAL D\u00db', `${fmtNum(totalDue)} ${currency}`],
            [isEn ? 'TOTAL PAID' : 'TOTAL VERS\u00c9', `${fmtNum(totalPaid)} ${currency}`],
            [isEn ? 'OUTSTANDING BALANCE' : 'SOLDE RESTANT', `${fmtNum(Math.max(0, balance))} ${currency}`],
        ],
        startY: y,
        theme: 'plain',
        columnStyles: { 0: { halign: 'left', cellWidth: 135, fontStyle: 'bold' }, 1: { halign: 'right', cellWidth: 45, fontStyle: 'bold' } },
        bodyStyles: { textColor: [30, 41, 59], fontSize: 9 },
        margin: { left: 15, right: 15 },
        didParseCell: (data: any) => {
            if (data.row.index === 2) {
                data.cell.styles.textColor = balance <= 0 ? [34, 197, 94] : [220, 38, 38];
                data.cell.styles.fontSize = 10;
            }
        }
    });
    y = (doc as any).lastAutoTable.finalY + 5;

    // === SECTION 2: Installment Breakdown ===
    if (classInstallments.length > 0) {
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(15, y, 195, y);
        y += 5;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primary[0], primary[1], primary[2]);
        doc.text(isEn ? '2.  BREAKDOWN BY INSTALLMENT' : '2.  R\u00c9PARTITION PAR TRANCHE', 15, y);
        y += 4;

        const instTableBody = [
            [
                isEn ? 'Registration' : 'Inscription',
                `${fmtNum(inscriptionDue)} ${currency}`,
                `${fmtNum(inscPaid)} ${currency}`,
                `${fmtNum(Math.max(0, inscriptionDue - inscPaid))} ${currency}`
            ],
            ...installmentRowData.map((r: any) => [
                r.name,
                `${fmtNum(r.due)} ${currency}`,
                `${fmtNum(r.paid)} ${currency}`,
                `${fmtNum(Math.max(0, r.balance))} ${currency}`
            ])
        ];

        (doc as any).autoTable({
            head: [[
                isEn ? 'Tranche' : 'Tranche',
                isEn ? 'Amount Due' : 'Montant D\u00fb',
                isEn ? 'Amount Paid' : 'Montant Vers\u00e9',
                isEn ? 'Balance' : 'Solde'
            ]],
            body: instTableBody,
            startY: y,
            theme: 'grid',
            headStyles: { fillColor: primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            bodyStyles: { textColor: [51, 65, 85], fontSize: 8 },
            columnStyles: {
                0: { cellWidth: 70 },
                1: { halign: 'right', cellWidth: 37 },
                2: { halign: 'right', cellWidth: 37 },
                3: { halign: 'right', cellWidth: 36 }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 15, right: 15 },
            didParseCell: (data: any) => {
                if (data.column.index === 3 && data.section === 'body') {
                    const bal = installmentBalances[data.row.index] ?? 0;
                    data.cell.styles.textColor = bal <= 0 ? [34, 197, 94] : [220, 38, 38];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });
        y = (doc as any).lastAutoTable.finalY + 5;
    }

    // === SECTION 3: Full Payment History ===
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(15, y, 195, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    const sectionNum = classInstallments.length > 0 ? '3' : '2';
    doc.text(`${sectionNum}.  ${isEn ? 'COMPLETE PAYMENT HISTORY' : 'HISTORIQUE COMPLET DES VERSEMENTS'}`, 15, y);
    y += 4;

    if (payments.length === 0) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(150, 150, 150);
        doc.text(isEn ? 'No payment recorded yet.' : 'Aucun versement enregistr\u00e9 pour le moment.', 20, y + 5);
        y += 12;
    } else {
        const sortedPayments = [...payments].sort((a: any, b: any) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
        const historyRows = sortedPayments.map((p: any, idx: number) => {
            const tranche = p.installmentName || (p.payment_type === 'Inscription' ? (isEn ? 'Registration' : 'Inscription') : '-');
            return [
                (idx + 1).toString(),
                fmtDate(p.payment_date),
                p.receipt_number || '-',
                p.payment_type || '-',
                tranche,
                p.depositor_name || '-',
                `${fmtNum(p.amount)} ${currency}`
            ];
        });
        (doc as any).autoTable({
            head: [['N\u00b0', isEn ? 'Date' : 'Date', isEn ? 'Receipt No.' : 'N\u00b0 Re\u00e7u', isEn ? 'Type' : 'Type', isEn ? 'Installment' : 'Tranche', isEn ? 'Depositor' : 'D\u00e9posant', isEn ? 'Amount' : 'Montant']],
            body: historyRows,
            startY: y,
            theme: 'striped',
            headStyles: { fillColor: primary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
            bodyStyles: { textColor: [51, 65, 85], fontSize: 7.5 },
            columnStyles: {
                0: { cellWidth: 8, halign: 'center' },
                1: { cellWidth: 22 },
                2: { cellWidth: 28 },
                3: { cellWidth: 22 },
                4: { cellWidth: 30 },
                5: { cellWidth: 35 },
                6: { halign: 'right', cellWidth: 35 }
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { left: 15, right: 15 }
        });
        y = (doc as any).lastAutoTable.finalY + 5;
    }

    // === SECTION 4: Summary by payment type ===
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(15, y, 195, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primary[0], primary[1], primary[2]);
    const secNum4 = classInstallments.length > 0 ? '4' : '3';
    doc.text(`${secNum4}.  ${isEn ? 'SUMMARY BY PAYMENT TYPE' : 'R\u00c9CAPITULATIF PAR TYPE DE VERSEMENT'}`, 15, y);
    y += 4;

    const paymentTypes = ['Inscription', 'Scolarit\u00e9', 'Transport', 'Examen'];
    const typeAmounts = paymentTypes.map(type => payments.filter((p: any) => p.payment_type === type).reduce((a: number, p: any) => a + (p.amount || 0), 0));
    const typeSummaryRows = paymentTypes.map((type, i) => [
        type,
        `${fmtNum(typeAmounts[i])} ${currency}`,
        typeAmounts[i] > 0 ? (isEn ? 'Paid' : 'Vers\u00e9') : '-'
    ]);

    (doc as any).autoTable({
        head: [[isEn ? 'Payment Type' : 'Type de Versement', isEn ? 'Total Paid' : 'Total Vers\u00e9', isEn ? 'Status' : 'Statut']],
        body: [
            ...typeSummaryRows,
            [isEn ? 'GRAND TOTAL' : 'TOTAL G\u00c9N\u00c9RAL', `${fmtNum(totalPaid)} ${currency}`, '']
        ],
        startY: y,
        theme: 'grid',
        headStyles: { fillColor: secondary, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        bodyStyles: { textColor: [51, 65, 85], fontSize: 8.5 },
        columnStyles: {
            0: { cellWidth: 80 },
            1: { halign: 'right', cellWidth: 70 },
            2: { halign: 'center', cellWidth: 30 }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: 15, right: 15 },
        didParseCell: (data: any) => {
            if (data.row.index === paymentTypes.length && data.section === 'body') {
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [241, 245, 249];
                data.cell.styles.textColor = [30, 41, 59];
            }
        }
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // === Signature block ===
    if (y > 260) { doc.addPage(); y = 20; }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(isEn ? "Bursar / Cashier" : "L'\u00c9conome / Caisse", 25, y);
    doc.text(isEn ? "School Director" : "Le Directeur / La Directrice", 130, y);
    y += 14;
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.3);
    doc.line(25, y, 90, y);
    doc.line(130, y, 195, y);

    const safeName = `${student.last_name || 'Eleve'}_${student.first_name || ''}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9_]/gi, "_").replace(/_+/g, "_").toUpperCase();
    doc.save(`Releve_Financier_${safeName}_${now.toISOString().slice(0, 10)}.pdf`);
};
