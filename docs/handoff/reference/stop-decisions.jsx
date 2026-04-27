// Stop-detail decision mocks. Each Qx is a screen variant illustrating one
// option for that question. Shares atoms.jsx + screens.jsx idioms.
const T = window.mystbTheme;
const I = window.mystbIcons;
const { RouteBadge, LiveDot, BucharestMap } = window;

// ───────── Shared shell (no tab bar; these are detail screens) ─────────
const Shell = ({ dark, children }) => {
  const t = T(dark);
  return (
    <div style={{
      width: 402, height: 874, position: 'relative', overflow: 'hidden',
      background: t.surface, color: t.ink, fontFamily: t.fontText,
    }}>{children}</div>
  );
};

// Compact stop header (no map, to keep focus on the list)
const StopHeader = ({ dark, name='Piața Romană', sub='Bd. Magheru · 2 min walk · 5 lines' }) => {
  const t = T(dark);
  return (
    <div style={{ padding: '60px 20px 14px', position:'relative' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 14 }}>
        <div style={{ width:36,height:36,borderRadius:18,background:t.surface2,border:`1px solid ${t.border}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <span style={{ display:'inline-block', transform:'rotate(180deg)' }}><I.IconArrow size={16} c={t.ink}/></span>
        </div>
        <div style={{ display:'flex', gap: 8 }}>
          <div style={{ width:36,height:36,borderRadius:18,background:t.red,display:'flex',alignItems:'center',justifyContent:'center'}}><I.IconBookmark size={16} c="#fff"/></div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase' }}>Stop · 1180</div>
      <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 28, color: t.ink, letterSpacing: -1, marginTop: 4 }}>{name}</div>
      <div style={{ fontSize: 13, color: t.ink2, marginTop: 4 }}>{sub}</div>
    </div>
  );
};

// Single arrival row, identical visual across Q1 options
const ArrivalRow = ({ dark, num, m, to, eta, next=[], live=true, starred=false }) => {
  const t = T(dark);
  return (
    <div style={{
      background: live ? t.liveTint : t.surface2, borderRadius: 14, padding: '12px 14px',
      display:'flex', alignItems:'center', gap: 12, boxShadow: t.shadow, position:'relative',
    }}>
      {starred && <div style={{ position:'absolute', top:8, left:8, fontSize: 11 }}>★</div>}
      <RouteBadge num={num} mode={m} dark={dark} size="md"/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: t.ink, fontWeight: 600 }}>to {to}</div>
        <div style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, marginTop: 2 }}>
          then {next.join(' · ')} min
        </div>
      </div>
      <div style={{ textAlign:'right' }}>
        <span style={{
          fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 28, color: live ? t.red : t.ink,
          fontVariantNumeric:'tabular-nums', letterSpacing: -1,
        }}>{eta}</span>
        <span style={{ fontSize: 11, color: t.ink3, marginLeft: 3 }}>min</span>
      </div>
    </div>
  );
};

// Section label small caps
const Group = ({ dark, label, children }) => {
  const t = T(dark);
  return (
    <div>
      <div style={{ padding: '14px 24px 8px', fontSize: 11, color: t.ink3,
                    fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ padding: '0 16px', display:'flex', flexDirection:'column', gap: 8 }}>{children}</div>
    </div>
  );
};

// Data — same arrivals across all Q1 options, ordered or grouped differently
const ALL = [
  { num:'M2',  m:'m2',      to:'Pipera',         eta:'<1', next:[5,9,14], live:true,  dir:'center', starred:false },
  { num:'41',  m:'tram',    to:'Drumul Taberei', eta:3,    next:[11,19,28], live:true, dir:'west',   starred:true  },
  { num:'178', m:'bus',     to:'Obor',           eta:6,    next:[14,26],    live:true, dir:'east',   starred:false },
  { num:'79',  m:'trolley', to:'Republica',      eta:12,   next:[24],       live:true, dir:'east',   starred:true  },
  { num:'301', m:'bus',     to:'Pantelimon',     eta:18,   next:[35,52],    live:false, dir:'east',  starred:false },
];

// =======================================================================
// Q1A — current. ETA order, every line in one flat list.
// =======================================================================
const Q1A = ({ dark }) => {
  const t = T(dark);
  return (
    <Shell dark={dark}>
      <StopHeader dark={dark}/>
      <div style={{ height: 1, background: t.border, margin: '0 20px' }}/>
      <div style={{ padding:'14px 24px 8px', display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
        <span style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700 }}>
          Arrivals
        </span>
        <span style={{ fontSize: 11, color: t.ink3, display:'inline-flex', alignItems:'center', gap: 4 }}>
          <LiveDot/> Live · 18:42
        </span>
      </div>
      <div style={{ padding: '0 16px', display:'flex', flexDirection:'column', gap: 8 }}>
        {ALL.map((r,i)=><ArrivalRow key={i} dark={dark} {...r}/>)}
      </div>
    </Shell>
  );
};

// =======================================================================
// Q1B — grouped by direction. Two collapsible sections.
// =======================================================================
const Q1B = ({ dark }) => {
  const center = ALL.filter(r => r.dir === 'center' || r.dir === 'east');
  const west   = ALL.filter(r => r.dir === 'west');
  return (
    <Shell dark={dark}>
      <StopHeader dark={dark}/>
      <Group dark={dark} label="→ Toward city center / east">
        {center.map((r,i)=><ArrivalRow key={i} dark={dark} {...r}/>)}
      </Group>
      <Group dark={dark} label="← Toward Drumul Taberei / west">
        {west.map((r,i)=><ArrivalRow key={i} dark={dark} {...r}/>)}
      </Group>
    </Shell>
  );
};

// =======================================================================
// Q1C — starred pinned on top, then rest by ETA. Subtle "Starred" label.
// =======================================================================
const Q1C = ({ dark }) => {
  const starred = ALL.filter(r => r.starred);
  const rest    = ALL.filter(r => !r.starred);
  return (
    <Shell dark={dark}>
      <StopHeader dark={dark}/>
      <Group dark={dark} label="★ Your lines">
        {starred.map((r,i)=><ArrivalRow key={i} dark={dark} {...r} starred={true}/>)}
      </Group>
      <Group dark={dark} label="Other arrivals">
        {rest.map((r,i)=><ArrivalRow key={i} dark={dark} {...r}/>)}
      </Group>
    </Shell>
  );
};

// =======================================================================
// Q2 — Direction handling
// A: one row per line (only the relevant direction at this stop)
// B: two rows per line (both directions w/ ← / → indicator)
// =======================================================================

// For Q2 we need realistic both-direction data. Same lines, both terminals.
// At Piața Romană, Bd. Magheru runs N–S. Each line has two endpoints.
const PAIRS = [
  { num:'M2',  m:'m2',      a:{ to:'Pipera',         eta:'<1', live:true  }, b:{ to:'Berceni',          eta:4,  live:true  } },
  { num:'41',  m:'tram',    a:{ to:'Drumul Taberei', eta:3,    live:true  }, b:{ to:'Pipera',           eta:9,  live:true  } },
  { num:'178', m:'bus',     a:{ to:'Obor',           eta:6,    live:true  }, b:{ to:'Pța. Sudului',     eta:13, live:true  } },
  { num:'79',  m:'trolley', a:{ to:'Republica',      eta:12,   live:true  }, b:{ to:'Bucureștii Noi',   eta:8,  live:true  } },
];

// Compact "both directions" row used in Q2B
const TwoWayRow = ({ dark, num, m, a, b }) => {
  const t = T(dark);
  const Side = ({ d, side }) => (
    <div style={{ flex:1, display:'flex', alignItems:'center', gap: 8, minWidth: 0 }}>
      <span style={{ fontSize: 14, color: t.ink3, fontFamily: t.fontMono, fontWeight: 700, flexShrink: 0 }}>{side}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12, color: t.ink, fontWeight: 600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.to}</div>
        <div style={{
          fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 22, color: d.live ? t.red : t.ink,
          fontVariantNumeric: 'tabular-nums', letterSpacing: -0.6, lineHeight: 1.05,
        }}>{d.eta}<span style={{ fontSize: 10, color: t.ink3, marginLeft: 2, fontWeight: 500 }}>min</span></div>
      </div>
    </div>
  );
  return (
    <div style={{
      background: t.liveTint, borderRadius: 14, padding: '10px 12px',
      display:'flex', alignItems:'center', gap: 10, boxShadow: t.shadow,
    }}>
      <RouteBadge num={num} mode={m} dark={dark} size="md"/>
      <Side d={a} side="←"/>
      <div style={{ width: 1, height: 32, background: t.border }}/>
      <Side d={b} side="→"/>
    </div>
  );
};

// Q2A — one row per line (current). Filtered to "this direction at this stop"
// Tiny direction caption above each row to clarify the implicit filter.
const Q2A = ({ dark }) => {
  const t = T(dark);
  return (
    <Shell dark={dark}>
      <StopHeader dark={dark}/>
      <div style={{ height: 1, background: t.border, margin: '0 20px' }}/>
      <div style={{ padding:'14px 24px 8px', display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
        <span style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700 }}>
          Arrivals · this side
        </span>
        <span style={{ fontSize: 11, color: t.red, fontWeight: 600 }}>Other side ↻</span>
      </div>
      <div style={{ padding: '0 16px', display:'flex', flexDirection:'column', gap: 8 }}>
        {PAIRS.map((p,i)=>(
          <ArrivalRow key={i} dark={dark} num={p.num} m={p.m}
            to={p.a.to} eta={p.a.eta} next={[]} live={p.a.live}/>
        ))}
      </div>
      <div style={{ padding:'14px 24px 0', fontSize: 11, color: t.ink3, lineHeight: 1.5 }}>
        Showing arrivals heading away from city center. Tap "Other side" to flip.
      </div>
    </Shell>
  );
};

// Q2B — two rows per line. Both directions visible, ETAs side by side.
const Q2B = ({ dark }) => {
  const t = T(dark);
  return (
    <Shell dark={dark}>
      <StopHeader dark={dark}/>
      <div style={{ height: 1, background: t.border, margin: '0 20px' }}/>
      <div style={{ padding:'14px 24px 8px' }}>
        <span style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700 }}>
          Arrivals · both directions
        </span>
      </div>
      <div style={{ padding: '0 16px', display:'flex', flexDirection:'column', gap: 8 }}>
        {PAIRS.map((p,i)=><TwoWayRow key={i} dark={dark} {...p}/>)}
      </div>
      <div style={{ padding:'14px 24px 0', fontSize: 11, color: t.ink3, lineHeight: 1.5 }}>
        Each row shows both directions of a line. Useful when this stop serves traffic both ways.
      </div>
    </Shell>
  );
};

// =======================================================================
// Q3 — Row tap behavior
// A: navigate to Route detail (line schematic)
// B: expand inline (more departures + mini map showing the vehicle)
// C: vehicle tracking modal (where is this specific tram right now)
// =======================================================================

// Q3A — preview of where you'd land: Route detail. Reuse the existing schematic shape.
const Q3A = ({ dark }) => {
  const t = T(dark);
  const stops = [
    { name:'Drumul Taberei', sub:'Terminus', passed:true },
    { name:'Valea Ialomiței', passed:true },
    { name:'Brașov', passed:true },
    { name:'Răzoare', passed:true, vehicle:true },
    { name:'Eroilor', passed:false },
    { name:'Operă', passed:false },
    { name:'Universitate', passed:false },
    { name:'Piața Romană', eta:3, passed:false, you:true },
    { name:'Iancului', eta:6, passed:false },
    { name:'Pipera', sub:'Terminus', eta:12, passed:false },
  ];
  return (
    <Shell dark={dark}>
      <div style={{ padding:'60px 16px 14px', display:'flex', alignItems:'center', gap: 12 }}>
        <div style={{ width:36,height:36,borderRadius:18,background:t.surface2,border:`1px solid ${t.border}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <span style={{ display:'inline-block', transform:'rotate(180deg)' }}><I.IconArrow size={16} c={t.ink}/></span>
        </div>
        <RouteBadge num="41" mode="tram" dark={dark} size="lg"/>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 18, color: t.ink, letterSpacing: -0.4 }}>Tram 41</div>
          <div style={{ fontSize: 12, color: t.ink2, marginTop: 1 }}>Drumul Taberei → Pipera</div>
        </div>
      </div>
      <div style={{ height: 1, background: t.border, margin: '0 20px' }}/>
      <div style={{ padding:'14px 24px 8px', fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700 }}>
        Stops · this direction
      </div>
      <div style={{ padding: '0 24px', position: 'relative' }}>
        <div style={{ position:'absolute', left: 32, top: 0, bottom: 0, width: 2, background: t.border }}/>
        {stops.map((s,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap: 14, padding: '10px 0', position:'relative' }}>
            <div style={{
              width: 16, height: 16, borderRadius: 8, marginLeft: 16, position:'relative', zIndex: 1,
              background: s.you ? t.red : (s.passed ? t.ink3 : t.surface),
              border: `2px solid ${s.you ? t.red : (s.passed ? t.ink3 : t.ink2)}`,
              boxShadow: s.vehicle ? `0 0 0 4px ${dark ? 'rgba(212,49,15,0.3)' : 'rgba(212,49,15,0.2)'}` : 'none',
              flexShrink: 0,
            }}/>
            {s.vehicle && (
              <div style={{
                position:'absolute', left: 4, top: '50%', transform:'translateY(-50%)',
                fontSize: 14, color: t.red,
              }}>🚊</div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: s.you ? t.red : t.ink, fontWeight: s.you ? 700 : 500 }}>{s.name}</div>
              {s.sub && <div style={{ fontSize: 11, color: t.ink3, marginTop: 1 }}>{s.sub}</div>}
              {s.you && <div style={{ fontSize: 11, color: t.red, fontWeight: 600, marginTop: 1 }}>Your stop</div>}
            </div>
            {s.eta != null && !s.passed && (
              <div style={{ textAlign:'right' }}>
                <span style={{
                  fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 18, color: s.you ? t.red : t.ink,
                  fontVariantNumeric: 'tabular-nums', letterSpacing: -0.4,
                }}>{s.eta}</span>
                <span style={{ fontSize: 11, color: t.ink3, marginLeft: 2 }}>min</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </Shell>
  );
};

// Q3B — inline expansion. Tram 41 row blown open showing more departures + a mini-map.
const Q3B = ({ dark }) => {
  const t = T(dark);
  return (
    <Shell dark={dark}>
      <StopHeader dark={dark}/>
      <div style={{ height: 1, background: t.border, margin: '0 20px' }}/>
      <div style={{ padding:'14px 24px 8px', fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700 }}>
        Arrivals
      </div>
      <div style={{ padding: '0 16px', display:'flex', flexDirection:'column', gap: 8 }}>
        <ArrivalRow dark={dark} num="M2" m="m2" to="Pipera" eta="<1" next={[5,9,14]}/>
        {/* Expanded card */}
        <div style={{ background: t.liveTint, borderRadius: 14, boxShadow: t.shadow, overflow: 'hidden' }}>
          <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap: 12 }}>
            <RouteBadge num="41" mode="tram" dark={dark} size="md"/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: t.ink, fontWeight: 600 }}>to Drumul Taberei</div>
              <div style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, marginTop: 2 }}>2 trams en route</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <span style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 28, color: t.red, fontVariantNumeric:'tabular-nums', letterSpacing: -1 }}>3</span>
              <span style={{ fontSize: 11, color: t.ink3, marginLeft: 3 }}>min</span>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: 14, display:'flex', alignItems:'center', justifyContent:'center', color: t.ink2 }}>
              <span style={{ display:'inline-block', transform:'rotate(180deg)' }}><I.IconChevR size={14} c={t.ink2}/></span>
            </div>
          </div>
          {/* Mini-map preview */}
          <div style={{ height: 140, position:'relative', borderTop: `1px solid ${t.border}` }}>
            <BucharestMap dark={dark} height={140}/>
            <div style={{ position:'absolute', top:'50%', left:'40%', width: 14, height: 14, borderRadius: 7, background: t.red, transform:'translate(-50%,-50%)', boxShadow:'0 0 0 4px rgba(212,49,15,0.3)' }}/>
          </div>
          {/* Following departures */}
          <div style={{ padding:'10px 14px', borderTop: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700, marginBottom: 6 }}>
              Following
            </div>
            <div style={{ display:'flex', gap: 16 }}>
              {[11,19,28].map((n,i)=>(
                <div key={i}>
                  <span style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 18, color: t.ink, fontVariantNumeric:'tabular-nums' }}>{n}</span>
                  <span style={{ fontSize: 10, color: t.ink3, marginLeft: 2 }}>min</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding:'10px 14px', borderTop: `1px solid ${t.border}`, display:'flex', gap: 8 }}>
            <button style={{
              flex: 1, height: 38, border:`1px solid ${t.border}`, background:'transparent', borderRadius: 10,
              color: t.ink, fontSize: 13, fontWeight: 600,
            }}>See full line ↗</button>
            <button style={{
              flex: 1, height: 38, border:'none', background: t.red, borderRadius: 10,
              color: '#fff', fontSize: 13, fontWeight: 600,
            }}>Notify me</button>
          </div>
        </div>
        <ArrivalRow dark={dark} num="178" m="bus" to="Obor" eta={6} next={[14,26]}/>
      </div>
    </Shell>
  );
};

