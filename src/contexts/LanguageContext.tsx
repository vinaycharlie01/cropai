'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, TranslationKeys } from '@/lib/translations';

type Language = 'en' | 'hi' | 'te' | 'kn' | 'ml' | 'ta';

interface LanguageContextType {
  language: Language;
  setLanguage: (language: string) => void;
  t: (key: TranslationKeys) => string;
  isLanguageSelected: boolean;
  setIsLanguageSelected: (selected: boolean) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [isLanguageSelected, setIsLanguageSelected] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const storedLang = localStorage.getItem('kisan-rakshak-lang');
    if (storedLang && ['en', 'hi', 'te', 'kn', 'ml', 'ta'].includes(storedLang)) {
      setLanguageState(storedLang as Language);
      setIsLanguageSelected(true);
    }
  }, []);
  
  const setLanguage = (langCode: string) => {
    if (['en', 'hi', 'te', 'kn', 'ml', 'ta'].includes(langCode)) {
      const newLang = langCode as Language;
      setLanguageState(newLang);
      localStorage.setItem('kisan-rakshak-lang', newLang);
    }
  };

  const t = (key: TranslationKeys): string => {
    return translations[language][key] || translations['en'][key];
  };

  if (!isMounted) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isLanguageSelected, setIsLanguageSelected }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
