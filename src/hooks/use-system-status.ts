import { useEffect, useState } from "react";

/** Shape returned by the /statuspage Convex endpoint (src/convex/status.ts). */
export interface SystemStatus {
  configured: true;
  page: { name: string; url: string };
  status: { indicator: string; description: string };
  components: Array<{ name: string; status: string }>;
  incidents: Array<{
    name: string;
    status: string;
    impact: string;
    shortlink?: string;
    createdAt?: string;
  }>;
  maintenances: Array<{
    name: string;
    status: string;
    scheduledFor?: string;
    shortlink?: string;
  }>;
}

/** null = probe in flight, false = page unset/unreachable, true = payload. */
export type SystemStatusState = SystemStatus | null | false;

/**
 * Live platform status from the deployment's /statuspage endpoint.
 * Polled on mount and refreshed every 5 minutes while the host stays open;
 * failures surface as `false` so the UI can show a quiet fallback line.
 */
export function useSystemStatus(): SystemStatusState {
  // Lazy initialiser: when the Convex site URL isn't configured there is
  // nothing to probe, so settle on `false` without an effect-driven setState.
  const [status, setStatus] = useState<SystemStatusState>(
    () => (import.meta.env.VITE_CONVEX_SITE_URL ? null : false),
  );

  useEffect(() => {
    const base = import.meta.env.VITE_CONVEX_SITE_URL;
    if (!base) return;

    let cancelled = false;

    const load = () => {
      fetch(`${base}/statuspage`)
        .then((r) =>
          r.ok ? r.json() : Promise.reject(new Error(String(r.status))),
        )
        .then((data: SystemStatus | { configured: false }) => {
          if (cancelled) return;
          setStatus(
            data && typeof data === "object" && "configured" in data && data.configured === true
              ? data
              : false,
          );
        })
        .catch(() => {
          if (!cancelled) setStatus(false);
        });
    };

    load();
    const id = window.setInterval(load, 5 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return status;
}

/** Indicator → Nixtab theme classes (dot colour + label tone). */
export function indicatorTheme(indicator: string) {
  switch (indicator) {
    case "none":
      return {
        dot: "bg-primary",
        label: "text-foreground",
        pulse: true,
      };
    case "minor":
    case "major":
      return {
        dot: "bg-chart-3",
        label: "text-foreground",
        pulse: true,
      };
    case "critical":
      return {
        dot: "bg-destructive",
        label: "text-destructive",
        pulse: true,
      };
    default:
      return {
        dot: "bg-muted-foreground",
        label: "text-muted-foreground",
        pulse: false,
      };
  }
}

/** Human label for a Statuspage indicator. */
export function indicatorLabel(indicator: string) {
  switch (indicator) {
    case "none":
      return "All systems go";
    case "minor":
      return "Minor disruption";
    case "major":
      return "Major disruption";
    case "critical":
      return "Outage";
    case "maintenance":
      return "Under maintenance";
    default:
      return "Status unknown";
  }
}
