import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'fr',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
    resources: {
      fr: {
        translation: {
          dashboard: 'Tableau de Bord',
          students: 'Gestion des Élèves',
          subjects: 'Gestion des Matières',
          grades: 'Saisie des Notes',
          finance: 'Gestion Financière',
          tuition_config: 'Config Scolarité',
          attendance: 'Cahier de Présence',
          admin: 'Contrôle Accès',
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
          founder_stats: 'Statistiques Globales',
          grades_entry: 'Saisie des Notes',
          unlock: 'Déverrouiller',
          payments: 'Paiements',
          transport: 'Transport',
          profile: 'Mon Profil',
          tickets: 'Requêtes',
          settings: 'Paramètres',
          acting_director: 'Mode Intérim Directeur',
          medical_info: 'Infos Santé',
          emergency_contact: 'Contact d\'Urgence'
        }
      },
      en: {
        translation: {
          dashboard: 'Dashboard',
          students: 'Student Management',
          subjects: 'Subject Management',
          grades: 'Grades Entry',
          finance: 'Finance Management',
          tuition_config: 'Tuition Fees',
          attendance: 'Daily Attendance',
          admin: 'Access Control',
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
          founder_stats: 'Global Statistics',
          grades_entry: 'Grades Entry',
          unlock: 'Unlock',
          payments: 'Payments',
          transport: 'Transport',
          profile: 'My Profile',
          tickets: 'Requests',
          settings: 'Settings',
          acting_director: 'Acting Director Mode',
          medical_info: 'Health Info',
          emergency_contact: 'Emergency Contact'
        }
      }
    }
  });

export default i18n;
