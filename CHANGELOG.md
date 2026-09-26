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
