import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Distro } from "@/lib/distros";
import { motion } from "framer-motion";
import { ArrowRight, Clock, MonitorPlay } from "lucide-react";
import type { CSSProperties } from "react";
import { Link } from "react-router";

interface DistroCardProps {
  distro: Distro;
  index?: number;
}

/** Monogram tile built from the distro's accent color. */
function DistroGlyph({ distro }: { distro: Distro }) {
  const initials = distro.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  return (
    <div
      aria-hidden
      className="flex size-12 shrink-0 items-center justify-center rounded-xl text-lg font-bold text-white shadow-sm"
      style={{
        background: `linear-gradient(135deg, ${distro.accent}, color-mix(in oklab, ${distro.accent} 70%, black))`,
      }}
    >
      {initials}
    </div>
  );
}

export function DistroCard({ distro, index = 0 }: DistroCardProps) {
  const inner = (
    <Card
      className="group relative h-full gap-0 overflow-hidden border-border/80 bg-card py-0 shadow-layered transition-all duration-200 hover:-translate-y-0.5 hover:shadow-layered-lg"
      style={{ "--distro": distro.accent } as CSSProperties}
    >
      {/* Brand accent bar */}
      <div
        aria-hidden
        className="h-1 w-full bg-(--distro) opacity-80 transition-opacity group-hover:opacity-100"
      />

      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <DistroGlyph distro={distro} />
            <div>
              <h3 className="font-semibold tracking-tight">{distro.name}</h3>
              <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                {distro.tagline}
              </p>
            </div>
          </div>
          {distro.comingSoon ? (
            <Badge
              variant="outline"
              className="shrink-0 gap-1 border-border/80 text-muted-foreground"
            >
              <Clock className="size-3" />
              Soon
            </Badge>
          ) : (
            <span
              aria-hidden
              className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-border/70 text-muted-foreground transition-colors group-hover:border-(--distro) group-hover:bg-(--distro) group-hover:text-white"
            >
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          )}
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          {distro.description}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          {distro.badges.map((badge) => (
            <Badge
              key={badge}
              variant="secondary"
              className="rounded-full bg-secondary/70 px-2.5 font-medium text-secondary-foreground/90"
            >
              {badge}
            </Badge>
          ))}
        </div>

        {!distro.comingSoon && (
          <div className="flex items-center gap-2 border-t border-border/60 pt-3 text-[13px] text-muted-foreground">
            <MonitorPlay className="size-4 shrink-0" style={{ color: distro.accent }} />
            <span>
              {distro.desktop} · {distro.memoryMb} MB RAM
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.3) }}
      className="h-full"
    >
      {distro.comingSoon ? (
        // Not clickable — there's nothing to boot yet. The FAQ on the
        // landing page explains why these stay locked.
        <div aria-label={`${distro.name} — coming soon`} className="h-full">
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
