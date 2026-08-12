import { betterAuth } from "better-auth";
import type { BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import * as schema from "../db/schema.js";
import { config } from "../config.js";
import { sendEmail } from "../services/email.js";
import { getSettings } from "../lib/settings.js";

/**
 * Better Auth instance (server-side, runs on the Node.js backend).
 * Google OAuth only. Roles are assigned server-side; the client never
 * supplies its own role.
 */
export const auth = betterAuth({
  appName: "Subly",
  secret: config.authSecret,
  baseURL: config.backendUrl,
  trustedOrigins: [config.frontendUrl],
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      account: schema.accounts,
      session: schema.sessions,
      verification: schema.verifications,
    },
  }),
  socialProviders: {
    google: {
      clientId: config.googleClientId,
      clientSecret: config.googleClientSecret,
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      requireLocalEmailVerified: false,
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "USER",
        input: false,
      },
      isSuspended: {
        type: "boolean",
        required: true,
        defaultValue: false,
        input: false,
      },
      phone: {
        type: "string",
        required: false,
        input: true,
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  advanced: {
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: "lax",
      secure: config.isProd,
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const email = (user.email ?? "").toLowerCase();
          if (config.adminEmails.includes(email)) {
            await db.update(schema.users).set({ role: "ADMIN", updatedAt: new Date() }).where(eq(schema.users.email, email));
          }
          const settings = await getSettings().catch(() => null);
          const storeName = settings?.storeName || "Subly";
          await sendEmail({
            to: user.email ?? "",
            subject: `Welcome to ${storeName}!`,
            title: `Welcome to ${storeName}!`,
            body:
              `Hi ${user.name ?? "there"},\n\n` +
              `Your ${storeName} account is ready. Browse eligible subscriptions, place an order, and manage everything from your dashboard.`,
            link: "/dashboard",
          });
        },
      },
    },
  },
} satisfies BetterAuthOptions);

/** Common auth option slices reused by the API and client typing. */
export type Auth = typeof auth;