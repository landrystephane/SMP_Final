import React, { useState, useEffect } from 'react';
import { CheckCircle2, ChevronRight, ChevronLeft, X, BookOpen, Users, DollarSign, FileText, BarChart2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const ROLE_ONBOARDING: Record<string, { title: string; subtitle: string; steps: { icon: React.ReactNode; title: string; desc: string }[] }> = {
  FOUNDER: {
    title: 'Bienvenue, Fondateur !',
    subtitle: 'Voici comment démarrer avec votre établissement',
    steps: [
      { icon: <Users className="w-6 h-6" />, title: 'Créer vos classes', desc: 'Allez dans Classes → Nouvelle classe. Définissez le niveau (Maternelle/Primaire) et la section (FR/EN).' },
      { icon: <BookOpen className="w-6 h-6" />, title: 'Ajouter vos utilisateurs', desc: 'Allez dans Utilisateurs → Nouvel utilisateur. Assignez les rôles : Directeur, Enseignant, Économe, etc.' },
      { icon: <DollarSign className="w-6 h-6" />, title: 'Configurer les frais de scolarité', desc: 'Allez dans Finance → Configuration des frais. Définissez le montant et les tranches de paiement.' },
      { icon: <FileText className="w-6 h-6" />, title: 'Générer votre premier bulletin', desc: 'Une fois les notes validées par les enseignants, allez dans Bulletins → Choisir trimestre → Générer PDF.' },
    ],
  },
  DIRECTOR: {
    title: 'Bienvenue, Directeur !',
    subtitle: 'Gérez votre établissement efficacement',
    steps: [
      { icon: <Users className="w-6 h-6" />, title: 'Inscrire les élèves', desc: 'Allez dans Élèves → Nouvel élève. Remplissez le profil et assignez une classe existante.' },
      { icon: <BarChart2 className="w-6 h-6" />, title: 'Suivre les performances', desc: 'Le tableau de bord affiche les stats en temps réel : effectifs, moyennes, taux de présence.' },
      { icon: <FileText className="w-6 h-6" />, title: 'Valider les bulletins', desc: 'Menu → Bulletins. Vérifiez que tous les enseignants ont validé leurs notes avant d\'imprimer.' },
    ],
  },
  SG: {
    title: 'Bienvenue !',
    subtitle: 'Votre espace de secrétariat général',
    steps: [
      { icon: <Users className="w-6 h-6" />, title: 'Gérer les inscriptions', desc: 'Élèves → Nouvel élève pour inscrire. Vous pouvez aussi modifier les informations existantes.' },
      { icon: <FileText className="w-6 h-6" />, title: 'Workflow administratif', desc: 'Menu → Workflow admin pour traiter les demandes, courriers et documents officiels.' },
    ],
  },
  BURSAR: {
    title: 'Bienvenue, Économe !',
    subtitle: 'Gérez les finances de l\'établissement',
    steps: [
      { icon: <DollarSign className="w-6 h-6" />, title: 'Enregistrer un paiement', desc: 'Finance → Nouveau paiement. Recherchez l\'élève, saisissez le montant. Le reçu se génère automatiquement.' },
      { icon: <FileText className="w-6 h-6" />, title: 'Imprimer un reçu', desc: 'Finance → Historique. Cliquez sur l\'icône imprimante à côté de chaque paiement pour le reçu PDF.' },
      { icon: <BarChart2 className="w-6 h-6" />, title: 'Voir les impayés', desc: 'Le tableau de bord Finance affiche les élèves avec solde restant et le taux de recouvrement global.' },
    ],
  },
  TEACHER: {
    title: 'Bienvenue, Enseignant(e) !',
    subtitle: 'Votre espace de gestion pédagogique',
    steps: [
      { icon: <BookOpen className="w-6 h-6" />, title: 'Saisir les notes', desc: 'Menu → Notes → Choisissez votre classe et votre matière. Entrez la note de chaque élève.' },
      { icon: <CheckCircle2 className="w-6 h-6" />, title: 'Valider les notes', desc: 'Une fois les notes saisies, cliquez "Valider". Attention : la validation est définitive.' },
      { icon: <FileText className="w-6 h-6" />, title: 'Marquer les présences', desc: 'Menu → Présences → Sélectionnez la date et la classe, puis cochez les absences.' },
    ],
  },
  PARENT: {
    title: 'Bienvenue !',
    subtitle: 'Suivez la scolarité de votre enfant',
    steps: [
      { icon: <BarChart2 className="w-6 h-6" />, title: 'Tableau de bord', desc: 'Dès la connexion, vous voyez les dernières notes et informations de votre enfant.' },
      { icon: <FileText className="w-6 h-6" />, title: 'Télécharger le bulletin', desc: 'Menu → Bulletins → Choisissez le trimestre → Télécharger PDF. Gardez-en une copie !' },
      { icon: <DollarSign className="w-6 h-6" />, title: 'Consulter les paiements', desc: 'Menu → Finance pour voir l\'historique des paiements et les reçus téléchargeables.' },
    ],
  },
  DRIVER: {
    title: 'Bienvenue, Chauffeur !',
    subtitle: 'Gérez votre trajet scolaire',
    steps: [
      { icon: <Users className="w-6 h-6" />, title: 'Votre liste d\'élèves', desc: 'Le tableau de bord affiche tous les élèves assignés à votre route de transport.' },
      { icon: <CheckCircle2 className="w-6 h-6" />, title: 'Marquer les présences', desc: 'Cochez les élèves présents au départ et à l\'arrivée pour chaque trajet.' },
    ],
  },
  ADVISOR: {
    title: 'Bienvenue, Conseiller !',
    subtitle: 'Accompagnez les élèves et les familles',
    steps: [
      { icon: <Users className="w-6 h-6" />, title: 'Dossiers élèves', desc: 'Accédez aux profils complets : notes, présences, comportement, historique.' },
      { icon: <FileText className="w-6 h-6" />, title: 'Ajouter des observations', desc: 'Sur chaque fiche élève, vous pouvez ajouter des notes de suivi et observations.' },
    ],
  },
  SUPERADMIN: {
    title: 'Bienvenue, Super Admin !',
    subtitle: 'Gérez tous les établissements',
    steps: [
      { icon: <Users className="w-6 h-6" />, title: 'Créer un établissement', desc: 'Menu → Établissements → Ajouter. Un fondateur par défaut (admin/admin) est créé automatiquement.' },
      { icon: <Sparkles className="w-6 h-6" />, title: 'Configurer le sous-domaine', desc: 'Dans les détails de l\'école, modifiez le slug pour définir l\'URL : slug.ecomanageapp.com.' },
      { icon: <BarChart2 className="w-6 h-6" />, title: 'Surveiller les abonnements', desc: 'Gérez les dates d\'expiration et les statuts de chaque école depuis le panneau admin.' },
    ],
  },
};

const STORAGE_KEY = 'eco_onboarding_done';

const OnboardingModal: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    const key = `${STORAGE_KEY}_${user.id || user.username}`;
    const done = localStorage.getItem(key);
    if (!done) setVisible(true);
  }, [user]);

  if (!user || !visible) return null;

  const config = ROLE_ONBOARDING[user.role] || ROLE_ONBOARDING['TEACHER'];
  const steps = config.steps;
  const isLast = step === steps.length - 1;

  const finish = () => {
    const key = `${STORAGE_KEY}_${user.id || user.username}`;
    localStorage.setItem(key, '1');
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={finish} />
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-b border-slate-700 p-6">
          <button type="button" onClick={finish} title="Fermer" aria-label="Fermer" className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span className="text-amber-500 text-xs font-black uppercase tracking-widest">
              {t('first_login', 'Première connexion')}
            </span>
          </div>
          <h2 className="text-white font-black text-xl">{config.title}</h2>
          <p className="text-slate-400 text-xs mt-1">{config.subtitle}</p>
        </div>

        {/* Step content */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              {steps[step].icon}
            </div>
            <div>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">
                Étape {step + 1} / {steps.length}
              </p>
              <h3 className="text-white font-black text-base mb-2">{steps[step].title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{steps[step].desc}</p>
            </div>
          </div>

          {/* Step dots */}
          <div className="flex justify-center gap-2 mt-6">
            {steps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                aria-label={`Étape ${i + 1}`}
                className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-amber-500 w-6' : 'bg-slate-600 hover:bg-slate-500'}`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 pb-6 gap-3">
          <button
            type="button"
            onClick={finish}
            className="text-xs text-slate-500 hover:text-slate-300 font-bold transition-colors"
          >
            {t('skip', 'Passer')}
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:border-slate-500 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Précédent
              </button>
            )}
            <button
              type="button"
              onClick={() => isLast ? finish() : setStep(s => s + 1)}
              className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 text-xs font-black hover:bg-amber-400 active:scale-95 transition-all"
            >
              {isLast ? (
                <><CheckCircle2 className="w-3.5 h-3.5" /> {t('got_it', 'C\'est parti !')}</>
              ) : (
                <>Suivant <ChevronRight className="w-3.5 h-3.5" /></>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingModal;
