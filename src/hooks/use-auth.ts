import { useConvexAuth } from "convex/react";
import { useAuthKit } from "@/providers/AppProviders";

/**
 * The app-wide auth hook. Works identically in both auth stacks:
 *
 *  - Legacy (Convex Auth): user comes from the Convex `users` table.
 *  - Clerk: user comes from the Clerk session and is synced into Convex.
 *
 * `isAuthenticated`/`isLoading` always derive from useConvexAuth(), i.e.
 * "Convex sees a valid identity" — the single source of truth for route
 * guards (RequireAuth) and Convex queries.
 */
export function useAuth() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const { user, signIn, signOut } = useAuthKit();

  // user is undefined while the active stack resolves, null when signed out.
  const isLoading = isAuthLoading || user === undefined;

  return {
    isLoading,
    isAuthenticated,
    user,
    signIn,
    signOut,
  };
}
