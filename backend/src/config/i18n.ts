import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import path from 'path';

export async function initI18n(): Promise<void> {
  await i18next
    .use(Backend)
    .init({
      lng: process.env['DEFAULT_LANGUAGE'] || 'en',
      fallbackLng: 'en',
      supportedLngs: (process.env['SUPPORTED_LANGUAGES'] || 'en,fr').split(','),
      backend: {
        loadPath: path.join(__dirname, '../locales/{{lng}}/{{ns}}.json'),
      },
      interpolation: {
        escapeValue: false,
      },
    });
}

export { i18next }; 