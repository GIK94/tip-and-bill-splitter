/** Built-in hero illustration: friends' plates around a table with the bill and a tip badge. */
export function HeroIllustration() {
  return (
    <svg viewBox="0 0 480 400" role="img" aria-labelledby="hero-art-title" className="hero-illustration">
      <title id="hero-art-title">Friends sharing a meal with the bill split between them</title>
      <ellipse cx="240" cy="210" rx="210" ry="150" fill="#ccebe6" />
      <ellipse cx="240" cy="200" rx="185" ry="128" fill="#fff" stroke="#0f766e" strokeWidth="3" />

      {/* plates */}
      {[
        [120, 130],
        [360, 130],
        [110, 270],
        [370, 270],
      ].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="42" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="3" />
          <circle cx={x} cy={y} r="28" fill={['#fde68a', '#fecaca', '#bbf7d0', '#fed7aa'][i]} />
          <circle cx={x - 8} cy={y - 6} r="7" fill={['#f59e0b', '#ef4444', '#22c55e', '#f97316'][i]} opacity="0.8" />
          <circle cx={x + 9} cy={y + 5} r="5" fill={['#f59e0b', '#ef4444', '#22c55e', '#f97316'][i]} opacity="0.6" />
        </g>
      ))}

      {/* receipt */}
      <g transform="rotate(-6 240 205)">
        <path d="M190 120h100v160l-12.5-9-12.5 9-12.5-9-12.5 9-12.5-9-12.5 9-12.5-9-12.5 9z" fill="#fff" stroke="#0f766e" strokeWidth="3" strokeLinejoin="round" />
        <rect x="205" y="138" width="70" height="8" rx="4" fill="#0f766e" />
        {[160, 176, 192, 208].map((y) => (
          <g key={y}>
            <rect x="205" y={y} width="38" height="6" rx="3" fill="#94a3b8" />
            <rect x="255" y={y} width="20" height="6" rx="3" fill="#94a3b8" />
          </g>
        ))}
        <rect x="205" y="232" width="70" height="3" rx="1.5" fill="#cbd5e1" />
        <rect x="205" y="244" width="30" height="8" rx="4" fill="#0f766e" />
        <rect x="249" y="244" width="26" height="8" rx="4" fill="#0f766e" />
      </g>

      {/* tip badge */}
      <circle cx="318" cy="108" r="30" fill="#f59e0b" />
      <text x="318" y="117" textAnchor="middle" fontSize="26" fontWeight="700" fill="#fff" fontFamily="system-ui, sans-serif">
        %
      </text>

      {/* coins */}
      <g>
        <ellipse cx="170" cy="330" rx="22" ry="9" fill="#d97706" />
        <ellipse cx="170" cy="322" rx="22" ry="9" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
        <ellipse cx="200" cy="340" rx="22" ry="9" fill="#d97706" />
        <ellipse cx="200" cy="332" rx="22" ry="9" fill="#fbbf24" stroke="#d97706" strokeWidth="2" />
      </g>

      {/* split arrows */}
      <path d="M300 300c30 10 50 30 58 52" stroke="#0f766e" strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="6 8" />
      <path d="M352 346l6 8 5-10" stroke="#0f766e" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
