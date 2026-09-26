import { clerkAppearance } from "@/lib/clerk";
import { SignUp } from "@clerk/clerk-react";
import { ShieldCheck } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import logo from "@/assets/logo.svg";
import { useAuth } from "@/hooks/use-auth";

/**
 * Clerk sign-up screen. Only reachable in Clerk mode (the /sign-up route is
 * registered for Clerk's SignUp component; legacy mode routes here are simply
 * an alternate entry into sign-in, which is fine).
 */
export default function ClerkSignUp() {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/onboarding", { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="flex w-full max-w-[400px] flex-col items-center">
          <img
            src={logo}
            alt="Nixtab logo"
            className="size-12 cursor-pointer rounded-lg"
            onClick={() => navigate("/")}
          />
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Nixtab
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Create your account
          </h1>

          <div className="mt-8 w-full">
            <SignUp
              appearance={clerkAppearance}
              routing="hash"
              fallbackRedirectUrl="/onboarding"
              signInUrl="/auth"
            />
          </div>

          <p className="mt-6 flex items-center gap-1.5 text-center text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            Your course choice is saved to your account after sign-up.
          </p>
        </div>
      </div>
    </div>
  );
}
