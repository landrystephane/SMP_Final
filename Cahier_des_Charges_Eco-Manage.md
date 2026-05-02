# Cahier des Charges - Projet Eco-Manage

## 1. Présentation du Projet
**Nom du Projet** : Eco-Manage
**Type d'Application** : Logiciel de Gestion Scolaire Hybride (Desktop + Mobile)
**Cible** : Établissements scolaires primaires et maternels bilingues au Cameroun.
**Objectif** : Automatiser la gestion administrative, pédagogique et financière tout en facilitant la saisie des notes par les enseignants via mobile dans un environnement sans internet.

## 2. Analyse des Besoins
L'établissement fonctionne avec deux sections (Francophone et Anglophone) et deux niveaux (Maternelle et Primaire).

### 2.1 Gestion des Utilisateurs et Rôles
Le système définit des permissions strictes par rôle :
- **Fondateur** : Super-administrateur, vision globale, gestion des paramètres avancés.
- **Directeur** : Validation pédagogique, déverrouillage des notes, supervision des enseignants.
- **Secrétaire Général (SG)** : Remplace le directeur en cas d'absence (Mode Intérim), gère les archives.
- **Économe (Bursar)** : Gestion des finances, configuration des frais de scolarité, encaissement.
- **Secrétaire** : Inscriptions des élèves, impression des documents officiels.
- **Enseignant** : Saisie des notes, appel (présences), suivi de classe.
- **Conseiller Pédagogique** : Suivi de la qualité de l'enseignement.

### 2.2 Gestion Pédagogique (Cœur du Système)
- **Bilinguisme** : Séparation stricte des matières et des coefficients par section.
- **Évaluation Maternelle** : Système de notation par compétences (A+ Expert, A Acquis, ECA En cours d'acquisition, NA Non acquis).
- **Évaluation Primaire** : Notation numérique sur 20 conforme aux standards MINEDUB.
- **Sécurité des Notes** : Une fois enregistrées par l'enseignant, les notes sont **verrouillées**. Toute modification ultérieure nécessite une requête au Directeur.
- **Bulletins de Notes** : Génération automatique de bulletins PDF bilingues avec calcul des moyennes, rangs et appréciations automatiques.

### 2.3 Gestion Administrative et Financière
- **Fiche Élève** : Dossier complet incluant photo, antécédents médicaux et contacts d'urgence.
- **Suivi des Paiements** : Enregistrement des tranches de scolarité et génération de reçus numériques.
- **Tableau de Bord** : Indicateurs financiers en temps réel (taux de recouvrement, revenus totaux vs objectifs).

### 2.4 Mobilité et Synchronisation
- **Serveur de Synchronisation Local** : L'application desktop (Electron) embarque un serveur API permettant aux smartphones des enseignants de se connecter via le Wi-Fi local de l'école (pas besoin d'internet).
- **Application Mobile (Capacitor)** : Interface simplifiée pour la saisie rapide des notes et des présences en classe.

## 3. Spécifications Techniques
### 3.1 Architecture
- **Desktop** : Electron.js pour une installation native sur Windows/Mac/Linux.
- **Frontend** : React.js avec TypeScript pour une interface robuste et typée.
- **Style** : Tailwind CSS pour un design moderne et responsive ("Glassmorphism").
- **Base de Données** : SQLite (via better-sqlite3) pour un stockage local performant et facile à sauvegarder.
- **Mobile** : Capacitor pour transformer le web en application Android/iOS native.

### 3.2 Sécurité
- **Authentification** : Hachage des mots de passe en SHA-256.
- **Isolation** : Utilisation du Context Bridge d'Electron pour protéger le système de fichiers.
- **Intégrité** : Verrouillage des données sensibles (Notes) par déclencheurs base de données/logique applicative.

## 4. Livrables
1. Code source complet du projet.
2. Base de données initialisée avec les programmes officiels (SIL à CM2 / Class 1 to 6).
3. Guide d'installation et d'utilisation.
4. Système de génération de rapports PDF.

---
*Document établi pour le projet de fin d'études - Logiciel Eco-Manage.*
