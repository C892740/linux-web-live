import { httpAction } from "./_generated/server";

/**
 * Reports whether the Microsoft Entra ID provider has its credentials set on
 * this Convex deployment. The auth page uses this to show the real
 * "Sign in with Microsoft 365" button vs. a clear not-configured state,
 * instead of a button that 500s.
 *
 * Never leaks the values — only whether they exist.
 */
export const msStatus = httpAction(async () => {
  const clientId = process.env.AUTH_MICROSOFT_ENTRA_ID_ID;
  const clientSecret = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET;
  const configured = Boolean(clientId && clientSecret);

  return new Response(JSON.stringify({ configured }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": process.env.CONVEX_SITE_URL ?? "*",
      "Access-Control-Allow-Methods": "GET",
    },
  });
});
