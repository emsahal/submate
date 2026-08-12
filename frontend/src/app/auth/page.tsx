"use client";

import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, X } from "lucide-react";
import { signIn, signUp, signInWithGoogle } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";

type Mode = "signin" | "signup";

function DotWaveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf: number;
    let t = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const { width, height } = parent.getBoundingClientRect();
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const { width, height } = parent.getBoundingClientRect();
      ctx.clearRect(0, 0, width, height);

      // Deep forest green to vibrant teal and cyan gradient
      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#0b0f0d");
      bg.addColorStop(0.55, "#0f6e58");
      bg.addColorStop(1, "#14b8a6");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const spacing = 12;
      const cols = Math.ceil(width / spacing);
      const rows = Math.ceil(height / spacing);

      for (let i = 0; i <= cols; i++) {
        for (let j = 0; j <= rows; j++) {
          const x = i * spacing;
          const y = j * spacing;

          const dx = x - width * 0.75;
          const dy = y - height * 0.15;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const wave = Math.sin(dist * 0.045 - t) * 0.5 + 0.5;
          const radius = wave * 1.5;
          if (radius < 0.15) continue;

          const proximity = 1 - Math.min(dist / (width * 0.9), 1);
          const alpha = 0.12 + wave * 0.48 * (0.3 + proximity * 0.7);

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(34, 211, 238, ${alpha.toFixed(3)})`; // Cyan wave points
          ctx.fill();
        }
      }

      t += 0.012;
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />;
}

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

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="flex min-h-[calc(100vh-4rem)] w-full items-center justify-center p-4 sm:p-6 bg-background">
      <div className="flex h-[600px] w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        
        {/* Left Side: Animated Wave Canvas (matching SubMate colors) */}
        <div className="relative hidden w-1/2 md:block overflow-hidden border-r border-border">
          <DotWaveCanvas />
          <div className="relative z-10 flex h-full flex-col justify-between p-10">
            <div className="flex items-center gap-2">
              <Logo />
            </div>
            <div className="space-y-3">
              <h2 className="max-w-[280px] font-heading text-3xl font-extrabold leading-tight text-white">
                Pakistan&apos;s digital subscription portal
              </h2>
              <p className="text-sm text-white/80 max-w-xs leading-relaxed">
                Unlock instant access to Netflix, Spotify, Canva, and more. Simple JazzCash or Easypaisa transfers.
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="relative flex w-full flex-col justify-center px-8 py-8 sm:px-14 md:w-1/2">
          <button
            onClick={() => router.push("/")}
            className="absolute right-5 top-5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          <div className="mx-auto w-full max-w-sm">
            <div className="mb-6">
              <h1 className="text-2xl font-bold font-heading text-foreground">
                {mode === "signin" ? "Welcome back" : "Create account"}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {mode === "signin"
                  ? "Access your dashboard to track subscriptions."
                  : "Sign up to buy and compare digital plans."}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2 text-sm"
                onClick={handleGoogle}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
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
                )}
                Continue with Google
              </Button>
            </div>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs uppercase tracking-widest text-muted-foreground/70">or</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
              {mode === "signup" && (
                <Input
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              )}
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  className="pr-10"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && (
                <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" disabled={loading} className="mt-1 bg-primary text-primary-foreground hover:bg-primary/95">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {mode === "signin" ? "Sign in" : "Create account"}
              </Button>
            </form>

            <div className="mt-5 text-center text-xs">
              {mode === "signin" ? (
                <p className="text-muted-foreground">
                  No account?{" "}
                  <button
                    onClick={() => setMode("signup")}
                    className="text-primary hover:underline font-semibold"
                  >
                    Sign up
                  </button>
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Already have an account?{" "}
                  <button
                    onClick={() => setMode("signin")}
                    className="text-primary hover:underline font-semibold"
                  >
                    Sign in
                  </button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
