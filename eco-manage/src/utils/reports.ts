import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getAppreciationNursery, getAppreciationPrimary } from './pedagogy';

export const generateReportCard = (student: any, grades: any[], section: string, allSubjects: any[]) => {
  const doc = new jsPDF();
  const isNursery = student.level === 'MATERNELLE';
  const isEnglish = section === 'ANGLOPHONE';

  // Header
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('REPUBLIQUE DU CAMEROUN', 105, 10, { align: 'center' });
  doc.text('REPUBLIC OF CAMEROON', 105, 13, { align: 'center' });
  doc.text('MINISTERE DE L\'EDUCATION DE BASE', 105, 16, { align: 'center' });
  doc.text('MINISTRY OF BASIC EDUCATION', 105, 19, { align: 'center' });

  doc.setFontSize(14);
  const title = isNursery
    ? (isEnglish ? 'PROGRESS REPORT (NURSERY)' : 'CARNET DE SUIVI (MATERNELLE)')
    : (isEnglish ? 'PROGRESS REPORT' : 'BULLETIN DE NOTES');
  doc.text(title, 105, 30, { align: 'center' });

  // Student & School Info Box
  doc.setDrawColor(200);
  doc.rect(14, 38, 182, 30);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${isEnglish ? 'Name' : 'Nom'} : ${student.lastName || student.last_name} ${student.firstName || student.first_name}`, 20, 45);
  doc.text(`${isEnglish ? 'ID' : 'Matricule'} : ${student.matricule}`, 20, 52);
  doc.text(`Classe : ${student.className || 'N/A'}`, 20, 59);

  doc.text(`Section : ${section}`, 130, 45);
  doc.text(`Année : 2025-2026`, 130, 52);
  doc.text(`Trimestre : ${student.term || '1'}`, 130, 59);

  // Merge grades with all subjects to ensure every subject appears
  const completeGrades = allSubjects.map(subject => {
      const grade = grades.find(g => g.subject_id === subject.id);
      return {
          ...subject,
          score: grade ? grade.score : null,
          coef: subject.coefficient
      };
  });

  // Table logic
  let tableHead, tableBody;

  if (isNursery) {
    tableHead = [[isEnglish ? 'Domains / Subjects' : 'Domaines / Activités', 'Cote', isEnglish ? 'Appreciation' : 'Appréciation']];
    tableBody = completeGrades.map(g => {
        const appreciation = g.score !== null ? getAppreciationNursery(g.score, isEnglish) : { code: '-', label: '-', label_en: '-' };
        return [g.name, appreciation.code, isEnglish ? appreciation.label_en : appreciation.label];
    });
  } else {
    tableHead = [[isEnglish ? 'Subjects' : 'Matières', 'Note / 20', 'Coef', 'Total', isEnglish ? 'Appreciation' : 'Appréciation']];
    tableBody = completeGrades.map(g => {
      const score = g.score;
      const coef = g.coef || 1;
      const total = score !== null ? (score * coef).toFixed(2) : '-';
      const app = score !== null ? (isEnglish ? getAppreciationPrimary(score, true) : getAppreciationPrimary(score)) : '-';

      return [g.name, score !== null ? score : '-', coef, total, app];
    });
  }

  autoTable(doc, {
    startY: 75,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 80 } },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Summary Stats
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  const gradedSubjects = completeGrades.filter(g => g.score !== null);
  const totalPoints = gradedSubjects.reduce((acc, g) => acc + (g.score * (g.coef || 1)), 0);
  const totalCoef = gradedSubjects.reduce((acc, g) => acc + (g.coef || 1), 0);
  const average = totalCoef > 0 ? (totalPoints / totalCoef).toFixed(2) : '0.00';

  doc.text(`Total : ${totalPoints.toFixed(2)} / ${totalCoef * 20}`, 14, finalY);
  doc.text(`${isEnglish ? 'Average' : 'Moyenne'} : ${average} / 20`, 14, finalY + 7);
  doc.text(`${isEnglish ? 'Rank' : 'Rang'} : ${student.rank || '...'}`, 14, finalY + 14);

  doc.text(`${isEnglish ? 'Class Average' : 'Moy. Classe'} : ${student.classAverage || '...'}`, 130, finalY);
  doc.text(`${isEnglish ? 'Absences' : 'Absences'} : ${student.absences || 0} ${isEnglish ? 'hours' : 'heures'}`, 130, finalY + 7);

  // Observation after absences
  let observation = "RAS";
  if (student.absences > 10) observation = isEnglish ? "Warning: Excessive absences" : "Blâme: Absences excessives";
  else if (student.absences > 5) observation = isEnglish ? "Notice: Regular attendance required" : "Avertissement: Manque d'assiduité";

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.text(`Observation : ${observation}`, 130, finalY + 14);

  // Decision
  doc.setFont('helvetica', 'bold');
  doc.setLineWidth(0.5);
  doc.line(14, finalY + 22, 196, finalY + 22);
  doc.text(isEnglish ? 'ADMISSION DECISION' : 'DÉCISION DU CONSEIL', 14, finalY + 30);
  doc.setFont('helvetica', 'normal');
  doc.rect(14, finalY + 34, 182, 15);

  // Footer / Signatures
  doc.setFontSize(9);
  doc.text(isEnglish ? 'Teacher\'s Signature' : 'Visa Enseignant', 14, finalY + 65);
  doc.text(isEnglish ? 'Parent\'s Signature' : 'Visa Parent', 105, finalY + 65, { align: 'center' });
  doc.text(isEnglish ? 'Director\'s Signature' : 'Visa Directeur', 196, finalY + 65, { align: 'right' });

  doc.save(`bulletin_${student.matricule}.pdf`);
};

export const generateRegistrationSheet = (student: any) => {
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ECO-MANAGE - FICHE D\'ENREGISTREMENT', 105, 20, { align: 'center' });

  doc.setLineWidth(0.5);
  doc.line(20, 25, 190, 25);

  doc.setFontSize(11);
  doc.text('IDENTITE DE L\'ELEVE', 20, 40);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nom Complet: ${student.last_name} ${student.first_name}`, 20, 50);
  doc.text(`Matricule: ${student.matricule}`, 20, 57);
  doc.text(`Classe Affectée: ${student.className || 'Non définie'}`, 20, 64);
  doc.text(`Quartier: ${student.neighborhood || 'N/A'}`, 20, 71);
  doc.text(`Date & Lieu de Naissance: ${student.birth_date} à ${student.birth_place}`, 20, 78);
  doc.text(`Sexe: ${student.gender === 'M' ? 'Masculin' : 'Féminin'}`, 20, 85);
  doc.text(`Section: ${student.section}`, 20, 92);

  doc.setFont('helvetica', 'bold');
  doc.text('CONTACTS D\'URGENCE', 20, 110);
  doc.setFont('helvetica', 'normal');
  doc.text(`Parent: ${student.parent_contact}`, 20, 120);
  doc.text(`Urgence: ${student.emergency_contact || 'N/A'}`, 20, 127);

  doc.setFont('helvetica', 'bold');
  doc.text('INFORMATIONS MEDICALES', 20, 145);
  doc.setFont('helvetica', 'normal');
  doc.rect(20, 150, 170, 30);
  doc.text(student.medical_info || 'Néant.', 25, 160, { maxWidth: 160 });

  doc.setFontSize(8);
  doc.text(`Document généré le ${new Date().toLocaleDateString()} par le Secrétariat Eco-Manage`, 105, 280, { align: 'center' });

  doc.save(`fiche_${student.matricule}.pdf`);
};

