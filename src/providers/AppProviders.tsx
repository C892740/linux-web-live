import { ConvexReactClient, useQuery } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexAuthProvider, useAuthActions } from "@convex-dev/auth/react";
import {
  ClerkProvider,
  useAuth as useClerkAuth,
  useClerk,
  useUser,
} from "@clerk/clerk-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { clerkAppearance, isClerkEnabled } from "@/lib/clerk";

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string,
);

type AuthMode = "clerk" | "legacy";

/**
 * What useAuth() consumes. `user` is undefined while auth state loads, null
 * when signed out, and a small {name, email} shape when signed in.
 */
export interface AuthKit {
  user: { name?: string; email?: string } | null | undefined;
  /** Legacy (Convex Auth) provider flow. Rejects in Clerk mode. */
  signIn: (provider: string, params?: FormData) => Promise<unknown>;
  signOut: () => Promise<void>;
}

const AuthKitContext = createContext<AuthKit>({
  user: undefined,
  signIn: async () => {
    throw new Error("Auth provider not mounted yet.");
  },
  signOut: async () => {},
});

/** Internal accessor for src/hooks/use-auth.ts. */
export function useAuthKit() {
  return useContext(AuthKitContext);
}

/**
 * Locks the auth mode before first paint so the whole tree renders in exactly
 * one auth stack (mixing them breaks Convex token validation).
 */
const ModeContext = createContext<AuthMode>(
  isClerkEnabled ? "clerk" : "legacy",
);

/** Which auth stack the app booted with. "clerk" once keys are configured. */
export const useAuthMode = () => useContext(ModeContext);

/**
 * Legacy mode: built-in Convex Auth. Exposes the same AuthKit contract so
 * pages don't know or care which stack is live.
 */
function LegacyBridge({ children }: { children: ReactNode }) {
  const user = useQuery(api.users.currentUser);
  const { signIn, signOut } = useAuthActions();

  const value = useMemo<AuthKit>(() => {
    const kitUser: AuthKit["user"] =
      user === undefined
        ? undefined
        : user === null
          ? null
          : { name: user.name ?? undefined, email: user.email ?? undefined };
    return {
      user: kitUser,
      signIn: (provider, params) => signIn(provider, params),
      signOut: () => signOut(),
    };
  }, [user, signIn, signOut]);

  return (
    <AuthKitContext.Provider value={value}>
      {children}
    </AuthKitContext.Provider>
  );
}

/**
 * Clerk mode: keeps the Convex users/profile row in sync with the Clerk
 * profile on sign-in and profile changes. Idempotent server-side.
 */
function ClerkBridge({ children }: { children: ReactNode }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut: clerkSignOut } = useClerk();
  const ensure = useMutation(api.profiles.ensure);

  const name = user?.fullName ?? undefined;
  const email = user?.primaryEmailAddress?.emailAddress ?? undefined;
  const clerkUserId = user?.id;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !clerkUserId) return;
    ensure({}).catch((err: unknown) => {
      console.warn("[clerk] profile sync failed:", err);
    });
  }, [isLoaded, isSignedIn, clerkUserId, name, email, ensure]);

  const value = useMemo<AuthKit>(() => {
    const kitUser: AuthKit["user"] = !isLoaded
      ? undefined
      : isSignedIn
        ? { name, email }
        : null;
    return {
      user: kitUser,
      signIn: async () => {
        throw new Error(
          "Sign-in is handled by Clerk on this deployment.",
        );
      },
      signOut: clerkSignOut,
    };
  }, [isLoaded, isSignedIn, name, email, clerkSignOut]);

  return (
    <AuthKitContext.Provider value={value}>
      {children}
    </AuthKitContext.Provider>
  );
}

/**
 * Single provider tree for the app.
 *
 * Clerk mode (publishable key present): ClerkProvider owns sign-in UI and
 * sessions; ConvexProviderWithClerk hands session tokens to Convex per the
 * official Convex↔Clerk integration; the backend validates them via
 * CLERK_FRONTEND_API_URL in convex/auth.config.ts.
 *
 * Legacy mode (no key yet): the built-in Convex Auth stack stays in place so
 * nothing breaks while keys are pending.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  if (!isClerkEnabled) {
    return (
      <ModeContext.Provider value="legacy">
        <ConvexAuthProvider client={convex}>
          <LegacyBridge>{children}</LegacyBridge>
        </ConvexAuthProvider>
      </ModeContext.Provider>
    );
  }

  return (
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string}
      appearance={clerkAppearance}
      afterSignOutUrl="/"
    >
      <ModeContext.Provider value="clerk">
        <ConvexProviderWithClerk client={convex} useAuth={useClerkAuth}>
          <ClerkBridge>{children}</ClerkBridge>
        </ConvexProviderWithClerk>
      </ModeContext.Provider>
    </ClerkProvider>
  );
}
