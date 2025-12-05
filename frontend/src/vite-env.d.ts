/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_WS_URL: string;
  readonly VITE_MAP_DEFAULT_LAT: string;
  readonly VITE_MAP_DEFAULT_LON: string;
  readonly VITE_MAP_DEFAULT_ZOOM: string;
  readonly VITE_ENABLE_VESSEL_TRACKS: string;
  readonly VITE_ENABLE_CLUSTERING: string;
  readonly VITE_ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
