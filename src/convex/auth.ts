// THIS FILE IS READ ONLY. Do not touch this file unless you are correctly adding a new auth provider in accordance to the vly auth documentation

import { convexAuth } from "@convex-dev/auth/server";
import { Anonymous } from "@convex-dev/auth/providers/Anonymous";
import MicrosoftEntraID from "@auth/core/providers/microsoft-entra-id";
import type { Profile } from "@auth/core/types";
import { emailOtp } from "./auth/emailOtp";

/**
 * Microsoft Entra ID (Azure AD) sign-in for Coventry College.
 *
 * Tenant restriction: the `issuer` pins the OAuth flow to the college's own
 * directory, so only accounts that exist in the coventrycollege.ac.uk tenant
 * can complete sign-in — no public Microsoft personal accounts, no other
 * organisations. This is enforced by Microsoft itself, not by an email
 * string check we could get wrong.
 *
 * Requires these env vars (set via the dashboard's Keys/API keys UI):
 *   AUTH_MICROSOFT_ENTRA_ID_ID
 *   AUTH_MICROSOFT_ENTRA_ID_SECRET
 */
const MicrosoftEntraIDCoventry = MicrosoftEntraID({
  // Pinning `issuer` to the college's tenant endpoint makes Microsoft resolve
  // the OIDC discovery, token and authorise URLs against
  // coventrycollege.ac.uk only — public Microsoft personal accounts and other
  // organisations' directories are refused at the door.
  issuer: "https://login.microsoftonline.com/coventrycollege.ac.uk/v2.0",
  authorization: { params: { scope: "openid email profile" } },
  /**
   * Only accept tokens whose home tenant is the college's directory. Guards
   * against multi-tenant app configurations accidentally letting guest
   * accounts from other directories through.
   */
  profile(profile: Profile & { tid?: string }) {
    if (profile.tid && profile.tid !== "coventrycollege.ac.uk") {
      throw new Error(
        "Sign-in is restricted to Coventry College accounts. Please use your college Microsoft 365 login.",
      );
    }
    return {
      id: profile.id ?? undefined,
      name: profile.name,
      email: profile.email ?? undefined,
      image: typeof profile.image === "string" ? profile.image : undefined,
    };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [emailOtp, Anonymous, MicrosoftEntraIDCoventry],
});
