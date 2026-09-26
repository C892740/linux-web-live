import type { BootMedia, Distro } from "@/lib/distros";

const MB = 1024 * 1024;

/**
 * Above this the browser tab can't reliably hold the image in memory.
 * 2 GB is the practical FileReader/ArrayBuffer ceiling in Chromium — larger
 * files either take minutes to read or crash the tab outright. (Not a v86
 * limit: the 32-bit guest CPU is a separate, harder wall — see below.)
 */
export const MAX_CUSTOM_BYTES = 2 * 1024 * 1024 * 1024;
/** Above this booting works, but the session will feel heavy. */
export const WARN_CUSTOM_BYTES = 300 * MB;

/**
 * Filenames that strongly suggest a 64-bit-only image. v86 emulates a 32-bit
 * (i386) CPU without long mode, so 64-bit kernels cannot execute — the boot
 * dies in the bootloader/kernel handoff. This is a physics limit of the
 * emulator, not a file-size limit, and no amount of RAM fixes it.
 */
const X64_HINTS = [
  "amd64",
  "x86_64",
  "x64",
  "64-bit",
] as const;

export interface CustomBootPlan {
  boot: BootMedia;
  warning?: string;
  /** Set when the file can't be used at all — show `rejected` and stop. */
  rejected?: string;
}

/**
 * Decides how v86 should attach a user-supplied image and whether the file
 * is usable at all. Only 32-bit x86 bootable images can actually run —
 * 64-bit-only ISOs (Zorin Core 17, Lubuntu, Linux Lite…) are allowed to try
 * (some boot far enough to print the kernel's own "requires x86-64 CPU"
 * error, which is genuinely educational) with a clear warning attached.
 */
export function planCustomBoot(file: File): CustomBootPlan {
  if (file.size > MAX_CUSTOM_BYTES) {
    return {
      boot: "cdrom",
      rejected: `${(file.size / (1024 * MB)).toFixed(1)} GB is beyond what a browser tab can hold — files are read into memory locally, and Chromium's practical ceiling is around 2 GB. There's no way around this in a pure-browser sandbox.`,
    };
  }

  const ext = (file.name.split(".").pop() ?? "").toLowerCase();
  let boot: BootMedia = "cdrom";

  if (ext === "bin") {
    // Kernel image (bzImage) — boots without a CD-ROM.
    boot = "kernel";
  } else if (["img", "ima", "dsk"].includes(ext) && file.size <= 2.88 * MB) {
    // Small raw image → floppy.
    boot = "floppy";
  } else if (["img", "raw", "dsk", "vhd"].includes(ext)) {
    // Larger raw image → hard disk.
    boot = "hda";
  }

  const warnings: string[] = [];

  if (file.size > WARN_CUSTOM_BYTES) {
    warnings.push(
      "Large image — the whole file is read into this tab's memory and boot will be slow. Under 300 MB gives the best experience.",
    );
  }

  const name = file.name.toLowerCase();
  if (X64_HINTS.some((hint) => name.includes(hint))) {
    warnings.push(
      "This filename suggests a 64-bit-only build. The emulator is 32-bit, so the boot will likely stop with an error — grab the i386/32-bit build of the same distro and it should start.",
    );
  }

  return { boot, warning: warnings.length > 0 ? warnings.join(" ") : undefined };
}

/**
 * Builds a synthetic Distro so the run screen and v86 hook can treat a
 * locally-supplied file exactly like a catalog entry.
 */
export function makeCustomDistro(
  file: File,
  memoryMb: number,
  boot: BootMedia,
): Distro {
  const sizeMb = Math.round((file.size / MB) * 10) / 10;
  const bootLabel: Record<BootMedia, string> = {
    cdrom: "CD-ROM",
    floppy: "Floppy",
    kernel: "Kernel image",
    hda: "Raw disk",
  };

  return {
    id: "custom",
    name: file.name,
    tagline: "Your own image, booted locally",
    description:
      "A live image supplied by you and read straight from your disk. Nothing is uploaded anywhere — the machine runs entirely in this tab. Only 32-bit x86 bootable images can start; 64-bit-only ISOs will fail inside the emulator.",
    sizeMb,
    memoryMb,
    boot,
    imageUrl: "", // unused — the buffer comes from the File directly
    ext: "iso",
    family: "linux",
    desktop: "Guest OS",
    accent: "#64748b",
    badges: [`${sizeMb} MB`, bootLabel[boot], "Local file"],
  };
}
