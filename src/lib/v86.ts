/**
 * Loads v86 from the jsDelivr CDN at runtime.
 *
 * v86 ships a UMD build (libv86.js) and its WebAssembly module (v86.wasm).
 * Loading from the CDN keeps the bundle tiny, gives fast global edge caching
 * for a ~2 MB wasm download, and every CDN asset is served with
 * `access-control-allow-origin: *`.
 *
 * The loader is idempotent and promise-cached so React StrictMode's double
 * mount doesn't insert two scripts.
 */

const V86_VERSION = "0.5.44";
const CDN = `https://cdn.jsdelivr.net/npm/v86@${V86_VERSION}`;

export const V86_WASM_URL = `${CDN}/build/v86.wasm`;

let loadPromise: Promise<V86Constructor> | null = null;

/** Minimal shape of the v86 constructor we rely on (full type in vite-env.d.ts). */
export interface V86Constructor {
  new (options: Record<string, unknown>): V86Instance;
}

export interface V86Instance {
  destroy(): void;
  keyboard_send_scancodes?(codes: number[]): void;
  serial0_send?(text: string): void;
  restart?(): void;
  stop?(): void;
}

/**
 * Injects the v86 script tag once and resolves with the `V86` constructor.
 * Rejects if the CDN is unreachable (offline developer, blocked network...).
 */
export function loadV86(): Promise<V86Constructor> {
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<V86Constructor>((resolve, reject) => {
    const w = window as unknown as { V86?: V86Constructor };

    // Already loaded (e.g. HMR remount).
    if (w.V86) {
      resolve(w.V86);
      return;
    }

    const script = document.createElement("script");
    script.src = `${CDN}/build/libv86.js`;
    script.async = true;
    script.crossOrigin = "anonymous";

    script.onload = () => {
      if (w.V86) {
        resolve(w.V86);
      } else {
        reject(new Error("v86 script loaded but window.V86 is missing."));
      }
    };
    script.onerror = () => {
      loadPromise = null; // allow a retry on the next attempt
      reject(new Error("Could not load the v86 emulator from the CDN."));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}
