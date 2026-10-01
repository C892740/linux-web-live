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

// ── Pre-flight boot validation ─────────────────────────────────────────
// A 366 MB ISO that fails SeaBIOS with "Could not read from CDROM (code
// 0003)" then "No bootable device" is NOT a memory or configuration problem
// (code 0003 is the BIOS's DISK_RET_EBADTRACK: the El Torito boot catalog
// failed checksum/validation). Reading 3×2 KB sectors from the File before
// powering on detects exactly this — and whether the image can still boot
// another way (isohybrid MBR) — in a few milliseconds.

const SECTOR = 2048;
const PVD_SECTOR = 16; // ISO-9660 Primary Volume Descriptor (always here)
const BRVD_SECTOR = 17; // Boot Record Volume Descriptor (El Torito)

export type IsoBootValidation =
  | { kind: "eltorito"; note?: string }
  /** No ISO-9660 descriptor, but a valid MBR — a raw/hybrid disk image. */
  | { kind: "mbr" }
  /** ISO descriptor present but the boot catalog is missing/invalid. */
  | { kind: "invalid-catalog"; hasMbr: boolean }
  /** File is smaller than the ISO volume declares — an interrupted download. */
  | { kind: "truncated"; expectedMb: number; actualMb: number }
  | { kind: "unreadable"; detail: string };

async function readSector(file: File, sector: number): Promise<DataView> {
  const start = sector * SECTOR;
  const buf = await file.slice(start, (sector + 1) * SECTOR).arrayBuffer();
  return new DataView(buf);
}

function ascii(view: DataView, start: number, end: number): string {
  let s = "";
  for (let i = start; i < end; i++) s += String.fromCharCode(view.getUint8(i));
  return s;
}

/** ISO string fields are NUL-padded; String.trim() does NOT strip NULs. */
function isoLabel(view: DataView, start: number, end: number): string {
  return ascii(view, start, end).replace(/[\0\s]+$/g, "");
}

/** El Torito Validation Entry: the sum of its 16-bit words must be zero. */
function catalogChecksumOk(view: DataView): boolean {
  let sum = 0;
  for (let i = 0; i < 32; i += 2) sum = (sum + view.getUint16(i, true)) & 0xffff;
  return sum === 0;
}

/**
 * Reads just enough of an image (system area + volume descriptors + boot
 * catalog, ~3 sectors) to know whether it can boot as a CD-ROM before the
 * emulator is started. Never reads the whole file.
 */
export async function validateIsoBoot(file: File): Promise<IsoBootValidation> {
  try {
    const mbr = await readSector(file, 0);
    const hasMbr = mbr.getUint16(510, false) === 0xaa55;

    const pvd = await readSector(file, PVD_SECTOR);
    if (isoLabel(pvd, 1, 6) !== "CD001") {
      return hasMbr ? { kind: "mbr" } : { kind: "invalid-catalog", hasMbr };
    }

    // Interrupted-download detector: the PVD declares the volume size in
    // 2048-byte sectors, so the file must be at least that large. A genuine
    // ISO is also always a whole number of sectors — anything else means the
    // write was cut off or corrupted, which is exactly the kind of file that
    // boots to SeaBIOS "Could not read from CDROM (code 0003)".
    const volumeSectors = pvd.getUint32(80, true);
    const volumeBytes = volumeSectors * SECTOR;
    if (
      volumeSectors > 0 &&
      volumeSectors === pvd.getUint32(84, false) && // LE/BE agree — sane PVD
      file.size < volumeBytes
    ) {
      return {
        kind: "truncated",
        expectedMb: Math.round((volumeBytes / (1024 * 1024)) * 10) / 10,
        actualMb: Math.round((file.size / (1024 * 1024)) * 10) / 10,
      };
    }

    const brvd = await readSector(file, BRVD_SECTOR);
    const catalogRba =
      isoLabel(brvd, 1, 6) === "CD001" &&
      isoLabel(brvd, 7, 39) === "EL TORITO SPECIFICATION"
        ? brvd.getUint32(71, true)
        : 0;
    if (!catalogRba) {
      return hasMbr ? { kind: "mbr" } : { kind: "invalid-catalog", hasMbr: false };
    }

    const cat = await readSector(file, catalogRba);
    if (cat.byteLength < 32) {
      // Catalog sector lies beyond EOF — the image is cut short.
      return { kind: "invalid-catalog", hasMbr };
    }
    // Validation Entry must be header 0x01, end in the 55 AA key, checksum
    // to zero, and be followed by a bootable Default Entry pointing at a
    // non-empty boot image.
    const valid =
      catalogChecksumOk(cat) &&
      cat.getUint8(0) === 0x01 &&
      cat.getUint8(30) === 0x55 &&
      cat.getUint8(31) === 0xaa &&
      cat.getUint8(32) === 0x88 &&
      cat.getUint32(40, true) > 0 &&
      cat.getUint16(38, true) > 0;

    if (!valid) return { kind: "invalid-catalog", hasMbr };
    // A non-sector-aligned file whose descriptors still validate: odd (every
    // standard ISO writer pads to 2048), so pass it through with a note.
    const note =
      file.size % SECTOR !== 0
        ? "The file size isn't a whole number of CD sectors, which suggests it may be damaged — if the boot misbehaves, re-download it."
        : undefined;
    return note ? { kind: "eltorito", note } : { kind: "eltorito" };
  } catch (err) {
    return {
      kind: "unreadable",
      detail: err instanceof Error ? err.message : "the file could not be read",
    };
  }
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

  if (file.size > 250 * MB) {
    warnings.push(
      "Desktop ISOs this size run best with 512–768 MB of RAM — use the memory slider before powering on. This is performance advice only: RAM never decides whether an image can boot.",
    );
  }

  if (file.size > WARN_CUSTOM_BYTES) {
    warnings.push(
      "Large image — it streams from disk lazily as the guest boots, but big ISOs are heavy for a 32-bit emulator and boot slowly. Under 300 MB gives the best experience.",
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
