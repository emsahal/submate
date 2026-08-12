"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { signIn, signUp, signInWithGoogle } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";

type Mode = "signin" | "signup";

function safeCallback(value: string | null): string {
  if (!value) return "/dashboard";
  if (!value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export default function AuthPage() {
  return (
    <React.Suspense fallback={null}>
      <AuthPageContent />
    </React.Suspense>
  );
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callback = safeCallback(searchParams.get("callback"));

  const [mode, setMode] = React.useState<Mode>("signin");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [googleLoading, setGoogleLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function handleGoogle() {
    setGoogleLoading(true);
    signInWithGoogle(callback);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result =
      mode === "signin"
        ? await signIn.email({ email, password })
        : await signUp.email({ name, email, password });

    if (result.error) {
      setError(result.error.message ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    router.push(callback);
    router.refresh();
  }

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  return (
    <div className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center px-4 py-16">
      <Card className="card-bubble w-full">
        <CardHeader className="items-center text-center">
          <Logo className="mb-2" />
          <CardTitle className="text-2xl">Welcome to Subly</CardTitle>
          <CardDescription>
            {mode === "signin" ? "Sign in to order subscriptions and manage your payments." : "Create an account to get started."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle */}
          <div className="grid grid-cols-2 gap-1 rounded-full border border-border bg-muted/50 p-1">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  mode === m ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {/* Email / password form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" ? (
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                  required
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                minLength={8}
                required
              />
            </div>

            {error ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs uppercase tracking-widest text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          {/* Google */}
          <Button onClick={handleGoogle} disabled={googleLoading} size="lg" className="w-full" variant="outline">
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52Z"
              />
            </svg>
            Continue with Google
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            By continuing you agree to our{" "}
            <a href="/terms" className="text-primary underline underline-offset-4">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-primary underline underline-offset-4">
              Privacy Policy
            </a>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
