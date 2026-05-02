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
    tableHead = [[
      student.section === 'ANGLOPHONE' ? 'Domains / Subjects' : 'Domaines / Activités',
      'Cote',
      student.section === 'ANGLOPHONE' ? 'Appreciation' : 'Appréciation'
    ]];
    tableBody = grades.map(g => {
        const score = typeof g.score === 'number' ? g.score : 0;
        const appreciation = getAppreciationNursery(score);
        return [g.subject_name || g.subject, appreciation.code, appreciation.label];
    });
  } else {
    tableHead = [[
      student.section === 'ANGLOPHONE' ? 'Subjects' : 'Matières',
      'Note / 20',
      'Coef',
      'Total',
      student.section === 'ANGLOPHONE' ? 'Appreciation' : 'Appréciation'
    ]];
    tableBody = grades.map(g => {
      const score = typeof g.score === 'number' ? g.score : 0;
      const coef = typeof g.coef === 'number' ? g.coef : 1;
      const total = score * coef;
      let app = student.section === 'ANGLOPHONE' ? 'Average' : 'Passable';
      if (score >= 16) app = student.section === 'ANGLOPHONE' ? 'Excellent' : 'Excellent';
      else if (score >= 14) app = student.section === 'ANGLOPHONE' ? 'Very Good' : 'Très Bien';
      else if (score >= 12) app = student.section === 'ANGLOPHONE' ? 'Good' : 'Bien';
      else if (score < 10) app = student.section === 'ANGLOPHONE' ? 'Poor' : 'Médiocre';

      return [g.subject_name || g.subject, score, coef, total, app];
    });
  }

  autoTable(doc, {
    startY: 65,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [212, 175, 55], textColor: [0, 0, 0], fontSize: 9 },
    columnStyles: { 0: { cellWidth: 80 } },
    didDrawCell: (_data) => {
        // Group rows by domain logic could go here if tableBody was sorted
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Summary Stats (Cameroon Standard)
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Total des Points: ${grades.reduce((acc, g) => acc + (g.score * (g.coef || 1)), 0).toFixed(2)}`, 14, finalY);
  doc.text(`Moyenne de l'élève: ${student.average || 'N/A'} / 20`, 14, finalY + 5);
  doc.text(`Rang: ${student.rank || 'N/A'} ex aequo`, 14, finalY + 10);

  doc.text(`Moyenne de Classe: ${student.classAverage || 'N/A'}`, 140, finalY);
  doc.text(`Moyenne du Premier: ${student.bestAverage || 'N/A'}`, 140, finalY + 5);
  doc.text(`Moyenne du Dernier: ${student.worstAverage || 'N/A'}`, 140, finalY + 10);

  // Attendance
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Absences: ${student.absences || 0} jours`, 14, finalY + 15);

  // Footer / Signatures
  doc.text('Visa Enseignant', 14, finalY + 30);
  doc.text('Visa Directeur', 105, finalY + 30, { align: 'center' });
  doc.text('Visa Parent', 180, finalY + 30, { align: 'right' });

  doc.save(`bulletin_${student.matricule}.pdf`);
};

export const generateRegistrationSheet = (student: any) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(10);
  doc.text('ECO-MANAGE - FICHE D\'ENREGISTREMENT ELEVE', 105, 20, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.line(20, 25, 190, 25);

  // Content
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('IDENTITE DE L\'ELEVE', 20, 40);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Nom Complet: ${student.last_name} ${student.first_name}`, 20, 50);
  doc.text(`Matricule: ${student.matricule}`, 20, 57);
  doc.text(`Date & Lieu de Naissance: ${student.birth_date} à ${student.birth_place}`, 20, 64);
  doc.text(`Sexe: ${student.gender === 'M' ? 'Masculin' : 'Féminin'}`, 20, 71);
  doc.text(`Section: ${student.section}`, 20, 78);

  doc.setFont('helvetica', 'bold');
  doc.text('CONTACTS & URGENCE', 20, 95);
  doc.setFont('helvetica', 'normal');
  doc.text(`Contact Parent principal: ${student.parent_contact}`, 20, 105);
  doc.text(`Contact d'Urgence: ${student.emergency_contact || 'N/A'}`, 20, 112);
  doc.text(`Adresse: ${student.address || 'N/A'}`, 20, 119);

  doc.setFont('helvetica', 'bold');
  doc.text('INFORMATIONS MEDICALES', 20, 135);
  doc.setFont('helvetica', 'normal');
  doc.rect(20, 140, 170, 40);
  doc.text(student.medical_info || 'Aucune information médicale signalée.', 25, 147, { maxWidth: 160 });

  doc.setFontSize(8);
  doc.text(`Généré le ${new Date().toLocaleDateString()} par le Secrétariat Eco-Manage`, 105, 280, { align: 'center' });

  doc.save(`fiche_inscription_${student.matricule}.pdf`);
};
