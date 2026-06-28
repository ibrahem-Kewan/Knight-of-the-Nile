"use client";

import { useEffect, useState } from "react";
import { assets } from "@/config/assets";

export function AuthSlideshow() {
  const slides = assets.gallery;
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((p) => (p + 1) % slides.length), 4000);
    return () => clearInterval(id);
  }, [slides.length]);

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl ring-1 ring-gold/30">
      {slides.map((s, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={s.src}
          src={s.src}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${idx === i ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
      <div className="absolute bottom-4 start-0 end-0 flex justify-center gap-2">
        {slides.map((s, idx) => (
          <span
            key={s.src}
            className={`h-1.5 rounded-full transition-all ${idx === i ? "w-6 bg-gold" : "w-1.5 bg-sand/50"}`}
          />
        ))}
      </div>
    </div>
  );
}
