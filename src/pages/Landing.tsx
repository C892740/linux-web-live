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
  ArrowUpRight,
  GraduationCap,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { Link } from "react-router";

/** Mono index rule line: "01 ——— 6.2 MB" style meta rows. */
function MetaRule({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-baseline gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
      <span>{left}</span>
      <span aria-hidden className="h-px flex-1 bg-border" />
      <span>{right}</span>
    </div>
  );
}

function HeroTerminal() {
  return (
    <div className="overflow-hidden rounded-lg border border-foreground/15 bg-[#0c1410] shadow-block">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 font-mono text-xs text-white/50">
          tinycore — 80×25
        </span>
      </div>
      <div className="space-y-1.5 px-5 py-5 font-mono text-[13px] leading-relaxed sm:text-sm">
        <p className="text-white/40">
          nixtab · booting Tiny Core Linux 11 · 256 MB
        </p>
        <p className="text-emerald-300">
          [<span className="text-emerald-300/50"> ok </span>] root filesystem
          mounted
        </p>
        <p className="text-emerald-300">
          [<span className="text-emerald-300/50"> ok </span>] X desktop up
          (FLTK)
        </p>
        <p className="text-white/85">
          <span className="text-emerald-400">tc@box:~$</span> uname -a
        </p>
        <p className="text-white/50">
          Linux box 6.1.2-tinycore i686 GNU/Linux
        </p>
        <p className="text-white/85">
          <span className="text-emerald-400">tc@box:~$</span>
          <span className="caret-blink text-emerald-400">▊</span>
        </p>
      </div>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Sign in with your college account",
    body: "One tap with Microsoft 365. Only Coventry College tenancy accounts get in — Microsoft checks, not us.",
  },
  {
    n: "02",
    title: "Pick your course",
    body: "IT & Computing unlocks the machine index today. Other subjects are saved for when their tools ship.",
  },
  {
    n: "03",
    title: "Boot a machine, break it safely",
    body: "Real kernels, real terminals, zero risk. Reset the sandbox and every trace is gone.",
  },
];

