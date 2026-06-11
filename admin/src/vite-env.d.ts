/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_CKEDITOR_LICENSE_KEY: string
  readonly VITE_CKEDITOR_CLOUD_SERVICES_TOKEN_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

