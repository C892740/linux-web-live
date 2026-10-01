import {
  loadV86,
  V86_WASM_URL,
  SEABIOS_URL,
  VGABIOS_URL,
  type V86Instance,
} from "@/lib/v86";
import type { BootMedia, Distro } from "@/lib/distros";
import { toast } from "sonner";
import { useCallback, useEffect, useRef, useState } from "react";

export type BootPhase =
  | "idle"
  | "loading-engine"
  | "downloading"
  | "booting"
  | "running"
  | "error";

/**
 * v86 only accepts these media option keys: cdrom, hda, hdb, fda, fdb,
 * bzimage, initrd, multiboot (verified in libv86's continue_init switch).
 * Anything else is silently dropped and the BIOS falls through to
 * "No bootable device" — which is exactly why the kernel-image and floppy
 * entries never started before 2.0.0. Map our UI-facing media names onto
 * the real keys at the API boundary.
 */
const BOOT_MEDIA_TO_V86: Record<BootMedia, string> = {
  cdrom: "cdrom",
  hda: "hda",
  kernel: "bzimage",
  floppy: "fda",
};

export interface UseV86Result {
  containerRef: React.RefObject<HTMLDivElement | null>;
  /** The machine frame (title bar + screen + hint bar) — the element we
   *  fullscreen so the whole machine fills the viewport. */
  frameRef: React.RefObject<HTMLDivElement | null>;
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
 * Download cache for catalog images — a reset/reboot reuses the bytes
 * instead of refetching (the UI has always promised "reboots reuse the
 * cache"; now it actually does). Keyed by distro id.
 */
const imageCache = new Map<string, ArrayBuffer>();

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
  const frameRef = useRef<HTMLDivElement | null>(null);
  const emulatorRef = useRef<V86Instance | null>(null);
  const bootedRef = useRef(false);
  /** All boot-scoped timer ids (text poll, stuck timer, freeze watchdog). */
  const timersRef = useRef<number[]>([]);
  /** Guards the refit path against ResizeObserver ping-pong (see scheduleFit). */
  const fittingRef = useRef(false);
  /** A refit requested while one was already in flight. */
  const pendingFitRef = useRef(false);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

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

  /**
   * Scale the emulated display to exactly fill the screen box (aspect-fit).
   *
   * v86's screen_set_scale multiplies the ACTIVE surface's current size —
   * canvas CSS size in graphics mode, a CSS transform on the text div in
   * text mode — and auto-upscales small canvases internally. Instead of
   * guessing those factors we reset the scale to 1, measure the surface's
   * natural size, and apply an exact fit for the current box. This also
   * fixes the old bug where the scale was computed against a content-sized
   * container, leaving the display small inside a huge black frame.
   */
  const applyDisplayScale = useCallback(() => {
    const emu = emulatorRef.current;
    const container = containerRef.current;
    if (!emu?.screen_set_scale || !container) return;

    const canvas = container.querySelector("canvas");
    const textEl = container.firstElementChild as HTMLElement | null;
    const canvasVisible =
      !!canvas && canvas.style.display !== "none" && canvas.width > 0;
    const surface = canvasVisible ? canvas : textEl;
    if (!surface) return;

    emu.screen_set_scale(1, 1); // clear previous scale before measuring

    const availW = container.clientWidth;
    const availH = container.clientHeight;
    if (!availW || !availH) return;

    const rect = surface.getBoundingClientRect();
    if (rect.width < 8 || rect.height < 8) return; // not laid out yet

    const scale = Math.min(availW / rect.width, availH / rect.height);
    if (!(scale > 0) || !Number.isFinite(scale)) return;

    // For the canvas v86 divides the scale by a fractional devicePixelRatio
    // (its own device-pixel-exactness trick) but applies text transforms
    // verbatim. Compensate per surface: without this, any machine with
    // 125%/150% OS scaling (fractional DPR) rendered the fit ~20% small,
    // which read as "the display doesn't cover the screen".
    const dpr = window.devicePixelRatio || 1;
    const applied =
      canvasVisible && !Number.isInteger(dpr) ? scale * dpr : scale;
    if (applied > 0 && Number.isFinite(applied)) {
      emu.screen_set_scale(applied, applied);
    }
  }, []);

  /**
   * Defer a refit by one frame. The guard flag swallows the ResizeObserver
   * callback triggered by our own scale change — otherwise refit → box
   * change → refit would ping-pong forever. Requests that arrive while a
   * fit is in flight are coalesced into one trailing pass (applying the
   * same scale twice is a no-op, so this still converges).
   */
  const scheduleFit = useCallback(() => {
    if (fittingRef.current) {
      pendingFitRef.current = true;
      return;
    }
    fittingRef.current = true;
    window.requestAnimationFrame(() => {
      try {
        applyDisplayScale();
      } finally {
        window.requestAnimationFrame(() => {
          fittingRef.current = false;
          if (pendingFitRef.current) {
            pendingFitRef.current = false;
            scheduleFit();
          }
        });
      }
    });
  }, [applyDisplayScale]);

  const boot = useCallback(async () => {
    if (!distro) return;

    try {
      setError(null);
      setProgress(0);
      setPhase("loading-engine");

      const V86 = await loadV86();
      // /boot flips its stage and calls start() in the same tick — give
      // React one beat to commit the screen container before reading it.
      let container = containerRef.current;
      if (!container) {
        await new Promise((r) => window.setTimeout(r, 50));
        container = containerRef.current;
      }
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
        // it avoids long stalls and hardware-detection timeouts. Verified
        // headlessly that DSL / TinyCore / buildroot all boot fine with it.
        acpi: true,
        bios: { buffer: biosBuffer },
        vga_bios: { buffer: vgaBiosBuffer },
        // THE critical fix: attach the image under the option key v86
        // actually reads. "kernel"/"floppy" are silently ignored upstream,
        // which left those guests at a SeaBIOS "No bootable device" screen.
        [BOOT_MEDIA_TO_V86[distro.boot]]: { buffer: bootBuffer, async: bootAsync },
      } as Record<string, unknown>);
      emulatorRef.current = emulator;

      // Observe box changes on the screen container and the canvas: entering
      // fullscreen, window resizes, and guest video-mode switches (the guest
      // changing resolution changes the canvas's CSS box) all arrive here.
      resizeObserverRef.current?.disconnect();
      if (typeof ResizeObserver !== "undefined") {
        const ro = new ResizeObserver(() => scheduleFit());
        ro.observe(container);
        const canvas = container.querySelector("canvas");
        if (canvas) ro.observe(canvas);
        resizeObserverRef.current = ro;
      }

      // Boot detection that reads REAL machine signals instead of DOM:
      //  - text mode: the screen adapter reports non-blank rows once the
      //    BIOS/guest has written to the VGA text buffer
      //  - graphics mode: v86 flips text div hidden / canvas visible, which
      //    the MutationObserver below catches
      //  - 18s with zero video output → clear error explaining likely causes
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        setPhase("running");
      };

      const readTextScreen = (): string[] | null => {
        const adapter = emulatorRef.current?.screen_adapter;
        if (typeof adapter?.get_text_screen === "function") {
          try {
            return adapter.get_text_screen();
          } catch {
            return null;
          }
        }
        return null;
      };

      const poll = window.setInterval(() => {
        const emu = emulatorRef.current;
        if (!emu) return;
        const screen = readTextScreen();
        if (screen?.some((row) => row.trim().length > 0)) {
          window.clearInterval(poll);
          settle();
        }
      }, 500);
      timersRef.current.push(poll);

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

      const stuckTimer = window.setTimeout(() => {
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
      timersRef.current.push(stuckTimer);

      // Freeze watchdog — text mode only, deliberately silent in graphics
      // mode, and only fires when the guest is PROVABLY not executing
      // anything. Background: the old canvas-hash watchdog fired "out of
      // memory" toasts on healthy sessions because an idle desktop is
      // pixel-stable by nature. A static console is no better a signal —
      // first-boot steps like gtk-icon-cache updates crunch for minutes
      // with no output while the instruction counter races. So we warn only
      // when the text screen has been static AND the emulated CPU has
      // executed nothing new for 45s: a wedged guest (dead init, RAM
      // exhaustion). A busy guest is never accused of being frozen.
      let lastText = "";
      let lastCounter = -1;
      let lastChange = Date.now();
      let warned = false;
      const renderWatch = window.setInterval(() => {
        if (warned) {
          window.clearInterval(renderWatch);
          return;
        }
        const emu = emulatorRef.current;
        if (!emu || !settled) return;
        try {
          const canvas = container.querySelector("canvas");
          const graphical = canvas && canvas.style.display !== "none";
          if (graphical) {
            lastChange = Date.now();
            return;
          }
          const screen = readTextScreen();
          if (!screen) return; // adapter unavailable — never guess
          const text = screen.join("\n");
          if (!text.trim()) return; // nothing printed yet — boot may be slow
          if (text !== lastText) {
            lastText = text;
            lastChange = Date.now();
            return;
          }
          // Text is static: is the CPU still executing instructions? A busy
          // guest (slow setup steps) must never be flagged; only a truly
          // frozen CPU counts.
          const counter = emu.get_instruction_counter?.() ?? -1;
          const cpuMoving = counter !== lastCounter;
          lastCounter = counter;
          if (cpuMoving) return;
          if (
            emu.is_running?.() !== false &&
            Date.now() - lastChange > 45_000
          ) {
            warned = true;
            window.clearInterval(renderWatch);
            toast.warning(
              "The guest has stopped responding — no screen output and no CPU activity for 45 seconds. It may have run out of memory. Try Reset, or boot with more RAM or a lighter image.",
              { duration: 10_000 },
            );
          }
        } catch {
          /* screen surface unavailable — ignore this tick */
        }
      }, 5_000);
      timersRef.current.push(renderWatch);
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
  }, [distro, overrides?.file, overrides?.memoryMb, overrides?.biosBuffers, scheduleFit]);

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
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
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
    // Fullscreen the whole machine frame (title bar + screen + hint bar), not
    // just the raw canvas container, so the display area can flex to the
    // viewport height instead of keeping its in-page height.
    const target = frameRef.current ?? containerRef.current;
    if (!target) return;

    // Custom fullscreen instead of v86's screen_go_fullscreen(): that one
    // hard-requires pointer lock, which sandboxed/embedded frames refuse
    // (SecurityError crash). Plain element fullscreen + our own scaling
    // gives the same result without the hard dependency.
    const request =
      target.requestFullscreen?.bind(target) ??
      (target as Element & { webkitRequestFullscreen?: () => void })
        .webkitRequestFullscreen?.bind(target);

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

  // Re-fit the display whenever the surface changes: entering/leaving
  // fullscreen, or window resizes. (Guest resolution changes arrive via the
  // ResizeObserver attached in boot().)
  useEffect(() => {
    const refit = () => scheduleFit();
    document.addEventListener("fullscreenchange", refit);
    window.addEventListener("resize", refit);
    return () => {
      document.removeEventListener("fullscreenchange", refit);
      window.removeEventListener("resize", refit);
    };
  }, [scheduleFit]);

  // First fit once the guest reaches a running desktop (layout has settled).
  useEffect(() => {
    if (phase === "running") {
      const t = window.setTimeout(scheduleFit, 200);
      return () => window.clearTimeout(t);
    }
  }, [phase, scheduleFit]);

  useEffect(() => {
    return () => {
      clearTimers();
      resizeObserverRef.current?.disconnect();
      emulatorRef.current?.destroy();
      emulatorRef.current = null;
      bootedRef.current = false;
    };
  }, [clearTimers]);

  return {
    containerRef,
    frameRef,
    phase,
    progress,
    error,
    start,
    reset,
    sendCtrlAltDelete,
    goFullscreen,
  };
}
