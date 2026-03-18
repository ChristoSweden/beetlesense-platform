import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import sv from './sv.json';
import fi from './locales/fi.json';
import no from './locales/no.json';
import de from './locales/de.json';

const savedLang = typeof window !== 'undefined' ? localStorage.getItem('beetlesense-lang') : null;

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    sv: { translation: sv },
    fi: { translation: fi },
    no: { translation: no },
    de: { translation: de },
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
