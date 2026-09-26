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

/**
 * Cheap visual fingerprint of the emulated canvas: downsample to 16×16 and
 * hash the RGB bytes. Detects "is the picture actually changing" without
 * reading the full framebuffer.
 */
function canvasFingerprint(canvas: HTMLCanvasElement): string {
  try {
    const sample = document.createElement("canvas");
    sample.width = 16;
    sample.height = 16;
    const ctx = sample.getContext("2d");
    if (!ctx) return "";
    ctx.drawImage(canvas, 0, 0, 16, 16);
    const data = ctx.getImageData(0, 0, 16, 16).data;
    let hash = 0;
    for (let i = 0; i < data.length; i += 4) {
      hash = ((hash * 31 + data[i] + data[i + 1] + data[i + 2]) | 0) + 1;
    }
    return String(hash);
  } catch {
    return "";
  }
}

export interface UseV86Overrides {
  /** Local image file (e.g. a user's own ISO). Passed to v86 as a LAZY
   *  File-backed buffer — the OS is read from disk in chunks on demand
   *  instead of being loaded into tab memory, so multi-GB ISOs boot without
   *  freezing or crashing the tab. */
  file?: File | null;
  /** Overrides the distro's default RAM for this session. */
  memoryMb?: number;
  /** Pre-fetched BIOS images from a previous session (skip re-download). */
  biosBuffers?: { bios?: ArrayBuffer; vgaBios?: ArrayBuffer } | null;
}

/**
 * Download cache for catalog images — a reset/reboot reuses the bytes
 * instead of refetching (the UI has always promised "reboots reuse the
 * cache"; now it actually does). Keyed by distro id.
 */
