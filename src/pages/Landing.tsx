import { DistroCard } from "@/components/DistroCard";
import { SiteNav } from "@/components/SiteNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BOOTABLE_DISTROS, DISTROS } from "@/lib/distros";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Cpu,
  Gauge,
  Github,
  HardDriveDownload,
  MonitorSmartphone,
  MousePointer2,
  Server,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Link } from "react-router";

function HeroTerminalMock() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-border/70 bg-[#0b1220] shadow-layered-lg">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
        <span className="ml-3 font-mono text-xs text-white/50">
          tinycore — tty1 — 80×25
        </span>
        <MousePointer2 className="ml-auto size-3.5 text-white/30" />
      </div>

      <div className="space-y-1.5 px-5 py-5 font-mono text-[13px] leading-relaxed sm:text-sm">
        <p className="text-white/40">
          Booting Tiny Core Linux 11 · v86 · 256 MB RAM
        </p>
        <p className="text-teal-300">
          [ <span className="text-teal-300/60">OK</span> ] Mounted 16 MB root
          filesystem
        </p>
        <p className="text-teal-300">
          [ <span className="text-teal-300/60">OK</span> ] Started X desktop
          (FLTK)
        </p>
        <p className="text-white/80">
          <span className="text-emerald-400">tc@box:~$</span> uname -a
        </p>
        <p className="text-white/50">
          Linux box 6.1.2-tinycore #2024 SMP i686 GNU/Linux
        </p>
        <p className="text-white/80">
          <span className="text-emerald-400">tc@box:~$</span> free -m
        </p>
        <p className="text-white/50">Mem: 251 total · 233 free</p>
        <p className="text-white/80">
          <span className="text-emerald-400">tc@box:~$</span>
          <span className="caret-blink text-emerald-400">▊</span>
        </p>
      </div>
    </div>
  );
}

const STEPS = [
  {
    icon: HardDriveDownload,
    title: "Pick a distro",
    body: "Choose from a curated list of tiny live images — no account, no installer, no USB stick.",
  },
  {
    icon: Cpu,
    title: "We boot it in your tab",
    body: "A real x86 machine boots inside your browser via WebAssembly. The image streams straight from a CDN.",
  },
  {
    icon: MonitorSmartphone,
    title: "Use it, then close the tab",
    body: "Click inside the screen to capture your keyboard. Everything is ephemeral — nothing is saved.",
  },
];

