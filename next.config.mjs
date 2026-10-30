export default {
  reactStrictMode: true,
  images: { unoptimized: true },
  async headers() {
    return [
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
