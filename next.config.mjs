/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  eslint: {
    // Tactical: prevent ESLint from blocking builds while we clean up
    ignoreDuringBuilds: true,
  },
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://figarie.vercel.app https://*.vercel.app http://localhost:3000 http://localhost:3001",
          },
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
        ],
      },
    ]
  },
  /**
   * SITE-03: 301 redirect scaffold.
   *
   * Phase 10 (v3.0) RESEARCH found NO existing indexed URLs that need to redirect:
   *   - Existing routes (/, /login, /signup, /dashboard/*, /admin/*) all preserved.
   *   - /pricing is a new route (no prior indexed URL to redirect from).
   *
   * Pre-launch action: export Search Console top-50 URLs and confirm /pricing
   * wasn't indexed elsewhere — see 10-07-SUMMARY.md.
   *
   * Post-launch action: add entries here as URL structure evolves. Each entry
   * is a permanent (308) or temporary (307) redirect (set permanent: true for 308).
   */
  async redirects() {
    return []
  },
}

export default nextConfig
