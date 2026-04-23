# Eco-Manage - Système de Gestion Scolaire

Application de bureau robuste pour la gestion des établissements primaires et maternels bilingues au Cameroun.

## Fonctionnalités
- **Gestion Administrative** : Inscription des élèves, dossiers personnels, archivage.
- **Suivi Pédagogique** : Saisie des notes, verrouillage sécurisé, calcul automatique des moyennes.
- **Gestion Financière** : Scolarité, frais d'inscription, reçus infalsifiables.
- **Tableau de Bord Fondateur** : Statistiques globales (réussite, genre, finances).
- **Bilingue** : Support complet Français/Anglais.
- **Hors-ligne** : Base de données locale SQLite pour une disponibilité totale.

## Architecture
- **Frontend** : React, TypeScript, Tailwind CSS.
- **Runtime** : Electron.js.
- **Base de données** : SQLite (via better-sqlite3).

## Installation
```bash
npm install
npm run dev
```

## Production
```bash
npm run electron:build
```

## Utilisation Mobile (Serveur Local Wi-Fi)
L'application peut être utilisée sur smartphone par les enseignants sans installation supplémentaire :
1. Connectez le PC principal et les smartphones au même réseau Wi-Fi.
2. Sur le PC, identifiez l'adresse IP (ex: `192.168.1.10`).
3. Dans `package.json`, assurez-vous que Vite écoute sur le réseau : `vite --host`.
4. Sur les smartphones, ouvrez le navigateur et tapez `http://192.168.1.10:5173`.
5. L'interface s'adaptera automatiquement au format mobile pour une saisie fluide des notes et des présences.
