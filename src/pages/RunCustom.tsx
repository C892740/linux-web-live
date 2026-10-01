import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SiteNav } from "@/components/SiteNav";
import { useV86 } from "@/hooks/use-v86";
import {
  MAX_CUSTOM_BYTES,
  makeCustomDistro,
  planCustomBoot,
} from "@/lib/custom-iso";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Disc3,
  FileUp,
  HardDrive,
  Loader2,
  MousePointerClick,
  RotateCcw,
  TerminalSquare,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Link } from "react-router";

const MB = 1024 * 1024;

/** RAM choices — v86 is 32-bit, so keep the ceiling sane. */
const MEMORY_CHOICES = [64, 128, 256, 512, 768, 1024];

type Stage =
  | { kind: "pick" }
  | { kind: "ready"; file: File; boot: import("@/lib/distros").BootMedia; warning?: string }
  | { kind: "running"; file: File; boot: import("@/lib/distros").BootMedia }
  | { kind: "rejected"; message: string };

export default function RunCustom() {
  const [stage, setStage] = useState<Stage>({ kind: "pick" });
  // 512 MB default: full-desktop live ISOs (Puppy, DSL with apps open) are
  // cramped at 256 MB and freezing under memory pressure looks like a bug.
  const [memoryMb, setMemoryMb] = useState(512);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const plan =
    stage.kind === "ready" || stage.kind === "running"
      ? makeCustomDistro(stage.file, memoryMb, stage.boot)
      : undefined;

  const {
    containerRef,
    frameRef,
    phase,
    error,
    start,
    reset,
    sendCtrlAltDelete,
    goFullscreen,
  } = useV86(plan, { file: stage.kind === "running" ? stage.file : null, memoryMb });

  const accept = useCallback((file: File) => {
    const result = planCustomBoot(file);
    if (result.rejected) {
      setStage({ kind: "rejected", message: result.rejected });
      return;
    }
    setStage({
      kind: "ready",
      file,
      boot: result.boot,
      warning: result.warning,
    });
  }, []);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    // No FileReader pass: the File object is handed to v86, which lazy-reads
    // it from disk in 4 MB chunks as the guest OS touches it. Booting a
    // 300 MB–2 GB ISO is instant instead of a long, memory-hungry read.
    accept(file);
  };

  const powerOn = () => {
    if (stage.kind !== "ready") return;
    setStage({ kind: "running", file: stage.file, boot: stage.boot });
    start();
  };

  const powerOff = () => {
    reset();
    setStage({ kind: "pick" });
  };

  // ── Running view: same chrome as /run/:id ──────────────────────────
  if (stage.kind === "running" && plan) {
    const showOverlay =
      phase === "loading-engine" || phase === "downloading" || phase === "booting";
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <SiteNav />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="icon" className="rounded-md">
                <Link to="/run/custom" aria-label="Back">
                  <ArrowLeft className="size-4" />
                </Link>
              </Button>
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="max-w-[40ch] truncate text-xl font-bold tracking-tight">
                    {stage.file.name}
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
                    {phase === "running" ? "session live" : phase === "error" ? "error" : "booting"}
                  </Badge>
                </div>
                <p className="mt-0.5 font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
                  local file · {memoryMb} MB ram · {stage.boot}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg font-mono text-xs"
                onClick={sendCtrlAltDelete}
              >
                Ctrl+Alt+Del
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg font-mono text-xs"
                onClick={goFullscreen}
              >
                Fullscreen
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg font-mono text-xs"
                onClick={powerOff}
              >
                <RotateCcw className="size-4" />
                Eject
              </Button>
            </div>
          </div>

          <div
            ref={frameRef}
            className="machine-frame mt-6 flex flex-col overflow-hidden rounded-lg border border-foreground/15 bg-[#0c1410] shadow-block-lg"
          >
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-3 font-mono text-xs text-white/50">
                your image — v86 machine — {memoryMb} MB
              </span>
            </div>
            <div className="machine-screen relative h-[420px] min-h-0 sm:h-[min(62dvh,640px)]">
              <div
                ref={containerRef}
                id="screen_container"
                className="absolute inset-0 flex items-center justify-center overflow-hidden font-mono text-[15px] leading-[1.45] text-[#e5e7eb]"
              >
                <div style={{ whiteSpace: "pre", padding: "16px" }} />
                <canvas style={{ display: "none" }} />
              </div>
              {showOverlay && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-[#0c1410] text-center"
                >
                  <Loader2 className="size-9 animate-spin text-emerald-300" />
                  <p className="font-mono text-sm text-white/90">
                    {phase === "loading-engine"
                      ? "loading emulator engine…"
                      : phase === "booting"
                        ? "booting your image…"
                        : "preparing…"}
                  </p>
                </motion.div>
              )}
              {phase === "error" && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[#0c1410] px-6 text-center">
                  <AlertTriangle className="size-8 text-amber-400" />
                  <div>
                    <p className="font-medium text-white">
                      This image couldn't boot
                    </p>
                    <p className="mt-1 max-w-md font-mono text-xs text-white/60">
                      {error}
                    </p>
                    <p className="mx-auto mt-3 max-w-md text-xs leading-relaxed text-white/45">
                      Most often this means the ISO is 64-bit-only (Zorin Core
                      17, Lubuntu, Linux Lite…) — the emulator is 32-bit. Try a
                      32-bit build of a distro, or one of the catalog images.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
                    asChild
                  >
                    <Link to="/run/custom">
                      <ArrowLeft className="size-4" />
                      Try another file
                    </Link>
                  </Button>
                </div>
              )}
            </div>
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
        </main>
      </div>
    );
  }

  // ── Pick / ready / rejected view ──────────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6">
        <Link
          to="/"
          className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
        >
          ← back to the index
        </Link>

        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          Boot your own image
        </h1>
        <p className="mt-2 max-w-xl leading-relaxed text-muted-foreground">
          Pick an ISO from your disk — it's read straight into this tab and
          booted. <strong className="text-foreground">Nothing is uploaded</strong>{" "}
          to any server. Only 32-bit x86 bootable images can start; 64-bit-only
          ISOs will fail inside the machine.
        </p>

        {/* Dropzone */}
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={cn(
            "mt-8 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors",
            dragOver
              ? "border-primary bg-primary/10"
              : "border-border bg-card hover:border-primary/50",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".iso,.bin,.img,.ima,.dsk,.raw,.vhd"
            className="sr-only"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
          <FileUp className="size-8 text-muted-foreground" />
          <span className="font-semibold">
            Drop an ISO here, or click to browse
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
            .iso · .img · .bin · floppy &amp; raw disk images · max{" "}
            {(MAX_CUSTOM_BYTES / MB / 1024).toFixed(0)} GB
          </span>
        </label>

        {stage.kind === "rejected" && (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <p className="font-medium">That file can't be used</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {stage.message}
              </p>
            </div>
          </div>
        )}

        {stage.kind === "ready" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 rounded-lg border border-border bg-card p-5 shadow-block"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
                  {stage.boot === "floppy" ? (
                    <Disc3 className="size-5" />
                  ) : stage.boot === "kernel" ? (
                    <TerminalSquare className="size-5" />
                  ) : (
                    <HardDrive className="size-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{stage.file.name}</p>
                  <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted-foreground">
                    {(stage.file.size / MB).toFixed(1)} MB · boots as{" "}
                    {stage.boot}
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                className="rounded-lg font-semibold shadow-block-primary"
                onClick={powerOn}
              >
                <TerminalSquare className="size-4" />
                Power on
              </Button>
            </div>

            {stage.warning && (
              <p className="mt-3 flex items-start gap-2 rounded-md bg-secondary px-3 py-2 text-xs leading-relaxed text-secondary-foreground">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                {stage.warning}
              </p>
            )}

            {/* RAM picker */}
            <div className="mt-5 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  Memory
                </p>
                <p className="font-mono text-xs tabular-nums">{memoryMb} MB</p>
              </div>
              <Slider
                className="mt-3"
                value={[MEMORY_CHOICES.indexOf(memoryMb)]}
                min={0}
                max={MEMORY_CHOICES.length - 1}
                step={1}
                onValueChange={([idx]) => setMemoryMb(MEMORY_CHOICES[idx])}
              />
              <div className="mt-1.5 flex justify-between font-mono text-[10px] text-muted-foreground">
                {MEMORY_CHOICES.map((m) => (
                  <span key={m}>{m}</span>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Guidance */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Good candidates
            </h2>
            <ul className="mt-2.5 space-y-1.5 text-sm text-muted-foreground">
              <li>· Tiny Core, DSL, Buildroot, 4MLinux (all 32-bit)</li>
              <li>· i386 builds of Alpine, antiX, Puppy, Debian</li>
              <li>· Floppy-based retro OS demos</li>
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Won't boot here
            </h2>
            <ul className="mt-2.5 space-y-1.5 text-sm text-muted-foreground">
              <li>· 64-bit-only ISOs (Zorin Core, Lubuntu, Mint — the emulator is 32-bit)</li>
              <li>· Anything over {(MAX_CUSTOM_BYTES / MB / 1024).toFixed(0)} GB (browser memory ceiling)</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