// Q3C — vehicle tracking modal. Big map, vehicle highlighted, ETA & next stops list.
const Q3C = ({ dark }) => {
  const t = T(dark);
  return (
    <Shell dark={dark}>
      {/* Big map taking top half */}
      <div style={{ position:'relative', height: 460, overflow:'hidden' }}>
        <BucharestMap dark={dark} height={460}/>
        {/* Close button */}
        <div style={{ position:'absolute', top: 60, left: 16, width:36, height:36, borderRadius: 18, background: t.surface2, boxShadow: t.shadow, display:'flex', alignItems:'center', justifyContent:'center', border:`1px solid ${t.border}` }}>
          <I.IconClose size={16} c={t.ink}/>
        </div>
        {/* Tracked vehicle */}
        <div style={{ position:'absolute', top: 240, left: 200, width: 28, height: 28, borderRadius: 14, background: t.red, border:'3px solid #fff', boxShadow:'0 4px 12px rgba(212,49,15,0.5)' }}/>
        <div style={{ position:'absolute', top: 232, left: 240, padding:'4px 10px', background: t.red, color:'#fff', borderRadius: 999, fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 12 }}>3 min</div>
      </div>
      {/* Bottom sheet w/ vehicle info */}
      <div style={{
        background: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22,
        marginTop: -20, position: 'relative', padding: '14px 20px 20px',
        boxShadow: dark ? '0 -10px 40px rgba(0,0,0,0.55)' : '0 -10px 40px rgba(26,31,46,0.14)',
      }}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: t.ink3, opacity: 0.35, margin: '0 auto 14px' }}/>
        <div style={{ display:'flex', alignItems:'center', gap: 12 }}>
          <RouteBadge num="41" mode="tram" dark={dark} size="lg"/>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 18, color: t.ink, letterSpacing: -0.4 }}>Tram 41</div>
            <div style={{ fontSize: 12, color: t.ink2, marginTop: 1 }}>Vehicle B-4612 · to Drumul Taberei</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 28, color: t.red, fontVariantNumeric:'tabular-nums', letterSpacing: -1 }}>3</div>
            <div style={{ fontSize: 10, color: t.ink3 }}>min away</div>
          </div>
        </div>
        <div style={{ marginTop: 18, paddingTop: 14, borderTop: `1px solid ${t.border}` }}>
          <div style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight: 700, marginBottom: 8 }}>
            Coming up
          </div>
          {[
            { name:'Răzoare', eta:'now' },
            { name:'Eroilor', eta:1 },
            { name:'Operă', eta:2 },
            { name:'Piața Romană', eta:3, you:true },
          ].map((s,i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', gap: 10, padding:'6px 0' }}>
              <div style={{ width: 8, height: 8, borderRadius: 4, background: s.you ? t.red : t.ink3 }}/>
              <span style={{ flex:1, fontSize: 13, color: s.you ? t.red : t.ink, fontWeight: s.you ? 600 : 500 }}>{s.name}</span>
              <span style={{ fontSize: 12, color: t.ink2, fontFamily: t.fontMono }}>{s.eta}{typeof s.eta === 'number' && ' min'}</span>
            </div>
          ))}
        </div>
        <button style={{
          marginTop: 14, width: '100%', height: 44, border:'none', background: t.red, borderRadius: 12,
          color:'#fff', fontSize: 14, fontWeight: 600,
        }}>Notify when 1 stop away</button>
      </div>
    </Shell>
  );
};

