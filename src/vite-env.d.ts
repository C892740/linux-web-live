/// <reference types="vite/client" />

/**
 * Ambient typing for the v86 UMD build loaded at runtime from the CDN.
 * We only construct it with an options bag, so a broad index signature is
 * enough — no need to vendor the full v86 typings.
 */
declare global {
  interface Window {
    V86?: import("@/lib/v86").V86Constructor;
  }
}

export {};
