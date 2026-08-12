/**
 * env:check — print the status of every environment variable used by Subly.
 * Does not throw; exits non-zero if any required variable is missing.
 */
import "dotenv/config";

type Status = "ok" | "missing" | "weak";

const REQUIRED: [string, number | undefined][] = [
  ["DATABASE_URL", undefined],
  ["AUTH_SECRET", 32],
  ["GOOGLE_CLIENT_ID", undefined],
  ["GOOGLE_CLIENT_SECRET", undefined],
  ["CREDENTIALS_ENCRYPTION_KEY", 32],
];

const OPTIONAL: [string, string][] = [
  ["NVIDIA_API_KEY", "AI payment verification"],
  ["NEON_STORAGE_BUCKET", "payment screenshots"],
  ["AWS_ACCESS_KEY_ID", "object storage"],
  ["AWS_SECRET_ACCESS_KEY", "object storage"],
  ["CRON_SECRET", "scheduled expiry jobs"],
  ["FRONTEND_URL", "defaults to http://localhost:3000"],
  ["BACKEND_URL", "defaults to http://localhost:3001"],
  ["NEXT_PUBLIC_APP_URL", "defaults to http://localhost:3000"],
  ["NEXT_PUBLIC_SUPPORT_EMAIL", "displayed on the site"],
  ["ADMIN_EMAILS", "auto-promoted to ADMIN at sign-up"],
];

function check(name: string, minLength?: number): Status {
  const value = process.env[name]?.trim();
  if (!value) return "missing";
  if (minLength !== undefined && value.length < minLength) return "weak";
  return "ok";
}

const results: { name: string; status: Status; note?: string }[] = REQUIRED.map(([name, min]) => {
  const status = check(name, min);
  const note = status === "weak" ? `too short (min ${min} chars)` : undefined;
  return { name, status, note };
});

const present: Record<string, string> = {};
for (const [name] of OPTIONAL) {
  const value = process.env[name]?.trim();
  if (value) present[name] = value;
}

let failed = 0;
console.log("\n[Subly environment check]\n");
for (const r of results) {
  const icon = r.status === "ok" ? "[ok]     " : r.status === "weak" ? "[weak]   " : "[missing]";
  console.log(`${icon} ${r.name}${r.note ? `  — ${r.note}` : ""}`);
  if (r.status !== "ok") failed++;
}
console.log("");
if (Object.keys(present).length) {
  console.log("Optional variables detected:");
  for (const name of Object.keys(present)) console.log(`  [present] ${name}`);
} else {
  console.log("Optional variables detected: none");
}
console.log("");
console.log(failed ? `✗ ${failed} required variable(s) missing or weak.` : "✓ All required variables are configured.");
process.exit(failed ? 1 : 0);