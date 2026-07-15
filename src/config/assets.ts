// Brand assets — sourced from the local project files in src/assets/branding
// (bundled by Next at build time; no remote CDN, no /public copy needed).
import logoImg from "@/assets/branding/knight-of-the-nile-logo.jpg";
import horseArcherImg from "@/assets/branding/Knight of the Nile-Image_ortpzmortpzmortp.png";
import galleryMorningImg from "@/assets/branding/gallery-morning-DLYtb1s-.jpg";
import galleryPrecisionImg from "@/assets/branding/gallery-precision-GWYg58jG.jpg";
import galleryGearImg from "@/assets/branding/gallery-gear-oGqohwr3.jpg";

export const assets = {
  logo: logoImg.src,
  hero: horseArcherImg.src,
  gallery: [
    { src: galleryMorningImg.src, ar: "تدريب الفجر", en: "Morning Drill" },
    { src: galleryPrecisionImg.src, ar: "الدقة", en: "Precision" },
    { src: galleryGearImg.src, ar: "العتاد", en: "Heritage Gear" },
    { src: horseArcherImg.src, ar: "الانطلاق", en: "The Charge" },
  ],
  // Category cover images (Arabic-themed, real project photos).
  covers: {
    horse: horseArcherImg.src,      // الفروسية / الرماية من على ظهر الخيل
    target: galleryPrecisionImg.src, // الرماية / الرماية الأرضية
    gear: galleryGearImg.src,        // الفارس الأسود
  },
} as const;
