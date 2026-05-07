import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const currentLang = i18n.language.split('-')[0]; // Gère 'fr-FR' ou 'en-US'
    const newLang = currentLang === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(newLang);
  };

  const isFrench = i18n.language.startsWith('fr');

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center space-x-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-black text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-all shadow-sm w-full justify-center tracking-widest"
    >
      <Languages className="w-4 h-4" />
      <span>{isFrench ? 'SWITCH TO ENGLISH' : 'PASSER AU FRANÇAIS'}</span>
    </button>
  );
};

export default LanguageSwitcher;
