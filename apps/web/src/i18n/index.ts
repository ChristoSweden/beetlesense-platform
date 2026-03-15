import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import sv from './sv.json';

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('beetlesense-lang') : null;

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    sv: { translation: sv },
  },
  lng: savedLang || 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('beetlesense-lang', lng);
  document.documentElement.lang = lng;
});

export default i18n;
