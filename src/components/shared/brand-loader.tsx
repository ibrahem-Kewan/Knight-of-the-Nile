import { useTranslations } from "next-intl";
import { assets } from "@/config/assets";

/**
 * Branded loading screen shown by `loading.tsx` while a route is streaming.
 *
 * - Pure CSS (no client JS): renders instantly as the Suspense fallback.
 * - Stays invisible for the first ~350ms (see `.kotn-loader` in globals.css),
 *   so fast navigations never flash it — it only appears when a page is slow.
 * - Works in RTL/LTR, light/dark, and honours `prefers-reduced-motion`.
 * - Animation keyframes live in `src/styles/globals.css` under "Brand loader".
 */
export function BrandLoader() {
  const t = useTranslations("loader");
  const tc = useTranslations("common");

  // 60 dial ticks (every 6°), a longer one every 30° — an archery-target / compass dial.
  const ticks = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="kotn-loader fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-background/90 backdrop-blur-md"
    >
      <span className="sr-only">{tc("loading")}</span>

      {/* Ambient light */}
      <div aria-hidden className="kotn-loader__glow pointer-events-none absolute inset-0" />

      <div aria-hidden className="relative flex flex-col items-center px-6 text-center">
        {/* ── Medallion ─────────────────────────────── */}
        <div className="kotn-loader__stage relative h-44 w-44 sm:h-56 sm:w-56">
          {/* Nile ripples spreading outward */}
          <span className="kotn-loader__ripple" />
          <span className="kotn-loader__ripple" />
          <span className="kotn-loader__ripple" />

          {/* Slow-turning dial */}
          <svg viewBox="0 0 200 200" className="kotn-loader__dial absolute inset-0 h-full w-full text-gold">
            {ticks.map((i) => {
              const major = i % 5 === 0;
              return (
                <line
                  key={i}
                  x1="100"
                  y1={major ? 3 : 5}
                  x2="100"
                  y2={major ? 11 : 8}
                  stroke="currentColor"
                  strokeWidth={major ? 1.4 : 0.8}
                  strokeLinecap="round"
                  opacity={major ? 0.85 : 0.4}
                  transform={`rotate(${i * 6} 100 100)`}
                />
              );
            })}
          </svg>

          {/* Counter-rotating dashed ring */}
          <span className="kotn-loader__dash absolute inset-[9%] rounded-full border border-dashed border-gold/35" />

          {/* Comet arc + its glowing head */}
          <span className="kotn-loader__arc absolute inset-[11%] rounded-full" />
          <span className="kotn-loader__orbit absolute inset-[11%]">
            <span className="kotn-loader__head" />
          </span>

          {/* Emblem disk */}
          <div className="kotn-loader__disk absolute inset-[16%] overflow-hidden rounded-full bg-black ring-1 ring-gold/60">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assets.emblem}
              alt=""
              width={512}
              height={512}
              decoding="async"
              fetchPriority="high"
              className="kotn-loader__emblem h-full w-full object-cover"
            />
            <span className="kotn-loader__shine pointer-events-none absolute inset-0" />
          </div>
        </div>

        {/* ── Wordmark ──────────────────────────────── */}
        <p className="kotn-loader__name mt-7 font-display text-3xl leading-tight sm:text-4xl">
          {tc("appName")}
        </p>

        {/* Symmetric ornament — pinned to LTR so both lines fade outward in either direction */}
        <div className="kotn-loader__rule mt-3 flex items-center gap-2 [direction:ltr]">
          <span className="h-px w-10 bg-gradient-to-r from-transparent to-gold sm:w-14" />
          <span className="h-1.5 w-1.5 rotate-45 bg-gold" />
          <span className="h-px w-10 bg-gradient-to-l from-transparent to-gold sm:w-14" />
        </div>

        <p className="kotn-loader__tagline mt-3 max-w-xs text-xs font-medium tracking-[0.18em] text-muted-foreground sm:text-sm">
          {t("tagline")}
        </p>

        {/* Indeterminate progress */}
        <div className="kotn-loader__track relative mt-6 h-[2px] w-40 overflow-hidden rounded-full bg-gold/15 sm:w-48">
          <span className="kotn-loader__bar absolute inset-y-0 w-1/3 rounded-full" />
        </div>
      </div>
    </div>
  );
}
