/**
 * Cameroon MINEDUB Standards for Grade Evaluation
 */

export const NURSERY_DOMAINS = [
  'Langue et Communication (Language & Communication)',
  'Éveil Scientifique (Science & Tech)',
  'Vie Courante (Life Skills)',
  'Création et Artistique (Arts & Craft)',
  'Motricité (Physical Education)'
];

export const getAppreciationNursery = (score: number) => {
  if (score >= 18) return { code: 'A+', label: 'Expert', label_en: 'Expert' };
  if (score >= 15) return { code: 'A', label: 'Acquis', label_en: 'Acquired' };
  if (score >= 11) return { code: 'ECA', label: 'En cours d\'acquisition', label_en: 'In progress' };
  return { code: 'NA', label: 'Non acquis', label_en: 'Not acquired' };
};

export const getAppreciationPrimary = (score: number, isEnglish: boolean = false) => {
  if (isEnglish) {
      if (score >= 18) return 'Excellent';
      if (score >= 16) return 'Very Good';
      if (score >= 14) return 'Good';
      if (score >= 12) return 'Fairly Good';
      if (score >= 10) return 'Average';
      return 'Poor';
  }
  if (score >= 18) return 'Excellent';
  if (score >= 16) return 'Très Bien';
  if (score >= 14) return 'Bien';
  if (score >= 12) return 'Assez Bien';
  if (score >= 10) return 'Passable';
  return 'Médiocre';
};

export const calculateAverage = (scores: number[]) => {
  if (scores.length === 0) return 0;
  const sum = scores.reduce((a, b) => a + b, 0);
  return (sum / scores.length).toFixed(2);
};
