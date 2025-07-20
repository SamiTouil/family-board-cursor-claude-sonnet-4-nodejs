/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SOCKET_URL: string
  readonly VITE_ENVIRONMENT: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_ENABLE_ANALYTICS: string
  readonly VITE_ENABLE_PUSH_NOTIFICATIONS: string
  readonly VITE_DEFAULT_LANGUAGE: string
  readonly VITE_SUPPORTED_LANGUAGES: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
} 