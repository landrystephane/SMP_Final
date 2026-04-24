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
      className="flex items-center space-x-2 px-3 py-1 bg-slate-800 border border-slate-700 rounded-md text-xs font-bold text-slate-gold-gold hover:bg-slate-700 transition-colors shadow-sm"
    >
      <Languages className="w-4 h-4" />
      <span>{isFrench ? 'ENGLISH' : 'FRANÇAIS'}</span>
    </button>
  );
};

export default LanguageSwitcher;
