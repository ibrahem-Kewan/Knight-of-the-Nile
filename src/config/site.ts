export const siteConfig = {
  name: "فارس النيل",
  nameEn: "Knight of the Nile",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  description: "منصة الرماية والرماية من على الخيل والفروسية",
  sports: ["archery", "horseback_archery", "equestrian"] as const,
  defaultCurrency: "EGP",
  social: {
    instagram: "",
    facebook: "",
  },
};

export type SiteConfig = typeof siteConfig;
