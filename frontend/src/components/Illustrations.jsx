const INK = "#2D2D2D";

/*
 * Signature editorial illustration language for FounDesk:
 * bone/cream clay fills + thin ink line-art + warm terracotta/sage accents.
 * Every component is a self-contained SVG (unique gradient ids).
 */

/* ── Hero: command-desk scene ───────────────────────────────── */
export function DeskScene({ style }) {
  return (
    <svg viewBox="0 0 760 620" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <defs>
        <linearGradient id="ds-board" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFDF9" />
          <stop offset="1" stopColor="#EDE3D2" />
        </linearGradient>
        <linearGradient id="ds-boardline" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F4EEE3" />
          <stop offset="1" stopColor="#E0D5C4" />
        </linearGradient>
        <linearGradient id="ds-amber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F2B879" />
          <stop offset="1" stopColor="#D6824F" />
        </linearGradient>
        <linearGradient id="ds-sage" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B9C4AF" />
          <stop offset="1" stopColor="#7E8E7B" />
        </linearGradient>
        <pattern id="ds-dots" width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="2.5" cy="2.5" r="1.5" fill={INK} fillOpacity="0.07" />
        </pattern>
        <filter id="ds-shadow" x="-20%" y="-20%" width="150%" height="170%">
          <feDropShadow dx="0" dy="18" stdDeviation="22" floodColor={INK} floodOpacity="0.16" />
        </filter>
      </defs>

      <rect width="760" height="620" rx="52" fill="url(#ds-dots)" />
      <rect width="760" height="620" rx="52" fill="#F7F1E7" fillOpacity="0.9" />

      {/* warm organic blob — top right */}
      <path
        d="M560 34 C 650 12 760 62 744 150 C 730 234 652 248 594 200 C 552 165 576 86 560 34 Z"
        fill="url(#ds-amber)"
        fillOpacity="0.92"
      />
      {/* mossy blob — bottom left */}
      <path
        d="M-30 470 C 40 392 176 384 204 452 C 230 516 150 596 40 596 C -20 596 -70 530 -30 470 Z"
        fill="url(#ds-sage)"
        fillOpacity="0.55"
      />

      {/* orbit ring */}
      <circle cx="150" cy="158" r="118" stroke={INK} strokeOpacity="0.5" strokeWidth="2" strokeDasharray="3 10" strokeLinecap="round" />
      <circle cx="150" cy="158" r="30" fill={INK} />
      <circle cx="150" cy="158" r="30" fill="url(#ds-amber)" fillOpacity="0.0" />
      <circle cx="80" cy="92" r="9" fill="url(#ds-amber)" />
      <circle cx="233" cy="120" r="7" fill="#8C8C8C" fillOpacity="0.6" />
      <circle cx="106" cy="258" r="6" fill="url(#ds-sage)" />

      {/* shadow layer for main board */}
      <rect x="162" y="202" width="352" height="304" rx="32" fill={INK} fillOpacity="0.12" transform="rotate(-2.6 338 354)" />

      {/* main board */}
      <g filter="url(#ds-shadow)">
        <rect x="148" y="182" width="352" height="304" rx="32" fill="url(#ds-board)" stroke={INK} strokeOpacity="0.1" transform="rotate(-2.6 324 334)" />
      </g>
      <g transform="rotate(-2.6 324 334)">
        {/* header pill + date chip */}
        <rect x="180" y="212" width="132" height="32" rx="16" fill="url(#ds-amber)" />
        <text x="246" y="233" fontFamily="Manrope, sans-serif" fontSize="13" fontWeight="700" fill={INK} textAnchor="middle" letterSpacing="0.08em">
          TODAY'S BRIEF
        </text>
        <rect x="356" y="212" width="100" height="32" rx="16" fill="#EDE4D4" stroke={INK} strokeOpacity="0.18" />
        <text x="406" y="233" fontFamily="Manrope, sans-serif" fontSize="12.5" fontWeight="700" fill={INK} textAnchor="middle">
          AUG 16
        </text>

        {/* rule */}
        <line x1="182" y1="272" x2="466" y2="272" stroke={INK} strokeOpacity="0.12" />

        {/* list rows */}
        {[
          { y: 306, w: 178, hot: true, done: true },
          { y: 342, w: 150, hot: false, done: true },
          { y: 378, w: 162, hot: false, done: false },
        ].map((row) => (
          <g key={row.y}>
            <circle cx="202" cy={row.y + 5} r={row.hot ? 7 : 5} fill={row.hot ? "url(#ds-amber)" : INK} fillOpacity={row.hot ? 1 : 0.35} />
            {row.done && (
              <line x1={202 - 3.4} y1={row.y + 5} x2={202 + 3.4} y2={row.y + 5} stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
            )}
            <rect x="226" y={row.y - 2} width={row.w} height="7" rx="3.5" fill={INK} fillOpacity="0.55" />
            <rect x="226" y={row.y + 12} width={row.w * 0.62} height="6" rx="3" fill={INK} fillOpacity="0.22" />
            <circle cx="446" cy={row.y + 5} r="10" fill="#EFE6D6" stroke={INK} strokeOpacity="0.18" />
            <line x1={442} y1={row.y + 5} x2={450} y2={row.y + 5} stroke={INK} strokeOpacity="0.45" strokeLinecap="round" />
          </g>
        ))}

        {/* footer chips */}
        <rect x="180" y="418" width="126" height="36" rx="18" fill="#F4EDE1" stroke={INK} strokeOpacity="0.2" />
        <text x="243" y="441" fontFamily="Manrope, sans-serif" fontSize="13" fontWeight="700" fill={INK} textAnchor="middle">
          13 done · 2 left
        </text>
        <circle cx="448" cy="436" r="21" fill="#EDE4D4" stroke={INK} strokeOpacity="0.2" />
        <path d="M444 428 L448 433 L454 426" stroke={INK} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>

      {/* calendar card */}
      <g transform="rotate(5 560 170)" filter="url(#ds-shadow)">
        <rect x="466" y="120" width="176" height="188" rx="26" fill="url(#ds-boardline)" stroke={INK} strokeOpacity="0.12" />
      </g>
      <g transform="rotate(5 560 170)">
        <rect x="492" y="142" width="124" height="20" rx="10" fill="url(#ds-sage)" fillOpacity="0.85" />
        <rect x="492" y="142" width="124" height="20" rx="10" fill="#FFFFFF" fillOpacity="0" />
        <text x="554" y="157" fontFamily="Manrope, sans-serif" fontSize="11.5" fontWeight="700" fill={INK} textAnchor="middle" letterSpacing="0.1em">
          AUGUST
        </text>
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3].map((c) => (
            <rect key={`${r}-${c}`} x={492 + c * 33} y={176 + r * 30} width="27" height="24" rx="9" fill="#EFE7D9" stroke={INK} strokeOpacity="0.1" />
          ))
        )}
        <rect x={492 + 2 * 33} y={176 + 1 * 30} width="27" height="24" rx="9" fill="url(#ds-amber)" />
        <text x={492 + 2 * 33 + 13.5} y={176 + 1 * 30 + 16.5} fontFamily="Manrope, sans-serif" fontSize="12" fontWeight="700" fill="#FFFFFF" textAnchor="middle">
          12
        </text>
        <circle cx="566" cy="176" r="9" fill="#E7DBC7" />
      </g>

      {/* coffee cup */}
      <g transform="rotate(-4 120 540)">
        <rect x="82" y="478" width="64" height="48" rx="14" fill="#FFFFFF" stroke={INK} strokeOpacity="0.35" strokeWidth="2.4" />
        <path d="M146 490 h18 a12 12 0 0 1 0 24 h-18" stroke={INK} strokeOpacity="0.35" strokeWidth="2.4" fill="none" />
        <path d="M114 468 q-6 -10 0 -20 q8 10 0 20" stroke="#D6824F" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <rect x="92" y="492" width="44" height="10" rx="5" fill="url(#ds-amber)" />
      </g>

      {/* sparkles */}
      {[
        [90, 80],
        [250, 60],
        [330, 550],
        [600, 460],
        [706, 240],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} stroke={INK} strokeOpacity="0.5" strokeWidth="2.6" strokeLinecap="round">
          <line x1={x - 8} y1={y} x2={x + 8} y2={y} />
          <line x1={x} y1={y - 8} x2={x} y2={y + 8} />
        </g>
      ))}
    </svg>
  );
}