// =======================================================================
// Q4 — Notification affordance
// A: persistent bell icon on every row (low-effort, always available)
// B: only inside the expanded card (Q3B winner) — keeps rows clean
// =======================================================================

const Q4A = ({ dark }) => {
  const t = T(dark);
  const Row = ({ num, m, to, eta, next, live=true, bellOn=false }) => (
    <div style={{
      background: live ? t.liveTint : t.surface2, borderRadius: 14, padding: '12px 14px',
      display:'flex', alignItems:'center', gap: 10, boxShadow: t.shadow,
    }}>
      <RouteBadge num={num} mode={m} dark={dark} size="md"/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, color: t.ink, fontWeight: 600 }}>to {to}</div>
        <div style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, marginTop: 2 }}>then {next.join(' · ')} min</div>
      </div>
      <div style={{ textAlign:'right' }}>
        <span style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 26, color: live ? t.red : t.ink, fontVariantNumeric:'tabular-nums', letterSpacing: -1 }}>{eta}</span>
        <span style={{ fontSize: 10, color: t.ink3, marginLeft: 2 }}>min</span>
      </div>
      <div style={{
        width: 32, height: 32, borderRadius: 16, marginLeft: 4,
        background: bellOn ? t.red : 'transparent',
        border: bellOn ? 'none' : `1px solid ${t.border}`,
        display:'flex', alignItems:'center', justifyContent:'center',
      }}>
        <I.IconBell size={16} c={bellOn ? '#fff' : t.ink2}/>
      </div>
    </div>
  );
  return (
    <Shell dark={dark}>
      <StopHeader dark={dark}/>
      <div style={{ height: 1, background: t.border, margin: '0 20px' }}/>
      <div style={{ padding:'14px 24px 8px', fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700 }}>
        Arrivals
      </div>
      <div style={{ padding: '0 16px', display:'flex', flexDirection:'column', gap: 8 }}>
        <Row num="M2"  m="m2"      to="Pipera"         eta="<1" next={[5,9,14]}/>
        <Row num="41"  m="tram"    to="Drumul Taberei" eta={3}  next={[11,19,28]} bellOn={true}/>
        <Row num="178" m="bus"     to="Obor"           eta={6}  next={[14,26]}/>
        <Row num="79"  m="trolley" to="Republica"      eta={12} next={[24]}/>
        <Row num="301" m="bus"     to="Pantelimon"     eta={18} next={[35,52]} live={false}/>
      </div>
      <div style={{ padding:'14px 24px 0', fontSize: 11, color: t.ink3, lineHeight: 1.5 }}>
        Tap the bell on any row to get a ping. Active alerts highlighted red.
      </div>
    </Shell>
  );
};

