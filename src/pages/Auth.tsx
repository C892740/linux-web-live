import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

import { useAuth } from "@/hooks/use-auth";
import { isClerkEnabled, clerkAppearance } from "@/lib/clerk";
import { SignIn } from "@clerk/clerk-react";
import logo from "@/assets/logo.svg";
import {
  ArrowRight,
  CheckCircle2,
  Loader2,
  Mail,
  ShieldCheck,
  UserX,
  XCircle,
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";

interface AuthProps {
  redirectAfterAuth?: string;
}

function resolveRedirectAfterAuth(
  returnTo: string | null,
  fallback = "/onboarding",
) {
  if (returnTo?.startsWith("/") && !returnTo.startsWith("//")) {
    return returnTo;
  }
  return fallback;
}

/** Microsoft 365 button glyph — four squares, drawn locally. */
function MicrosoftGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 23 23" className={className} aria-hidden fill="currentColor">
      <rect x="1" y="1" width="10" height="10" />
      <rect x="12" y="1" width="10" height="10" />
      <rect x="1" y="12" width="10" height="10" />
      <rect x="12" y="12" width="10" height="10" />
    </svg>
  );
}

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const [searchParams] = useSearchParams();
  const redirect = resolveRedirectAfterAuth(
    searchParams.get("returnTo"),
    redirectAfterAuth,
  );

  // Clerk mode renders Clerk's themed <SignIn /> component; legacy mode keeps
  // the built-in Convex Auth card. Both end up at the same `redirect`.
  return isClerkEnabled ? (
    <ClerkSignInScreen redirect={redirect} />
  ) : (
    <LegacyAuthScreen redirect={redirect} />
  );
}

/**
 * Clerk sign-in screen. The <SignIn /> component renders Clerk's UI (Social
 * sign-in, email code, etc.) themed via clerkAppearance to match Nixtab;
 * `routing="hash"` keeps it self-contained on this route.
 */
function ClerkSignInScreen({ redirect }: { redirect: string }) {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(redirect, { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate, redirect]);

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
            Sign in to your machine index
          </h1>

          <div className="mt-8 w-full">
            <SignIn
              appearance={clerkAppearance}
              routing="hash"
              fallbackRedirectUrl={redirect}
              signUpUrl="/sign-up"
            />
          </div>

          <p className="mt-6 flex items-center gap-1.5 text-center text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" />
            College sign-in via Microsoft 365 once Entra SSO is enabled in
            Clerk
          </p>
        </div>
      </div>
    </div>
  );
}

