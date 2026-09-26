import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/logo.svg";
import { TerminalSquare } from "lucide-react";
import { Link, useNavigate } from "react-router";

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
        </nav>

        <div className="flex items-center gap-2">
          {!isLoading && isAuthenticated ? (
            <Button size="sm" className="rounded-lg font-semibold" onClick={() => navigate("/dashboard")}>
              Launchpad
            </Button>
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
