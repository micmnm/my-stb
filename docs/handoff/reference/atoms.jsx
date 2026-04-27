// MyStb screen library — shared atoms (icons, map, theme tokens, mini-components)
// All icons: Phosphor-style line, 1.75 stroke, rounded.

// ─────────────── Theme ───────────────
const theme = (dark) => ({
  surface:    dark ? '#1A1F2E' : '#F4ECE0',
  surface2:   dark ? '#252B3D' : '#FBF7F0',
  ink:        dark ? '#F4ECE0' : '#1A1F2E',
  ink2:       dark ? '#B8B0A0' : '#574F40',
  ink3:       dark ? '#7A7261' : '#7A7261',
  border:     dark ? 'rgba(244,236,224,0.10)' : '#EFE8DC',
  red:        '#E63027',
  yellow:     '#F5C518',
  bus:        '#2BB673',
  trolley:    '#2B6CB0',
  metroM2:    '#0F766E',
  metroM5:    '#7A4FA3',
  shadow:     dark
    ? '0 1px 2px rgba(0,0,0,.4), 0 6px 18px rgba(0,0,0,.25)'
    : '0 1px 2px rgba(26,31,46,.06), 0 4px 12px rgba(26,31,46,.04)',
  liveTint:   dark
    ? 'linear-gradient(180deg, #2A2410 0%, #252B3D 100%)'
    : 'linear-gradient(180deg, #FFF8EE 0%, #FBF7F0 100%)',
  fontDisplay: '"Bricolage Grotesque", "Space Grotesk", system-ui, sans-serif',
  fontText:    '"Space Grotesk", system-ui, sans-serif',
  fontMono:    '"JetBrains Mono", ui-monospace, monospace',
});

// ─────────────── Icons (Phosphor-style line, 1.75) ───────────────
const Icon = ({ d, size = 22, c = 'currentColor', stroke = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d={d} stroke={c} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconSearch  = (p) => <Icon {...p} d="M11 19a8 8 0 100-16 8 8 0 000 16zm5.5-2.5L21 21" />;
const IconHome    = (p) => <Icon {...p} d="M3 11l9-8 9 8v9a2 2 0 01-2 2h-4v-7H9v7H5a2 2 0 01-2-2v-9z" />;
const IconBookmark= (p) => <Icon {...p} d="M6 4a1 1 0 011-1h10a1 1 0 011 1v17l-6-4-6 4V4z" />;
const IconRoute   = (p) => <Icon {...p} d="M6 19a3 3 0 100-6h12a3 3 0 100-6M6 19h2M16 7h-2M3 22l3-3 3 3M21 2l-3 3-3-3" />;
const IconMap     = (p) => <Icon {...p} d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6zm6-3v15m6-12v15" />;
const IconStar    = (p) => <Icon {...p} d="M12 3l2.7 5.6 6.1.9-4.4 4.4 1 6.1L12 17.1 6.6 20l1-6.1L3.2 9.5l6.1-.9L12 3z" />;
const IconClock   = (p) => <Icon {...p} d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-13v5l3 2" />;
const IconWalk    = (p) => <Icon {...p} d="M13 5a2 2 0 100-4 2 2 0 000 4zm-3 17l2-7-3-2 1-5 4 2 4 1m-7-2l-2 4m6-1l3 4" />;
const IconArrow   = (p) => <Icon {...p} d="M5 12h14m-6-6l6 6-6 6" />;
const IconClose   = (p) => <Icon {...p} d="M6 6l12 12M6 18L18 6" />;
const IconChevR   = (p) => <Icon {...p} d="M9 6l6 6-6 6" />;
const IconChevD   = (p) => <Icon {...p} d="M6 9l6 6 6-6" />;
const IconLocation= (p) => <Icon {...p} d="M12 22c5-5.3 8-9.4 8-13a8 8 0 10-16 0c0 3.6 3 7.7 8 13z" />;
const IconLocationDot = (p) => (<svg width={p.size||22} height={p.size||22} viewBox="0 0 24 24" fill="none">
  <path d="M12 22c5-5.3 8-9.4 8-13a8 8 0 10-16 0c0 3.6 3 7.7 8 13z" stroke={p.c||'currentColor'} strokeWidth={p.stroke||1.75} strokeLinecap="round" strokeLinejoin="round"/>
  <circle cx="12" cy="9" r="2.5" fill={p.c||'currentColor'}/></svg>);
const IconHeart   = (p) => <Icon {...p} d="M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z" />;
const IconBriefcase=(p) => <Icon {...p} d="M3 8h18v12a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm5 0V5a2 2 0 012-2h4a2 2 0 012 2v3" />;
const IconDumbbell=(p) => <Icon {...p} d="M3 9v6m18-6v6M5 7v10M19 7v10M7 12h10" />;
const IconBook    = (p) => <Icon {...p} d="M4 4h7a3 3 0 013 3v14a2 2 0 00-2-2H4V4zm16 0h-7a3 3 0 00-3 3v14a2 2 0 012-2h8V4z" />;
const IconShop    = (p) => <Icon {...p} d="M3 9l1.5-5h15L21 9M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9M3 9h18M9 13h6" />;
const IconAccess  = (p) => <Icon {...p} d="M12 6a2 2 0 100-4 2 2 0 000 4zm0 0v6h4l3 8m-7-8l-4 5a4 4 0 105 5" />;
const IconBell    = (p) => <Icon {...p} d="M6 16V11a6 6 0 1112 0v5l1.5 2h-15L6 16zm3 4a3 3 0 006 0" />;
const IconWifi    = (p) => <Icon {...p} d="M5 12.5a10 10 0 0114 0M2 9a14 14 0 0120 0M8.5 16a5 5 0 017 0M12 19.5h.01" />;
const IconSwap    = (p) => <Icon {...p} d="M7 4v16m0 0l-3-3m3 3l3-3M17 20V4m0 0l-3 3m3-3l3 3" />;
const IconPlus    = (p) => <Icon {...p} d="M12 5v14M5 12h14" />;
const IconShare   = (p) => <Icon {...p} d="M16 6l-4-4-4 4m4-4v15M5 14v5a2 2 0 002 2h10a2 2 0 002-2v-5" />;
const IconStop    = (p) => (<svg width={p.size||22} height={p.size||22} viewBox="0 0 24 24" fill="none">
  <circle cx="12" cy="12" r="9" stroke={p.c||'currentColor'} strokeWidth={p.stroke||1.75}/>
  <circle cx="12" cy="12" r="3" fill={p.c||'currentColor'}/></svg>);

// ─────────────── Route badge (mode-colored chip) ───────────────
const RouteBadge = ({ num, mode = 'tram', dark, size = 'md' }) => {
  const t = theme(dark);
  const colors = { tram: t.red, bus: t.bus, trolley: t.trolley, m1: t.yellow, m2: t.metroM2, m3: t.red, m4: t.trolley, m5: t.metroM5 };
  const sizes = { sm: { w: 36, h: 22, f: 11 }, md: { w: 44, h: 28, f: 13 }, lg: { w: 56, h: 36, f: 16 } };
  const s = sizes[size];
  const isMetro = mode.startsWith('m');
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: s.w, height: s.h, padding: '0 8px',
      borderRadius: isMetro ? 999 : 6,
      background: colors[mode], color: mode === 'm1' ? '#1A1F2E' : '#fff',
      fontFamily: t.fontMono, fontSize: s.f, fontWeight: 700, letterSpacing: -0.2,
    }}>{num}</span>
  );
};