/* ── Mini calendar illustration (strip card) ───────────────── */
export function MiniCalendar({ style }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <defs>
        <linearGradient id="mc-board" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFDF9" />
          <stop offset="1" stopColor="#EFE5D4" />
        </linearGradient>
        <linearGradient id="mc-amber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F2B879" />
          <stop offset="1" stopColor="#D6824F" />
        </linearGradient>
      </defs>
      <circle cx="40" cy="40" r="26" fill="url(#mc-amber)" fillOpacity="0.5" />
      <rect x="42" y="34" width="132" height="128" rx="24" fill="url(#mc-board)" stroke={INK} strokeOpacity="0.12" />
      <rect x="58" y="50" width="54" height="14" rx="7" fill="url(#mc-amber)" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <rect key={`${r}-${c}`} x={58 + c * 34} y={76 + r * 28} width="28" height="20" rx="8" fill="#EAE0CE" stroke={INK} strokeOpacity="0.1" />
        ))
      )}
      <rect x={58 + 2 * 34} y={76 + 2 * 28} width="28" height="20" rx="8" fill={INK} />
      <circle cx="172" cy="80" r="8" fill="#8C8C8C" fillOpacity="0.55" />
      <circle cx="172" cy="104" r="8" fill="#8C8C8C" fillOpacity="0.3" />
    </svg>
  );
}