/** Legacy (Convex Auth) sign-in card, unchanged behaviour. */
function LegacyAuthScreen({ redirect }: { redirect: string }) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<"signIn" | { email: string }>("signIn");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Probe the deployment for Microsoft provider credentials so the UI can
  // show the real flow when configured and an honest fallback when not.
  // Lazy initialiser + async bootstrap avoids setState directly in an effect.
  const [msConfigured, setMsConfigured] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null;
    return import.meta.env.VITE_CONVEX_SITE_URL ? null : false;
  });
  const needsProbe = msConfigured === null;
  useEffect(() => {
    if (!needsProbe) return;
    let cancelled = false;
    const base = import.meta.env.VITE_CONVEX_SITE_URL;
    fetch(`${base}/ms-status`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: { configured: boolean }) => {
        if (!cancelled) setMsConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (!cancelled) setMsConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, [needsProbe]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirect);
    }
  }, [authLoading, isAuthenticated, navigate, redirect]);

  const handleMicrosoftSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // "microsoft-entra-id" is the provider id Convex Auth registered for
      // our MicrosoftEntraIDCoventry provider (derived from its constructor).
      await signIn("microsoft-entra-id");
      navigate(redirect);
    } catch (err) {
      console.error("Microsoft sign-in error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Microsoft sign-in failed. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      setStep({ email: formData.get("email") as string });
      setIsLoading(false);
    } catch (err) {
      console.error("Email sign-in error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send verification code. Please try again.",
      );
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      await signIn("email-otp", formData);
      navigate(redirect);
    } catch (err) {
      console.error("OTP verification error:", err);
      setError("The verification code you entered is incorrect.");
      setIsLoading(false);
      setOtp("");
    }
  };

  const handleGuestLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signIn("anonymous");
      navigate(redirect);
    } catch (err) {
      console.error("Guest login error:", err);
      setError(
        `Failed to sign in as guest: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Auth Content */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="flex h-full flex-col items-center justify-center">
          <Card className="min-w-[350px] border-border pb-0 shadow-block-lg">
            {step === "signIn" ? (
              <>
                <CardHeader className="text-center">
                  <div className="flex justify-center">
                    <img
                      src={logo}
                      alt="Nixtab logo"
                      width={56}
                      height={56}
                      className="mb-4 mt-4 cursor-pointer rounded-lg"
                      onClick={() => navigate("/")}
                    />
                  </div>
                  <CardTitle className="text-xl">Sign in to Nixtab</CardTitle>
                  <CardDescription>
                    Use your college Microsoft 365 account
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  {/* Primary: Microsoft 365 (Coventry College tenant) */}
                  {msConfigured === null ? (
                    <Button
                      className="h-11 w-full"
                      disabled
                    >
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Checking sign-in options…
                    </Button>
                    ) : msConfigured ? (
                    <>
                      <Button
                        className="h-11 w-full"
                        onClick={handleMicrosoftSignIn}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="mr-2 size-4 animate-spin" />
                        ) : (
                          <MicrosoftGlyph className="mr-2 size-4" />
                        )}
                        Sign in with Microsoft 365
                      </Button>
                      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                        <ShieldCheck className="size-3.5 text-primary" />
                        Restricted to Coventry College accounts
                      </p>
                    </>
                  ) : (
                    /* Provider credentials not set yet — honest fallback. */
                    <div className="rounded-lg border border-dashed border-border bg-secondary/50 p-3.5 text-center">
                      <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-secondary-foreground">
                        <XCircle className="size-3.5" />
                        Microsoft 365 sign-in isn't configured on this
                        deployment yet.
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        Add{" "}
                        <code className="font-mono">
                          AUTH_MICROSOFT_ENTRA_ID_ID
                        </code>{" "}
                        and{" "}
                        <code className="font-mono">
                          AUTH_MICROSOFT_ENTRA_ID_SECRET
                        </code>{" "}
                        in the Keys tab, using the Azure app registration's
                        redirect URI{" "}
                        <code className="font-mono break-all">
                          {`${typeof window !== "undefined" ? window.location.origin : ""}/api/auth/callback/microsoft-entra-id`}
                        </code>
                        .
                      </p>
                    </div>
                  )}

                  {/* Secondary: email code */}
                  <div className="mt-5">
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or with a code
                        </span>
                      </div>
                    </div>

                    <form onSubmit={handleEmailSubmit}>
                      <div className="relative mt-4 flex items-center gap-2">
                        <div className="relative flex-1">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            name="email"
                            placeholder="name@example.com"
                            type="email"
                            className="pl-9"
                            disabled={isLoading}
                            required
                          />
                        </div>
                        <Button
                          type="submit"
                          variant="outline"
                          size="icon"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </form>

                    <Button
                      type="button"
                      variant="outline"
                      className="mt-4 w-full"
                      onClick={handleGuestLogin}
                      disabled={isLoading}
                    >
                      <UserX className="mr-2 h-4 w-4" />
                      Continue as Guest
                    </Button>
                  </div>

                  {error && (
                    <p className="mt-3 text-sm text-destructive">{error}</p>
                  )}
                </CardContent>
              </>
            ) : (
              <>
                <CardHeader className="mt-4 text-center">
                  <CardTitle>Check your email</CardTitle>
                  <CardDescription>
                    We've sent a code to {step.email}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleOtpSubmit}>
                  <CardContent className="pb-4">
                    <input type="hidden" name="email" value={step.email} />
                    <input type="hidden" name="code" value={otp} />

                    <div className="flex justify-center">
                      <InputOTP
                        value={otp}
                        onChange={setOtp}
                        maxLength={6}
                        disabled={isLoading}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            otp.length === 6 &&
                            !isLoading
                          ) {
                            const form = (e.target as HTMLElement).closest(
                              "form",
                            );
                            if (form) {
                              form.requestSubmit();
                            }
                          }
                        }}
                      >
                        <InputOTPGroup>
                          {Array.from({ length: 6 }).map((_, index) => (
                            <InputOTPSlot key={index} index={index} />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    {error && (
                      <p className="mt-2 text-center text-sm text-destructive">
                        {error}
                      </p>
                    )}
                    <p className="mt-4 text-center text-sm text-muted-foreground">
                      Didn't receive a code?{" "}
                      <Button
                        variant="link"
                        className="h-auto p-0"
                        onClick={() => setStep("signIn")}
                      >
                        Try again
                      </Button>
                    </p>
                  </CardContent>
                  <CardFooter className="flex-col gap-2">
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isLoading || otp.length !== 6}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          Verify code
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setStep("signIn")}
                      disabled={isLoading}
                      className="w-full"
                    >
                      Use different email
                    </Button>
                  </CardFooter>
                </form>
              </>
            )}

            <div className="rounded-b-lg border-t bg-muted px-6 py-4 text-center text-xs text-muted-foreground">
              {msConfigured ? (
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-primary" />
                  College tenancy enforced by Microsoft Entra ID
                </span>
              ) : (
                <span>
                  Guest &amp; code sign-ins are for preview only — college
                  sign-in arrives with Microsoft 365 setup.
                </span>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
