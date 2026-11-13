import { BrandLoader } from "@/components/shared/brand-loader";

// Own boundary for the dashboards so the sidebar layout is kept (not re-rendered)
// while moving between dashboard pages; the loader overlays it only if the page is slow.
export default function Loading() {
  return <BrandLoader />;
}
