import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { COURSE_OPTIONS } from "@/components/ProfileGate";
import { useAuth } from "@/hooks/use-auth";
import logo from "@/assets/logo.svg";
import { ArrowRight, Check, GraduationCap, Loader2 } from "lucide-react";
import { useState } from "react";
import { Navigate, useNavigate } from "react-router";

/** One-shot screen after sign-in: which course are you on? */
export default function Onboarding() {
  const { user, isLoading } = useAuth();
  const me = useQuery(api.profiles.get);
  const setCourse = useMutation(api.profiles.setCourse);
  const navigate = useNavigate();
  const [saving, setSaving] = useState<string | null>(null);

  if (isLoading || me === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  // Signed out mid-flow — back to auth.
  if (me === null) {
    return <Navigate to="/auth" replace />;
  }

  // Already onboarded? Nothing to do here.
  if (me.onboarded) {
    return <Navigate to="/dashboard" replace />;
  }

  const pick = async (course: string) => {
    setSaving(course);
    try {
      await setCourse({ course });
      // Served courses go straight to the launchpad; unserved ones land on
      // the waiting gate handled by ProfileGate.
      navigate("/dashboard", { replace: true });
    } finally {
      setSaving(null);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-grid bg-background px-4 py-12">
      <Card className="w-full max-w-xl border-border shadow-block-lg">
        <CardContent className="p-8">
          <img src={logo} alt="" className="size-10 rounded-lg" />
          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            What do you study?
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {user?.email ? (
              <>
                Signed in as{" "}
                <span className="font-mono text-[13px]">{user.email}</span>.
              </>
            ) : null}{" "}
            Pick your course so Nixtab can show you the right tools. Your
            choice is saved to your college account.
          </p>

          <div className="mt-7 grid gap-2.5">
            {COURSE_OPTIONS.map((course) => (
              <button
                key={course.id}
                onClick={() => void pick(course.id)}
                disabled={saving !== null}
                className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3.5 text-left transition-all hover:border-primary/60 hover:shadow-block disabled:opacity-50"
              >
                <span className="flex items-center gap-3">
                  <GraduationCap className="size-4 text-muted-foreground transition-colors group-hover:text-primary" />
                  <span>
                    <span className="block text-sm font-semibold">
                      {course.label}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {course.blurb}
                    </span>
                  </span>
                </span>
                {saving === course.id ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : (
                  <ArrowRight className="size-4 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                )}
              </button>
            ))}
          </div>

          <p className="mt-6 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check className="size-3.5 text-primary" />
            Wrong pick? You can change this any time from your launchpad.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
