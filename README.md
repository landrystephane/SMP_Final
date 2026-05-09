# Eco-Manage : Système de Gestion Scolaire Bilingue (PFE 5ème Année)

Eco-Manage est une application de gestion scolaire robuste et bilingue, conçue spécifiquement pour le contexte éducatif camerounais (enseignement primaire et maternel). Ce projet constitue un rendu de fin d'études (PFE) complet, intégrant les dimensions administratives, financières et pédagogiques.

## 🌟 Vision du Projet

L'établissement visé opère sous deux sections : **Francophone** et **Anglophone**. Eco-Manage unifie la gestion de ces deux systèmes tout en respectant leurs particularités respectives (système de notation, matières, langue de communication).

## 🚀 Fonctionnalités Majeures

### 🔐 Sécurité et Hiérarchie Administrative
- **Contrôle d'Accès par Rôles (RBAC)** : Fondateur, Directeur, Secrétaire Général (SG), Économe, Enseignants, etc.
- **Mode Intérim Stratégique** : Permet au Secrétaire Général de remplacer le Directeur en cas d'absence pour la validation des notes et bulletins.
- **Verrouillage des Notes** : Une fois enregistrée, une note ne peut plus être modifiée par l'enseignant, garantissant l'intégrité des résultats. Seul le Directeur possède la clé de déverrouillage.

### 📊 Tableau de Bord Décisionnel (Pour le Fondateur)
- Visualisation en temps réel des effectifs (garçons/filles).
- Suivi du taux de réussite global et par classe.
- Monitoring du recouvrement des pensions (solvabilité financière).

### 📝 Gestion Pédagogique
- **Cahier de Présence** : Suivi journalier des absences avec calcul automatique des sanctions prévisionnelles.
- **Saisie des Notes Bilingue** : Interface optimisée pour la saisie rapide des évaluations mensuelles et trimestrielles.
- **Génération de Bulletins (PDF)** : Création automatique de bulletins de notes professionnels conformes aux standards nationaux.

### 💰 Gestion Financière
- Suivi rigoureux des frais de scolarité (inscription + pension).
- Journal des encaissements avec impression instantanée de reçus de paiement sécurisés.

## 🛠️ Stack Technique

- **Frontend** : React 19, TypeScript, Tailwind CSS.
- **Desktop Container** : Electron 35 (pour une installation sur PC bureau).
- **Base de Données** : SQLite (persistance locale sans dépendance internet).
- **Architecture Mobile** : Support de la synchronisation locale pour smartphone (Capacitor/Express).
- **Reporting** : jsPDF pour les documents administratifs.

## ⚙️ Installation

1. Accédez au répertoire du projet :
   ```bash
   cd eco-manage
   ```
2. Installez les dépendances :
   ```bash
   npm install
   ```
3. Lancez l'application en mode développement :
   ```bash
   npm run dev
   ```

## 👥 Utilisateurs de Test (Configuration Initiale)

| Rôle | Nom d'utilisateur | Mot de passe |
| :--- | :--- | :--- |
| Fondateur | `founder1` | `admin123` |
| Directeur | `director1` | `admin123` |
| SG | `sg1` | `admin123` |
| Économe | `bursar1` | `admin123` |
| Enseignant | `teacher1` | `admin123` |

---
*Développé avec passion pour l'excellence académique au Cameroun.*
