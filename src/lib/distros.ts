/**
 * Catalog of distros that can boot live in the browser via v86 (32-bit x86).
 *
 * Version 1 only lists images that are verified to work cross-origin in the
 * browser (access-control-allow-origin) and boot under v86's emulation:
 *
 *  - `linux3.iso` is the v86 demo "Linux 2.6 / Buildroot" live image (6.2 MB).
 *  - `TinyCore-11.0.iso` is Tiny Core Linux 11 (19 MB, FLTK desktop).
 *  - `dsl-cdrom.iso` is Damn Small Linux 4.4.10 (50 MB, JWM desktop).
 *  - `buildroot-bzimage68.bin` boots as a kernel image (no CD-ROM needed).
 *  - `mobius-fd-release5.img` is a 1.44 MB boot floppy (graphical demo OS).
 *
 * All images come from the `affinityjeff96/v86-disk-images` Hugging Face
 * dataset, which mirrors the v86 test images and serves every file with
 * `access-control-allow-origin` — required, because v86 fetches the whole
 * image from the browser before booting.
 *
 * Popular distros like Zorin OS, Linux Lite and Lubuntu are listed as
 * "coming soon": they ship 64-bit-only installers far too large for v86's
 * 32-bit emulator and browser streaming, so v1 can't boot them honestly.
 */

export type BootMedia = "cdrom" | "kernel" | "floppy";

export interface Distro {
  id: string;
  name: string;
  tagline: string;
  description: string;
  /** Size of the image the browser must download before boot. */
  sizeMb: number;
  /** Human-friendly RAM for this distro inside the emulated machine. */
  memoryMb: number;
  boot: BootMedia;
  /** URL of the boot image (CORS-enabled). */
  imageUrl: string;
  /** v86 file extension hint — mirrors how copy.sh names its images. */
  ext: "iso" | "bin" | "img";
  family: "linux" | "demo";
  desktop: string;
  accent: string;
  badges: string[];
  comingSoon?: boolean;
  /** Set for coming-soon entries — why it can't boot in v1. */
  comingSoonNote?: string;
}

const HF = "https://huggingface.co/datasets/affinityjeff96/v86-disk-images/resolve/main";

export const DISTROS: Distro[] = [
  {
    id: "buildroot",
    name: "Buildroot Linux",
    tagline: "Tiny live console · boots in seconds",
    description:
      "A minimal Linux 2.6 live system with a busybox shell. The fastest way to watch a real kernel boot — try `ls`, `uname -a`, `top` in the console.",
    sizeMb: 9.6,
    memoryMb: 128,
    boot: "kernel",
    imageUrl: `${HF}/buildroot-bzimage68.bin`,
    ext: "bin",
    family: "linux",
    desktop: "Console",
    accent: "#0e7490",
    badges: ["9.6 MB", "Fastest boot", "Terminal"],
  },
  {
    id: "linux3",
    name: "Linux 3 Live",
    tagline: "The classic v86 demo live CD",
    description:
      "A small live CD built around Linux 3.18 with a basic JWM desktop, a terminal and a few utilities. The same image that powers the v86 project's own demo.",
    sizeMb: 6.2,
    memoryMb: 128,
    boot: "cdrom",
    imageUrl: `${HF}/linux3.iso`,
    ext: "iso",
    family: "linux",
    desktop: "JWM",
    accent: "#2563eb",
    badges: ["6.2 MB", "Tiny desktop", "Classic"],
  },
  {
    id: "tinycore",
    name: "Tiny Core Linux 11",
    tagline: "16 MB of pure minimalism",
    description:
      "The famously tiny Tiny Core with the FLTK desktop. Boots to RAM, so everything feels snappy even inside an emulator. Right-click the desktop for a tool menu.",
    sizeMb: 19,
    memoryMb: 256,
    boot: "cdrom",
    imageUrl: `${HF}/TinyCore-11.0.iso`,
    ext: "iso",
    family: "linux",
    desktop: "FLTK",
    accent: "#0d9488",
    badges: ["19 MB", "Runs from RAM", "Graphical"],
  },
  {
    id: "dsl",
    name: "Damn Small Linux 4.4",
    tagline: "The legendary 50 MB desktop",
    description:
      "DSL packs a window manager, browser, file manager and office tools into 50 MB — a masterclass in small, ideal for a virtual machine in a browser tab.",
    sizeMb: 50.4,
    memoryMb: 512,
    boot: "cdrom",
    imageUrl: `${HF}/dsl-cdrom.iso`,
    ext: "iso",
    family: "linux",
    desktop: "JWM + FLTK",
    accent: "#7c3aed",
    badges: ["50 MB", "Full desktop", "Legendary"],
  },
  {
    id: "mobius",
    name: "Mobius",
    tagline: "A 1.4 MB graphical OS on a floppy",
    description:
      "A tiny retro operating system that fits on a single 1.44 MB floppy. Pure demo-OS nostalgia — great for seeing just how small 'an OS' can be.",
    sizeMb: 1.4,
    memoryMb: 64,
    boot: "floppy",
    imageUrl: `${HF}/mobius-fd-release5.img`,
    ext: "img",
    family: "demo",
    desktop: "Custom GUI",
    accent: "#d97706",
    badges: ["1.4 MB", "Instant boot", "Retro"],
  },
  {
    id: "zorin",
    name: "Zorin OS",
    tagline: "Windows-friendly desktop for switchers",
    description:
      "A polished desktop that feels familiar to Windows users.",
    sizeMb: 4000,
    memoryMb: 0,
    boot: "cdrom",
    imageUrl: "",
    ext: "iso",
    family: "linux",
    desktop: "Zorin Desktop (GNOME)",
    accent: "#0ea5e9",
    badges: ["~4 GB", "64-bit only"],
    comingSoon: true,
    comingSoonNote:
      "Zorin OS ships 64-bit installers several gigabytes in size. v86 emulates 32-bit x86 only and streams small images into a browser tab, so it can't boot Zorin yet.",
  },
  {
    id: "linuxlite",
    name: "Linux Lite",
    tagline: "Lightweight, Ubuntu-based, beginner-first",
    description:
      "A gentle Ubuntu LTS derivative aimed at Windows switchers.",
    sizeMb: 2300,
    memoryMb: 0,
    boot: "cdrom",
    imageUrl: "",
    ext: "iso",
    family: "linux",
    desktop: "Xfce",
    accent: "#64748b",
    badges: ["~2.3 GB", "64-bit only"],
    comingSoon: true,
    comingSoonNote:
      "Linux Lite is 64-bit only and ~2.3 GB. Browser streaming of images that size isn't practical in v1 — we're tracking smaller Xfce-based builds.",
  },
  {
    id: "lubuntu",
    name: "Lubuntu",
    tagline: "The featherweight LXQt Ubuntu",
    description:
      "Ubuntu's official LXQt flavour, built to run on low-spec machines.",
    sizeMb: 2300,
    memoryMb: 0,
    boot: "cdrom",
    imageUrl: "",
    ext: "iso",
    family: "linux",
    desktop: "LXQt",
    accent: "#2563eb",
    badges: ["~2.3 GB", "64-bit only"],
    comingSoon: true,
    comingSoonNote:
      "Lubuntu dropped 32-bit images years ago. When a suitable 32-bit LXQt build exists, it'll land here.",
  },
];

export function getDistro(id: string | undefined): Distro | undefined {
  return DISTROS.find((d) => d.id === id);
}

export const BOOTABLE_DISTROS = DISTROS.filter((d) => !d.comingSoon);
