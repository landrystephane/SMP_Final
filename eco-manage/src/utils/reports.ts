import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getNurseryAppreciation, getPrimaryAppreciation, calculateAttendanceObservations } from './pedagogy';

export const generateReportCard = (data: any) => {
    const { student, classObj, school, grades, attendance, term, rank, totalStudents } = data;
    const doc = new jsPDF();
    const isNursery = classObj.level === 'MATERNELLE';

    // Top Bilingual Header
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    // Left side (French)
    doc.text('RÉPUBLIQUE DU CAMEROUN', 20, 10);
    doc.text('Paix - Travail - Patrie', 20, 14);
    doc.text('MINISTÈRE DE L\'ÉDUCATION DE BASE', 20, 18);
    // Right side (English)
    doc.text('REPUBLIC OF CAMEROON', 190, 10, { align: 'right' });
    doc.text('Peace - Work - Fatherland', 190, 14, { align: 'right' });
    doc.text('MINISTRY OF BASIC EDUCATION', 190, 18, { align: 'right' });

    // Center Logo/School Info
    doc.setFontSize(12);
    doc.text(school.name.toUpperCase(), 105, 30, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(school.motto || '', 105, 35, { align: 'center' });
    doc.text(school.address || '', 105, 39, { align: 'center' });
    doc.text(`BP: ${school.bp || '....'}`, 105, 43, { align: 'center' });

    doc.setDrawColor(200, 200, 200);
    doc.line(20, 48, 190, 48);

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    const termTitle = term === 1 ? '1ER TRIMESTRE / 1ST TERM' : term === 2 ? '2E TRIMESTRE / 2ND TERM' : '3E TRIMESTRE / 3RD TERM';
    doc.text('BULLETIN DE NOTES / REPORT CARD', 105, 58, { align: 'center' });
    doc.setFontSize(10);
    doc.text(termTitle, 105, 65, { align: 'center' });

    // Student Info Box
    doc.setDrawColor(30, 41, 59);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(20, 72, 170, 35, 3, 3, 'FD');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('NOM ET PRÉNOM / FULL NAME:', 25, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(`${student.last_name} ${student.first_name}`, 80, 80);

    doc.setFont('helvetica', 'bold');
    doc.text('MATRICULE / REG. NUMBER:', 25, 87);
    doc.setFont('helvetica', 'normal');
    doc.text(student.matricule, 80, 87);

    doc.setFont('helvetica', 'bold');
    doc.text('CLASSE / CLASS:', 25, 94);
    doc.setFont('helvetica', 'normal');
    doc.text(classObj.name, 80, 94);

    doc.setFont('helvetica', 'bold');
    doc.text('ANNÉE SCOLAIRE / SCHOOL YEAR:', 120, 80);
    doc.setFont('helvetica', 'normal');
    doc.text(`${new Date().getFullYear() - 1}/${new Date().getFullYear()}`, 175, 80, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.text('SECTION:', 120, 87);
    doc.setFont('helvetica', 'normal');
    doc.text(classObj.section, 175, 87, { align: 'right' });

    // Grades Table
    const tableHeaders = isNursery
        ? [['MATIÈRE / DOMAINE (SUBJECT / DOMAIN)', 'ÉVALUATION (RATING)', 'OBSERVATION']]
        : [['MATIÈRE (SUBJECT)', 'NOTE/20', 'COEF', 'TOTAL', 'APPRÉCIATION']];

    const tableBody = grades.map((g: any) => {
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
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 8, fontStyle: 'bold' },
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
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, finalY, 170, 40);

    doc.setFont('helvetica', 'bold');
    doc.text('RÉSUMÉ DES PERFORMANCES / PERFORMANCE SUMMARY', 25, finalY + 7);
    doc.line(25, finalY + 9, 110, finalY + 9);

    const totalAbsence = attendance.reduce((acc: number, cur: any) => acc + (cur.hours_absent || 0), 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Absences: ${totalAbsence} Heures/Hours`, 25, finalY + 16);
    doc.text(`Conduite / Conduct: ${calculateAttendanceObservations(totalAbsence)}`, 25, finalY + 23);

    if (!isNursery) {
        const totalPoints = grades.reduce((acc: number, g: any) => acc + (g.score * g.coefficient), 0);
        const totalCoef = grades.reduce((acc: number, g: any) => acc + g.coefficient, 0);
        const average = totalPoints / (totalCoef || 1);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`MOYENNE / AVERAGE: ${average.toFixed(2)} / 20`, 120, finalY + 16);
        doc.text(`RANG / RANK: ${rank || '--'} / ${totalStudents || '--'}`, 120, finalY + 23);

        const decision = average >= 10 ? 'TRAVAIL SATISFAISANT' : 'EFFORTS SOUTENUS REQUIS';
        doc.text(`DÉCISION: ${decision}`, 120, finalY + 30);
    }

    // Signatures
    const sigY = finalY + 55;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('L\'ENSEIGNANT (TEACHER)', 30, sigY);
    doc.text('PARENT / GUARDIAN', 90, sigY);
    doc.text('LE DIRECTEUR (HEADMASTER)', 145, sigY);

    // Footer
    doc.setFontSize(7);
    doc.setFont('helvetica', 'italic');
    doc.text(`Généré par Eco-Manage le ${new Date().toLocaleDateString()} - Document Officiel`, 105, 285, { align: 'center' });

    doc.save(`Bulletin_${student.matricule}_T${term}.pdf`);
};

export const generatePaymentReceipt = (payment: any, student: any, financials: any) => {
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text('REÇU DE PAIEMENT', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`REÇU N°: ${payment.receipt_number}`, 20, 35);
    doc.text(`DATE: ${new Date(payment.payment_date).toLocaleDateString()}`, 140, 35);

    doc.line(20, 40, 190, 40);

    doc.text(`ÉLÈVE: ${student.last_name} ${student.first_name}`, 20, 55);
    doc.text(`MATRICULE: ${student.matricule}`, 20, 62);

    doc.setFontSize(12);
    doc.text(`MONTANT PAYÉ: ${payment.amount.toLocaleString()} FCFA`, 20, 80);
    doc.text(`MOTIF: ${payment.payment_type.toUpperCase()}`, 20, 90);

    doc.setFontSize(10);
    doc.text('SITUATION FINANCIÈRE APRÈS PAIEMENT:', 20, 110);
    doc.text(`Total dû: ${financials.totalDue.toLocaleString()} FCFA`, 30, 120);
    doc.text(`Total versé: ${financials.totalPaid.toLocaleString()} FCFA`, 30, 128);
    doc.text(`Reste à payer: ${financials.balance.toLocaleString()} FCFA`, 30, 136);

    doc.text('Signature de l\'Économe', 140, 160);

    doc.save(`Recu_${payment.receipt_number}.pdf`);
};

export const generateRegistrationSheet = (student: any) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('FICHE D\'ENREGISTREMENT ÉLÈVE', 105, 20, { align: 'center' });

    doc.setFontSize(12);
    doc.text(`MATRICULE: ${student.matricule}`, 20, 40);
    doc.text(`NOM: ${student.last_name}`, 20, 50);
    doc.text(`PRÉNOM: ${student.first_name}`, 20, 60);
    doc.text(`CLASSE: ${student.className}`, 20, 70);
    doc.text(`SECTION: ${student.section}`, 20, 80);
    doc.text(`CONTACT PARENT: ${student.parent_contact}`, 20, 90);
    doc.text(`INFOS MÉDICALES: ${student.medical_info || 'N/A'}`, 20, 100);

    doc.save(`Fiche_${student.matricule}.pdf`);
};
