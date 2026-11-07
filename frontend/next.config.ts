import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

function origin(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

// The browser talks to exactly three things: this site, the FastAPI
// backend, and Supabase Auth. Everything else is refused.
const connectSrc = [
  "'self'",
  origin(process.env.NEXT_PUBLIC_API_BASE_URL),
  origin(process.env.NEXT_PUBLIC_SUPABASE_URL),
  // Next's dev server hot-reload socket.
  ...(isDev ? ["ws:", "http://localhost:*", "http://127.0.0.1:*"] : []),
].filter(Boolean);

const contentSecurityPolicy = [
  "default-src 'self'",
  // 'unsafe-inline' is required by Next's inline hydration scripts unless
  // every page is rendered dynamically with a nonce, which would defeat
  // the ISR caching this app depends on for fast loads. 'unsafe-eval' is
  // dev-only (React Refresh).
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Supabase: 2-minute signed URLs for certificate previews on /admin.
  `img-src 'self' data: blob: https://tile.openstreetmap.org https://*.tile.openstreetmap.org ${origin(process.env.NEXT_PUBLIC_SUPABASE_URL) ?? ""}`.trim(),
  "font-src 'self'",
  "worker-src 'self'",
  "manifest-src 'self'",
  `connect-src ${connectSrc.join(" ")}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // geolocation: "Près de moi" (computed on the device). microphone:
    // voice search. Both prompt the user and stay first-party only.
    value: "camera=(), microphone=(self), payment=(), usb=(), geolocation=(self)",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Lets a verification build go to another folder (NEXT_DIST_DIR) so it
  // never clobbers the .next of a running `npm run dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
