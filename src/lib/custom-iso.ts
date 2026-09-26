import type { BootMedia, Distro } from "@/lib/distros";

const MB = 1024 * 1024;

/** Above this the browser tab can't hold the image + guest RAM reliably. */
export const MAX_CUSTOM_BYTES = 1.5 * 1024 * 1024 * 1024;
/** Above this we boot, but warn about download-free but heavy sessions. */
export const WARN_CUSTOM_BYTES = 600 * MB;

export interface CustomBootPlan {
  boot: BootMedia;
  warning?: string;
  /** Set when the file can't be used at all — show `rejected` and stop. */
  rejected?: string;
}

/**
 * Decides how v86 should attach a user-supplied image and whether the file
 * is usable at all. Only 32-bit x86 bootable images can actually run —
 * 64-bit-only ISOs (Zorin Core 17, Lubuntu, Linux Lite…) will fail inside
 * the machine; we let them try and see rather than pretend otherwise.
 */
export function planCustomBoot(file: File): CustomBootPlan {
  if (file.size > MAX_CUSTOM_BYTES) {
    return {
      boot: "cdrom",
      rejected: `${(file.size / (1024 * MB)).toFixed(1)} GB is beyond what a browser tab can hold. Use an image under 1.5 GB — ideally under 600 MB.`,
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

  const warning =
    file.size > WARN_CUSTOM_BYTES
      ? "Large image — the whole file is read into memory and boot will be slow. Under 600 MB gives the best experience."
      : undefined;

  return { boot, warning };
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
