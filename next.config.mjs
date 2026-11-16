export default {
  reactStrictMode: true,
  experimental: { optimizeCss: true },
  images: { unoptimized: true },
  async headers() {
    return [
      {
        source: "/index.md",
        headers: [
          { key: "Content-Type", value: "text/markdown; charset=utf-8" },
        ],
      },
      {
        source: "/pdf.worker-:version.js",
        headers: [
          { key: "Content-Type", value: "text/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/api/contact.php",
        destination: "/api/contact",
        permanent: false,
      },
    ];
  },
};
