import createNextIntlPlugin from "next-intl/plugin";
import withSerwistInit from "@serwist/next";

const withNextIntl = createNextIntlPlugin("./src/lib/i18n/request.ts");

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "nil-knight-championships.lovable.app" },
      { protocol: "https", hostname: "pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev" },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default withSerwist(withNextIntl(nextConfig));