/* ── Mini mail illustration (strip card) ───────────────────── */
export function MiniMail({ style }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <defs>
        <linearGradient id="mm-sage" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B9C4AF" />
          <stop offset="1" stopColor="#7E8E7B" />
        </linearGradient>
        <linearGradient id="mm-env" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFDF9" />
          <stop offset="1" stopColor="#EDE3D2" />
        </linearGradient>
      </defs>
      <circle cx="160" cy="56" r="30" fill="url(#mm-sage)" fillOpacity="0.6" />
      <g transform="rotate(-5 100 104)">
        <rect x="40" y="66" width="132" height="84" rx="16" fill="url(#mm-env)" stroke={INK} strokeOpacity="0.18" />
        <path d="M40 82 L106 122 L172 82" stroke={INK} strokeOpacity="0.4" strokeWidth="2" fill="none" />
        <rect x="56" y="116" width="44" height="16" rx="8" fill={INK} fillOpacity="0.75" />
        <rect x="122" y="116" width="30" height="16" rx="8" fill="#E7DBC7" stroke={INK} strokeOpacity="0.15" />
      </g>
      {[
        [70, 50],
        [150, 150],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} stroke={INK} strokeOpacity="0.45" strokeWidth="2.6" strokeLinecap="round">
          <line x1={x - 7} y1={y} x2={x + 7} y2={y} />
          <line x1={x} y1={y - 7} x2={x} y2={y + 7} />
        </g>
      ))}
    </svg>
  );
}

/* ── Mini crm illustration (strip card) ────────────────────── */
export function MiniCrm({ style }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <defs>
        <linearGradient id="mr-amber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F2B879" />
          <stop offset="1" stopColor="#D6824F" />
        </linearGradient>
      </defs>
      <circle cx="52" cy="150" r="34" fill="url(#mr-amber)" fillOpacity="0.5" />
      {[
        { cx: 62, cy: 66, r: 26, fill: "#FFFFFF", stroke: INK },
        { cx: 140, cy: 96, r: 26, fill: "url(#mr-amber)", stroke: INK },
        { cx: 108, cy: 148, r: 26, fill: "url(#mc-board)", stroke: INK },
      ].map((n) => (
        <circle key={n.cx} cx={n.cx} cy={n.cy} r={n.r} fill="#F0E7D7" fillOpacity={0.35} stroke={INK} strokeOpacity="0.14" />
      ))}
      <line x1="88" y1="66" x2="114" y2="96" stroke={INK} strokeOpacity="0.35" strokeWidth="2" strokeDasharray="3 5" />
      <line x1="132" y1="112" x2="116" y2="128" stroke={INK} strokeOpacity="0.35" strokeWidth="2" strokeDasharray="3 5" />
      <circle cx="62" cy="66" r="8" fill={INK} />
      <circle cx="140" cy="96" r="8" fill={INK} fillOpacity="0.8" />
      <circle cx="108" cy="148" r="8" fill={"url(#mr-amber)"} />
      <path d="M150 40 q0 0 0 0" stroke={INK} strokeWidth="2" />
    </svg>
  );
}

/* ── Manifesto: interlocking rings ─────────────────────────── */
export function Rings({ style }) {
  return (
    <svg viewBox="0 0 480 480" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <defs>
        <linearGradient id="rl-amber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F2B879" />
          <stop offset="1" stopColor="#D6824F" />
        </linearGradient>
        <linearGradient id="rl-sage" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B9C4AF" />
          <stop offset="1" stopColor="#7E8E7B" />
        </linearGradient>
      </defs>
      <circle cx="240" cy="240" r="206" stroke={INK} strokeOpacity="0.06" strokeWidth="2" fill="none" />
      <circle cx="240" cy="240" r="168" stroke={INK} strokeOpacity="0.06" strokeWidth="2" fill="none" />
      <circle cx="176" cy="232" r="66" fill="#F2E9D9" stroke={INK} strokeOpacity="0.16" />
      <circle cx="176" cy="232" r="40" fill="url(#rl-amber)" fillOpacity="0.9" />
      <circle cx="292" cy="186" r="64" fill="#E9EFE2" stroke={INK} strokeOpacity="0.16" />
      <circle cx="292" cy="186" r="38" fill="url(#rl-sage)" fillOpacity="0.9" />
      <circle cx="276" cy="296" r="62" fill="#F1EAE0" stroke={INK} strokeOpacity="0.16" />
      <circle cx="276" cy="296" r="34" fill="#2D2D2D" />
      {[
        [120, 96],
        [392, 150],
        [360, 384],
        [130, 382],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} stroke={INK} strokeOpacity="0.4" strokeWidth="2.8" strokeLinecap="round">
          <line x1={x - 8} y1={y} x2={x + 8} y2={y} />
          <line x1={x} y1={y - 8} x2={x} y2={y + 8} />
        </g>
      ))}
    </svg>
  );
}

