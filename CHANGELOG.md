# Changelog

All notable changes to Nixtab are documented here.

## Versioning convention

Semver `MAJOR.MINOR.PATCH`, applied on every update:

- **MAJOR** — decided by the user in the prompt (e.g. public launch, breaking
  product change). The first number changes.
- **MINOR** — a new feature or meaningful capability (new integration, new
  page, new catalog section). The second number changes.
- **PATCH** — small updates: fixes, QoL, performance, copy tweaks. The third
  number changes.

The version lives in `package.json` and `public/manifest.webmanifest` and must
be bumped as part of every change.

## [2.0.0] — 2026-10-01

Major reliability release: guests that silently never started now boot, the
display truly fills the machine screen (fullscreen included), and the false
"out of memory" freeze toast is gone.

### Fixed
- **Kernel-image and floppy guests never started.** v86 only accepts the
  option keys `bzimage` / `fda`; the app was passing `kernel` / `floppy`,
  which the emulator silently drops — leaving Buildroot and Mobius (and any
  `/boot` file detected as a kernel or floppy) parked on a SeaBIOS "No
  bootable device" screen while the UI showed a running session. Media names
  are now mapped to the real v86 keys at the API boundary.
- **False "guest looks frozen — may have run out of memory" toasts.** The
  watchdog read text through an instance method v86 doesn't expose and
  treated pixel-stable desktops as frozen, so it fired on healthy sessions
  (e.g. DSL showing Firefox). It now reads the real text buffer via the
  screen adapter, stays silent in graphics mode (an idle desktop is
  supposed to be static), and warns once — only when a text-mode boot stops
  printing for 30 seconds.
- **Display didn't cover the machine screen, especially in fullscreen.** The
  scale was computed against a content-sized container (circular: the canvas
  sized its own box), capping the display small inside a big black frame.
  Scaling now resets v86's scale, measures the active surface's natural
  size, and applies an exact aspect-fit to the real screen box — refitting
  on fullscreen changes, window resizes, and guest resolution switches. It
  also compensates v86's fractional-DPR canvas quirk, which had undersized
  the fit ~20% on 125%/150% Windows display scaling.
- Fullscreen now targets the whole machine frame, and in fullscreen the
  screen area flexes to the viewport so the display covers the entire
  screen instead of keeping its in-page size.
- Text-mode output is centered and scaled instead of hugging the top-left
  corner of a mostly-empty frame.

### Changed
- **v86 0.5.44 → 0.5.465** — roughly 420 upstream releases of CPU, IDE,
  VGA, and ACPI fixes. Every catalog image was verified booting headlessly
  before pinning: Buildroot to its kernel console, DSL to its 1024×768 JWM
  desktop, Mobius to its shell, Tiny Core to its boot menu, Linux 3 to text
  mode.
- `/boot` large-image advice now reflects lazy disk streaming (files are no
  longer read into tab memory before boot).

## [1.0.0] — 2026-09-26

First major release: the platform is stable, fast, and documented.

### Added
- Documentation page (`/docs`): how the emulation works, what Nixtab is for,
  capabilities and honest limits, a machine-index table with boot links,
  hands-on session tips, and illustrated session showcases. Linked from the
  site navigation.
- True-resolution fullscreen: the emulated display scales to fill the
  monitor at the guest's native resolution (aspect-preserving), refitting on
  fullscreen change, window resize, and when the desktop first appears.
- Freeze watchdog: when the guest stops producing video output for 20s while
  still running (typically guest RAM exhaustion), the UI warns with recovery
  advice instead of leaving a frozen screen.
- RAM guidance for large desktop ISOs on /boot (slider defaults and inline
  advice tuned to image size).

### Changed
- **Boot performance overhaul.** Local ISOs are no longer read fully into
  memory before boot: v86 now lazy-reads them from disk in chunks on demand,
  so 300 MB–2 GB images start booting immediately instead of after a long,
  memory-hungry read. Catalog images are cached across resets/reboots.
- ACPI is exposed to the guest, avoiding long hardware-probe stalls on
  modern kernels (Puppy's 6.x series, etc.).
- Fullscreen no longer depends on pointer lock: works in embedded frames
  and uses a custom scaler instead of v86's hardcoded behaviour.

### Fixed
- Timer leaks: boot watchdogs and polls are now cleaned up on reset and
  navigation, so sessions can't leave orphaned timers behind.

## [0.3.1] — 2026-09-26

### Fixed
- The Fullscreen button no longer crashes when the app runs inside an
  embedded/sandboxed preview frame: the browser refuses pointer lock there
  (SecurityError), so the click now shows a friendly explanation instead of
  throwing. Fullscreen still works when Nixtab is opened in its own tab.

## [0.3.0] — 2026-09-26

### Added
- Dark mode. Light / Dark / System toggle in the site navigation (every page
  with the shared nav), powered by `next-themes` with the `dark` class on
  `<html>`; defaults to following the OS setting. All pages render from the
  existing dark token set, so dashboards, machine sessions and auth screens
  switch cleanly. Toast notifications follow the active theme.

## [0.2.0] — 2026-09-26

### Added
- Official OS logos in the machine index for every distro that publishes one:
  Buildroot, Tiny Core Linux, Damn Small Linux, Zorin OS, Linux Lite, and
  Lubuntu. Logos are vendored into `src/assets/logos/` with sources recorded
  in `ATTRIBUTION.md`; entries without an official mark (Linux 3 Live demo
  image, Mobius) keep the monogram tile.

## [0.1.0] — 2026-09-26

Baseline version for the initial platform build.

### Added
- Landing page, machine index, and Nixtab editorial theme (Archivo + IBM Plex
  Mono, warm paper / phosphor-green).
- v86 machine runner (`/run/:distroId`) with five bootable images (Buildroot,
  Linux 3 Live, Tiny Core 11, Damn Small Linux 4.4, Mobius floppy) and three
  documented coming-soon entries (Zorin OS, Linux Lite, Lubuntu).
- Bring-your-own image booting (`/boot`): local files read in-browser, never
  uploaded; boot-media classification, RAM slider, 2 GB ceiling, and honest
  64-bit warnings.
- Auth: Microsoft Entra ID (Coventry College tenancy) + email OTP + guest
  sign-in via Convex Auth, course onboarding, per-course content gating,
  verified-student badge.
- Clerk dual-mode integration: activates automatically when
  `VITE_CLERK_PUBLISHABLE_KEY` is configured, preserving the Convex Auth
  stack until then.
- Live system status from Statuspage (`/statuspage` endpoint, nav chip,
  landing footer panel).

### Fixed
- v86 boots now pass real SeaBIOS + VGABIOS binaries (the npm package ships
  without them, which left machines running headless on a black screen).
- Boot detection now reads real video output (VGA text buffer / graphics-mode
  switch) instead of DOM heuristics, with a clear error when nothing appears.
