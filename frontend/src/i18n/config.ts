import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import fr from './locales/fr.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'en',
    lng: 'en',
    debug: false,

    // Make i18n initialization synchronous for E2E tests
    initImmediate: false,

    interpolation: {
      escapeValue: false,
    },

    resources: {
      en: {
        translation: en,
      },
      fr: {
        translation: fr,
      },
    },
  })

export default i18n 