/* ── Runway: stacked progress tiles ────────────────────────── */
export function Streaks({ style }) {
  return (
    <svg viewBox="0 0 480 420" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <defs>
        <linearGradient id="st-amber" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F2B879" />
          <stop offset="1" stopColor="#D6824F" />
        </linearGradient>
        <linearGradient id="st-sage" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#B9C4AF" />
          <stop offset="1" stopColor="#7E8E7B" />
        </linearGradient>
      </defs>
      <circle cx="70" cy="70" r="34" fill="url(#st-sage)" fillOpacity="0.55" />
      {[
        { y: 40, w: 300, fill: "url(#st-amber)", pct: 0.9 },
        { y: 112, w: 380, fill: "#D9CCB8", pct: 0.66 },
        { y: 184, w: 320, fill: "url(#st-sage)", pct: 0.8 },
      ].map((row) => (
        <g key={row.y}>
          <rect x="40" y={row.y} width={row.w} height="56" rx="18" fill="#F3ECDF" stroke={INK} strokeOpacity="0.14" />
          <rect x="56" y={row.y + 16} width={row.w * row.pct} height="26" rx="13" fill={row.fill} />
          <circle cx={56 + row.w * row.pct} cy={row.y + 29} r="6" fill="#FFFFFF" />
        </g>
      ))}
      <g stroke={INK} strokeOpacity="0.4" strokeWidth="2.8" strokeLinecap="round">
        <line x1="392" y1="240" x2="408" y2="240" />
        <line x1="400" y1="232" x2="400" y2="248" />
        <line x1="88" y1="300" x2="104" y2="300" />
        <line x1="96" y1="292" x2="96" y2="308" />
      </g>
    </svg>
  );
}

/* ── Thumbnail tiles for the 3D marketplace rail (login) ───── */
export function ThumbCalendar({ style }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <defs>
        <linearGradient id="tc-board" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFDF9" />
          <stop offset="1" stopColor="#EFE3D1" />
        </linearGradient>
      </defs>
      <rect x="14" y="12" width="92" height="96" rx="20" fill="url(#tc-board)" stroke={INK} strokeOpacity="0.14" />
      <rect x="28" y="26" width="34" height="10" rx="5" fill={INK} fillOpacity="0.75" />
      {[0, 1].map((r) =>
        [0, 1, 2].map((c) => (
          <rect key={`${r}-${c}`} x={28 + c * 26} y={46 + r * 24} width="22" height="17" rx="6" fill="#E7DCC9" stroke={INK} strokeOpacity="0.1" />
        ))
      )}
      <rect x={28 + 2 * 26} y={46} width="22" height="17" rx="6" fill="#D6824F" />
    </svg>
  );
}

export function ThumbMail({ style }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <g transform="rotate(-5 60 60)">
        <rect x="16" y="30" width="88" height="56" rx="14" fill="#F3ECDF" stroke={INK} strokeOpacity="0.18" />
        <path d="M16 42 L60 72 L104 42" stroke={INK} strokeOpacity="0.35" strokeWidth="2" fill="none" />
        <rect x="30" y="64" width="26" height="10" rx="5" fill="#D6824F" />
      </g>
    </svg>
  );
}

export function ThumbCrm({ style }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" style={style}>
      <circle cx="32" cy="34" r="12" fill={INK} />
      <circle cx="88" cy="44" r="12" fill="#D6824F" />
      <circle cx="66" cy="86" r="12" fill="#7E8E7B" />
      <line x1="44" y1="34" x2="76" y2="44" stroke={INK} strokeOpacity="0.35" strokeWidth="2" strokeDasharray="3 4" />
      <line x1="82" y1="54" x2="72" y2="76" stroke={INK} strokeOpacity="0.35" strokeWidth="2" strokeDasharray="3 4" />
    </svg>
  );
}