const FAQS = [
  {
    q: "How is Linux running inside my browser?",
    a: "Nixtab runs v86, an open-source x86 emulator that translates machine code to WebAssembly as it executes. Your tab becomes a small virtual PC — CPU, RAM, display — and boots the distro's live image exactly like real hardware would.",
  },
  {
    q: "Who can sign in?",
    a: "Anyone can look around, but full access is built for Coventry College students. Sign-in with Microsoft 365 is restricted to the college's Entra ID tenancy at the identity-provider level, and student accounts (c-number emails) are flagged automatically for the verified badge.",
  },
  {
    q: "I'm not on an IT course — is Nixtab for me?",
    a: "Not yet. After sign-in you pick your course; if it isn't IT & Computing you'll see an honest 'nothing for this course yet' screen. Your choice is saved — Business & finance tools are next on the roadmap as the brand grows.",
  },
  {
    q: "Why can't I boot Zorin OS, Linux Lite or Lubuntu?",
    a: "Those distros ship 64-bit installers several gigabytes in size. The emulator runs 32-bit x86 with a browser-friendly memory budget, so the index focuses on small live images that genuinely boot. They stay listed as 'coming soon'.",
  },
  {
    q: "Is anything saved between sessions?",
    a: "No. Each session boots a fresh copy of the image into memory. Reset or close the tab and every change is gone — which is exactly what makes it safe to experiment freely in class.",
  },
  {
    q: "Does it work on a college Chromebook?",
    a: "Yes — anything with a modern browser works, no install and no admin rights needed. Speed depends on the device and connection, so a wired connection in the lab gives the best experience.",
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />

      <main className="flex-1">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section className="relative overflow-hidden border-b border-border">
          <div aria-hidden className="bg-grid bg-grid-fade absolute inset-0" />
          <div className="relative mx-auto w-full max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20">
            <MetaRule left="Nixtab" right="Machine index · v1" />
            <div className="mt-8 grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="flex items-center gap-2"
                >
                  <Badge
                    variant="outline"
                    className="rounded-full border-primary/40 bg-primary/10 px-3 py-1 text-[13px] text-accent-foreground"
                  >
                    <GraduationCap className="size-3.5" />
                    Built for IT courses at Coventry College
                  </Badge>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.08 }}
                  className="mt-5 text-[2.6rem] font-bold leading-[1.02] sm:text-6xl"
                >
                  Real Linux machines.
                  <br />
                  <span className="text-gradient">Zero installs.</span>
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.16 }}
                  className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground"
                >
                  Nixtab boots genuine Linux distributions in a browser tab
                  through an x86 emulator. Sign in with your college Microsoft
                  365 account, pick your course, and start breaking things —
                  safely.
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
                    className="h-12 rounded-lg px-6 text-[15px] font-semibold shadow-block-primary"
                  >
                    <Link to={isAuthenticated ? "/dashboard" : "/auth"}>
                      {isAuthenticated ? "Open the index" : "Sign in with Microsoft 365"}
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-lg px-6 text-[15px]"
                  >
                    <Link to="/run/buildroot">Boot one without an account</Link>
                  </Button>
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.34 }}
                  className="mt-5 flex items-center gap-2 font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground"
                >
                  <ShieldCheck className="size-4 text-primary" />
                  College tenancy · ephemeral sessions · nothing stored
                </motion.p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <HeroTerminal />
                <MetaRule left="spec" right="v86 · wasm · client-side" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── Machine index ─────────────────────────────────────── */}
        <section id="distros" className="scroll-mt-20 py-16 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <MetaRule left="Section 01" right={`${BOOTABLE_DISTROS.length} bootable`} />
            <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
              <h2 className="text-3xl font-bold sm:text-4xl">
                The machine index
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">
                Every entry boots live in this tab. Sizes are the real bytes
                your browser fetches first.
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {DISTROS.map((distro, index) => (
                <DistroCard key={distro.id} distro={distro} index={index} />
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ──────────────────────────────────────── */}
        <section
          id="how"
          className="scroll-mt-20 border-y border-border bg-secondary/40 py-16 sm:py-24"
        >
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <MetaRule left="Section 02" right="Three steps" />
            <h2 className="mt-4 text-3xl font-bold sm:text-4xl">
              From browser tab to root shell
            </h2>

            <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-3">
              {STEPS.map((step, i) => (
                <motion.div
                  key={step.n}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  className="bg-card p-7"
                >
                  <span className="font-mono text-sm text-primary">
                    {step.n}
                  </span>
                  <h3 className="mt-3 font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Marquee ───────────────────────────────────────────── */}
        <section aria-hidden className="overflow-hidden border-b border-border py-4">
          <div className="animate-marquee flex w-max gap-10">
            {[0, 1].map((copy) => (
              <div
                key={copy}
                className="flex shrink-0 items-center gap-10 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground/80"
              >
                {[
                  "uname -a",
                  "Tiny Core 19 MB",
                  "DSL 50 MB",
                  "cat /etc/os-release",
                  "Buildroot ~3s boot",
                  "Mobius on floppy",
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

        {/* ── FAQ ───────────────────────────────────────────────── */}
        <section id="faq" className="scroll-mt-20 py-16 sm:py-24">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <MetaRule left="Section 03" right="Questions" />
            <div className="mt-4 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
              <div>
                <h2 className="text-3xl font-bold sm:text-4xl">
                  Fine print, in plain words
                </h2>
                <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">
                  What happens when you press boot, what never leaves your
                  device, and who gets in.
                </p>
                <Button asChild variant="outline" className="mt-6 rounded-lg">
                  <a
                    href="https://github.com/copy/v86"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    The emulator we build on
                    <ArrowUpRight className="size-4" />
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

        {/* ── Final CTA ─────────────────────────────────────────── */}
        <section className="px-4 pb-24 sm:px-6">
          <div className="relative mx-auto w-full max-w-6xl overflow-hidden rounded-lg border border-foreground/20 bg-[#0c1410] px-6 py-14 text-center shadow-block-lg sm:px-12">
            <div aria-hidden className="absolute inset-0 bg-[#0c1410]" />
            <div className="relative">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-emerald-300/70">
                Ready when you are
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                Your first machine is 6 MB away
              </h2>
              <p className="mx-auto mt-3 max-w-lg leading-relaxed text-white/60">
                No downloads to manage, no partitions at risk, nothing to
                uninstall afterwards. Pick an image and press boot.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Button
                  asChild
                  size="lg"
                  className="h-12 rounded-lg bg-emerald-300 px-7 text-[15px] font-semibold text-emerald-950 hover:bg-emerald-200"
                >
                  <Link to="/run/buildroot">
                    <Zap className="size-4" />
                    Boot the fastest machine
                  </Link>
                </Button>
                {!isAuthenticated && (
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-12 rounded-lg border-white/25 bg-transparent px-7 text-[15px] text-white hover:bg-white/10 hover:text-white"
                  >
                    <Link to="/auth">Create your account</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 font-mono text-xs uppercase tracking-[0.12em] text-muted-foreground sm:flex-row sm:px-6">
          <p>Nixtab — built on the open-source v86 emulator</p>
          <p>Distros belong to their respective projects</p>
        </div>
      </footer>
    </div>
  );
}
