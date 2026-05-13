import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { getNurseryAppreciation, getPrimaryAppreciation, calculateAttendanceObservations } from './pedagogy';

export const generateReportCard = (data: any) => {
    const { student, classObj, school, grades, attendance, term } = data;
    const doc = new jsPDF();
    const isNursery = classObj.level === 'MATERNELLE';

    // Header
    doc.setFontSize(10);
    doc.text(school.name.toUpperCase(), 105, 15, { align: 'center' });
    doc.setFontSize(8);
    doc.text(school.motto || 'Paix - Travail - Patrie', 105, 20, { align: 'center' });
    doc.text(school.address || '', 105, 25, { align: 'center' });

    doc.line(20, 30, 190, 30);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`BULLETIN DE NOTES - TRIMESTRE ${term}`, 105, 40, { align: 'center' });

    // Student Info
    doc.setFontSize(10);
    doc.text(`ÉLÈVE: ${student.last_name} ${student.first_name}`, 20, 55);
    doc.text(`MATRICULE: ${student.matricule}`, 20, 62);
    doc.text(`CLASSE: ${classObj.name}`, 140, 55);
    doc.text(`ANNÉE: ${new Date().getFullYear()}`, 140, 62);

    // Grades Table
    const tableHeaders = isNursery
        ? [['MATIÈRE / DOMAINE', 'ÉVALUATION', 'OBSERVATION']]
        : [['MATIÈRE', 'NOTE', 'COEF', 'TOTAL', 'APPRÉCIATION']];

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
        startY: 75,
        head: tableHeaders,
        body: tableBody,
        theme: 'grid',
        headStyles: { fillColor: [30, 41, 59], textColor: 255 },
    });

    // Summary & Attendance
    const finalY = (doc as any).lastAutoTable.finalY + 15;
    const totalAbsence = attendance.reduce((acc: number, cur: any) => acc + (cur.hours_absent || 0), 0);

    doc.setFontSize(10);
    doc.text('RÉSUMÉ PÉDAGOGIQUE', 20, finalY);
    doc.setFontSize(9);
    doc.text(`Absences: ${totalAbsence} heures`, 20, finalY + 8);
    doc.text(`Conduite: ${calculateAttendanceObservations(totalAbsence)}`, 20, finalY + 16);

    if (!isNursery) {
        const totalPoints = grades.reduce((acc: number, g: any) => acc + (g.score * g.coefficient), 0);
        const totalCoef = grades.reduce((acc: number, g: any) => acc + g.coefficient, 0);
        const average = totalPoints / (totalCoef || 1);

        doc.setFontSize(12);
        doc.text(`MOYENNE GÉNÉRALE: ${average.toFixed(2)} / 20`, 140, finalY + 16, { align: 'right' });
    }

    // Signatures
    doc.text('L\'ENSEIGNANT', 30, finalY + 40);
    doc.text('LE DIRECTEUR', 150, finalY + 40);

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
