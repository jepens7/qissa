/// <reference types="vite/client" />

/** Versi app dari `version` di apps/web/package.json; disuntik oleh vite.config.ts. */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  readonly VITE_SITE_URL?: string;
  readonly VITE_CONTENT_BASE?: string;
  readonly VITE_UMAMI_SCRIPT?: string;
  readonly VITE_UMAMI_ID?: string;
  readonly VITE_WA_CHANNEL?: string;
  readonly VITE_PB_URL?: string;
  readonly VITE_APP_VERSION?: string;
}
