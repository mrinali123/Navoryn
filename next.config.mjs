import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  fallbacks: { document: "/offline" },
});

// Content-Security-Policy
// script-src includes 'unsafe-inline' and 'unsafe-eval' because Next.js 14
// requires them for hydration scripts. A nonce-based CSP would be stricter
// but requires middleware integration outside the scope of this config.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://images.unsplash.com https://*.tile.openstreetmap.org",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.open-meteo.com https://nominatim.openstreetmap.org https://photon.komoot.io https://router.project-osrm.org",
  "font-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Prevent MIME-type sniffing
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Prevent clickjacking via iframe embedding
          { key: "X-Frame-Options", value: "DENY" },
          // Disable legacy XSS auditor (modern browsers use CSP instead)
          { key: "X-XSS-Protection", value: "0" },
          // Limit referrer information sent to third parties
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Restrict access to sensitive browser features
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          // Content Security Policy
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
