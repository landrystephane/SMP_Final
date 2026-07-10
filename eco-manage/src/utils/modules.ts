export interface AppModule {
  key: string;
  label: string;
}

export const AVAILABLE_MODULES: AppModule[] = [
  { key: 'students', label: 'Gestion des Élèves' },
  { key: 'subjects', label: 'Matières' },
  { key: 'classes', label: 'Classes' },
  { key: 'grades', label: 'Saisie des Notes' },
  { key: 'pedagogy_advisor', label: 'Conseiller Pédagogique' },
  { key: 'finance', label: 'Gestion Financière' },
  { key: 'tuition_config', label: 'Configuration Scolarité' },
  { key: 'attendance', label: 'Cahier de Présence' },
  { key: 'stats', label: 'Statistiques' },
  { key: 'admin', label: 'Contrôle Accès' },
  { key: 'users', label: 'Utilisateurs' },
  { key: 'parents', label: 'Portail Parents' },
  { key: 'transport', label: 'Transport' },
  { key: 'tickets', label: 'Requêtes' },
  { key: 'messaging', label: 'Messagerie Interne' },
  { key: 'customization', label: 'Personnalisation' },
  { key: 'archives', label: 'Archives Annuelles' },
  { key: 'sync', label: 'Synchronisation' },
];
