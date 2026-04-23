# Cahier des Charges : Application Eco-Manage

## 1. Présentation du Projet
**Nom du Projet :** Eco-Manage  
**Nature :** Logiciel de gestion intégrée pour établissement scolaire bilingue (Système francophone et anglophone).  
**Objectif :** Digitaliser l'administration, la finance et le suivi pédagogique d'une école primaire et maternelle, en respectant les normes officielles du MINEDUB (Cameroun).

---

## 2. Objectifs Fonctionnels
L'application doit permettre :
- Une gestion **Hors-ligne (Offline-first)** pour garantir la disponibilité des données sans internet.
- Un système **Bilingue (Français/Anglais)** avec un basculement instantané de l'interface et des rapports.
- Une interface utilisateur **Premium** (Design moderne, Glassmorphism, Responsive).

---

## 3. Architecture des Rôles (RBAC)
Le système s'articule autour de plusieurs profils utilisateurs avec des permissions spécifiques :

| Rôle | Responsabilités |
| :--- | :--- |
| **Fondateur (Super Admin)** | Contrôle total, configuration du système, audit financier, gestion du personnel. |
| **Directeur / Principal** | Supervision pédagogique, validation des bulletins, suivi des effectifs. |
| **Économe (Bursar)** | Collecte des frais, gestion des paiements partiels, génération des reçus. |
| **Secrétaire** | Inscription des élèves, gestion des dossiers administratifs, archives. |
| **Enseignant** | Saisie des notes mensuelles, suivi des absences, appréciations pédagogiques. |

---

## 4. Spécifications Pédagogiques
L'application gère les cycles **Maternelle** et **Primaire**.

### A. Cycle Maternelle (PS, MS, GS)
- **Évaluation par Domaines :** Langue, Éveil scientifique, Vie courante, Création, Motricité.
- **Échelle de Notation (Norme A+) :**
  - **18 - 20 (Expert) :** A+
  - **15 - 17 (Acquis) :** A
  - **11 - 14 (En cours d'acquisition) :** ECA
  - **00 - 10 (Non acquis) :** NA

### B. Cycle Primaire (SIL au CM2)
- **Cycle de Reporting :** Trimestriel avec des saisies mensuelles (Octobre, Novembre, Décembre, etc.).
- **Calcul Automatique :** Sommation des points, calcul des moyennes trimestrielles et annuelles.
- **Domaines Officiels :** Langue Française, English Language, Mathématiques, Sciences & Techno, Sciences Humaines, Développement Personnel, Activités Pratiques.

---

## 5. Module Financier
- **Gestion des Frais de Scolarité :** Paramétrage des tranches par classe.
- **Paiements Partiels :** Support des avances avec calcul automatique du solde restant.
- **Reçus Numériques :** Génération instantanée de reçus infalsifiables (non modifiables après validation).
- **Suivi des Débiteurs :** Listes d'impayés exportables pour relance parentale.

---

## 6. Spécifications Techniques
- **Framework Frontend :** React.js avec Vite.
- **Runtime Desktop :** Electron.js (pour l'exécution en tant qu'application Windows .exe).
- **Base de Données :** SQLite (Base de données locale légère et rapide).
- **Design System :** CSS natif avec variables de thèmes (Slate & Gold), Glassmorphism, et icônes (Lucide-React).
- **Exportation :** Génération de bulletins et reçus sous format PDF imprimable.

---

## 7. Livrables Attendus
1. **Application Exécutable (.exe)** prête à l'emploi.
2. **Base de Données Initialisée** avec les structures de classes et matières officielles.
3. **Manuel d'Utilisation** pour chaque profil (Directeur, Économe, Enseignant).