export const generatePaymentReceipt = (payment: any, student: any, financials: any) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('REÇU DE PAIEMENT / PAYMENT RECEIPT', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`N°: ${payment.receipt_number}`, 105, 28, { align: 'center' });

    doc.rect(14, 40, 182, 100);
    doc.setFontSize(12);
    doc.text(`Élève / Student: ${student.last_name} ${student.first_name}`, 20, 55);
    doc.text(`Matricule / ID: ${student.matricule}`, 20, 62);
    doc.text(`Classe / Class: ${student.className || 'N/A'}`, 20, 69);
    doc.text(`Motif / Purpose: ${payment.payment_type}`, 20, 79);

    doc.setFontSize(14);
    doc.text(`MONTANT VERSÉ: ${payment.amount.toLocaleString()} FCFA`, 20, 95);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Scolarité Totale: ${financials.totalDue.toLocaleString()} FCFA`, 20, 110);
    doc.text(`Cumul payé: ${financials.totalPaid.toLocaleString()} FCFA`, 20, 117);
    doc.text(`RESTE À PAYER: ${financials.balance.toLocaleString()} FCFA`, 20, 124);

    // Breakdown
    doc.setFontSize(8);
    let breakdownText = `Répartition: Inscription: ${financials.breakdown.registration.toLocaleString()}`;
    financials.breakdown.installments.forEach((inst: any) => {
        breakdownText += ` | ${inst.name}: ${inst.paid.toLocaleString()}`;
    });
    doc.text(breakdownText, 20, 132);

    doc.text(`Fait le ${new Date().toLocaleDateString()}`, 140, 155);
    doc.text('Le Caissier / Bursar', 140, 165);

    doc.save(`recu_${payment.receipt_number}.pdf`);
};
