import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';
import { localization } from './index';

export async function initI18n(): Promise<void> {
  await i18next
    .use(Backend)
    .init({
      lng: localization.defaultLanguage,
      fallbackLng: 'en',
      supportedLngs: localization.supportedLanguages,
      backend: {
        loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json'),
      },
      interpolation: {
        escapeValue: false,
      },
    });
}

export { i18next }; 