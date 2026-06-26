// Brand assets sourced from the Knight of the Nile design.
// NOTE: these are remote (Lovable CDN). To make them permanent for production,
// download each into /public/brand/ and replace the URL with e.g. "/brand/hero-archer.jpg".
const BASE = "https://nil-knight-championships.lovable.app";

export const assets = {
  logo: `${BASE}/__l5e/assets-v1/4fef2db1-10bb-46ad-9482-982d47c1158d/knight-of-the-nile-logo.jpg`,
  hero: `${BASE}/assets/hero-archer-DxZt46af.jpg`,
  gallery: [
    { src: `${BASE}/assets/gallery-morning-DLYtb1s-.jpg`, ar: "تدريب الفجر", en: "Morning Drill" },
    { src: `${BASE}/assets/gallery-precision-GWYg58jG.jpg`, ar: "الدقة", en: "Precision" },
    { src: `${BASE}/assets/gallery-gear-oGqohwr3.jpg`, ar: "العتاد", en: "Heritage Gear" },
    { src: `${BASE}/assets/gallery-charge-C20X6RHk.jpg`, ar: "الانطلاق", en: "The Charge" },
  ],
} as const;
