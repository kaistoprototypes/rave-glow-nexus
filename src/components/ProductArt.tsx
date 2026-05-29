type Props = {
  palette: string[];
  name: string;
  className?: string;
  style?: string;
};

// Generates a deterministic SVG product visual from the color palette + name.
// Different design styles render different patterns.
export function ProductArt({ palette, name, className, style }: Props) {
  const [c1 = "#39FF14", c2 = "#00E5FF", c3 = "#FF00C8"] = palette;
  const seed = Math.abs(hash(name));
  const variant = seed % 6;
  const id = `pa-${seed}`;

  return (
    <svg viewBox="0 0 400 400" className={className} preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={c1} stopOpacity="0.18" />
          <stop offset="100%" stopColor={c3} stopOpacity="0.35" />
        </linearGradient>
        <radialGradient id={`${id}-glow`}>
          <stop offset="0%" stopColor={c2} stopOpacity="0.6" />
          <stop offset="100%" stopColor={c2} stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-blur`}><feGaussianBlur stdDeviation="14" /></filter>
      </defs>
      <rect width="400" height="400" fill="#06120A" />
      <rect width="400" height="400" fill={`url(#${id}-bg)`} />
      <circle cx={80 + (seed % 240)} cy={80 + ((seed >> 3) % 240)} r="120" fill={`url(#${id}-glow)`} filter={`url(#${id}-blur)`} />
      {variant === 0 && <Geo c1={c1} c2={c2} c3={c3} seed={seed} />}
      {variant === 1 && <Waves c1={c1} c2={c2} c3={c3} seed={seed} />}
      {variant === 2 && <Grid c1={c1} c2={c2} c3={c3} />}
      {variant === 3 && <Orbit c1={c1} c2={c2} c3={c3} seed={seed} />}
      {variant === 4 && <Tribal c1={c1} c2={c2} c3={c3} seed={seed} />}
      {variant === 5 && <Splatter c1={c1} c2={c2} c3={c3} seed={seed} />}
      <text x="200" y="370" textAnchor="middle" fill={c1} fillOpacity="0.55" fontFamily="monospace" fontSize="14" letterSpacing="6">
        {(style || "neon").toUpperCase().slice(0, 18)}
      </text>
    </svg>
  );
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function Geo({ c1, c2, c3, seed }: { c1: string; c2: string; c3: string; seed: number }) {
  return (
    <g>
      {Array.from({ length: 6 }).map((_, i) => (
        <polygon
          key={i}
          points="200,40 360,200 200,360 40,200"
          fill="none"
          stroke={i % 2 ? c1 : c3}
          strokeOpacity={0.4 - i * 0.05}
          strokeWidth={2}
          transform={`rotate(${(seed + i * 12) % 90} 200 200) scale(${1 - i * 0.1})`}
          style={{ transformOrigin: "center" }}
        />
      ))}
      <circle cx="200" cy="200" r="60" fill="none" stroke={c2} strokeWidth="2" />
      <circle cx="200" cy="200" r="80" fill="none" stroke={c1} strokeWidth="1" strokeDasharray="4 6" />
    </g>
  );
}
function Waves({ c1, c2, c3, seed }: { c1: string; c2: string; c3: string; seed: number }) {
  return (
    <g opacity="0.85">
      {Array.from({ length: 8 }).map((_, i) => (
        <path
          key={i}
          d={`M0 ${80 + i * 40} Q 100 ${40 + ((seed + i * 17) % 100)} 200 ${80 + i * 40} T 400 ${80 + i * 40}`}
          stroke={i % 3 === 0 ? c1 : i % 3 === 1 ? c2 : c3}
          strokeWidth="2"
          fill="none"
          opacity={0.7 - i * 0.06}
        />
      ))}
    </g>
  );
}
function Grid({ c1, c2 }: { c1: string; c2: string; c3: string }) {
  return (
    <g opacity="0.7">
      {Array.from({ length: 12 }).map((_, i) => (
        <line key={`v${i}`} x1={i * 33} y1="200" x2={i * 33 - 100} y2="400" stroke={c1} strokeWidth="1" />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <line key={`h${i}`} x1="0" y1={200 + i * 30} x2="400" y2={200 + i * 30} stroke={c2} strokeOpacity={1 - i * 0.1} strokeWidth="1" />
      ))}
    </g>
  );
}
function Orbit({ c1, c2, c3, seed }: { c1: string; c2: string; c3: string; seed: number }) {
  return (
    <g>
      {Array.from({ length: 5 }).map((_, i) => (
        <ellipse key={i} cx="200" cy="200" rx={60 + i * 30} ry={20 + i * 12} fill="none"
          stroke={[c1, c2, c3][i % 3]} strokeOpacity={0.6} strokeWidth="1.5"
          transform={`rotate(${(seed + i * 30) % 180} 200 200)`} />
      ))}
      <circle cx="200" cy="200" r="20" fill={c1} />
    </g>
  );
}
function Tribal({ c1, c2, c3, seed }: { c1: string; c2: string; c3: string; seed: number }) {
  return (
    <g>
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i / 12) * Math.PI * 2 + (seed % 360) / 360;
        const x = 200 + Math.cos(a) * 120;
        const y = 200 + Math.sin(a) * 120;
        return <line key={i} x1="200" y1="200" x2={x} y2={y} stroke={i % 2 ? c1 : c3} strokeWidth="3" strokeLinecap="round" />;
      })}
      <circle cx="200" cy="200" r="40" fill={c2} fillOpacity="0.2" stroke={c2} />
    </g>
  );
}
function Splatter({ c1, c2, c3, seed }: { c1: string; c2: string; c3: string; seed: number }) {
  return (
    <g>
      {Array.from({ length: 20 }).map((_, i) => {
        const r = 4 + ((seed + i * 7) % 30);
        const x = (seed * 13 + i * 41) % 400;
        const y = (seed * 7 + i * 67) % 400;
        return <circle key={i} cx={x} cy={y} r={r} fill={[c1, c2, c3][i % 3]} fillOpacity={0.5} />;
      })}
    </g>
  );
}
