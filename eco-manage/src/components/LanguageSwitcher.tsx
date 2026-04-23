import React from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'fr' ? 'en' : 'fr';
    i18n.changeLanguage(newLang);
  };

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center space-x-2 px-3 py-1 bg-slate-800 border border-slate-700 rounded-md text-xs font-bold text-slate-300 hover:text-white transition-colors"
    >
      <Languages className="w-4 h-4" />
      <span>{i18n.language === 'fr' ? 'ENGLISH' : 'FRANÇAIS'}</span>
    </button>
  );
};

export default LanguageSwitcher;
