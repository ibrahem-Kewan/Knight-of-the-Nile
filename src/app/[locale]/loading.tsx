import { BrandLoader } from "@/components/shared/brand-loader";

// Route-level Suspense fallback for every page under [locale] (public, auth, profile, checkout).
// The loader stays invisible for ~350ms, so it only appears when a page is actually slow.
export default function Loading() {
  return <BrandLoader />;
}
