import { createAuthClient } from "better-auth/react";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

export const authClient = createAuthClient({
  baseURL: backendUrl,
  fetchOptions: {
    credentials: "include",
  },
});

export const { signIn, signOut, signUp, useSession, getSession } = authClient;

/**
 * Start Google OAuth. The callback lives on the backend (port 3001), but the
 * redirect after a successful login must point at the frontend — Better Auth
 * resolves a relative callbackURL against its own origin (the backend).
 */
export function signInWithGoogle(callbackURL = "/dashboard") {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/+$/, "");
  const target = callbackURL.startsWith("http") ? callbackURL : `${appUrl}${callbackURL}`;
  return signIn.social({ provider: "google", callbackURL: target });
}
