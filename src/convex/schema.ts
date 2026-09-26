import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove

      // External identity subject (Clerk user id) for token-based sign-in.
      externalId: v.optional(v.string()),
    })
      .index("email", ["email"]) // index for the email. do not remove or modify
      .index("byExternalId", ["externalId"]), // Clerk identity lookup

    // add other tables here

    /**
     * Per-user product profile. One row per user, keyed by userId.
     *
     * `course` records the subject picked during onboarding so the product
     * can gate content per course: "IT" unlocks the Linux sandboxes, other
     * subjects get a polite "nothing here yet" while the brand scales out
     * (finance/business tools are planned).
     */
    profiles: defineTable({
      userId: v.id("users"),
      /** Subject/course picked during onboarding, e.g. "IT" or "Business". */
      course: v.optional(v.string()),
      /** Whether the user finished the post-sign-in course prompt. */
      onboarded: v.boolean(),
      /** Set when the signed-in email matches the college student pattern. */
      verifiedStudent: v.optional(v.boolean()),
      /** When the profile row was created (ms epoch). */
      createdAt: v.number(),
    }).index("by_user", ["userId"]),

    // tableName: defineTable({
    //   ...
    //   // table fields
    // }).index("by_field", ["field"])
  },
  {
    schemaValidation: false,
  },
);

export default schema;
