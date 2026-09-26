import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { ensureCurrentUser, resolveCurrentUser } from "./identity";

/**
 * The college's student email pattern:
 *   c + digits @student.coventrycollege.ac.uk
 * e.g. c829740@student.coventrycollege.ac.uk
 */
const STUDENT_EMAIL_PATTERN = /^c\d+@student\.coventrycollege\.ac\.uk$/i;

/**
 * True when the email is a Coventry College student address. Exported for
 * reuse (UI badges) and future unit tests.
 */
export function isCoventryStudentEmail(
  email: string | undefined | null,
): boolean {
  return Boolean(email && STUDENT_EMAIL_PATTERN.test(email));
}

/** Read the signed-in user's profile. Pure read — no writes in a query. */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const user = await resolveCurrentUser(ctx);
    if (!user) return null;

    const verifiedStudent = isCoventryStudentEmail(user.email ?? undefined);

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    if (!existing) {
      return { course: undefined, onboarded: false, verifiedStudent };
    }
    return {
      _id: existing._id,
      course: existing.course,
      onboarded: existing.onboarded,
      verifiedStudent,
    };
  },
});

/**
 * Creates the users row (if needed) and the profile row on first sign-in.
 * Idempotent: returns the existing profile's id when one already exists.
 */
export const ensure = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await ensureCurrentUser(ctx);
    if (userId === null) throw new Error("Not signed in.");

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) return existing._id;

    const user = await ctx.db.get(userId);
    const verifiedStudent = isCoventryStudentEmail(user?.email ?? undefined);

    return await ctx.db.insert("profiles", {
      userId,
      onboarded: false,
      verifiedStudent,
      createdAt: Date.now(),
    });
  },
});

/**
 * Records the course picked during onboarding. Only subjects the product
 * currently serves ("IT") complete onboarding; everything else records the
 * choice and the UI shows the waiting-room gate for that course.
 */
export const setCourse = mutation({
  args: { course: v.string() },
  handler: async (ctx, { course }) => {
    const userId = await ensureCurrentUser(ctx);
    if (userId === null) throw new Error("Not signed in.");

    const user = await ctx.db.get(userId);
    const verifiedStudent = isCoventryStudentEmail(user?.email ?? undefined);
    const onboarded = course === "IT";

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, { course, onboarded, verifiedStudent });
      return existing._id;
    }
    return await ctx.db.insert("profiles", {
      userId,
      course,
      onboarded,
      verifiedStudent,
      createdAt: Date.now(),
    });
  },
});

/** Lets a user re-run the course prompt (e.g. they picked the wrong subject). */
export const resetOnboarding = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await ensureCurrentUser(ctx);
    if (userId === null) throw new Error("Not signed in.");

    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, { onboarded: false });
    }
  },
});