// ─────────────── Live dot ───────────────
const LiveDot = ({ size = 8, dark }) => (
  <span style={{
    display: 'inline-block', width: size, height: size, borderRadius: 999,
    background: '#F5C518', boxShadow: '0 0 0 0 rgba(245,197,24,0.7)',
    animation: 'mystb-pulse 1.4s ease-in-out infinite',
  }}/>
);

// ─────────────── Tab bar ───────────────
const TabBar = ({ active = 'home', dark }) => {
  const t = theme(dark);
  const tabs = [
    { id: 'home',   label: 'Home',   I: IconMap },
    { id: 'plan',   label: 'Plan',   I: IconRoute },
    { id: 'saved',  label: 'Saved',  I: IconBookmark },
  ];
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 30,
      paddingBottom: 32, paddingTop: 8,
      background: dark ? 'rgba(26,31,46,0.92)' : 'rgba(244,236,224,0.92)',
      backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      borderTop: `1px solid ${t.border}`,
      display: 'flex', justifyContent: 'space-around', paddingLeft: 32, paddingRight: 32,
    }}>
      {tabs.map(({ id, label, I }) => {
        const on = id === active;
        return (
          <div key={id} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            color: on ? t.red : t.ink3, fontSize: 10, fontFamily: t.fontText, fontWeight: 600,
            letterSpacing: 0.2, padding: '4px 14px',
          }}>
            <I size={22} stroke={on ? 2 : 1.75}/>
            <span>{label}</span>
          </div>
        );
      })}
    </div>
  );
};

