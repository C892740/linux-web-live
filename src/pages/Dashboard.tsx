import { DistroCard } from "@/components/DistroCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { BOOTABLE_DISTROS, DISTROS } from "@/lib/distros";
import { Clock, LogOut, TerminalSquare } from "lucide-react";
import { Link, useNavigate } from "react-router";

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const upcoming = DISTROS.filter((d) => d.comingSoon);

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/70 bg-card/50">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Your launchpad
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              Welcome{user?.name ? `, ${user.name}` : ""} — ready to boot?
            </h1>
          </div>
          <Button
            type="button"
            variant="outline"
            className="self-start"
            onClick={handleSignOut}
          >
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        {/* Quick boot */}
        <Card className="gap-0 border-border/70 py-0 shadow-layered">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
            <div className="flex items-center gap-4">
              <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <TerminalSquare className="size-5" />
              </div>
              <div>
                <p className="font-semibold tracking-tight">Quick boot</p>
                <p className="text-sm text-muted-foreground">
                  Jump straight into the fastest machine — Buildroot, live in
                  seconds.
                </p>
              </div>
            </div>
            <Button asChild>
              <Link to="/run/buildroot">Boot Buildroot</Link>
            </Button>
          </CardContent>
        </Card>

        {/* All distros */}
        <section className="mt-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Bootable now
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {BOOTABLE_DISTROS.length} machines ready — pick one and it
                boots in this tab.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/">Browse the full catalog</Link>
            </Button>
          </div>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BOOTABLE_DISTROS.map((distro, index) => (
              <DistroCard key={distro.id} distro={distro} index={index} />
            ))}
          </div>
        </section>

        {/* Coming soon */}
        <section className="mt-12">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-muted-foreground" />
            <h2 className="text-xl font-bold tracking-tight">Coming soon</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Requested distros we're tracking — blocked today by 64-bit-only
            installers and image size.
          </p>

          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((distro, index) => (
              <DistroCard key={distro.id} distro={distro} index={index} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
