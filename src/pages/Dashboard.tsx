import { DistroCard } from "@/components/DistroCard";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { BOOTABLE_DISTROS, DISTROS } from "@/lib/distros";
import { COURSE_OPTIONS } from "@/components/ProfileGate";
import { BadgeCheck, Clock, LogOut, TerminalSquare } from "lucide-react";
import { Link, useNavigate } from "react-router";

const COURSE_LABELS: Record<string, string> = Object.fromEntries(
  COURSE_OPTIONS.map((c) => [c.id, c.label]),
);

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const me = useQuery(api.profiles.get);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const upcoming = DISTROS.filter((d) => d.comingSoon);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
              Nixtab launchpad
            </p>
            <h1 className="mt-1.5 text-2xl font-bold tracking-tight">
              Welcome{user?.name ? `, ${user.name}` : ""}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {me?.verifiedStudent && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-accent-foreground">
                  <BadgeCheck className="size-3.5" />
                  Verified student
                </span>
              )}
              {me?.course && (
                <span className="inline-flex items-center rounded-full border border-border bg-secondary px-2.5 py-0.5 text-xs text-secondary-foreground">
                  {COURSE_LABELS[me.course] ?? me.course}
                </span>
              )}
              {user?.email && (
                <span className="font-mono text-xs text-muted-foreground">
                  {user.email}
                </span>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="self-start rounded-lg"
            onClick={handleSignOut}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        {/* Quick boot */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-5 shadow-block">
          <div className="flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-md bg-primary/15 text-primary">
              <TerminalSquare className="size-5" />
            </div>
            <div>
              <p className="font-semibold tracking-tight">Quick boot</p>
              <p className="text-sm text-muted-foreground">
                Straight into the fastest machine — Buildroot, live in seconds.
              </p>
            </div>
          </div>
          <Button asChild className="rounded-lg font-semibold">
            <Link to="/run/buildroot">Power on</Link>
          </Button>
        </div>

        {/* Bootable now */}
        <section className="mt-12">
          <div className="flex items-baseline gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <span>Ready</span>
            <span aria-hidden className="h-px flex-1 bg-border" />
            <span>{BOOTABLE_DISTROS.length} machines</span>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BOOTABLE_DISTROS.map((distro, index) => (
              <DistroCard key={distro.id} distro={distro} index={index} />
            ))}
          </div>
        </section>

        {/* Coming soon */}
        <section className="mt-14">
          <div className="flex items-baseline gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            <Clock className="size-3.5" />
            <span>In the workshop</span>
            <span aria-hidden className="h-px flex-1 bg-border" />
          </div>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            Requested distros we're tracking — blocked today by 64-bit-only
            installers and image size, not by choice.
          </p>
          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((distro, index) => (
              <DistroCard key={distro.id} distro={distro} index={index} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