// ─────────────── Stylized Bucharest map ───────────────
// Custom illustrated layout: river curves through middle, ring road, tram lines,
// stops as dots. Cream/navy background per theme. Drawn at 402×874 viewport.
const BucharestMap = ({ dark, height = 874, showVehicles = true, focus, lines = 'all' }) => {
  const land    = dark ? '#252B3D' : '#EFE6D6';
  const water   = dark ? '#1B3340' : '#BFE4EE';
  const park    = dark ? '#1F3A2A' : '#D5E5C8';
  const road    = dark ? 'rgba(244,236,224,0.07)' : 'rgba(26,31,46,0.07)';
  const blockBg = dark ? '#2C334A' : '#E5DBC9';
  return (
    <svg width="100%" height={height} viewBox="0 0 402 874" preserveAspectRatio="xMidYMid slice"
         style={{ display: 'block', background: land }}>
      {/* Block grid (city texture) */}
      <g stroke={road} strokeWidth="0.5">
        {Array.from({length: 16}).map((_, i) => <line key={'v'+i} x1={25 + i*24} x2={25 + i*24} y1="0" y2="874" />)}
        {Array.from({length: 36}).map((_, i) => <line key={'h'+i} x1="0" x2="402" y1={20 + i*24} y2={20 + i*24} />)}
      </g>
      {/* Building blocks (subtle) */}
      <g fill={blockBg} opacity={dark ? 0.5 : 0.45}>
        <rect x="40" y="60" width="60" height="44"/>
        <rect x="120" y="80" width="80" height="50"/>
        <rect x="220" y="40" width="50" height="70"/>
        <rect x="290" y="100" width="70" height="40"/>
        <rect x="50" y="180" width="90" height="60"/>
        <rect x="170" y="200" width="60" height="50"/>
        <rect x="260" y="170" width="100" height="55"/>
        <rect x="30" y="320" width="80" height="50"/>
        <rect x="140" y="340" width="70" height="55"/>
        <rect x="240" y="310" width="120" height="60"/>
        <rect x="60" y="500" width="85" height="50"/>
        <rect x="180" y="490" width="60" height="60"/>
        <rect x="270" y="510" width="90" height="55"/>
        <rect x="40" y="640" width="100" height="60"/>
        <rect x="170" y="660" width="80" height="55"/>
        <rect x="280" y="630" width="70" height="60"/>
        <rect x="60" y="780" width="90" height="50"/>
        <rect x="200" y="790" width="120" height="50"/>
      </g>
      {/* Cișmigiu Park (small) */}
      <ellipse cx="155" cy="430" rx="38" ry="22" fill={park}/>
      <text x="155" y="435" textAnchor="middle" fontSize="8" fill={dark ? '#7A8A6E' : '#5C7048'}
            fontFamily='"Space Grotesk", sans-serif' fontWeight="600" letterSpacing="0.5">CIȘMIGIU</text>
      {/* Herăstrău Park (top) */}
      <path d="M 230 25 Q 320 35 360 95 Q 320 130 240 110 Q 200 80 230 25 Z" fill={park}/>
      <text x="290" y="78" textAnchor="middle" fontSize="9" fill={dark ? '#7A8A6E' : '#5C7048'}
            fontFamily='"Space Grotesk", sans-serif' fontWeight="600" letterSpacing="0.5">HERĂSTRĂU</text>
      {/* Dâmbovița river — curves through */}
      <path d="M -10 470 Q 80 450 160 480 T 320 510 T 420 520" stroke={water} strokeWidth="14" fill="none" strokeLinecap="round"/>
      <path d="M -10 470 Q 80 450 160 480 T 320 510 T 420 520" stroke={dark ? '#2D5466' : '#9FCFDA'} strokeWidth="0.5" fill="none" strokeDasharray="2 3" opacity="0.4"/>

      {/* Major road — ring boulevard */}
      <path d="M 30 200 L 372 200 L 372 700 L 30 700 Z" stroke={road} strokeWidth="2.5" fill="none"/>
      {/* Cross axis: Calea Victoriei (vertical) */}
      <line x1="200" y1="40" x2="200" y2="820" stroke={road} strokeWidth="2"/>
      {/* Magheru/Bălcescu (horiz center) */}
      <line x1="20" y1="430" x2="380" y2="430" stroke={road} strokeWidth="2"/>

      {/* Tram line 41 (red) */}
      {(lines==='all' || lines==='41') && <>
        <path d="M 50 820 Q 110 740 140 640 Q 165 540 180 430 Q 195 320 220 220 Q 250 130 320 70"
              stroke="#E63027" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.95"/>
      </>}
      {/* Bus 178 (green) */}
      {(lines==='all' || lines==='178') && <>
        <path d="M 30 380 Q 110 400 200 430 Q 290 460 372 480"
              stroke="#2BB673" strokeWidth="3.2" fill="none" strokeLinecap="round" opacity="0.95"/>
      </>}
      {/* Trolley 79 (blue) */}
      {(lines==='all' || lines==='79') && <>
        <path d="M 200 820 Q 220 700 240 580 Q 260 450 250 320 Q 245 200 280 100"
              stroke="#2B6CB0" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.85"/>
      </>}
      {/* Metro M2 (teal, dashed wider) */}
      {(lines==='all' || lines==='M2') && <>
        <path d="M 100 40 L 100 830" stroke="#0F766E" strokeWidth="3" fill="none" opacity="0.85" strokeDasharray="8 5"/>
      </>}

      {/* Stop dots along tram 41 */}
      {[
        [85, 760], [115, 690], [140, 590], [165, 480], [180, 380], [205, 280], [240, 180], [290, 105]
      ].map(([x,y], i) => (
        <g key={'s'+i}>
          <circle cx={x} cy={y} r={3.5} fill={dark ? '#1A1F2E' : '#fff'} stroke="#E63027" strokeWidth="1.5"/>
        </g>
      ))}

      {/* Vehicle pulses */}
      {showVehicles && (focus !== 'plan') && <>
        <g transform="translate(180 380)">
          <circle r="14" fill="#E63027" opacity="0.18">
            <animate attributeName="r" values="8;18;8" dur="2.2s" repeatCount="indefinite"/>
            <animate attributeName="opacity" values="0.3;0.05;0.3" dur="2.2s" repeatCount="indefinite"/>
          </circle>
          <circle r="6" fill="#E63027" stroke="#fff" strokeWidth="2"/>
          <text y="3" textAnchor="middle" fontSize="7" fill="#fff" fontWeight="700"
                fontFamily='"JetBrains Mono", monospace'>41</text>
        </g>
        <g transform="translate(250 445)">
          <circle r="6" fill="#2BB673" stroke="#fff" strokeWidth="2"/>
          <text y="3" textAnchor="middle" fontSize="6.5" fill="#fff" fontWeight="700"
                fontFamily='"JetBrains Mono", monospace'>178</text>
        </g>
        <g transform="translate(245 360)">
          <circle r="6" fill="#2B6CB0" stroke="#fff" strokeWidth="2"/>
          <text y="3" textAnchor="middle" fontSize="7" fill="#fff" fontWeight="700"
                fontFamily='"JetBrains Mono", monospace'>79</text>
        </g>
      </>}

      {/* "You are here" */}
      <g transform="translate(200 470)">
        <circle r="22" fill="#F5C518" opacity="0.18"/>
        <circle r="11" fill="#F5C518" opacity="0.35"/>
        <circle r="6" fill="#F5C518" stroke={dark ? '#1A1F2E' : '#fff'} strokeWidth="2.5"/>
      </g>

      {/* Neighborhood labels */}
      <g fontFamily='"Space Grotesk", sans-serif' fill={dark ? 'rgba(244,236,224,0.45)' : 'rgba(26,31,46,0.4)'}
         letterSpacing="1.4" fontWeight="600">
        <text x="200" y="160" textAnchor="middle" fontSize="9">VICTORIEI</text>
        <text x="80" y="350" textAnchor="middle" fontSize="9">COTROCENI</text>
        <text x="320" y="350" textAnchor="middle" fontSize="9">DOROBANȚI</text>
        <text x="80" y="600" textAnchor="middle" fontSize="9">RAHOVA</text>
        <text x="320" y="640" textAnchor="middle" fontSize="9">VITAN</text>
        <text x="200" y="780" textAnchor="middle" fontSize="9">BERCENI</text>
      </g>
    </svg>
  );
};

// Pulse keyframes (one-time inject)
if (typeof document !== 'undefined' && !document.getElementById('mystb-anim')) {
  const s = document.createElement('style');
  s.id = 'mystb-anim';
  s.textContent = `
    @keyframes mystb-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(245,197,24,0.7); opacity: 1; }
      50% { box-shadow: 0 0 0 6px rgba(245,197,24,0); opacity: 0.6; }
    }
  `;
  document.head.appendChild(s);
}

Object.assign(window, {
  mystbTheme: theme, mystbIcons: {
    IconSearch, IconHome, IconBookmark, IconRoute, IconMap, IconStar, IconClock,
    IconWalk, IconArrow, IconClose, IconChevR, IconChevD, IconLocation, IconLocationDot,
    IconHeart, IconBriefcase, IconDumbbell, IconBook, IconShop, IconAccess, IconBell,
    IconWifi, IconSwap, IconPlus, IconShare, IconStop,
  },
  RouteBadge, LiveDot, TabBar, BucharestMap,
});
