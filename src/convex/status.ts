import { httpAction } from "./_generated/server";

/**
 * Live system status for the Nixtab platform, read from our Atlassian
 * Statuspage page.
 *
 * The public, unauthenticated Statuspage API
 * (https://api.statuspage.io/v1/pages/{page_id}/summary.json) is exactly the
 * data the public status page shows and requires no key, so this endpoint
 * exposes nothing that isn't already public — it only hides whether
 * STATUSPAGE_PAGE_ID exists on the deployment.
 *
 * STATUSPAGE_PAGE_ID may be either:
 *  - the page id (a 32-char hex string, from the v1 API / dashboard URL), or
 *  - the page subdomain (e.g. "nixtab", from the page's public URL).
 * Both resolve against the v1 summary endpoint; the subdomain form is used as
 * a fallback against the v2 summary endpoint if the v1 lookup 404s.
 *
 * STATUSPAGE_API_KEY (OAuth token for the authenticated v1 write API) is NOT
 * needed for this read-only status display, and is never used here.
 *
 * Client behaviour on failure: {configured: false} renders the UI's neutral
 * "status unavailable" state.
 */
export const systemStatus = httpAction(async () => {
  const pageId = process.env.STATUSPAGE_PAGE_ID;
  const corsHeaders = {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=30",
    "Access-Control-Allow-Origin": process.env.CONVEX_SITE_URL ?? "*",
    "Access-Control-Allow-Methods": "GET",
  } as const;

  const notConfigured = new Response(
    JSON.stringify({ configured: false }),
    { status: 200, headers: corsHeaders },
  );
  if (!pageId) return notConfigured;

  const isSubdomain = /^[a-z0-9-]+$/i.test(pageId);
  const candidates: string[] = [
    `https://api.statuspage.io/v1/pages/${encodeURIComponent(pageId)}/summary.json`,
  ];
  if (isSubdomain && !/^[0-9a-f]{32}$/i.test(pageId)) {
    candidates.push(
      `https://${pageId}.statuspage.io/api/v2/summary.json`,
    );
  }

  for (const url of candidates) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) continue;
      const raw: unknown = await res.json();
      if (!isSummary(raw)) continue;

      const activeIncidents = (raw.incidents ?? [])
        .filter((i) => i.status !== "resolved" && i.status !== "postmortem")
        .map((i) => ({
          name: i.name,
          status: i.status,
          impact: i.impact ?? "maintenance",
          shortlink: i.shortlink,
          createdAt: i.created_at,
        }));

      const maintenances = (raw.scheduled_maintenances ?? [])
        .filter((m) => m.status === "in_progress" || m.status === "scheduled")
        .map((m) => ({
          name: m.name,
          status: m.status,
          scheduledFor: m.scheduled_for,
          shortlink: m.shortlink,
        }));

      return new Response(
        JSON.stringify({
          configured: true,
          page: { name: raw.page.name, url: raw.page.url },
          status: {
            indicator: raw.status.indicator,
            description: raw.status.description,
          },
          components: raw.components.map((c) => ({
            name: c.name,
            status: c.status,
          })),
          incidents: activeIncidents,
          maintenances,
        }),
        { status: 200, headers: corsHeaders },
      );
    } catch {
      // Try the next candidate URL, then fall through to "unavailable".
    }
  }

  // Page id is set but the page couldn't be reached — surface as unavailable.
  return notConfigured;
});

/** Minimal structural check of a v1/v2 summary.json payload. */
function isSummary(
  raw: unknown,
): raw is {
  page: { name: string; url: string };
  status: { indicator: string; description: string };
  components: Array<{ name: string; status: string }>;
  incidents?: Array<{
    name: string;
    status: string;
    impact?: string;
    shortlink?: string;
    created_at?: string;
  }>;
  scheduled_maintenances?: Array<{
    name: string;
    status: string;
    scheduled_for?: string;
    shortlink?: string;
  }>;
} {
  if (typeof raw !== "object" || raw === null) return false;
  const r = raw as Record<string, unknown>;
  const page = r.page as Record<string, unknown> | undefined;
  const status = r.status as Record<string, unknown> | undefined;
  return (
    typeof page?.name === "string" &&
    typeof status?.indicator === "string" &&
    Array.isArray(r.components)
  );
}
