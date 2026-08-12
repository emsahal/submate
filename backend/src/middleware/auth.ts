import type { Context, Next } from "hono";
import { auth } from "../auth/index.js";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  role: "USER" | "ADMIN";
  isSuspended?: boolean;
};

export interface AppVariables {
  user: AuthUser;
  session: { id: string; userId: string };
}

export async function getSessionData(c: Context) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers as Headers });
  return session;
}

/** Require a valid (non-suspended) session. */
export const requireUser = async (c: Context<{ Variables: AppVariables }>, next: Next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers as Headers });
  if (!session?.user) {
    return c.json({ error: { code: "UNAUTHENTICATED", message: "You must be signed in." } }, 401);
  }
  if (session.user.isSuspended) {
    return c.json({ error: { code: "SUSPENDED", message: "Your account has been suspended." } }, 403);
  }
  c.set("user", session.user as AuthUser);
  c.set("session", { id: session.session.id, userId: session.user.id });
  await next();
};

/** Require an admin session. */
export const requireAdmin = async (c: Context<{ Variables: AppVariables }>, next: Next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers as Headers });
  if (!session?.user) {
    return c.json({ error: { code: "UNAUTHENTICATED", message: "You must be signed in." } }, 401);
  }
  if ((session.user as { role?: string }).role !== "ADMIN") {
    return c.json({ error: { code: "FORBIDDEN", message: "Admin access required." } }, 403);
  }
  if (session.user.isSuspended) {
    return c.json({ error: { code: "SUSPENDED", message: "Your account has been suspended." } }, 403);
  }
  c.set("user", session.user as AuthUser);
  c.set("session", { id: session.session.id, userId: session.user.id });
  await next();
};