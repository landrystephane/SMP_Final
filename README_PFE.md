# Compte Rendu : Application ECO-MANAGE (PFE)

## 1. Contexte du Projet
Eco-Manage est un système de gestion scolaire intégré conçu spécifiquement pour les établissements bilingues (Francophone & Anglophone) au Cameroun, couvrant les cycles Maternelle et Primaire.

## 2. Architecture Technique
- **Frontend** : React.js avec TypeScript, Tailwind CSS pour une interface moderne (Thème Dark & Amber).
- **Desktop Wrapper** : Electron.js, permettant une installation sur PC Windows/Mac.
- **Base de Données** : SQLite (via better-sqlite3) pour un stockage local robuste et sécurisé.
- **Mobile Sync** : Serveur API Express.js intégré permettant aux enseignants de synchroniser les notes depuis leurs smartphones via le Wi-Fi local.

## 3. Fonctionnalités Clés Implémentées

### A. Gestion Administrative & Utilisateurs
- **Rôles Multiples** : Fondateur, Directeur, Secrétaire Général (SG), Secrétariat, Économe, Enseignants, Conseiller Pédagogique, Chauffeur.
- **Sécurité des Notes** : Une fois les notes enregistrées, elles sont **verrouillées**. Seul le **Directeur** ou le **Fondateur** peut les déverrouiller pour correction.
- **Mode Intérim** : Le Fondateur peut activer un mode "Suppléance" permettant au SG d'exercer les droits du Directeur en son absence.

### B. Gestion Pédagogique (Normes MINEDUB)
- **Maternelle** : Évaluation qualitative par domaines (A+, A, ECA, NA) conforme au bulletin national.
- **Primaire** : Notation sur 20 avec calcul automatique des moyennes, coefficients et appréciations.
- **Bilinguisme** : Support complet des sections Francophone et Anglophone avec terminologie spécifique.
- **Cahier de Présence** : Suivi des absences en heures avec sanctions prévisionnelles automatisées.

### C. Gestion Financière (Économe)
- **Paiements par Tranches** : Configuration personnalisée des frais de scolarité par classe (Inscription + 3 Tranches).
- **Imputation Automatique** : Les versements sont automatiquement affectés aux dettes chronologiques de l'élève.
- **Recouvrement** : Alertes en temps réel sur le tableau de bord concernant les élèves insolvables.
- **Reçus** : Génération de reçus PDF professionnels lors de chaque transaction.

### D. Communication & Support
- **Ticketing Interne** : Système de requêtes permettant au staff de communiquer avec l'administration (ex: demande de déverrouillage de notes).
- **Tableau de Bord Global** : Diagnostic visuel des effectifs, taux de réussite et santé financière de l'école.

## 4. Instructions de Connexion (Test)
- **Fondateur** : `admin` / `admin`
- **Enseignant** : `teacher` / `teacher`

## 5. Mobile & Synchronisation
L'application expose un serveur sur le port 3001 du réseau local. Les enseignants peuvent utiliser le module "Sync Center" pour pousser leurs saisies mobiles vers la base de données centrale.
