import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "فارس النيل — Knight of the Nile",
    short_name: "فارس النيل",
    description: "منصة الرماية والرماية من على الخيل والفروسية",
    start_url: "/",
    display: "standalone",
    background_color: "#0E0E0E",
    theme_color: "#C9A227",
    dir: "rtl",
    lang: "ar",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
