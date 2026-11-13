// Brand assets — sourced from the local project files in src/assets/branding
// (bundled by Next at build time; no remote CDN, no /public copy needed).
import logoImg from "@/assets/branding/knight-of-the-nile-logo.jpg";
import horseArcherImg from "@/assets/branding/Knight of the Nile-Image_ortpzmortpzmortp.png";
import galleryMorningImg from "@/assets/branding/gallery-morning-DLYtb1s-.jpg";
import galleryPrecisionImg from "@/assets/branding/gallery-precision-GWYg58jG.jpg";
import galleryGearImg from "@/assets/branding/gallery-gear-oGqohwr3.jpg";
import blackKnightImg from "@/assets/branding/black-knight.jpg";

export const assets = {
  logo: logoImg.src,
  hero: horseArcherImg.src,
  // Captions live in messages/*.json under home.gallery.<key>.
  gallery: [
    { src: galleryMorningImg.src, key: "morning" },
    { src: galleryPrecisionImg.src, key: "precision" },
    { src: galleryGearImg.src, key: "gear" },
    { src: horseArcherImg.src, key: "charge" },
  ],
  // Category cover images (Arabic-themed, real project photos).
  covers: {
    horse: horseArcherImg.src,      // الفروسية / الرماية من على ظهر الخيل
    target: galleryPrecisionImg.src, // الرماية / الرماية الأرضية
    gear: galleryGearImg.src,        // العتاد (لم تعد غلاف الفارس الأسود)
    // الفارس الأسود — شعار مربع بخلفية رملية؛ يُعرض بـ object-contain فوق لون خلفيته
    // (خلفية bg-[#e3d3b1] في الرئيسية و about) حتى لا يُقصّ الفارس أو شريط الاسم.
    blackKnight: blackKnightImg.src,
  },
} as const;
