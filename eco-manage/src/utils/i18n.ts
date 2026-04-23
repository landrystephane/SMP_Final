import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr',
    lng: 'fr', // Explicitly set language for consistent testing
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      fr: {
        translation: {
          dashboard: 'Tableau de bord',
          students: 'Élèves',
          grades: 'Notes',
          finance: 'Finance',
          login: 'Se connecter',
          logout: 'Déconnexion',
          welcome: 'Bienvenue sur Eco-Manage',
          new_student: 'Nouvel Élève',
          save: 'Enregistrer',
          cancel: 'Annuler',
          search: 'Rechercher...',
          matricule: 'Matricule',
          full_name: 'Nom complet',
          class: 'Classe',
          section: 'Section',
          actions: 'Actions',
          evaluation_period: 'Période d\'évaluation',
          attendance: 'Présences',
          founder_stats: 'Statistiques Globales',
        }
      },
      en: {
        translation: {
          dashboard: 'Dashboard',
          students: 'Students',
          grades: 'Grades',
          finance: 'Finance',
          login: 'Login',
          logout: 'Logout',
          welcome: 'Welcome to Eco-Manage',
          new_student: 'New Student',
          save: 'Save',
          cancel: 'Cancel',
          search: 'Search...',
          matricule: 'ID Number',
          full_name: 'Full Name',
          class: 'Class',
          section: 'Section',
          actions: 'Actions',
          evaluation_period: 'Evaluation Period',
          attendance: 'Attendance',
          founder_stats: 'Global Statistics',
        }
      }
    }
  });

export default i18n;
