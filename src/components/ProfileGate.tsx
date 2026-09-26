import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logo from "@/assets/logo.svg";

/** The subjects Nixtab currently serves. The brand will add more later. */
export const SERVED_COURSES = ["IT"] as const;

export const COURSE_OPTIONS = [
  { id: "IT", label: "IT / Computing", blurb: "Linux sandboxes are ready for you." },
  { id: "Business", label: "Business", blurb: "Finance & business tools are planned." },
  { id: "Health", label: "Health & Social Care", blurb: "Nothing here yet." },
  { id: "Construction", label: "Construction & Trades", blurb: "Nothing here yet." },
  { id: "Other", label: "Something else", blurb: "Nothing here yet." },
] as const;

/**
 * Wraps any route that requires a signed-in user who has picked a course.
 *
 * Flow after sign-in:
 *   1. no profile / not onboarded  →  /onboarding (course picker)
 *   2. course with no content yet  →  gate screen ("nothing for this course yet")
 *   3. served course (IT)          →  render children
 */
export function ProfileGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const me = useQuery(api.profiles.get);
  const resetOnboarding = useMutation(api.profiles.resetOnboarding);

  if (me === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  // Signed out — let RequireAuth's sibling logic handle it, but be safe.
  if (me === null) {
    const returnTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?returnTo=${encodeURIComponent(returnTo)}`} replace />;
  }

  if (!me.onboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!SERVED_COURSES.includes((me.course ?? "") as (typeof SERVED_COURSES)[number])) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md border-border shadow-block">
          <CardContent className="p-8 text-center">
            <img src={logo} alt="" className="mx-auto size-10 rounded-lg opacity-80" />
            <h1 className="mt-5 text-xl font-bold tracking-tight">
              Nothing here for {me.course} yet
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Nixtab currently serves IT &amp; Computing courses. We're building
              tools for other subjects — your pick is saved and you'll get
              access the moment yours launches.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button variant="outline" onClick={() => void resetOnboarding({})}>
                Change course
              </Button>
              <Button asChild>
                <a href="/">Back to home</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    );
  }

  return children;
}
