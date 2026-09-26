import type { QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";

/**
 * Resolve the signed-in user across BOTH auth stacks:
 *
 *  - Clerk mode: the JWT subject is the Clerk user id. Convex core exposes it
 *    via ctx.auth.getUserIdentity(); the users row is matched on `externalId`
 *    (and created by ensureCurrentUser when missing).
 *  - Legacy (Convex Auth) mode: the identity subject is the users row id, and
 *    Convex Auth sessions resolve via getAuthUserId.
 *
 * Returns the full user doc, or null when signed out / unresolvable.
 */
export async function resolveCurrentUser(
  ctx: QueryCtx | MutationCtx,
): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();

  if (identity) {
    // 1) Legacy Convex Auth puts the users row id in the token subject.
    const bySubject = await safeGetUser(ctx, identity.subject);
    if (bySubject) return bySubject;

    // 2) Clerk mode: users rows are keyed by externalId = Clerk user id.
    const byExternal = await ctx.db
      .query("users")
      .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
      .first();
    if (byExternal) return byExternal;

    // 3) Fall back to an email match (covers rows created before Clerk).
    if (identity.email) {
      const byEmail = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", identity.email))
        .first();
      if (byEmail) return byEmail;
    }
  }

  // 4) Legacy Convex Auth session lookup (anonymous / email OTP flows).
  const legacyId = await getAuthUserId(ctx);
  if (legacyId !== null) {
    const user = await ctx.db.get(legacyId);
    if (user) return user;
  }

  return null;
}

/** db.get that tolerates subjects that aren't users-table ids. */
async function safeGetUser(
  ctx: QueryCtx | MutationCtx,
  subject: string,
): Promise<Doc<"users"> | null> {
  try {
    return await ctx.db.get(subject as Id<"users">);
  } catch {
    return null;
  }
}

/**
 * Ensure a users row exists for the current identity and return its id.
 *
 * Beyond creation, it also heals the row against fresher token claims:
 *  - backfills name/email when the row lacks them (Clerk's default session
 *    token carries only `sub`/`aud` unless extra claims are mapped, so
 *    without this the verified-student email check would silently never fire),
 *  - stamps externalId onto rows first created in legacy mode once the same
 *    person signs in through Clerk (matched by verified email).
 */
export async function ensureCurrentUser(
  ctx: MutationCtx,
): Promise<Id<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  const tokenName = identity.name ?? undefined;
  const tokenEmail = identity.email ?? undefined;

  // 1) Legacy self-issued tokens put the users row id in the subject.
  const bySubject = await safeGetUser(ctx, identity.subject);
  if (bySubject) return bySubject._id;

  // 2) Clerk: rows keyed by externalId = Clerk user id.
  const byExternal = await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", identity.subject))
    .first();
  if (byExternal) {
    if (
      (tokenEmail && byExternal.email !== tokenEmail && !byExternal.email) ||
      (tokenName && byExternal.name !== tokenName && !byExternal.name)
    ) {
      await ctx.db.patch(byExternal._id, {
        ...(tokenEmail && !byExternal.email ? { email: tokenEmail } : {}),
        ...(tokenName && !byExternal.name ? { name: tokenName } : {}),
      });
    }
    return byExternal._id;
  }

  // 3) Row created before Clerk (legacy mode) — link it by verified email.
  if (tokenEmail) {
    const byEmail = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", tokenEmail))
      .first();
    if (byEmail) {
      await ctx.db.patch(byEmail._id, { externalId: identity.subject });
      return byEmail._id;
    }
  }

  // 4) Fresh identity — create the row.
  return await ctx.db.insert("users", {
    externalId: identity.subject,
    name: tokenName,
    email: tokenEmail,
  });
}
