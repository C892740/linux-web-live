import { loadV86, V86_WASM_URL, type V86Instance } from "@/lib/v86";
import type { Distro } from "@/lib/distros";
import { useCallback, useEffect, useRef, useState } from "react";

export type BootPhase =
  | "idle"
  | "loading-engine"
  | "downloading"
  | "booting"
  | "running"
  | "error";

export interface UseV86Result {
  containerRef: React.RefObject<HTMLDivElement | null>;
  phase: BootPhase;
  /** 0–100 for the engine/image download, null when size is unknown. */
  progress: number | null;
  error: string | null;
  start: () => void;
  reset: () => void;
  sendCtrlAltDelete: () => void;
  goFullscreen: () => void;
}

/** Fetch with progress reporting (0–100). Falls back to null on unknown size. */
async function fetchWithProgress(
  url: string,
  onProgress: (fraction: number | null) => void,
): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Image server returned HTTP ${response.status}.`);
  }

  const header = response.headers.get("content-length");
  const total = header ? Number(header) : NaN;
  if (!response.body || !Number.isFinite(total) || total <= 0) {
    onProgress(null);
    return response.arrayBuffer();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    onProgress(Math.min(1, received / total));
  }
  const blob = new Blob(chunks as BlobPart[]);
  return blob.arrayBuffer();
}

/** Ctrl+Alt+Del as i8042 make/break scancodes. */
const CTRL_ALT_DEL_SCANCODES = [0x1d, 0x38, 0x53, 0xd3, 0xb8, 0x9d];

/**
 * Boots a distro in v86, exposing UI-facing phase/progress/error state.
 *
 * The emulator is created exactly once per session (guarded by a ref) and
 * destroyed on unmount, so navigating away from /run/:distroId tears the
 * whole VM down cleanly.
 */
export function useV86(distro: Distro | undefined): UseV86Result {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const emulatorRef = useRef<V86Instance | null>(null);
  const bootedRef = useRef(false);

  const [phase, setPhase] = useState<BootPhase>("idle");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const boot = useCallback(async () => {
    if (!distro) return;

    try {
      setError(null);
      setProgress(0);
      setPhase("loading-engine");

      const V86 = await loadV86();
      const container = containerRef.current;
      if (!container) throw new Error("Screen container is missing.");

      setPhase("downloading");
      const buffer = await fetchWithProgress(distro.imageUrl, (fraction) => {
        setProgress(fraction === null ? null : Math.round(fraction * 100));
      });

      setPhase("booting");
      const emulator = new V86({
        wasm_path: V86_WASM_URL,
        memory_size: distro.memoryMb * 1024 * 1024,
        vga_memory_size: 4 * 1024 * 1024,
        screen_container: container,
        autostart: true,
        disable_speaker: true,
        [distro.boot]: { buffer },
      });
      emulatorRef.current = emulator;

      // v86 toggles style.display between the text div and the canvas as the
      // guest switches video modes. The first toggle means the machine is
      // rendering — a 10s fallback keeps the UI unstuck either way.
      const observer = new MutationObserver(() => {
        setPhase("running");
        observer.disconnect();
      });
      observer.observe(container, {
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class"],
        childList: true,
        characterData: true,
      });
      window.setTimeout(() => {
        setPhase((p) => (p === "booting" ? "running" : p));
        observer.disconnect();
      }, 10_000);
    } catch (err) {
      emulatorRef.current?.destroy();
      emulatorRef.current = null;
      bootedRef.current = false;
      setPhase("error");
      setError(
        err instanceof Error ? err.message : "Unexpected error while booting.",
      );
    }
  }, [distro]);

  const start = useCallback(() => {
    if (!distro || distro.comingSoon || bootedRef.current) return;
    bootedRef.current = true;
    void boot();
  }, [distro, boot]);

  const reset = useCallback(() => {
    if (emulatorRef.current) {
      emulatorRef.current.destroy();
      emulatorRef.current = null;
    }
    bootedRef.current = false;
    setPhase("idle");
    setProgress(null);
    setError(null);
  }, []);

  const sendCtrlAltDelete = useCallback(() => {
    emulatorRef.current?.keyboard_send_scancodes?.(CTRL_ALT_DEL_SCANCODES);
  }, []);

  const goFullscreen = useCallback(() => {
    const emulator = emulatorRef.current as
      | (V86Instance & { screen_go_fullscreen?: () => void })
      | null;
    emulator?.screen_go_fullscreen?.();
  }, []);

  useEffect(() => {
    return () => {
      emulatorRef.current?.destroy();
      emulatorRef.current = null;
      bootedRef.current = false;
    };
  }, []);

  return {
    containerRef,
    phase,
    progress,
    error,
    start,
    reset,
    sendCtrlAltDelete,
    goFullscreen,
  };
}
