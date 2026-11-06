import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy.
// NOTE: script-src includes 'unsafe-inline' because Next.js emits inline
// bootstrap scripts; moving to a nonce-based CSP (set from proxy.ts) would allow
// removing it. 'unsafe-eval' is only added in development (React Refresh).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://js.stripe.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    "https://*.convex.cloud wss://*.convex.cloud https://*.convex.site",
    "https://api.stripe.com https://vitals.vercel-insights.com https://va.vercel-scripts.com",
    isDev ? "ws://localhost:* ws://127.0.0.1:* http://127.0.0.1:* http://localhost:*" : "",
  ]
    .filter(Boolean)
    .join(" "),
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "form-action 'self' https://checkout.stripe.com",
  "base-uri 'self'",
  "object-src 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // NOTE: experimental.inlineCss was measured and rejected — it inlines the whole
  // app stylesheet into every page (doc 24KB → 148KB) and made FCP/LCP worse.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: '/super_admin',
        destination: '/super-admin',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
