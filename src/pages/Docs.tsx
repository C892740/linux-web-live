import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/SiteNav";
import { BOOTABLE_DISTROS } from "@/lib/distros";
import { MAX_CUSTOM_BYTES } from "@/lib/custom-iso";
import {
  ArrowRight,
  ArrowUpRight,
  Cpu,
  Gauge,
  HardDrive,
  Lightbulb,
  MonitorPlay,
  ShieldCheck,
  TerminalSquare,
  Undo2,
} from "lucide-react";
import { Link } from "react-router";

/** Mono index rule line, matching the landing page. */
function MetaRule({ left, right }: { left: string; right: string }) {
  return (
    <div className="flex items-baseline gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
      <span>{left}</span>
      <span aria-hidden className="h-px flex-1 bg-border" />
      <span>{right}</span>
    </div>
  );
}

function Section({
  id,
  index,
  title,
  lede,
  children,
}: {
  id: string;
  index: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-border py-12 first:border-t-0">
      <MetaRule left={`Section ${index}`} right={title} />
      <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
        {title}
      </h2>
      {lede && (
        <p className="mt-2 max-w-2xl leading-relaxed text-muted-foreground">
          {lede}
        </p>
      )}
      <div className="mt-8">{children}</div>
    </section>
  );
}

const HOW_STEPS = [
  {
    icon: HardDrive,
    title: "An image is fetched",
    body: "Each machine in the index points at a real, unmodified live image on a public mirror. Your browser downloads it once and caches it for reboots — or, on the Boot your own ISO page, reads a file straight from your disk without uploading anything.",
  },
  {
    icon: Cpu,
    title: "Your tab becomes a PC",
    body: "v86, an open-source x86 emulator written in WebAssembly, emulates a complete 32-bit PC: CPU, RAM, VGA display, keyboard, mouse and storage. The kernel doesn't know it isn't real hardware.",
  },
  {
    icon: MonitorPlay,
    title: "The OS boots for real",
    body: "SeaBIOS initialises the machine and hands off to the image's bootloader. What you see is the genuine boot sequence — kernel messages, hardware probing, the desktop starting — at native emulation speed.",
  },
  {
    icon: Undo2,
    title: "Nothing persists",
    body: "The machine runs entirely in memory. Reset the session or close the tab and every change evaporates. That's the point: it's a sandbox you can't break.",
  },
];

const USES = [
  {
    icon: ShieldCheck,
    title: "Break things safely",
    body: "Practise fdisk, kill processes, misconfigure a boot loader, delete /bin — then hit Reset and do it again. Ideal for IT coursework where breaking a real machine has consequences.",
  },
  {
    icon: MonitorPlay,
    title: "Classroom demonstrations",
    body: "Every student gets the same machine in the same tab — no installs, no admin rights, works on locked-down college Chromebooks. Show a genuine Linux boot in the first five minutes of a lesson.",
  },
  {
    icon: Gauge,
    title: "Try before you install",
    body: "Kick the tyres of a lightweight desktop (Tiny Core, DSL, Puppy-class images) before committing to a dual-boot or USB stick on your own hardware.",
  },
  {
    icon: TerminalSquare,
    title: "Retro & embedded exploration",
    body: "Boot floppy images, kernel images, and demo operating systems — great for understanding how small 'an operating system' can actually be.",
  },
];

const CAPABILITIES = [
  "32-bit (i386) x86 live ISOs, floppies and raw disk images",
  "Kernel-image boots (bzImage) without any CD-ROM at all",
  "Up to 1 GB of guest RAM per session",
  "True-resolution fullscreen scaling to your monitor",
  "Bring-your-own images up to ~2 GB, read locally — never uploaded",
  "Ctrl+Alt+Del, session reset and cached reboots",
];

const LIMITS = [
  "64-bit-only ISOs (Zorin Core, Lubuntu, Mint…) cannot execute — the emulator is a 32-bit CPU",
  "Guest RAM is capped: heavy desktops need light images, not more memory",
  "Emulation is slower than bare metal — expect real-kernel speed, not native",
  "Sessions are ephemeral: nothing you save inside the guest survives a reset",
];

const TIPS = [
  ["Capture the keyboard", "Click once inside the machine's screen."],
  ["Release the mouse", "Press Ctrl+Alt — the cursor returns to the page."],
  ["Reboot the guest", "Use the Ctrl+Alt+Del button, or type reboot in the guest."],
  ["Fullscreen", "The monitor icon scales the display to your screen's native resolution; press Esc to leave."],
  ["Stuck or frozen?", "Hit Reset — the machine powers off and boots a fresh copy. Nothing was lost, because nothing was stored."],
];

