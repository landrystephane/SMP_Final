import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    if (!i18n.language) return;
    const currentLang = i18n.language.split('-')[0]; // Gère 'fr-FR' ou 'en-US'
    const newLang = currentLang === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(newLang);
  };

  const isFrench = i18n.language ? i18n.language.startsWith('fr') : true;

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center space-x-2 px-3 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black text-amber-500 hover:bg-amber-500 hover:text-slate-950 transition-all shadow-sm w-full justify-center tracking-widest"
    >
      <Languages className="w-4 h-4" />
      <span>{isFrench ? 'SWITCH TO ENGLISH' : 'PASSER AU FRANÇAIS'}</span>
    </button>
  );
};

export default LanguageSwitcher;
