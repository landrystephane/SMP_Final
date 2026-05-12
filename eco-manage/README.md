# Eco-Manage
Système de gestion scolaire intégré pour établissements bilingues au Cameroun.

## Installation
1. Accédez au dossier : `cd eco-manage`
2. Installez les dépendances : `npm install`
3. Si vous avez des erreurs avec SQLite au lancement : `npm run rebuild`
4. Compilez l'application : `npm run build`

## Lancement (Développement)
Pour lancer l'application en mode développement avec rechargement automatique :
`npm run start`

## Identifiants de test
- **Administrateur (Fondateur)** : admin / admin
- **Enseignant** : teacher / teacher
- **SuperAdmin** : superadmin / superadmin

## Fonctionnalités
- Gestion bilingue (FR/EN) et biculturelle (Maternelle/Primaire)
- Saisie des notes sécurisée (Verrouillage/Déverrouillage)
- Gestion des pensions par tranches
- Journal de présence
- Impression des bulletins et reçus (PDF)
- Synchronisation mobile locale (API intégrée)
