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
