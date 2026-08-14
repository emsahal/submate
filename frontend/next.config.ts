import type { NextConfig } from "next";

const backendUrlStr = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001";
let backendUrl: URL;
try {
  backendUrl = new URL(backendUrlStr);
} catch {
  backendUrl = new URL("http://localhost:3001");
}

const securityHeaders = [
  // Prevent MIME-type sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Prevent clickjacking — allow same-origin framing only
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Control referer information sent with requests
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // HSTS — instruct browsers to use HTTPS (1 year, include subdomains)
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  // Restrict powerful browser features the app doesn't need
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: backendUrl.protocol.replace(":", "") as "http" | "https",
        hostname: backendUrl.hostname,
        port: backendUrl.port || undefined,
        pathname: "/**",
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