// Q4B — clean rows, notify only inside the expanded inline card (Q3B style).
const Q4B = ({ dark }) => {
  const t = T(dark);
  return (
    <Shell dark={dark}>
      <StopHeader dark={dark}/>
      <div style={{ height: 1, background: t.border, margin: '0 20px' }}/>
      <div style={{ padding:'14px 24px 8px', fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700 }}>
        Arrivals
      </div>
      <div style={{ padding: '0 16px', display:'flex', flexDirection:'column', gap: 8 }}>
        <ArrivalRow dark={dark} num="M2" m="m2" to="Pipera" eta="<1" next={[5,9,14]}/>
        {/* Tap-expanded card */}
        <div style={{ background: t.liveTint, borderRadius: 14, boxShadow: t.shadow, overflow: 'hidden' }}>
          <div style={{ padding:'12px 14px', display:'flex', alignItems:'center', gap: 12 }}>
            <RouteBadge num="41" mode="tram" dark={dark} size="md"/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: t.ink, fontWeight: 600 }}>to Drumul Taberei</div>
              <div style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, marginTop: 2 }}>2 trams en route</div>
            </div>
            <div style={{ textAlign:'right' }}>
              <span style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 28, color: t.red, fontVariantNumeric:'tabular-nums', letterSpacing: -1 }}>3</span>
              <span style={{ fontSize: 11, color: t.ink3, marginLeft: 3 }}>min</span>
            </div>
          </div>
          {/* Notify section */}
          <div style={{ padding:'12px 14px', borderTop: `1px solid ${t.border}` }}>
            <div style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700, marginBottom: 8 }}>
              Notify me
            </div>
            <div style={{ display:'flex', gap: 8 }}>
              {['1 min','2 min','5 min','When arriving'].map((label, i) => (
                <div key={i} style={{
                  padding: '8px 12px', borderRadius: 10,
                  border: `1px solid ${i === 1 ? t.red : t.border}`,
                  background: i === 1 ? (dark ? 'rgba(212,49,15,0.15)' : 'rgba(212,49,15,0.08)') : 'transparent',
                  color: i === 1 ? t.red : t.ink, fontSize: 12, fontWeight: 600,
                }}>{label}</div>
              ))}
            </div>
          </div>
          <div style={{ padding:'10px 14px', borderTop: `1px solid ${t.border}`, display:'flex', gap: 8 }}>
            <button style={{ flex: 1, height: 38, border:`1px solid ${t.border}`, background:'transparent', borderRadius: 10, color: t.ink, fontSize: 13, fontWeight: 600 }}>See full line ↗</button>
          </div>
        </div>
        <ArrivalRow dark={dark} num="178" m="bus" to="Obor" eta={6} next={[14,26]}/>
      </div>
      <div style={{ padding:'14px 24px 0', fontSize: 11, color: t.ink3, lineHeight: 1.5 }}>
        Tap a row to expand → choose how early to be pinged. Lists stay clean.
      </div>
    </Shell>
  );
};

