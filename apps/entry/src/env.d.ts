/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_RESUME_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
