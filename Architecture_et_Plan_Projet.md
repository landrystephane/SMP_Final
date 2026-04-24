# Architecture et Plan de Projet : Eco-Manage

## 1. Choix Technologiques (Justification)

Pour répondre aux contraintes d'un établissement scolaire au Cameroun (instabilité internet, besoin de mobilité, sécurité des données), l'architecture choisie est un **Modèle Hybride Desktop-Serveur Local**.

### Pile Technique
- **Runtime :** Electron.js
  - *Pourquoi ?* Permet d'installer l'application comme un logiciel standard (.exe) sur le PC du Directeur/Fondateur. Il sert de "Serveur Central" sans avoir besoin d'Internet.
- **Frontend :** React + TypeScript + Tailwind CSS
  - *Pourquoi ?* Offre une interface fluide, moderne (Glassmorphism) et réactive. Le typage avec TypeScript garantit la robustesse du code pour un projet de fin d'études.
- **Base de Données :** SQLite (via `better-sqlite3`)
  - *Pourquoi ?* Base de données locale extrêmement rapide, stockée dans un seul fichier sur l'ordinateur. Pas de serveur SQL complexe à installer. Facile à sauvegarder sur une clé USB.
- **Serveur API Intégré :** Express.js (embarqué dans Electron)
  - *Pourquoi ?* Permet aux enseignants de se connecter à l'application depuis leur smartphone via le Wi-Fi local de l'école pour saisir les notes, sans passer par Internet.

---

## 2. Architecture des Modules

### A. Module Administratif & Inscription
- Inscription avec génération automatique de matricule.
- Gestion des dossiers élèves (photo, contacts parents, antécédents médicaux).
- Attribution des classes par section (Francophone/Anglophone).

### B. Module Pédagogique (Cœur du Système)
- **Saisie des Notes :** Interface optimisée pour mobile et desktop.
- **Système de Verrouillage :**
  - Une fois enregistrée, une note est verrouillée.
  - Seul le Directeur ou le Conseiller Pédagogique peut déverrouiller via un "Ticket de modification".
- **Normes MINEDUB :**
  - Maternelle : Évaluation par compétences (A+, A, ECA, NA).
  - Primaire : Système de 0-20 avec calcul automatique des moyennes et rangs.

### C. Module Financier (Économe)
- Gestion des tranches de scolarité.
- Impression de reçus PDF infalsifiables.
- État des impayés en temps réel pour le Fondateur.

### D. Module Sécurité & Accès Mobile
- **Provisioning :** Le Fondateur génère des clés d'accès uniques pour chaque téléphone autorisé.
- **Hiérarchie :** Fondateur > Directeur > Secrétaire/Économe > Enseignant.

---

## 3. Roadmap de Développement pour le PFE

1.  **Phase 1 : Socle Technique** (Terminé)
    - Configuration Electron/React et Base de données.
2.  **Phase 2 : Gestion des Élèves & Personnel** (Terminé)
    - CRUD complet et attribution des rôles.
3.  **Phase 3 : Moteur de Notation & Bulletins** (En cours)
    - Implémentation des coefficients et calculs de moyennes.
    - Exportation PDF (Bulletins).
4.  **Phase 4 : Module Mobile & Serveur Local** (Terminé)
    - Activation des accès via Wi-Fi.
5.  **Phase 5 : Soutenance & Documentation**
    - Préparation du manuel utilisateur et du rapport technique.

---

## 4. Spécificités de Sécurité (Réponse au besoin utilisateur)
- **Le Fondateur** a une vue "Audit" sur toutes les transactions financières.
- **Le Directeur** est le seul garant de l'intégrité des notes.
- **La Secrétaire** gère les impressions finales une fois que le Directeur a validé le trimestre.
