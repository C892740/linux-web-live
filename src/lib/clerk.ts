/**
 * Clerk wiring for Nixtab.
 *
 * Clerk becomes the sign-in stack the moment a publishable key is present;
 * until then the app keeps running on the built-in Convex Auth stack so the
 * preview never breaks. Both modes share the same Convex identity contract:
 *   - useConvexAuth() decides "signed in" everywhere (useAuth / RequireAuth)
 *   - Convex functions see the user via getAuthUserId / getUserIdentity
 *
 * Keys live in the Keys tab:
 *   VITE_CLERK_PUBLISHABLE_KEY  (frontend)
 *   CLERK_SECRET_KEY            (backend, optional — only for server API calls)
 */

export const CLERK_PUBLISHABLE_KEY = import.meta.env
  .VITE_CLERK_PUBLISHABLE_KEY as string | undefined;

/** True when the deployment has a Clerk publishable key configured. */
export const isClerkEnabled = Boolean(
  CLERK_PUBLISHABLE_KEY && CLERK_PUBLISHABLE_KEY.startsWith("pk_"),
);

/*
 * Clerk component appearance, tuned to the Nixtab editorial theme: warm
 * paper, dense ink, phosphor-green accent, IBM Plex Mono metadata. Clerk's
 * variables are scoped to its portals, so these don't leak into the app.
 */
export const clerkAppearance = {
  variables: {
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif",
    fontFamilyButtons: "Archivo, ui-sans-serif, system-ui, sans-serif",
    colorPrimary: "#1f8a5a",
    colorBackground: "#fdfcf9",
    colorText: "#23262b",
    colorTextSecondary: "#6b6f76",
    colorInputBackground: "#ffffff",
    colorInputText: "#23262b",
    colorBorder: "#e3e0d8",
    borderRadius: "0.5rem",
  },
  elements: {
    card: "shadow-none border border-[#e3e0d8]",
    socialButtonsBlockButton:
      "border border-[#e3e0d8] shadow-none hover:bg-[#f4f2ec]",
    formButtonPrimary: "shadow-none",
    identityPreviewText: "font-mono text-[13px]",
    footer: "&>div>a { font-family: 'IBM Plex Mono', monospace; }",
  },
} as const;
