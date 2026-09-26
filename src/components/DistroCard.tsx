import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Distro } from "@/lib/distros";
import { motion } from "framer-motion";
import { ArrowUpRight, Clock, MonitorPlay } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "react-router";

interface DistroCardProps {
  distro: Distro;
  index?: number;
}

/** Monogram tile built from the distro's accent colour. */
function DistroGlyph({ distro }: { distro: Distro }) {
  const initials = distro.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <div
      aria-hidden
      className="flex size-11 shrink-0 items-center justify-center rounded-md text-base font-bold text-white"
      style={{ background: distro.accent }}
    >
      {initials}
    </div>
  );
}

export function DistroCard({ distro, index = 0 }: DistroCardProps) {
  const inner = (
    <Card
      className="group relative h-full gap-0 overflow-hidden rounded-lg border-border bg-card py-0 transition-all duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-block"
      style={{ "--distro": distro.accent } as CSSProperties}
    >
      {/* Brand accent bar */}
      <div
        aria-hidden
        className="h-[3px] w-full bg-(--distro) opacity-90 transition-opacity group-hover:opacity-100"
      />

      <CardContent className="flex h-full flex-col gap-3.5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <DistroGlyph distro={distro} />
            <div>
              <h3 className="font-semibold leading-tight tracking-tight">
                {distro.name}
              </h3>
              <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                {distro.tagline}
              </p>
            </div>
          </div>
          {distro.comingSoon ? (
            <Badge
              variant="outline"
              className="shrink-0 gap-1 border-border font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
            >
              <Clock className="size-3" />
              Soon
            </Badge>
          ) : (
            <span
              aria-hidden
              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors group-hover:border-(--distro) group-hover:bg-(--distro) group-hover:text-white"
            >
              <ArrowUpRight className="size-3.5" />
            </span>
          )}
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {distro.description}
        </p>

        {/* Mono spec strip — the registry feel */}
        <div className="mt-auto space-y-2 border-t border-border pt-3 font-mono text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {distro.badges.map((badge) => (
              <span key={badge}>{badge}</span>
            ))}
          </div>
          {!distro.comingSoon && (
            <div className="flex items-center gap-1.5">
              <MonitorPlay className="size-3.5 text-(--distro)" />
              <span>
                {distro.desktop} · {distro.memoryMb} MB RAM
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.05, 0.25) }}
      className="h-full"
    >
      {distro.comingSoon ? (
        // Not clickable — there's nothing to boot yet. The FAQ explains why.
        <div aria-label={`${distro.name} — coming soon`} className="h-full opacity-90">
          {inner}
        </div>
      ) : (
        <Link to={`/run/${distro.id}`} className="block h-full">
          {inner}
        </Link>
      )}
    </motion.div>
  );
}
