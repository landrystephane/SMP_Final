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

## 🎓 Guide pour l'Encadreur / Soutenance

Pour présenter ce projet à votre encadreur, vous avez trois options :

### 1. Démonstration en direct (Recommandé)
- Lancez l'application sur votre PC avec `npm run dev`.
- Montrez la gestion des deux sections (Francophone/Anglophone).
- Faites une saisie de note et montrez qu'elle se verrouille immédiatement (sécurité des données).
- Connectez votre propre smartphone au Wi-Fi du PC pour montrer la saisie mobile.

### 2. Partage du Code Source
Si l'encadreur souhaite examiner le code :
1. Envoyez-lui l'accès au dépôt Git ou une archive ZIP du dossier `eco-manage` (sans le dossier `node_modules`).
2. Il devra installer [Node.js](https://nodejs.org/) et exécuter `npm install` puis `npm run dev`.

### 3. Génération d'un Exécutable (.exe)
Vous pouvez créer un installateur Windows pro pour qu'il puisse l'installer comme n'importe quel logiciel :
```bash
npm run electron:build
```
Le fichier `.exe` se trouvera dans le dossier `dist/` ou `release/`. Vous pouvez lui envoyer ce fichier sur une clé USB.

## 🛠️ Diagnostics Techniques
En cas de problème de chargement du Dashboard sur un nouveau PC :
- Supprimez le fichier de base de données résiduel : `%APPDATA%/eco-manage/school.db`.
- Relancez l'application. Elle recréera une base de données propre avec les paramètres MINEDUB.
