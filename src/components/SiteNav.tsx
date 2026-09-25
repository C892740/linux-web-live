import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/logo.svg";
import { TerminalSquare } from "lucide-react";
import { Link, useNavigate } from "react-router";

/** Slim sticky site header shared by public pages. */
export function SiteNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <img
            src={logo}
            alt="DistroTest logo"
            className="size-8 rounded-lg ring-1 ring-foreground/10"
          />
          <span className="text-[15px] font-semibold tracking-tight">
            DistroTest
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Button asChild variant="ghost" size="sm">
            <a href="/#distros">Distros</a>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href="/#how">How it works</a>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <a href="/#faq">FAQ</a>
          </Button>
        </nav>

        <div className="flex items-center gap-2">
          {!isLoading && isAuthenticated ? (
            <Button size="sm" onClick={() => navigate("/dashboard")}>
              My workspace
            </Button>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex"
              >
                <Link to="/auth">Sign in</Link>
              </Button>
              <Button size="sm" onClick={() => navigate("/#distros")}>
                <TerminalSquare className="size-4" />
                Launch a distro
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
