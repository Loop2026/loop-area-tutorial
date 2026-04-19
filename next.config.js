/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Bunny.net thumbnails
      { protocol: "https", hostname: "**.b-cdn.net" },
      // Supabase Storage (se useremo bucket pubblici)
      { protocol: "https", hostname: "**.supabase.co" }
    ]
  },
  // Consenti embed Bunny player via iframe
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }
        ]
      }
    ];
  }
};

module.exports = nextConfig;
