import { createRequire } from "node:module";

const { version: heifVersion } = createRequire(import.meta.url)(
  "libheif-js/package.json",
);

export default {
  env: { NEXT_PUBLIC_HEIF_VERSION: heifVersion },
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
