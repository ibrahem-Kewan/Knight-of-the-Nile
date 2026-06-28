import { assets } from "@/config/assets";

const BLUE = "#2E47A0";
const GOLD = "#E3B505";
const NAVY = "#16205C";
const GRAY = "#D7D7D7";

export function TargetTabla60({ className }: { className?: string }) {
  const cx = 200, cy = 200;
  const spokes = Array.from({ length: 10 }, (_, k) => (k * 360) / 10);
  const ticks = Array.from({ length: 10 }, (_, k) => (k * 360) / 10 + 18);
  const rad = (a: number) => (a * Math.PI) / 180;
  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-label="Target Tabla 60x60">
      <circle cx={cx} cy={cy} r="196" fill={GOLD} />
      <circle cx={cx} cy={cy} r="182" fill={BLUE} />
      {/* radial gold spokes */}
      {spokes.map((a) => (
        <line key={a} x1={cx} y1={cy}
          x2={cx + 182 * Math.cos(rad(a))} y2={cy + 182 * Math.sin(rad(a))}
          stroke={GOLD} strokeWidth="6" />
      ))}
      {/* outer tick marks */}
      {ticks.map((a) => (
        <line key={a}
          x1={cx + 150 * Math.cos(rad(a))} y1={cy + 150 * Math.sin(rad(a))}
          x2={cx + 178 * Math.cos(rad(a))} y2={cy + 178 * Math.sin(rad(a))}
          stroke={GOLD} strokeWidth="8" strokeLinecap="round" />
      ))}
      {/* mid gold ring + gray inner band */}
      <circle cx={cx} cy={cy} r="118" fill="none" stroke={GOLD} strokeWidth="7" />
      <circle cx={cx} cy={cy} r="112" fill={GRAY} />
      {/* numbers */}
      <text x="262" y="206" fill={GOLD} fontSize="16" fontWeight="700">4</text>
      <text x="330" y="206" fill={GOLD} fontSize="16" fontWeight="700">2</text>
      {/* center */}
      <circle cx={cx} cy={cy} r="64" fill={NAVY} />
      <circle cx={cx} cy={cy} r="52" fill="#fff" />
      <clipPath id="ctr60"><circle cx={cx} cy={cy} r="50" /></clipPath>
      <image href={assets.logo} x="150" y="150" width="100" height="100" clipPath="url(#ctr60)" preserveAspectRatio="xMidYMid slice" />
    </svg>
  );
}

export function TargetFace80({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-label="Target face 80x80">
      <rect x="8" y="8" width="384" height="384" fill="#E2231A" />
      <rect x="58" y="58" width="284" height="284" fill="#1FA64A" />
      <rect x="108" y="108" width="184" height="184" fill="#111111" />
      <rect x="150" y="150" width="100" height="100" fill="#FFE500" />
      <rect x="176" y="176" width="48" height="48" fill="#fff" />
      <clipPath id="ctr80"><rect x="178" y="178" width="44" height="44" /></clipPath>
      <image href={assets.logo} x="178" y="178" width="44" height="44" clipPath="url(#ctr80)" preserveAspectRatio="xMidYMid slice" />
    </svg>
  );
}
