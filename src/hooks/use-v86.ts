import {
  loadV86,
  V86_WASM_URL,
  SEABIOS_URL,
  VGABIOS_URL,
  type V86Instance,
} from "@/lib/v86";
import type { Distro } from "@/lib/distros";
import { toast } from "sonner";
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

export interface UseV86Overrides {
  /** Pre-loaded image bytes (e.g. a user's own ISO read via FileReader).
   *  When set, the hook skips its own fetch entirely. */
  buffer?: ArrayBuffer | null;
  /** Overrides the distro's default RAM for this session. */
  memoryMb?: number;
  /** Pre-fetched BIOS images from a previous session (skip re-download). */
  biosBuffers?: { bios?: ArrayBuffer; vgaBios?: ArrayBuffer } | null;
}

/**
 * Boots a distro in v86, exposing UI-facing phase/progress/error state.
 *
 * The emulator is created exactly once per session (guarded by a ref) and
 * destroyed on unmount, so navigating away from /run/:distroId tears the
 * whole VM down cleanly.
 */
export function useV86(
  distro: Distro | undefined,
  overrides?: UseV86Overrides,
): UseV86Result {
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

      // v86's npm package ships without the BIOS binaries (seabios.bin and
      // vgabios.bin are .gitignored upstream and absent from the tarball).
      // Without a real VGA BIOS the machine starts with an uninitialised
      // display — the guest runs headless and the screen stays black — so we
      // fetch both from a CORS-enabled mirror and pass them as buffers.
      const biosOverride = overrides?.biosBuffers;
      let biosBuffer: ArrayBuffer | undefined;
      let vgaBiosBuffer: ArrayBuffer | undefined;
      if (biosOverride?.bios && biosOverride?.vgaBios) {
        biosBuffer = biosOverride.bios;
        vgaBiosBuffer = biosOverride.vgaBios;
      } else {
        const [bios, vgaBios] = await Promise.all([
          fetch(SEABIOS_URL).then((r) => {
            if (!r.ok) throw new Error(`BIOS fetch failed (HTTP ${r.status}).`);
            return r.arrayBuffer();
          }),
          fetch(VGABIOS_URL).then((r) => {
            if (!r.ok)
              throw new Error(`VGA BIOS fetch failed (HTTP ${r.status}).`);
            return r.arrayBuffer();
          }),
        ]);
        biosBuffer = bios;
        vgaBiosBuffer = vgaBios;
      }

      const bufferOverride = overrides?.buffer;
      let buffer: ArrayBuffer;
      if (bufferOverride) {
        // Local file supplied by the user — no download phase at all.
        buffer = bufferOverride;
        setProgress(100);
      } else {
        setPhase("downloading");
        buffer = await fetchWithProgress(distro.imageUrl, (fraction) => {
          setProgress(fraction === null ? null : Math.round(fraction * 100));
        });
      }

      setPhase("booting");
      const memoryMb = overrides?.memoryMb ?? distro.memoryMb;
      const emulator = new V86({
        wasm_path: V86_WASM_URL,
        memory_size: memoryMb * 1024 * 1024,
        vga_memory_size: 8 * 1024 * 1024,
        screen_container: container,
        autostart: true,
        disable_speaker: true,
        bios: { buffer: biosBuffer },
        vga_bios: { buffer: vgaBiosBuffer },
        [distro.boot]: { buffer },
      });
      emulatorRef.current = emulator;

      // Boot detection that reads REAL machine signals instead of DOM:
      //  - text mode: get_text_screen() returns non-blank content once the
      //    BIOS/guest has written to the VGA text buffer
      //  - graphics mode: v86 flips text div hidden / canvas visible
      //  - 18s with zero video output → clear error explaining likely causes
      let settled = false;
      const stuckTimer = { id: undefined as number | undefined };
      const settle = () => {
        if (settled) return;
        settled = true;
        if (stuckTimer.id !== undefined) window.clearTimeout(stuckTimer.id);
        setPhase("running");
      };

      const poll = window.setInterval(() => {
        const emu = emulatorRef.current;
        if (!emu) return;
        if (typeof emu.get_text_screen === "function") {
          try {
            const screen = emu.get_text_screen();
            if (screen.some((row) => row.trim().length > 0)) {
              window.clearInterval(poll);
              settle();
            }
          } catch {
            // screen adapter not ready yet — keep polling
          }
        }
      }, 500);

      const observer = new MutationObserver(() => {
        settle();
        observer.disconnect();
        window.clearInterval(poll);
      });
      observer.observe(container, {
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class"],
        childList: true,
        characterData: true,
      });

      stuckTimer.id = window.setTimeout(() => {
        window.clearInterval(poll);
        observer.disconnect();
        setPhase((p) => {
          if (p !== "booting") return p;
          setError(
            "No video output was detected. The guest either isn't bootable in a 32-bit emulator (64-bit-only ISOs behave exactly like this) or the BIOS found no bootable device. Try a 32-bit build or a different image.",
          );
          return "error";
        });
      }, 18_000);
    } catch (err) {
      emulatorRef.current?.destroy();
      emulatorRef.current = null;
      bootedRef.current = false;
      setPhase("error");
      setError(
        err instanceof Error ? err.message : "Unexpected error while booting.",
      );
    }
    // `overrides` is read at boot time; callers hold it stable while a
    // session is live (the buffer must not change mid-boot).
  }, [distro, overrides?.buffer, overrides?.memoryMb, overrides?.biosBuffers]);

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
    try {
      emulator?.screen_go_fullscreen?.();
    } catch (err) {
      // Embedded/sandboxed preview frames refuse pointer lock and element
      // fullscreen (SecurityError). Don't crash the click handler — explain.
      console.warn("[v86] fullscreen unavailable:", err);
      toast.info(
        "Fullscreen is blocked in this embedded preview — open Nixtab in its own browser tab for fullscreen.",
      );
    }
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
