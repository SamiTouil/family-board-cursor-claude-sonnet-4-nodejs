import { expect, afterEach, beforeAll } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

// Initialize i18next for tests
beforeAll(async () => {
  await i18n
    .use(initReactI18next)
    .init({
      lng: 'en',
      fallbackLng: 'en',
      debug: false,
      interpolation: {
        escapeValue: false,
      },
      resources: {
        en: {
          translation: {
            app: {
              title: 'Family Board'
            }
          }
        }
      }
    })
})

// extends Vitest's expect method with methods from react-testing-library
expect.extend(matchers)

// runs a cleanup after each test case (e.g. clearing jsdom)
afterEach(() => {
  cleanup()
}) 