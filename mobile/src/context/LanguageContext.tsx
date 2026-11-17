import React, { createContext, useContext, useState, ReactNode } from 'react';
import { en } from '../i18n/en';
import { ne } from '../i18n/ne';

type Language = 'en' | 'ne';
type Translations = typeof en;

interface LanguageContextType {
  language: Language;
  t: Translations;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const translations = { en, ne };

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('ne');

  const toggleLanguage = () => {
    setLanguage((prev) => (prev === 'en' ? 'ne' : 'en'));
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        t: translations[language],
        setLanguage,
        toggleLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