export default function Docs() {
  const mb = (bytes: number) => Math.round(bytes / 1024 / 1024);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteNav />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 sm:px-6">
        {/* Hero */}
        <header className="border-b border-border py-14">
          <MetaRule left="Nixtab" right="Documentation · v1" />
          <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">
            The manual.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Nixtab boots real, unmodified Linux distributions inside your
            browser tab — no installs, no downloads to manage, nothing at risk.
            This page documents how it works, what it's good for, and where the
            honest limits are.
          </p>
          <div className="mt-7 flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {[
              ["#how", "How it works"],
              ["#screens", "What you'll see"],
              ["#uses", "What it's for"],
              ["#capabilities", "Capabilities & limits"],
              ["#machines", "Machine index"],
              ["#tips", "Hands-on tips"],
            ].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="rounded-md border border-border px-3 py-1.5 transition-colors hover:border-primary/50 hover:bg-primary/5"
              >
                {label}
              </a>
            ))}
          </div>
        </header>

        {/* How it works */}
        <Section
          id="how"
          index="01"
          title="How it works"
          lede="Four things happen between clicking Boot and seeing a desktop."
        >
          <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2">
            {HOW_STEPS.map((step, i) => (
              <div key={step.title} className="bg-card p-6">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <step.icon className="size-4.5" />
                  </span>
                  <span className="font-mono text-sm text-primary">
                    0{i + 1}
                  </span>
                </div>
                <h3 className="mt-3.5 font-semibold tracking-tight">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-lg border border-primary/30 bg-primary/5 p-5">
            <p className="flex items-start gap-2.5 text-sm leading-relaxed text-accent-foreground">
              <ShieldCheck className="mt-0.5 size-4.5 shrink-0 text-primary" />
              <span>
                <strong>Nothing ever leaves your device.</strong> Images are
                fetched from public mirrors straight into your browser and
                emulated there. Nixtab's servers never see your screen, your
                files, or anything you type inside a machine.
              </span>
            </p>
          </div>
        </Section>

        {/* Visual showcase */}
        <Section
          id="screens"
          index="02"
          title="What you'll see"
          lede="The three faces of a Nixtab session, from cold boot to desktop."
        >
          <div className="grid gap-5 lg:grid-cols-3">
            <figure>
              <div className="overflow-hidden rounded-lg border border-foreground/15 bg-[#0c1410] shadow-block">
                <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
                  <span className="size-2 rounded-full bg-[#ff5f57]" />
                  <span className="size-2 rounded-full bg-[#febc2e]" />
                  <span className="size-2 rounded-full bg-[#28c840]" />
                </div>
                <div className="space-y-1 px-4 py-4 font-mono text-[11px] leading-relaxed">
                  <p className="text-white/40">SeaBIOS (version 1.16.0)</p>
                  <p className="text-emerald-300">[ ok ] probing storage</p>
                  <p className="text-emerald-300">[ ok ] loading kernel</p>
                  <p className="text-white/60">Loading linux3.iso… done</p>
                  <p className="text-white/85">tc@box:~$ uname -a</p>
                  <p className="text-white/50">Linux box i686 GNU/Linux</p>
                </div>
              </div>
              <figcaption className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                01 · The boot sequence, unedited
              </figcaption>
            </figure>

            <figure>
              <div className="overflow-hidden rounded-lg border border-foreground/15 bg-[#0c1410] shadow-block">
                <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
                  <span className="size-2 rounded-full bg-[#ff5f57]" />
                  <span className="size-2 rounded-full bg-[#febc2e]" />
                  <span className="size-2 rounded-full bg-[#28c840]" />
                </div>
                <div className="space-y-2 px-4 py-4">
                  <div className="flex gap-1.5">
                    <span className="flex h-14 flex-1 items-end justify-center rounded bg-teal-900/60 pb-1 font-mono text-[9px] text-teal-200">FLTK</span>
                    <span className="flex h-14 flex-1 items-end justify-center rounded bg-purple-900/60 pb-1 font-mono text-[9px] text-purple-200">JWM</span>
                    <span className="flex h-14 flex-1 items-end justify-center rounded bg-sky-900/60 pb-1 font-mono text-[9px] text-sky-200">Term</span>
                  </div>
                  <div className="h-1.5 w-2/3 rounded bg-white/10" />
                  <div className="h-1.5 w-1/2 rounded bg-white/10" />
                  <div className="h-1.5 w-3/5 rounded bg-white/10" />
                </div>
              </div>
              <figcaption className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                02 · A real graphical desktop, in-tab
              </figcaption>
            </figure>

            <figure>
              <div className="overflow-hidden rounded-lg border border-foreground/15 bg-[#0c1410] shadow-block">
                <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
                  <span className="size-2 rounded-full bg-[#ff5f57]" />
                  <span className="size-2 rounded-full bg-[#febc2e]" />
                  <span className="size-2 rounded-full bg-[#28c840]" />
                </div>
                <div className="space-y-1 px-4 py-4 font-mono text-[11px] leading-relaxed">
                  <p className="text-white/85">$ dd if=/dev/zero of=test</p>
                  <p className="text-white/50">^C — 2048 KiB written</p>
                  <p className="text-white/85">$ rm -rf /bin</p>
                  <p className="text-emerald-300">…go ahead. Reset fixes it.</p>
                  <p className="text-white/40">session: ephemeral · 0 bytes kept</p>
                </div>
              </div>
              <figcaption className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                03 · Break it. Reset. Repeat.
              </figcaption>
            </figure>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
            Illustrations in the documentation style of this page — the real
            machines render as an authentic VGA display in your browser.
          </p>
        </Section>

        {/* Uses */}
        <Section
          id="uses"
          index="03"
          title="What it's for"
          lede="Nixtab is built for IT & Computing students at Coventry College — and anyone who wants to learn Linux by doing."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            {USES.map((use) => (
              <div
                key={use.title}
                className="rounded-lg border border-border bg-card p-6"
              >
                <span className="flex size-9 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                  <use.icon className="size-4.5" />
                </span>
                <h3 className="mt-3.5 font-semibold tracking-tight">
                  {use.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {use.body}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* Capabilities & limits */}
        <Section
          id="capabilities"
          index="04"
          title="Capabilities & limits"
          lede="What the machine index can honestly do today, and where the walls are."
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-semibold tracking-tight">Capable of</h3>
              <ul className="mt-3.5 space-y-2.5">
                {CAPABILITIES.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-card p-6">
              <h3 className="font-semibold tracking-tight">Not (yet) capable of</h3>
              <ul className="mt-3.5 space-y-2.5">
                {LIMITS.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-destructive/70" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Bring-your-own images are capped at {mb(MAX_CUSTOM_BYTES)} GB
            because the file is handled entirely in your browser's memory.
          </p>
        </Section>

        {/* Machine index */}
        <Section
          id="machines"
          index="05"
          title="The machine index"
          lede="Every entry boots live in this tab. Sizes are the real bytes your browser fetches before the kernel starts."
        >
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Machine</th>
                  <th className="px-4 py-3 font-medium">Desktop</th>
                  <th className="px-4 py-3 font-medium">Image</th>
                  <th className="px-4 py-3 font-medium">RAM</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {BOOTABLE_DISTROS.map((distro) => (
                  <tr
                    key={distro.id}
                    className="border-b border-border/60 last:border-b-0"
                  >
                    <td className="px-4 py-3 font-medium">{distro.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {distro.desktop}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {distro.sizeMb} MB
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {distro.memoryMb} MB
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/run/${distro.id}`}
                        className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.1em] text-primary hover:underline"
                      >
                        Boot
                        <ArrowUpRight className="size-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-5 rounded-lg border border-dashed border-border p-5">
            <h3 className="font-semibold tracking-tight">
              Your own images on <span className="font-mono text-sm">/boot</span>
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Any 32-bit bootable ISO, floppy or raw disk image from your disk —
              read locally, never uploaded, classified automatically (CD-ROM,
              floppy, kernel or hard-disk boot) with a RAM slider before power
              on. 64-bit-only ISOs won't execute; the page warns you when a
              filename suggests one.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4 rounded-lg">
              <Link to="/boot">
                <TerminalSquare className="size-4" />
                Open the boot tray
              </Link>
            </Button>
          </div>
        </Section>

        {/* Tips */}
        <Section
          id="tips"
          index="06"
          title="Hands-on tips"
          lede="The small things that make a session feel less like a demo and more like a real machine."
        >
          <div className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
            {TIPS.map(([title, body]) => (
              <div key={title} className="bg-card p-5">
                <p className="flex items-center gap-2 font-semibold tracking-tight">
                  <Lightbulb className="size-4 text-primary" />
                  {title}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* CTA */}
        <div className="mt-4 rounded-lg border border-foreground/20 bg-[#0c1410] p-8 text-center shadow-block-lg">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            That's the theory. Boot something.
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-white/60">
            The fastest machine reaches a shell in seconds; the smallest
            graphical desktop fits in 19 MB.
          </p>
          <Button
            asChild
            size="lg"
            className="mt-6 rounded-lg bg-emerald-300 font-semibold text-emerald-950 hover:bg-emerald-200"
          >
            <Link to="/run/buildroot">
              Boot the fastest machine
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
