import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateReportCard = (student: any, grades: any[], _section: string) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(10);
  doc.text('REPUBLIQUE DU CAMEROUN', 105, 10, { align: 'center' });
  doc.text('REPUBLIC OF CAMEROON', 105, 15, { align: 'center' });
  doc.text('MINISTERE DE L\'EDUCATION DE BASE', 105, 20, { align: 'center' });
  doc.text('MINISTRY OF BASIC EDUCATION', 105, 25, { align: 'center' });

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('BULLETIN DE NOTES / PROGRESS REPORT', 105, 40, { align: 'center' });

  // Student Info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nom de l'élève / Name: ${student.lastName} ${student.firstName}`, 14, 55);
  doc.text(`Matricule / ID: ${student.matricule}`, 14, 62);
  doc.text(`Classe / Class: ${student.className}`, 14, 69);
  doc.text(`Année Scolaire / School Year: 2025/2026`, 140, 69);

  // Table
  const tableRows = grades.map(g => [
    g.subject,
    g.score,
    20,
    g.appreciation
  ]);

  autoTable(doc, {
    startY: 80,
    head: [['Matières / Subjects', 'Note', 'Max', 'Appréciation']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0] },
  });

  // Footer / Signatures
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.text('Visa de l\'Enseignant', 14, finalY);
  doc.text('Visa du Directeur', 105, finalY, { align: 'center' });
  doc.text('Visa du Parent', 180, finalY, { align: 'right' });

  doc.save(`bulletin_${student.matricule}.pdf`);
};
