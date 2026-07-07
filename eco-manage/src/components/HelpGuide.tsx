import React, { useState } from 'react';
import { X, HelpCircle, BookOpen, Users, DollarSign, FileText, BarChart2, Bus, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const GUIDES: Record<string, { icon: React.ReactNode; title: string; steps: string[] }[]> = {
  FOUNDER: [
    {
      icon: <Users className="w-4 h-4" />,
      title: 'Gérer les utilisateurs',
      steps: [
        'Menu → Utilisateurs → "Nouvel utilisateur"',
        'Choisir le rôle (Directeur, Enseignant, Économe...)',
        'L\'utilisateur reçoit ses identifiants pour se connecter',
      ],
    },
    {
      icon: <BookOpen className="w-4 h-4" />,
      title: 'Configurer les classes',
      steps: [
        'Menu → Classes → "Nouvelle classe"',
        'Assigner un enseignant titulaire et une section (FR/EN)',
        'Ajouter les matières via le gestionnaire de matières',
      ],
    },
    {
      icon: <FileText className="w-4 h-4" />,
      title: 'Générer les bulletins',
      steps: [
        'Menu → Bulletins → Choisir trimestre et classe',
        'Vérifier que les notes sont validées par les enseignants',
        'Cliquer "Générer PDF" pour imprimer',
      ],
    },
  ],
  DIRECTOR: [
    {
      icon: <Users className="w-4 h-4" />,
      title: 'Inscrire un élève',
      steps: [
        'Menu → Élèves → "Nouvel élève"',
        'Remplir les informations et assigner une classe',
        'L\'élève est immédiatement visible pour les enseignants',
      ],
    },
    {
      icon: <BarChart2 className="w-4 h-4" />,
      title: 'Voir les statistiques',
      steps: [
        'Tableau de bord → Vue d\'ensemble en temps réel',
        'Menu → Statistiques pour les rapports détaillés',
      ],
    },
  ],
  SG: [
    {
      icon: <Users className="w-4 h-4" />,
      title: 'Gérer les inscriptions',
      steps: [
        'Menu → Élèves → Ajouter ou modifier un élève',
        'Vérifier les documents d\'inscription',
        'Assigner l\'élève à une classe existante',
      ],
    },
  ],
  BURSAR: [
    {
      icon: <DollarSign className="w-4 h-4" />,
      title: 'Enregistrer un paiement',
      steps: [
        'Menu → Finance → "Nouveau paiement"',
        'Rechercher l\'élève par nom ou matricule',
        'Saisir le montant et générer le reçu automatiquement',
      ],
    },
    {
      icon: <FileText className="w-4 h-4" />,
      title: 'Imprimer un reçu',
      steps: [
        'Menu → Finance → Historique des paiements',
        'Cliquer sur l\'icône imprimante à côté du paiement',
        'Le reçu s\'ouvre en PDF prêt à imprimer',
      ],
    },
  ],
  TEACHER: [
    {
      icon: <BookOpen className="w-4 h-4" />,
      title: 'Saisir les notes',
      steps: [
        'Menu → Notes → Choisir la classe et la matière',
        'Entrer la note pour chaque élève',
        'Cliquer "Valider" pour confirmer les notes (irréversible)',
      ],
    },
    {
      icon: <FileText className="w-4 h-4" />,
      title: 'Marquer les présences',
      steps: [
        'Menu → Présences → Choisir la date et la classe',
        'Cocher les absents et indiquer les heures',
      ],
    },
  ],
  PARENT: [
    {
      icon: <FileText className="w-4 h-4" />,
      title: 'Voir le bulletin de mon enfant',
      steps: [
        'Tableau de bord → Choisir l\'enfant si vous en avez plusieurs',
        'Menu → Bulletins → Choisir le trimestre',
        'Cliquer "Télécharger PDF" pour avoir une copie',
      ],
    },
    {
      icon: <DollarSign className="w-4 h-4" />,
      title: 'Consulter les paiements',
      steps: [
        'Menu → Finance → Historique des paiements de votre enfant',
        'Les reçus sont téléchargeables en PDF',
      ],
    },
  ],
  DRIVER: [
    {
      icon: <Bus className="w-4 h-4" />,
      title: 'Gérer mon trajet',
      steps: [
        'Tableau de bord → Liste des élèves de votre route',
        'Marquer les présents/absents au départ et à l\'arrivée',
      ],
    },
  ],
  ADVISOR: [
    {
      icon: <MessageSquare className="w-4 h-4" />,
      title: 'Suivre les élèves',
      steps: [
        'Menu → Élèves → Voir les dossiers et comportements',
        'Ajouter des observations dans la fiche de l\'élève',
      ],
    },
  ],
  SUPERADMIN: [
    {
      icon: <Users className="w-4 h-4" />,
      title: 'Gérer les établissements',
      steps: [
        'Menu → Établissements → "Ajouter un établissement"',
        'Définir le slug pour le sous-domaine (ex: vie → vie.ecomanageapp.com)',
        'Le fondateur reçoit ses identifiants par défaut (admin / admin)',
      ],
    },
  ],
};

const HelpGuide: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const role = user?.role || 'TEACHER';
  const sections = GUIDES[role] || GUIDES['TEACHER'];

  return (
    <>
      {/* Floating help button */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 flex items-center justify-center hover:bg-amber-400 active:scale-95 transition-all"
        title={t('help_guide', 'Guide d\'utilisation')}
      >
        <HelpCircle className="w-6 h-6" />
      </button>

      {/* Slide-in panel */}
      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm bg-slate-900 border-l border-slate-700 flex flex-col h-full shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-500" />
                <h2 className="text-white font-black text-sm uppercase tracking-wider">
                  {t('help_guide', 'Guide d\'utilisation')}
                </h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <p className="text-xs text-slate-400">
                {t('help_role_intro', 'Voici les actions principales pour votre rôle')} <span className="text-amber-500 font-bold">{role}</span>.
              </p>

              {sections.map((section, i) => (
                <div key={i} className="bg-slate-800 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wider">
                    {section.icon}
                    {section.title}
                  </div>
                  <ol className="space-y-2">
                    {section.steps.map((step, j) => (
                      <li key={j} className="flex gap-2 text-xs text-slate-300">
                        <span className="flex-shrink-0 w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                          {j + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              ))}

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-xs text-slate-400 space-y-1">
                <p className="font-bold text-slate-300">💡 Astuce</p>
                <p>En cas de problème, contactez votre administrateur ou écrivez à <span className="text-amber-500">contact@ecomanageapp.com</span></p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default HelpGuide;
