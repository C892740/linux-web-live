import type { AuthConfig } from "convex/server";

// Freebuff-signed federated tokens (see freebuff web's
// src/lib/vly-convex-jwt.ts) let a signed-in freebuff.com user carry their
// identity into this project without going through local sign-in. customJwt
// is correct for this provider: freebuff's tokens and JWKS both carry a
// `kid` header, which the customJwt validation path requires.
const freebuffIssuer =
  process.env.VLY_CONVEX_AUTH_ISSUER ?? "https://freebuff.com";

export default {
  providers: [
    // ── Clerk activation (pending keys) ──────────────────────────────
    // When CLERK_FRONTEND_API_URL is set on the deployment (Keys tab,
    // value = Clerk Frontend API URL, e.g. https://verb-noun-00.clerk.accounts.dev),
    // add this provider entry at the TOP of this array to accept Clerk
    // session JWTs (aud is pre-mapped to "convex" by Clerk's integration):
    //
    //   { domain: process.env.CLERK_FRONTEND_API_URL!, applicationID: "convex" },
    //
    // Until then it must stay commented out: Convex rejects an auth config
    // that references an env var which isn't set.
    // ─────────────────────────────────────────────────────────────────
    // Standard Convex Auth provider for this project's own sign-in ("Get
    // Started" email/guest, see src/convex/auth.ts). The deployment
    // self-issues JWTs (iss = CONVEX_SITE_URL, no `kid` header) validated
    // via OIDC discovery at `${domain}/.well-known/openid-configuration`,
    // served by auth.addHttpRoutes() in convex/http.ts. Do NOT convert this
    // entry to `type: "customJwt"` — that path rejects tokens without a
    // `kid` header, so sign-in would silently never confirm and RequireAuth
    // would loop back to /auth forever.
    {
      domain: process.env.CONVEX_SITE_URL!,
      applicationID: "convex",
    },
    {
      type: "customJwt",
      issuer: freebuffIssuer,
      jwks: `${freebuffIssuer}/api/web/.well-known/jwks.json`,
      applicationID: "vly-convex",
      algorithm: "RS256",
    },
  ],
} satisfies AuthConfig;
