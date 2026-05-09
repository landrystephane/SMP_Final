# Cahier des Charges : Eco-Manage

## 1. Contexte du Projet
Eco-Manage est une application de gestion pour un établissement scolaire camerounais comprenant une section maternelle et une section primaire. L'établissement est bilingue (Francophone et Anglophone).

## 2. Objectifs
- Digitaliser l'enregistrement des élèves et du personnel.
- Automatiser le calcul des moyennes et la génération des bulletins.
- Sécuriser la saisie des notes (Verrouillage après enregistrement).
- Assurer le suivi financier (Pensions, Inscriptions).

## 3. Profils Utilisateurs et Droits
- **Fondateur** : Super-utilisateur, accès aux statistiques financières et pédagogiques globales.
- **Directeur** : Validation finale des notes, déverrouillage des saisies en cas d'erreur, signature des bulletins.
- **Secrétaire Général (SG)** : Remplace le directeur en cas d'absence (Mode Intérim), gère les présences.
- **Économe** : Gestion exclusive des finances (pensions, frais de transport, cantine).
- **Secrétaire** : Inscription des élèves, édition des fiches d'enregistrement.
- **Enseignants** : Saisie des notes de leur classe respective, appel journalier.

## 4. Spécificités Pédagogiques (Cameroun)
### Maternelle
- Notation par cotes : **A+** (Acquis avec Mention), **A** (Acquis), **ECA** (En Cours d'Acquisition), **NA** (Non Acquis).
- Évaluation par domaines d'activités.

### Primaire
- Notation numérique sur 20.
- Utilisation de coefficients par matière.
- Moyenne trimestrielle calculée sur la base des évaluations mensuelles.

## 5. Fonctionnalités Techniques
- **Mode Offline** : L'application doit fonctionner sans connexion internet (SQLite local).
- **Synchronisation Mobile** : Les enseignants peuvent utiliser leur téléphone pour l'appel et les notes via un point d'accès Wi-Fi local à l'école.
- **Export PDF** : Reçus, Bulletins, Fiches d'inscription.

## 6. Architecture logicielle
- **Frontend** : React/TS avec Tailwind CSS.
- **Desktop** : Electron pour une application native Windows/Mac/Linux.
- **Mobile** : Progressive Web App (PWA) / Capacitor.
- **Base de données** : SQLite géré via le process Main d'Electron.
