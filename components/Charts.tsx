"use client";

// Valkea — bağımlılıksız (saf SVG) grafik bileşenleri. Teal #2da3c7 / amber #e8a33d.

function money(v: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(v || 0);
}
function shortMoney(v: number) {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${(v / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}M`;
  if (a >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(Math.round(v));
}

/* ── Net Trend — alan + çizgi (negatif destekli) ── */
export function NetTrend({
  points,
  height = 150,
}: {
  points: { label: string; net: number }[];
  height?: number;
}) {
  const W = 320;
  const padX = 12, padTop = 18, padBottom = 26;
  const innerH = height - padTop - padBottom;
  const vals = points.map((p) => p.net);
  const max = Math.max(...vals, 0);
  const min = Math.min(...vals, 0);
  const span = max - min || 1;
  const stepX = points.length > 1 ? (W - padX * 2) / (points.length - 1) : 0;
  const x = (i: number) => padX + i * stepX;
  const y = (v: number) => padTop + (1 - (v - min) / span) * innerH;
  const yZero = y(0);

  const linePts = points.map((p, i) => `${x(i)},${y(p.net)}`).join(" ");
  const areaPath =
    `M ${x(0)},${yZero} ` +
    points.map((p, i) => `L ${x(i)},${y(p.net)}`).join(" ") +
    ` L ${x(points.length - 1)},${yZero} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="netTrendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2da3c7" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#2da3c7" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* sıfır çizgisi */}
      <line x1={padX} y1={yZero} x2={W - padX} y2={yZero} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
      <path d={areaPath} fill="url(#netTrendFill)" />
      <polyline points={linePts} fill="none" stroke="#2da3c7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => {
        const isLast = i === points.length - 1;
        return (
          <g key={i}>
            <circle cx={x(i)} cy={y(p.net)} r={isLast ? 4 : 3} fill={isLast ? "#e8a33d" : "#2da3c7"} stroke="#fff" strokeWidth="1.5" />
            <text x={x(i)} y={height - 14} textAnchor="middle" fontSize="9" fontWeight="700" fill="#94a3b8">{p.label}</text>
            <text x={x(i)} y={height - 3} textAnchor="middle" fontSize="8.5" fontWeight="800" fill={p.net >= 0 ? "#0f766e" : "#dc2626"}>{shortMoney(p.net)}</text>
          </g>
        );
      })}
    </svg>
  );
}

/* ── Donut — kategori dağılımı (saf SVG, ortada toplam) ── */
export function Donut({
  data,
  size = 150,
  centerLabel,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  centerLabel?: string;
}) {
  const total = data.reduce((t, d) => t + d.value, 0);
  const r = size * 0.38;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  const sw = size * 0.15;
  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${cx} ${cy})`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#eef1f6" strokeWidth={sw} />
        {total > 0 && data.map((d, i) => {
          const len = (d.value / total) * circ;
          const seg = (
            <circle
              key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={d.color} strokeWidth={sw}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
            />
          );
          offset += len;
          return seg;
        })}
      </g>
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize={size * 0.16} fontWeight="800" fill="#0f172a">{data.length}</text>
      <text x={cx} y={cy + size * 0.12} textAnchor="middle" fontSize={size * 0.075} fontWeight="700" fill="#94a3b8">
        {centerLabel || "kategori"}
      </text>
    </svg>
  );
}

export { money as fmtMoney };
