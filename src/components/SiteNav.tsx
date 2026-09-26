import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import {
  indicatorLabel,
  indicatorTheme,
  useSystemStatus,
} from "@/hooks/use-system-status";
import { IdentityBadge } from "@/components/IdentityBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import logo from "@/assets/logo.svg";
import { TerminalSquare } from "lucide-react";
import { Link, useNavigate } from "react-router";

/** Live status tick from our Statuspage page; quiet when unset/unreachable. */
function StatusChip() {
  const status = useSystemStatus();
  if (!status) return null;
  const theme = indicatorTheme(status.status.indicator);

  return (
    <a
      href={status.page.url}
      target="_blank"
      rel="noopener noreferrer"
      className="hidden items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] transition-colors hover:border-primary/50 hover:bg-primary/5 lg:inline-flex"
      title={status.status.description}
    >
      <span
        className={`size-2 rounded-full ${theme.dot} ${theme.pulse ? "tick-pulse" : ""}`}
      />
      <span className={theme.label}>{indicatorLabel(status.status.indicator)}</span>
    </a>
  );
}

/** Nixtab site header shared by public pages. */
export function SiteNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <img
            src={logo}
            alt="Nixtab logo"
            className="size-8 rounded-md"
          />
          <span className="text-[15px] font-bold tracking-tight">Nixtab</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Button asChild variant="ghost" size="sm" className="font-mono text-xs uppercase tracking-[0.1em]">
            <a href="/#distros">Index</a>
          </Button>
          <Button asChild variant="ghost" size="sm" className="font-mono text-xs uppercase tracking-[0.1em]">
            <a href="/#how">How</a>
          </Button>
          <Button asChild variant="ghost" size="sm" className="font-mono text-xs uppercase tracking-[0.1em]">
            <a href="/#faq">FAQ</a>
          </Button>
          <Button asChild variant="ghost" size="sm" className="font-mono text-xs uppercase tracking-[0.1em]">
            <Link to="/docs">Docs</Link>
          </Button>
        </nav>

        <div className="flex items-center gap-2">
          <StatusChip />
          <ThemeToggle />
          {!isLoading && isAuthenticated ? (
            <IdentityBadge />
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden font-mono text-xs uppercase tracking-[0.1em] sm:inline-flex"
              >
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button
                size="sm"
                className="rounded-lg font-semibold shadow-block-primary"
                onClick={() => navigate("/#distros")}
              >
                <TerminalSquare className="size-4" />
                Boot one
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