const imageCache = new Map<string, ArrayBuffer>();

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
  /** All boot-scoped timer ids (text poll, stuck timer, freeze watchdog). */
  const timersRef = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const id of timersRef.current) {
      window.clearInterval(id);
      window.clearTimeout(id);
    }
    timersRef.current = [];
  }, []);

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

      setPhase("downloading");
      let bootBuffer: ArrayBuffer | File;
      let bootAsync = false;

      const localFile = overrides?.file;
      if (localFile) {
        // LAZY local-file boot: v86 reads the image from disk in chunks as
        // the guest touches it. No multi-GB ArrayBuffer, no long read delay,
        // no GC pressure — this is what keeps big live ISOs (Puppy etc.)
        // responsive instead of freezing the tab. v86 forces synchronous
        // buffers for floppies and kernel/initrd; honour that.
        bootBuffer = localFile;
        bootAsync = distro.boot === "cdrom" || distro.boot === "hda";
        setProgress(100);
      } else {
        const cached = imageCache.get(distro.id);
        if (cached) {
          bootBuffer = cached;
          setProgress(100);
        } else {
          bootBuffer = await fetchWithProgress(distro.imageUrl, (fraction) => {
            setProgress(fraction === null ? null : Math.round(fraction * 100));
          });
          imageCache.set(distro.id, bootBuffer);
        }
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
        // Modern guest kernels (Puppy's 6.x, etc.) probe for ACPI; exposing
        // it avoids long stalls and hardware-detection timeouts.
        acpi: true,
        bios: { buffer: biosBuffer },
        vga_bios: { buffer: vgaBiosBuffer },
        [distro.boot]: { buffer: bootBuffer, async: bootAsync },
      } as Record<string, unknown>);
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
        timersRef.current.push(poll);
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
        timersRef.current.push(stuckTimer.id!);
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

      // Freeze watchdog: a healthy guest repaints continuously. Sample the
      // actual screen surface — text-buffer contents in text mode, canvas
      // pixels in graphics mode — and warn (non-destructively) when nothing
      // has changed for 20s while the CPU claims to be running. Heavy apps
      // exhausting guest RAM look exactly like this.
      let surfaceFingerprint = "";
      let lastChange = Date.now();
      const renderWatch = window.setInterval(() => {
        timersRef.current.push(renderWatch);
        const emu = emulatorRef.current;
        if (!emu || !settled) return;
        try {
          const canvas = container.querySelector("canvas");
          const graphical = canvas && canvas.style.display !== "none";
          const fp = graphical
            ? `c:${canvasFingerprint(canvas)}`
            : `t:${typeof emu.get_text_screen === "function" ? emu.get_text_screen().join("\n") : ""}`;
          if (fp !== surfaceFingerprint) {
            surfaceFingerprint = fp;
            lastChange = Date.now();
            return;
          }
          if (emu.is_running?.() && Date.now() - lastChange > 20_000) {
            window.clearInterval(renderWatch);
            toast.warning(
              "The guest looks frozen — it may have run out of memory. Try Reset, or reboot with more RAM or a lighter image.",
              { duration: 10_000 },
            );
          }
        } catch {
          /* screen surface unavailable — ignore this tick */
        }
      }, 5_000);
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
    // session is live (the image must not change mid-boot).
  }, [distro, overrides?.file, overrides?.memoryMb, overrides?.biosBuffers]);

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
    clearTimers();
    bootedRef.current = false;
    setPhase("idle");
    setProgress(null);
    setError(null);
  }, [clearTimers]);

  const sendCtrlAltDelete = useCallback(() => {
    emulatorRef.current?.keyboard_send_scancodes?.(CTRL_ALT_DEL_SCANCODES);
  }, []);

  const goFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    // Custom fullscreen instead of v86's screen_go_fullscreen(): that one
    // hard-requires pointer lock, which sandboxed/embedded frames refuse
    // (SecurityError crash). Plain element fullscreen + our own scaling
    // gives the same result without the hard dependency.
    const request =
      container.requestFullscreen?.bind(container) ??
      (container as Element & { webkitRequestFullscreen?: () => void })
        .webkitRequestFullscreen?.bind(container);

    if (!request) {
      toast.info(
        "Fullscreen isn't supported by this browser frame — open Nixtab in its own browser tab.",
      );
      return;
    }

    try {
      const result = request() as unknown as Promise<void> | undefined;
      result?.catch?.(() => {
        toast.info(
          "Fullscreen is blocked in this embedded preview — open Nixtab in its own browser tab for fullscreen.",
        );
      });
    } catch {
      toast.info(
        "Fullscreen is blocked in this embedded preview — open Nixtab in its own browser tab for fullscreen.",
      );
    }
  }, []);

  /**
   * Scale the emulated display to fill the available surface (the browser
   * viewport in fullscreen, the machine frame otherwise) at the guest's
   * native resolution — integer-preserving aspect, no blur.
   */
  const applyDisplayScale = useCallback(() => {
    const emu = emulatorRef.current;
    const container = containerRef.current;
    if (!emu?.screen_set_scale || !container) return;

    const canvas = container.querySelector("canvas");
    const graphical = canvas && canvas.style.display !== "none";
    // Text mode is 720×400 (80×25 at 9×16); graphics mode uses the canvas's
    // native framebuffer size.
    const guestW = graphical && canvas ? canvas.width : 720;
    const guestH = graphical && canvas ? canvas.height : 400;
    if (!guestW || !guestH) return;

    const availW = container.clientWidth;
    const availH = container.clientHeight;
    const scale = Math.min(availW / guestW, availH / guestH);
    if (scale > 0 && Number.isFinite(scale)) {
      emu.screen_set_scale(scale, scale);
    }
  }, []);

  // Re-fit the display whenever the surface changes: entering/leaving
  // fullscreen, window resizes, or first reaching a running desktop.
  useEffect(() => {
    const refit = () =>
      window.setTimeout(applyDisplayScale, 150); // let layout settle
    document.addEventListener("fullscreenchange", refit);
    window.addEventListener("resize", refit);
    return () => {
      document.removeEventListener("fullscreenchange", refit);
      window.removeEventListener("resize", refit);
    };
  }, [applyDisplayScale]);

  useEffect(() => {
    if (phase === "running") {
      const t = window.setTimeout(applyDisplayScale, 250);
      return () => window.clearTimeout(t);
    }
  }, [phase, applyDisplayScale]);

  useEffect(() => {
    return () => {
      clearTimers();
      emulatorRef.current?.destroy();
      emulatorRef.current = null;
      bootedRef.current = false;
    };
  }, [clearTimers]);

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