// =======================================================================
// Q5 — Walk time / distance
// A: distance only — "120 m from you" (current)
// B: time + distance — "2 min walk · 120 m"
// =======================================================================

const Q5Header = ({ dark, sub }) => {
  const t = T(dark);
  return (
    <div style={{ padding: '60px 20px 14px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 14 }}>
        <div style={{ width:36,height:36,borderRadius:18,background:t.surface2,border:`1px solid ${t.border}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <span style={{ display:'inline-block', transform:'rotate(180deg)' }}><I.IconArrow size={16} c={t.ink}/></span>
        </div>
        <div style={{ width:36,height:36,borderRadius:18,background:t.red,display:'flex',alignItems:'center',justifyContent:'center'}}><I.IconBookmark size={16} c="#fff"/></div>
      </div>
      <div style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase' }}>Stop · 1180</div>
      <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 28, color: t.ink, letterSpacing: -1, marginTop: 4 }}>Piața Romană</div>
      <div style={{ fontSize: 13, color: t.ink2, marginTop: 4 }}>{sub}</div>
    </div>
  );
};

const Q5Body = ({ dark }) => {
  const t = T(dark);
  return (
    <>
      <div style={{ height: 1, background: t.border, margin: '0 20px' }}/>
      <div style={{ padding:'14px 24px 8px', display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
        <span style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700 }}>
          Arrivals
        </span>
        <span style={{ fontSize: 11, color: t.ink3, display:'inline-flex', alignItems:'center', gap: 4 }}>
          <LiveDot/> Live · 18:42
        </span>
      </div>
      <div style={{ padding: '0 16px', display:'flex', flexDirection:'column', gap: 8 }}>
        {ALL.slice(0,3).map((r,i)=><ArrivalRow key={i} dark={dark} {...r}/>)}
      </div>
    </>
  );
};

const Q5A = ({ dark }) => (
  <Shell dark={dark}>
    <Q5Header dark={dark} sub="Bd. Magheru · 120 m from you · 5 lines"/>
    <Q5Body dark={dark}/>
  </Shell>
);

const Q5B = ({ dark }) => {
  const t = T(dark);
  return (
    <Shell dark={dark}>
      <Q5Header dark={dark} sub={
        <span style={{ display:'inline-flex', alignItems:'center', gap: 6 }}>
          <I.IconWalk size={14} c={t.ink2}/>
          <strong style={{ fontWeight: 700, color: t.ink }}>2 min walk</strong>
          <span style={{ color: t.ink3 }}>· 120 m · 5 lines</span>
        </span>
      }/>
      <Q5Body dark={dark}/>
    </Shell>
  );
};

// =======================================================================
// Q6 — Direction switcher (Route detail)
// A: top tabs (two pills, Drumul Taberei ↔ Pipera)
// B: arrow swap button — single direction shown, tap a swap icon to flip
// =======================================================================

const Q6Stops = (reversed=false) => {
  const base = [
    { name:'Drumul Taberei', sub:'Terminus' },
    { name:'Valea Ialomiței' },
    { name:'Brașov' },
    { name:'Răzoare', vehicle:true },
    { name:'Eroilor' },
    { name:'Operă' },
    { name:'Universitate' },
    { name:'Piața Romană', you:true, eta:3 },
    { name:'Iancului', eta:6 },
    { name:'Pipera', sub:'Terminus', eta:12 },
  ];
  return reversed ? [...base].reverse() : base;
};

const RouteSchematic = ({ dark, stops }) => {
  const t = T(dark);
  return (
    <div style={{ padding: '0 24px', position: 'relative' }}>
      <div style={{ position:'absolute', left: 32, top: 0, bottom: 0, width: 2, background: t.border }}/>
      {stops.map((s,i)=>(
        <div key={i} style={{ display:'flex', alignItems:'center', gap: 14, padding: '8px 0', position:'relative' }}>
          <div style={{
            width: 14, height: 14, borderRadius: 7, marginLeft: 17, position:'relative', zIndex: 1,
            background: s.you ? t.red : t.surface,
            border: `2px solid ${s.you ? t.red : (s.vehicle ? t.red : t.ink3)}`,
            boxShadow: s.vehicle ? `0 0 0 4px ${dark ? 'rgba(212,49,15,0.3)' : 'rgba(212,49,15,0.2)'}` : 'none',
            flexShrink: 0,
          }}/>
          {s.vehicle && <div style={{ position:'absolute', left:6, fontSize: 12, color: t.red }}>🚊</div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, color: s.you ? t.red : t.ink, fontWeight: s.you ? 700 : 500 }}>{s.name}</div>
            {s.sub && <div style={{ fontSize: 11, color: t.ink3, marginTop: 1 }}>{s.sub}</div>}
            {s.you && <div style={{ fontSize: 11, color: t.red, fontWeight: 600, marginTop: 1 }}>Your stop</div>}
          </div>
          {s.eta != null && (
            <div style={{ textAlign:'right' }}>
              <span style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 16, color: s.you ? t.red : t.ink, fontVariantNumeric:'tabular-nums', letterSpacing: -0.4 }}>{s.eta}</span>
              <span style={{ fontSize: 11, color: t.ink3, marginLeft: 2 }}>min</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const RouteHeader = ({ dark, children }) => {
  const t = T(dark);
  return (
    <div style={{ padding:'60px 16px 14px', display:'flex', alignItems:'center', gap: 12 }}>
      <div style={{ width:36,height:36,borderRadius:18,background:t.surface2,border:`1px solid ${t.border}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <span style={{ display:'inline-block', transform:'rotate(180deg)' }}><I.IconArrow size={16} c={t.ink}/></span>
      </div>
      <RouteBadge num="41" mode="tram" dark={dark} size="lg"/>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 18, color: t.ink, letterSpacing: -0.4 }}>Tram 41</div>
        {children}
      </div>
    </div>
  );
};

const Q6A = ({ dark }) => {
  const t = T(dark);
  return (
    <Shell dark={dark}>
      <RouteHeader dark={dark}>
        <div style={{ fontSize: 12, color: t.ink2, marginTop: 1 }}>Drumul Taberei ↔ Pipera</div>
      </RouteHeader>
      {/* Direction tabs */}
      <div style={{ padding: '0 20px 12px', display: 'flex', gap: 6 }}>
        <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: t.red, color: '#fff', fontSize: 13, fontWeight: 600, display:'flex', alignItems:'center', justifyContent:'center', gap: 6 }}>
          <span>→</span>
          <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>Pipera</span>
        </div>
        <div style={{ flex: 1, padding: '10px 12px', borderRadius: 10, background: t.surface2, color: t.ink2, fontSize: 13, fontWeight: 600, display:'flex', alignItems:'center', justifyContent:'center', gap: 6, border: `1px solid ${t.border}` }}>
          <span>←</span>
          <span style={{ whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>Drumul Taberei</span>
        </div>
      </div>
      <div style={{ height: 1, background: t.border, margin: '0 20px' }}/>
      <div style={{ padding:'14px 24px 8px', fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700 }}>
        Stops · → Pipera
      </div>
      <RouteSchematic dark={dark} stops={Q6Stops()}/>
    </Shell>
  );
};

const Q6B = ({ dark }) => {
  const t = T(dark);
  return (
    <Shell dark={dark}>
      <RouteHeader dark={dark}>
        <div style={{ display:'flex', alignItems:'center', gap: 6, marginTop: 1 }}>
          <span style={{ fontSize: 12, color: t.ink2 }}>→ Pipera</span>
        </div>
      </RouteHeader>
      <div style={{ height: 1, background: t.border, margin: '0 20px' }}/>
      <div style={{ padding:'14px 24px 8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700 }}>
          Stops
        </span>
        <div style={{ display:'inline-flex', alignItems:'center', gap: 6, padding:'6px 10px', background: t.surface2, borderRadius: 999, border: `1px solid ${t.border}` }}>
          <I.IconSwap size={14} c={t.ink}/>
          <span style={{ fontSize: 11, color: t.ink, fontWeight: 600 }}>Reverse</span>
        </div>
      </div>
      <RouteSchematic dark={dark} stops={Q6Stops()}/>
    </Shell>
  );
};

// =======================================================================
// Q7 — Multi-vehicle display (Route detail)
// A: only the next vehicle (current)
// B: all vehicles on the line, each labeled with its ETA
// =======================================================================

const MultiStops = (showAll) => {
  // 41 line: vehicles at multiple positions if showAll
  return [
    { name:'Drumul Taberei', sub:'Terminus' },
    { name:'Valea Ialomiței', vehicle: showAll ? '14m' : null },
    { name:'Brașov' },
    { name:'Răzoare' },
    { name:'Eroilor', vehicle: showAll ? '8m' : null },
    { name:'Operă' },
    { name:'Universitate', vehicle: '3m', label: showAll ? 'next' : null },
    { name:'Piața Romană', you:true, eta:3 },
    { name:'Iancului', eta:6 },
    { name:'Pipera', sub:'Terminus', eta:12 },
  ];
};

const MultiSchematic = ({ dark, stops }) => {
  const t = T(dark);
  return (
    <div style={{ padding: '0 24px', position: 'relative' }}>
      <div style={{ position:'absolute', left: 32, top: 0, bottom: 0, width: 2, background: t.border }}/>
      {stops.map((s,i)=>(
        <div key={i} style={{ display:'flex', alignItems:'center', gap: 14, padding: '8px 0', position:'relative' }}>
          <div style={{
            width: 14, height: 14, borderRadius: 7, marginLeft: 17, position:'relative', zIndex: 1,
            background: s.you ? t.red : t.surface,
            border: `2px solid ${s.you ? t.red : t.ink3}`,
            flexShrink: 0,
          }}/>
          {s.vehicle && (
            <div style={{
              position:'absolute', left: 0, display:'flex', alignItems:'center', gap: 4,
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 11, background: t.red, border:'2px solid #fff',
                display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 6px rgba(212,49,15,0.4)',
              }}>
                <span style={{ fontSize: 11, color:'#fff' }}>🚊</span>
              </div>
              <div style={{
                background: t.red, color:'#fff', fontFamily: t.fontMono, fontSize: 9, fontWeight: 700,
                padding:'2px 6px', borderRadius: 999, letterSpacing: 0.3,
              }}>{s.vehicle}{s.label && ` · ${s.label}`}</div>
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0, paddingLeft: s.vehicle ? 60 : 0 }}>
            <div style={{ fontSize: 14, color: s.you ? t.red : t.ink, fontWeight: s.you ? 700 : 500 }}>{s.name}</div>
            {s.sub && <div style={{ fontSize: 11, color: t.ink3, marginTop: 1 }}>{s.sub}</div>}
            {s.you && <div style={{ fontSize: 11, color: t.red, fontWeight: 600, marginTop: 1 }}>Your stop</div>}
          </div>
          {s.eta != null && (
            <div style={{ textAlign:'right' }}>
              <span style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 16, color: s.you ? t.red : t.ink, fontVariantNumeric:'tabular-nums', letterSpacing: -0.4 }}>{s.eta}</span>
              <span style={{ fontSize: 11, color: t.ink3, marginLeft: 2 }}>min</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const Q7A = ({ dark }) => {
  const t = T(dark);
  return (
    <Shell dark={dark}>
      <RouteHeader dark={dark}>
        <div style={{ fontSize: 12, color: t.ink2, marginTop: 1 }}>→ Pipera</div>
      </RouteHeader>
      <div style={{ height: 1, background: t.border, margin: '0 20px' }}/>
      <div style={{ padding:'14px 24px 8px', fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700 }}>
        Stops · 1 vehicle en route
      </div>
      <MultiSchematic dark={dark} stops={MultiStops(false)}/>
    </Shell>
  );
};

const Q7B = ({ dark }) => {
  const t = T(dark);
  return (
    <Shell dark={dark}>
      <RouteHeader dark={dark}>
        <div style={{ fontSize: 12, color: t.ink2, marginTop: 1 }}>→ Pipera</div>
      </RouteHeader>
      <div style={{ height: 1, background: t.border, margin: '0 20px' }}/>
      <div style={{ padding:'14px 24px 8px', fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700 }}>
        Stops · 3 vehicles en route
      </div>
      <MultiSchematic dark={dark} stops={MultiStops(true)}/>
    </Shell>
  );
};

// =======================================================================
// Q8 — Schedule view
// A: no schedule — live arrivals only (cleanest)
// B: schedule tab — weekday/weekend timetable from a chosen stop
// =======================================================================

const Q8A = ({ dark }) => {
  const t = T(dark);
  return (
    <Shell dark={dark}>
      <RouteHeader dark={dark}>
        <div style={{ fontSize: 12, color: t.ink2, marginTop: 1 }}>→ Pipera</div>
      </RouteHeader>
      <div style={{ height: 1, background: t.border, margin: '0 20px' }}/>
      <div style={{ padding:'14px 24px 8px', fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700 }}>
        Stops · live
      </div>
      <MultiSchematic dark={dark} stops={MultiStops(true)}/>
      <div style={{ padding: '24px 24px 0', fontSize: 12, color: t.ink3, lineHeight: 1.5 }}>
        Live arrivals only. No timetable view.
      </div>
    </Shell>
  );
};

const Q8B = ({ dark }) => {
  const t = T(dark);
  const tabs = ['Live', 'Schedule'];
  // mocked Mon-Fri timetable rows
  const sched = [
    { hour: 6,  mins: ['12','24','36','48'] },
    { hour: 7,  mins: ['00','08','16','22','30','38','46','54'] },
    { hour: 8,  mins: ['02','10','18','26','34','42','50','58'] },
    { hour: 9,  mins: ['08','22','36','50'] },
    { hour: 10, mins: ['04','18','32','46'] },
    { hour: 11, mins: ['00','14','28','42','56'] },
    { hour: 12, mins: ['10','24','38','52'] },
  ];
  return (
    <Shell dark={dark}>
      <RouteHeader dark={dark}>
        <div style={{ fontSize: 12, color: t.ink2, marginTop: 1 }}>→ Pipera · from Piața Romană</div>
      </RouteHeader>
      {/* Live / Schedule toggle */}
      <div style={{ padding: '0 20px 12px', display: 'flex', gap: 6 }}>
        {tabs.map((label, i) => (
          <div key={i} style={{
            flex: 1, padding: '10px 12px', borderRadius: 10,
            background: i === 1 ? t.red : 'transparent',
            color: i === 1 ? '#fff' : t.ink2,
            border: i === 1 ? 'none' : `1px solid ${t.border}`,
            fontSize: 13, fontWeight: 600, textAlign:'center',
          }}>{label}</div>
        ))}
      </div>
      {/* Day selector */}
      <div style={{ padding: '0 20px 12px', display:'flex', gap: 6, fontSize: 11, fontFamily: t.fontMono, fontWeight: 700, letterSpacing: 0.5 }}>
        {['Mon-Fri','Sat','Sun'].map((d,i)=>(
          <div key={i} style={{
            padding:'6px 10px', borderRadius: 999,
            background: i===0 ? (dark ? 'rgba(244,236,224,0.08)' : 'rgba(26,31,46,0.06)') : 'transparent',
            color: i===0 ? t.ink : t.ink3,
          }}>{d.toUpperCase()}</div>
        ))}
        <div style={{ flex: 1 }}/>
        <div style={{ color: t.ink3, alignSelf:'center', fontFamily: t.fontText, fontSize: 11, fontWeight: 500 }}>now: 18:42</div>
      </div>
      <div style={{ height: 1, background: t.border, margin: '0 20px 8px' }}/>
      {/* Timetable */}
      <div style={{ padding: '0 20px', maxHeight: 480, overflow: 'hidden' }}>
        {sched.map((row, i) => (
          <div key={i} style={{ display:'flex', alignItems:'flex-start', gap: 14, padding: '10px 0', borderBottom: `1px solid ${t.border}` }}>
            <div style={{
              fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 22, color: t.ink,
              fontVariantNumeric:'tabular-nums', letterSpacing: -0.6, minWidth: 36,
            }}>{String(row.hour).padStart(2,'0')}</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap: 6, paddingTop: 4 }}>
              {row.mins.map((m,j)=>(
                <span key={j} style={{
                  fontFamily: t.fontMono, fontSize: 12, color: t.ink2, fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                  padding: '2px 6px', borderRadius: 6,
                  background: dark ? 'rgba(244,236,224,0.05)' : 'rgba(26,31,46,0.04)',
                }}>{m}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Shell>
  );
};

// =======================================================================
// Q9 — Service alerts placement (disruption shown for tram 41)
// A: top banner at the top of the route detail
// B: inline in the schematic where the disruption hits
// C: badge on the route badge + tap to expand a small alert sheet
// =======================================================================

const ALERT_TEXT = 'Tram 41 reroutes via Drumul Sării — overhead works · until Fri, 22:00';

const Q9A = ({ dark }) => {
  const t = T(dark);
  return (
    <Shell dark={dark}>
      <RouteHeader dark={dark}>
        <div style={{ fontSize: 12, color: t.ink2, marginTop: 1 }}>→ Pipera</div>
      </RouteHeader>
      {/* Top alert banner */}
      <div style={{ margin:'0 16px 12px', padding:'12px 14px', borderRadius: 14,
                    background: dark ? 'rgba(245,197,24,0.12)' : 'rgba(245,197,24,0.18)',
                    border: `1px solid ${dark ? 'rgba(245,197,24,0.3)' : 'rgba(245,197,24,0.5)'}`,
                    display:'flex', alignItems:'flex-start', gap: 10 }}>
        <div style={{ width: 22, height: 22, borderRadius: 11, background: t.yellow,
                      color: t.bg, display:'flex', alignItems:'center', justifyContent:'center',
                      fontWeight: 800, fontSize: 14, flexShrink: 0 }}>!</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: t.ink, fontWeight: 700, marginBottom: 2 }}>Service alert</div>
          <div style={{ fontSize: 12, color: t.ink2, lineHeight: 1.4 }}>{ALERT_TEXT}</div>
        </div>
      </div>
      <div style={{ height: 1, background: t.border, margin: '0 20px' }}/>
      <div style={{ padding:'14px 24px 8px', fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700 }}>
        Stops · → Pipera
      </div>
      <MultiSchematic dark={dark} stops={MultiStops(true)}/>
    </Shell>
  );
};

const Q9B = ({ dark }) => {
  const t = T(dark);
  // Inject inline alert AT a specific stop in the schematic
  const stops = MultiStops(true);
  return (
    <Shell dark={dark}>
      <RouteHeader dark={dark}>
        <div style={{ fontSize: 12, color: t.ink2, marginTop: 1 }}>→ Pipera</div>
      </RouteHeader>
      <div style={{ height: 1, background: t.border, margin: '0 20px' }}/>
      <div style={{ padding:'14px 24px 8px', fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700 }}>
        Stops · → Pipera
      </div>
      {/* Schematic w/ inline alert injected after Eroilor (idx 4) */}
      <div style={{ padding: '0 24px', position: 'relative' }}>
        <div style={{ position:'absolute', left: 32, top: 0, bottom: 0, width: 2, background: t.border }}/>
        {stops.map((s,i) => (
          <React.Fragment key={i}>
            <div style={{ display:'flex', alignItems:'center', gap: 14, padding: '8px 0', position:'relative' }}>
              <div style={{
                width: 14, height: 14, borderRadius: 7, marginLeft: 17, position:'relative', zIndex: 1,
                background: s.you ? t.red : t.surface,
                border: `2px solid ${s.you ? t.red : t.ink3}`,
                flexShrink: 0,
              }}/>
              {s.vehicle && (
                <div style={{ position:'absolute', left: 0, display:'flex', alignItems:'center', gap: 4 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 11, background: t.red, border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <span style={{ fontSize: 11, color:'#fff' }}>🚊</span>
                  </div>
                  <div style={{ background: t.red, color:'#fff', fontFamily: t.fontMono, fontSize: 9, fontWeight: 700, padding:'2px 6px', borderRadius: 999 }}>{s.vehicle}{s.label && ` · ${s.label}`}</div>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0, paddingLeft: s.vehicle ? 60 : 0 }}>
                <div style={{ fontSize: 14, color: s.you ? t.red : t.ink, fontWeight: s.you ? 700 : 500 }}>{s.name}</div>
                {s.sub && <div style={{ fontSize: 11, color: t.ink3, marginTop: 1 }}>{s.sub}</div>}
                {s.you && <div style={{ fontSize: 11, color: t.red, fontWeight: 600, marginTop: 1 }}>Your stop</div>}
              </div>
              {s.eta != null && (
                <div style={{ textAlign:'right' }}>
                  <span style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 16, color: s.you ? t.red : t.ink, fontVariantNumeric:'tabular-nums', letterSpacing: -0.4 }}>{s.eta}</span>
                  <span style={{ fontSize: 11, color: t.ink3, marginLeft: 2 }}>min</span>
                </div>
              )}
            </div>
            {/* Inline alert injected between Eroilor (4) and Operă (5) */}
            {i === 4 && (
              <div style={{
                margin: '4px 0 4px 28px', padding: '8px 12px', borderRadius: 10,
                background: dark ? 'rgba(245,197,24,0.12)' : 'rgba(245,197,24,0.18)',
                border: `1px dashed ${t.yellow}`,
                display:'flex', alignItems:'flex-start', gap: 8,
              }}>
                <span style={{ color: t.yellow, fontWeight: 800, fontSize: 13 }}>!</span>
                <div style={{ fontSize: 11, color: t.ink2, lineHeight: 1.4 }}>
                  <strong style={{ color: t.ink }}>Reroute through here</strong> — overhead works on Bd. Magheru. Skips Operă & Universitate.
                </div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </Shell>
  );
};

const Q9C = ({ dark }) => {
  const t = T(dark);
  return (
    <Shell dark={dark}>
      <div style={{ padding:'60px 16px 14px', display:'flex', alignItems:'center', gap: 12 }}>
        <div style={{ width:36,height:36,borderRadius:18,background:t.surface2,border:`1px solid ${t.border}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <span style={{ display:'inline-block', transform:'rotate(180deg)' }}><I.IconArrow size={16} c={t.ink}/></span>
        </div>
        {/* Route badge w/ alert dot */}
        <div style={{ position:'relative' }}>
          <RouteBadge num="41" mode="tram" dark={dark} size="lg"/>
          <div style={{
            position:'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: 8,
            background: t.yellow, color: t.bg, fontWeight: 800, fontSize: 11,
            display:'flex', alignItems:'center', justifyContent:'center',
            border: `2px solid ${t.surface}`,
          }}>!</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 18, color: t.ink, letterSpacing: -0.4 }}>Tram 41</div>
          <div style={{ fontSize: 12, color: t.yellow, marginTop: 1, fontWeight: 600 }}>1 active alert · tap to read</div>
        </div>
      </div>
      <div style={{ height: 1, background: t.border, margin: '0 20px' }}/>
      <div style={{ padding:'14px 24px 8px', fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700 }}>
        Stops · → Pipera
      </div>
      <MultiSchematic dark={dark} stops={MultiStops(true)}/>
      {/* Bottom-pinned alert pill (collapsed sheet hint) */}
      <div style={{
        position:'absolute', bottom: 24, left: 16, right: 16,
        padding:'10px 14px', borderRadius: 14,
        background: t.yellow, color: t.bg,
        boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
        display:'flex', alignItems:'center', gap: 10,
      }}>
        <span style={{ fontWeight: 800, fontSize: 14 }}>!</span>
        <span style={{ flex: 1, fontSize: 12, fontWeight: 600 }}>Reroute via Drumul Sării — until Fri, 22:00</span>
        <span style={{ fontSize: 11, fontFamily: t.fontMono, fontWeight: 700, opacity: 0.8 }}>READ ↑</span>
      </div>
    </Shell>
  );
};

Object.assign(window, { Q1A, Q1B, Q1C, Q2A, Q2B, Q3A, Q3B, Q3C, Q5A, Q5B, Q6A, Q6B, Q7A, Q7B, Q8A, Q8B, Q9A, Q9B, Q9C });
