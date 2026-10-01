import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SiteNav } from "@/components/SiteNav";
import { useV86 } from "@/hooks/use-v86";
import { getDistro } from "@/lib/distros";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Expand,
  Loader2,
  MousePointerClick,
  RotateCcw,
  TerminalSquare,
} from "lucide-react";
import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router";

/** Overlay shown while the engine/image download and early boot run. */
function BootOverlay({
  distroName,
  phase,
  progress,
}: {
  distroName: string;
  phase: string;
  progress: number | null;
}) {
  const messages: Record<string, string> = {
    "loading-engine": "loading emulator engine…",
    downloading: `fetching ${distroName}…`,
    booting: "booting — real kernel starting…",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-[#0c1410] text-center"
    >
      <div className="relative">
        <Loader2 className="size-9 animate-spin text-emerald-300" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full opacity-70 blur-xl"
          style={{
            background:
              "radial-gradient(closest-side, rgba(52,211,153,.45), transparent)",
          }}
        />
      </div>

      <div>
        <p className="font-mono text-sm text-white/90">
          {messages[phase] ?? "preparing…"}
        </p>
        <p className="mt-1 font-mono text-xs text-white/45">
          first boot downloads the image once · reboots reuse the cache
        </p>
      </div>

      {progress !== null && (
        <div className="w-56">
          <Progress
            value={progress}
            className="h-1.5 bg-white/10 [&>[data-slot=progress-indicator]]:bg-emerald-300"
          />
          <p className="mt-2 font-mono text-xs tabular-nums text-white/60">
            {progress}%
          </p>
        </div>
      )}
    </motion.div>
  );
}

export default function RunDistro() {
  const { distroId } = useParams<{ distroId: string }>();
  const distro = getDistro(distroId);
  const navigate = useNavigate();

  const {
    containerRef,
    frameRef,
    phase,
    progress,
    error,
    start,
    reset,
    sendCtrlAltDelete,
    goFullscreen,
  } = useV86(distro);

  // Boot automatically once the page and screen container are mounted.
  useEffect(() => {
    if (distro && !distro.comingSoon && phase === "idle") {
      const timer = window.setTimeout(start, 350);
      return () => window.clearTimeout(timer);
    }
  }, [distro, phase, start]);

  // Redirect coming-soon / unknown ids back to the index.
  useEffect(() => {
    if (!distro || distro.comingSoon) {
      navigate("/", { replace: true });
    }
  }, [distro, navigate]);

  if (!distro || distro.comingSoon) return null;

  const showOverlay =
    phase === "loading-engine" ||
    phase === "downloading" ||
    phase === "booting";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {/* Session header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="rounded-md">
              <Link to="/" aria-label="Back to the index">
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold tracking-tight">
                  {distro.name}
                </h1>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-2 py-0 font-mono text-[10px] uppercase tracking-wider",
                    phase === "running"
                      ? "border-primary/40 bg-primary/10 text-accent-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {phase === "running"
                    ? "session live"
                    : phase === "error"
                      ? "error"
                      : "booting"}
                </Badge>
              </div>
              <p className="mt-0.5 font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
                {distro.desktop} · {distro.memoryMb} MB ram · {distro.sizeMb} mb
                image
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg font-mono text-xs"
                    onClick={sendCtrlAltDelete}
                  >
                    Ctrl+Alt+Del
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Sends a reboot signal to the VM</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg font-mono text-xs"
              onClick={goFullscreen}
            >
              <Expand className="size-4" />
              Fullscreen
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg font-mono text-xs"
              onClick={reset}
              disabled={phase === "idle"}
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
          </div>
        </div>

        {/* Machine screen. The frame is the fullscreen target: in fullscreen
            it becomes a flex column and .machine-screen flexes to fill the
            viewport (see index.css), so the display covers the whole screen. */}
        <div
          ref={frameRef}
          className="machine-frame mt-6 flex flex-col overflow-hidden rounded-lg border border-foreground/15 bg-[#0c1410] shadow-block-lg"
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
            <span className="size-2.5 rounded-full bg-[#ff5f57]" />
            <span className="size-2.5 rounded-full bg-[#febc2e]" />
            <span className="size-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 font-mono text-xs text-white/50">
              {distro.id} — v86 machine — {distro.memoryMb} MB
            </span>
          </div>

          {/* Definite-height screen area: the v86 container fills it
              absolutely, so display scaling measures a real box instead of
              the content's own (circular) size. */}
          <div className="machine-screen relative h-[420px] min-h-0 sm:h-[min(62dvh,640px)]">
            {/* v86 mounts its text div + canvas inside this container.
                It toggles .style.display between them as the guest
                switches video modes — Tailwind classes would be
                overwritten, so it must own these elements. Flex centering
                keeps the active surface centered at any scale. */}
            <div
              ref={containerRef}
              id="screen_container"
              className="absolute inset-0 flex items-center justify-center overflow-hidden font-mono text-[15px] leading-[1.45] text-[#e5e7eb]"
            >
              <div style={{ whiteSpace: "pre", padding: "16px" }} />
              <canvas style={{ display: "none" }} />
            </div>

            {showOverlay && (
              <BootOverlay
                distroName={distro.name}
                phase={phase}
                progress={progress}
              />
            )}

            {phase === "idle" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#0c1410]">
                <Button
                  size="lg"
                  className="rounded-lg bg-emerald-300 font-semibold text-emerald-950 hover:bg-emerald-200"
                  onClick={start}
                >
                  <TerminalSquare className="size-4" />
                  Power on
                </Button>
                <p className="font-mono text-xs text-white/50">
                  {distro.name} · {distro.sizeMb} MB download
                </p>
              </div>
            )}

            {phase === "error" && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#0c1410] px-6 text-center">
                <AlertTriangle className="size-8 text-amber-400" />
                <div>
                  <p className="font-medium text-white">
                    Couldn't start this machine
                  </p>
                  <p className="mt-1 max-w-md font-mono text-xs text-white/60">
                    {error}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                    onClick={start}
                  >
                    Try again
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
                    asChild
                  >
                    <Link to="/">Back to the index</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Capture hint */}
          {phase === "running" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 border-t border-white/10 px-4 py-2.5 font-mono text-xs text-white/55"
            >
              <MousePointerClick className="size-3.5 shrink-0" />
              click inside the screen to capture your keyboard · ctrl+alt
              releases the mouse
            </motion.div>
          )}
        </div>

        {/* Notes */}
        <div className="mt-8 grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-lg border border-border bg-card p-6 shadow-layered">
            <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              About this machine
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              {distro.description}
            </p>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 shadow-layered">
            <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Session notes
            </h2>
            <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted-foreground">
              <li>· Everything is ephemeral — a reset wipes all changes.</li>
              <li>· The image streams from a public mirror, unmodified.</li>
              <li>· Speed varies with your connection and device.</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