const FAQS = [
  {
    q: "How is this running Linux in my browser?",
    a: "DistroTest runs v86, an open-source x86 emulator that recompiles machine code to WebAssembly as it executes. Your tab becomes a small virtual PC with a CPU, RAM and a display — then it boots the distro's live image exactly like a real machine would.",
  },
  {
    q: "Where do the disk images come from?",
    a: "Each distro is a public, unmodified live image streamed from a content delivery network straight into your browser. Nothing is installed to your computer and nothing is uploaded.",
  },
  {
    q: "Why can't I boot Zorin OS, Linux Lite or Lubuntu?",
    a: "Those distros ship 64-bit installers that are gigabytes in size. The emulator runs 32-bit x86 with a browser-friendly memory budget, so v1 focuses on small live images that genuinely boot. They stay listed as 'coming soon' so you know we haven't forgotten them.",
  },
  {
    q: "Do I need an account?",
    a: "No — pick a distro and it boots. An optional account on this site just gives signed-in users a personal launchpad for quick access.",
  },
  {
    q: "Is anything saved between sessions?",
    a: "No. Each session boots a fresh copy of the image from RAM. As soon as you close or reset the tab, every change vanishes — that's what makes it safe to explore freely.",
  },
  {
    q: "It feels slow compared to my real PC. Why?",
    a: "Every CPU instruction is translated on the fly inside a single browser tab, with no hardware acceleration. Downloads, boot times and general speed depend on your connection and device — a wired connection helps most.",
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="bg-grid bg-grid-fade absolute inset-0"
          />
          <div
            aria-hidden
            className="absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full opacity-60"
            style={{
              background:
                "radial-gradient(closest-side, color-mix(in oklab, var(--primary) 14%, transparent), transparent)",
            }}
          />

          <div className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Badge
                    variant="outline"
                    className="gap-1.5 rounded-full border-primary/25 bg-primary/5 px-3 py-1 text-[13px] text-primary"
                  >
                    <Zap className="size-3.5" />
                    No install · No signup · Just a tab
                  </Badge>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.08 }}
                  className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]"
                >
                  Try real Linux distros{" "}
                  <span className="text-gradient">live in your browser</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.16 }}
                  className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground"
                >
                  DistroTest boots tiny, genuine Linux systems — from a 6 MB
                  live CD to a full tiny desktop — inside an x86 emulator
                  running on WebAssembly. Curious beginners, students and
                  distro-hoppers: start exploring in seconds.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.24 }}
                  className="mt-8 flex flex-wrap items-center gap-3"
                >
                  <Button
                    asChild
                    size="lg"
                    className="h-12 rounded-xl px-6 text-[15px] shadow-layered"
                  >
                    <a href="#distros">
                      <MousePointer2 className="size-4" />
                      Pick a distro
                    </a>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-xl px-6 text-[15px]"
                  >
                    <Link to="/run/buildroot">
                      Boot the fastest one
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.34 }}
                  className="mt-5 flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <ShieldCheck className="size-4 text-primary" />
                  Runs 100% client-side — your session is ephemeral and nothing
                  is stored.
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 16, rotate: 0.4 }}
                animate={{ opacity: 1, y: 0, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <HeroTerminalMock />
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Distro picker ────────────────────────────────────────── */}
        <section id="distros" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">
                  Pick a distro, boot it now
                </h2>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  Every card below boots live in this tab. Download sizes are
                  the real thing your browser fetches before the machine
                  starts.
                </p>
              </div>
              <Badge variant="secondary" className="rounded-full px-3 py-1">
                {BOOTABLE_DISTROS.length} bootable now
              </Badge>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {DISTROS.map((distro, index) => (
                <DistroCard
                  key={distro.id}
                  distro={distro}
                  index={index}
                />
              ))}
            </div>

            <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
              <Server className="size-4" />
              Images are unmodified live media streamed from public mirrors.
            </p>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────────────── */}
        <section
          id="how"
          className="scroll-mt-20 border-y border-border/60 bg-secondary/40 py-20 sm:py-24"
        >
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight">
              How it works
            </h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Three steps, zero installation. The whole operating system lives
              in your tab until you close it.
            </p>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <div className="relative h-full rounded-2xl border border-border/70 bg-card p-6 shadow-layered">
                    <span className="absolute right-6 top-6 font-mono text-4xl font-bold text-foreground/8">
                      0{i + 1}
                    </span>
                    <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <step.icon className="size-5" />
                    </div>
                    <h3 className="mt-4 font-semibold tracking-tight">
                      {step.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Marquee strip ────────────────────────────────────────── */}
        <section
          aria-hidden
          className="overflow-hidden border-b border-border/60 py-5"
        >
          <div className="animate-marquee flex w-max gap-10">
            {[0, 1].map((copy) => (
              <div
                key={copy}
                className="flex shrink-0 items-center gap-10 font-mono text-sm text-muted-foreground/80"
              >
                {[
                  "uname -a",
                  "Tiny Core 19 MB",
                  "Damn Small Linux 50 MB",
                  "cat /etc/os-release",
                  "Buildroot boots in ~3s",
                  "Mobius on a 1.44 MB floppy",
                  "top",
                  "Linux 3 Live · JWM",
                ].map((item) => (
                  <span key={`${copy}-${item}`} className="flex items-center gap-10">
                    <span>{item}</span>
                    <span className="text-primary/60">◆</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────── */}
        <section id="faq" className="scroll-mt-20 py-20 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">
                  Questions, answered
                </h2>
                <p className="mt-2 max-w-md text-muted-foreground">
                  The short version of what happens when you press "boot" — and
                  what doesn't.
                </p>
                <Button asChild variant="outline" className="mt-6 rounded-xl">
                  <a
                    href="https://github.com/copy/v86"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="size-4" />
                    About the v86 emulator
                  </a>
                </Button>
              </div>

              <Accordion type="single" collapsible className="w-full">
                {FAQS.map((faq) => (
                  <AccordionItem key={faq.q} value={faq.q}>
                    <AccordionTrigger className="text-left text-[15px] font-medium">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* ── Final CTA ────────────────────────────────────────────── */}
        <section className="px-4 pb-24 sm:px-6">
          <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-3xl border border-border/60 bg-card px-6 py-14 text-center shadow-layered-lg sm:px-12">
            <div
              aria-hidden
              className="bg-grid bg-grid-fade absolute inset-0 opacity-70"
            />
            <div className="relative">
              <Gauge className="mx-auto size-8 text-primary" />
              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                Your first Linux machine is 6 MB away
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                No downloads to manage, no partitions at risk. Pick the
                smallest image and watch a real kernel boot in your browser
                tab.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button asChild size="lg" className="h-12 rounded-xl px-7 text-[15px]">
                  <a href="#distros">
                    Choose a distro
                    <ArrowRight className="size-4" />
                  </a>
                </Button>
                {!isAuthenticated && (
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-xl px-7 text-[15px]"
                  >
                    <Link to="/auth">Create a free account</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/60 py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <p>
            Built with the open-source{" "}
            <a
              href="https://github.com/copy/v86"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              v86
            </a>{" "}
            emulator.
          </p>
          <p>Distro names and projects belong to their respective owners.</p>
        </div>
      </footer>
    </div>
  );
}
