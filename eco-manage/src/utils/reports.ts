import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getAppreciationNursery } from './pedagogy';

export const generateReportCard = (student: any, grades: any[], _section: string) => {
  const doc = new jsPDF();
  const isNursery = student.level === 'MATERNELLE';

  // Header
  doc.setFontSize(8);
  doc.text('REPUBLIQUE DU CAMEROUN', 105, 10, { align: 'center' });
  doc.text('REPUBLIC OF CAMEROON', 105, 13, { align: 'center' });
  doc.text('MINISTERE DE L\'EDUCATION DE BASE', 105, 16, { align: 'center' });
  doc.text('MINISTRY OF BASIC EDUCATION', 105, 19, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  const title = isNursery ? 'CARNET DE SUIVI (MATERNELLE) / PROGRESS REPORT' : 'BULLETIN DE NOTES / PROGRESS REPORT';
  doc.text(title, 105, 30, { align: 'center' });

  // Student Info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nom / Name: ${student.lastName} ${student.firstName}`, 14, 45);
  doc.text(`Matricule / ID: ${student.matricule}`, 14, 50);
  doc.text(`Classe / Class: ${student.className}`, 14, 55);
  doc.text(`Section: ${student.section}`, 140, 55);

  // Table logic
  let tableHead, tableBody;

  if (isNursery) {
    tableHead = [['Domaines / Subjects', 'Note / 20', 'Cote', 'Appréciation']];
    tableBody = grades.map(g => {
        const appreciation = getAppreciationNursery(g.score);
        return [g.subject, g.score, appreciation.code, appreciation.label];
    });
  } else {
    tableHead = [['Matières / Subjects', 'Note / 20', 'Coef', 'Total', 'Appréciation']];
    tableBody = grades.map(g => [g.subject, g.score, g.coef, (g.score * g.coef), g.appreciation]);
  }

  autoTable(doc, {
    startY: 65,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontSize: 9 },
    columnStyles: { 0: { cellWidth: 80 } }
  });

  // Attendance
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(9);
  doc.text(`Absences: ${student.absences || 0} jours`, 14, finalY);

  // Footer / Signatures
  doc.text('Visa Enseignant', 14, finalY + 20);
  doc.text('Visa Directeur', 105, finalY + 20, { align: 'center' });
  doc.text('Visa Parent', 180, finalY + 20, { align: 'right' });

  doc.save(`bulletin_${student.matricule}.pdf`);
};
