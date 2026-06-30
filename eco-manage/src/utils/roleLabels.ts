const ROLE_LABELS_FR: Record<string, string> = {
  SUPERADMIN: 'Super Administrateur',
  FOUNDER: 'le Fondateur',
  DIRECTOR: 'le Directeur',
  SG: 'le Secrétaire Général',
  SECRETARY: 'la Secrétaire',
  BURSAR: "l'Économe",
  TEACHER: 'un Enseignant',
  ADVISOR: 'le Conseiller Pédagogique',
  PARENT: 'un Parent',
  DRIVER: 'le Chauffeur',
  MAINTENANCE: 'la Maintenance',
};

const ROLE_LABELS_EN: Record<string, string> = {
  SUPERADMIN: 'Super Admin',
  FOUNDER: 'the Founder',
  DIRECTOR: 'the Director',
  SG: 'the General Secretary',
  SECRETARY: 'the Secretary',
  BURSAR: 'the Bursar',
  TEACHER: 'a Teacher',
  ADVISOR: 'the Pedagogical Advisor',
  PARENT: 'a Parent',
  DRIVER: 'the Driver',
  MAINTENANCE: 'Maintenance Staff',
};

export const getRoleLabel = (role: string | undefined | null, lang: string = 'fr'): string => {
  const map = lang.startsWith('en') ? ROLE_LABELS_EN : ROLE_LABELS_FR;
  return map[role || ''] || (lang.startsWith('en') ? 'a staff member' : 'un membre du personnel');
};
