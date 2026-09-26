import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserButton } from "@clerk/clerk-react";
import { useAuthMode } from "@/providers/AppProviders";
import { clerkAppearance } from "@/lib/clerk";
import { useAuth } from "@/hooks/use-auth";
import { Home, LogOut } from "lucide-react";
import { useNavigate } from "react-router";

/**
 * Nixtab's identity control.
 *
 * Clerk mode: Clerk's <UserButton /> (profile menu, sessions, sign-out),
 * themed via clerkAppearance — themed to Nixtab in lib/clerk.ts.
 * Legacy mode: the classic dropdown built on the Convex Auth session.
 */
export function IdentityBadge() {
  const mode = useAuthMode();

  if (mode === "clerk") {
    return (
      <UserButton
        appearance={clerkAppearance}
        afterSignOutUrl="/"
        userProfileUrl="/dashboard"
      />
    );
  }

  return <LegacyIdentityBadge />;
}

/** Convex Auth identity dropdown (legacy mode). */
function LegacyIdentityBadge() {
  const { isAuthenticated, user, signOut } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) return null;

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          aria-label="Account"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary">
            {(user?.name ?? user?.email ?? "N").slice(0, 1).toUpperCase()}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          {user?.email ?? "Signed in"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate("/dashboard")}
          className="cursor-pointer"
        >
          <Home className="mr-2 size-4" />
          Launchpad
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
