export function HeroArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 420"
      className={className}
      role="img"
      aria-label="فارس النيل"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1B4965" />
          <stop offset="1" stopColor="#0E0E0E" />
        </linearGradient>
        <radialGradient id="sun" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#E6C75A" />
          <stop offset="0.6" stopColor="#C9A227" />
          <stop offset="1" stopColor="#C9A227" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="sand" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#C9A227" />
          <stop offset="1" stopColor="#8a6f18" />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width="520" height="420" rx="24" fill="url(#sky)" />
      <circle cx="360" cy="150" r="95" fill="url(#sun)" />
      <circle cx="360" cy="150" r="62" fill="#E6C75A" opacity="0.95" />

      <polygon points="70,300 160,150 250,300" fill="#1f1f1f" opacity="0.95" />
      <polygon points="160,150 250,300 205,300 160,205" fill="#000000" opacity="0.25" />
      <polygon points="230,300 300,190 370,300" fill="#161616" opacity="0.95" />
      <polygon points="300,190 370,300 335,300 300,235" fill="#000000" opacity="0.25" />

      <rect x="0" y="300" width="520" height="120" fill="url(#sand)" />
      <g stroke="#1E6091" strokeWidth="4" fill="none" opacity="0.7">
        <path d="M30 350 q 20 -10 40 0 t 40 0 t 40 0 t 40 0" />
        <path d="M250 366 q 20 -10 40 0 t 40 0 t 40 0 t 40 0 t 40 0" />
      </g>

      <g fill="#0E0E0E">
        <path d="M150 300 c -8 -22 6 -40 30 -42 c 18 -2 30 6 46 4 c 18 -2 26 -14 44 -12 c 14 2 20 12 18 24 c -2 10 -10 12 -10 22 l 6 28 l -12 0 l -8 -26 c -16 6 -34 6 -50 2 l 6 24 l -12 0 l -8 -26 c -14 -2 -22 -8 -24 -18 z" />
        <rect x="172" y="300" width="6" height="34" rx="3" />
        <rect x="206" y="300" width="6" height="34" rx="3" />
        <rect x="244" y="300" width="6" height="34" rx="3" />
        <rect x="276" y="300" width="6" height="34" rx="3" />
        <path d="M272 268 c 14 -10 28 -10 34 -2 c 4 6 -2 12 -10 14 l -6 14 l -14 -2 z" />
        <path d="M150 264 c -16 4 -22 18 -18 34 c 6 -10 12 -16 22 -18 z" />
      </g>

      <g fill="#C9A227">
        <circle cx="214" cy="214" r="11" />
        <path d="M214 226 c 12 0 18 10 18 22 l -6 26 l -10 0 l -2 -22 l -2 22 l -10 0 l -6 -26 c 0 -12 6 -22 18 -22 z" />
      </g>
      <g stroke="#E6C75A" strokeWidth="3" fill="none" strokeLinecap="round">
        <path d="M250 196 q 22 24 0 52" />
        <line x1="250" y1="222" x2="196" y2="222" />
      </g>
      <line x1="250" y1="196" x2="250" y2="248" stroke="#E6C75A" strokeWidth="1.5" />
    </svg>
  );
}
