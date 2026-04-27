// MyStb screen mocks — Home / Search / Stop detail / Plan / Saved
// Each export is a full-bleed iPhone screen (402×874). All static.
// Uses atoms from atoms.jsx (theme, icons, RouteBadge, LiveDot, TabBar, BucharestMap).

const T = window.mystbTheme;
const I = window.mystbIcons;
const { RouteBadge, LiveDot, TabBar, BucharestMap } = window;

// ─────────────── Shared shells ───────────────
const ScreenShell = ({ dark, children, tab = null }) => {
  const t = T(dark);
  return (
    <div style={{
      width: 402, height: 874, position: 'relative', overflow: 'hidden',
      background: t.surface, color: t.ink, fontFamily: t.fontText,
    }}>
      {children}
      {tab && <TabBar active={tab} dark={dark}/>}
    </div>
  );
};

const TopGreeting = ({ dark, name = 'Andrei', sub = 'Tuesday · 18:42' }) => {
  const t = T(dark);
  return (
    <div style={{ padding: '64px 20px 14px' }}>
      <div style={{ fontSize: 13, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 0.6, textTransform: 'uppercase' }}>{sub}</div>
      <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 32, lineHeight: 1.05, letterSpacing: -1, marginTop: 4, color: t.ink }}>
        Hi, {name}.
      </div>
    </div>
  );
};

const SectionLabel = ({ dark, children, action }) => {
  const t = T(dark);
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 20px', marginBottom: 8 }}>
      <span style={{ fontFamily: t.fontMono, fontSize: 11, fontWeight: 700, color: t.ink3, letterSpacing: 1, textTransform: 'uppercase' }}>{children}</span>
      {action && <span style={{ fontSize: 12, color: t.ink2, fontWeight: 500 }}>{action}</span>}
    </div>
  );
};

// =====================================================================
// HOME — Variation A: Map-first w/ peek sheet (default mode)
// =====================================================================
const HomeA = ({ dark }) => {
  const t = T(dark);
  return (
    <ScreenShell dark={dark} tab="home">
      {/* Map fills upper 55% */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 480, overflow: 'hidden' }}>
        <BucharestMap dark={dark} height={480}/>
        {/* Search pill overlay */}
        <div style={{ position: 'absolute', top: 60, left: 16, right: 16, display: 'flex', gap: 10 }}>
          <div style={{
            flex: 1, height: 44, background: t.surface2, borderRadius: 22, display: 'flex', alignItems: 'center', gap: 10,
            padding: '0 14px', boxShadow: t.shadow, border: `1px solid ${t.border}`,
          }}>
            <I.IconSearch size={18} c={t.ink3}/>
            <span style={{ color: t.ink3, fontSize: 14 }}>Where to?</span>
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: 22, background: t.surface2, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: t.shadow, border: `1px solid ${t.border}`, color: t.ink,
          }}>
            <I.IconLocationDot size={20} c={t.red}/>
          </div>
        </div>
      </div>

      {/* Bottom sheet — peeking up */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 80, top: 430,
        background: t.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24,
        boxShadow: dark ? '0 -10px 40px rgba(0,0,0,0.5)' : '0 -10px 40px rgba(26,31,46,0.10)',
        paddingTop: 8, overflow: 'hidden',
      }}>
        <div style={{ width: 40, height: 5, borderRadius: 3, background: t.ink3, opacity: 0.3, margin: '4px auto 16px' }}/>

        {/* "At your closest stop" */}
        <div style={{ padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
              <LiveDot/> Live · at your stop
            </div>
            <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 22, color: t.ink, letterSpacing: -0.5, marginTop: 4 }}>
              Piața Romană
            </div>
            <div style={{ fontSize: 12, color: t.ink3, marginTop: 2 }}>120 m · 2 min walk</div>
          </div>
          <I.IconChevR size={20} c={t.ink3}/>
        </div>

        {/* Arrival rows */}
        {[
          { num: '41',  mode: 'tram',  to: 'Drumul Taberei', eta: '3',  next: '11 · 19', live: true },
          { num: '178', mode: 'bus',   to: 'Obor',            eta: '6',  next: '14 · 26', live: true },
          { num: '79',  mode: 'trolley', to: 'Republica',       eta: '12', next: '24',     live: false },
        ].map((r, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px',
            borderTop: `1px solid ${t.border}`,
          }}>
            <RouteBadge num={r.num} mode={r.mode} dark={dark} size="md"/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, color: t.ink, fontWeight: 600 }}>to {r.to}</div>
              <div style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, marginTop: 2 }}>then {r.next} min</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{
                fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 28, color: r.live ? t.red : t.ink,
                fontVariantNumeric: 'tabular-nums', letterSpacing: -1,
              }}>{r.eta}</span>
              <span style={{ fontSize: 11, color: t.ink3, marginLeft: 3 }}>min</span>
            </div>
          </div>
        ))}
      </div>
    </ScreenShell>
  );
};

// =====================================================================
// HOME — Variation B: Saved routes hero (data-rich, no map until tap)
// =====================================================================
const HomeB = ({ dark }) => {
  const t = T(dark);
  const saved = [
    { nick: 'Home stop',  Icon: I.IconHome,    place: 'Piața Romană',          routes: [{n:'41',m:'tram'},{n:'178',m:'bus'}], next: 3, live: true },
    { nick: 'Work stop',  Icon: I.IconBriefcase, place: 'Aviatorilor',          routes: [{n:'M2',m:'m2'},{n:'301',m:'bus'}],   next: 7, live: true },
    { nick: 'Gym',        Icon: I.IconDumbbell, place: 'Universitate',          routes: [{n:'M2',m:'m2'},{n:'M3',m:'m3'}],     next: 11, live: false },
    { nick: 'Mum\u2019s',  Icon: I.IconHeart,    place: 'Obor',                  routes: [{n:'21',m:'tram'},{n:'253',m:'bus'}], next: 18, live: false },
  ];
  return (
    <ScreenShell dark={dark} tab="home">
      <TopGreeting dark={dark}/>
      <SectionLabel dark={dark}>Your stops · live</SectionLabel>
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {saved.map((s, i) => (
          <div key={i} style={{
            background: s.live ? t.liveTint : t.surface2,
            borderRadius: 16, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 14, boxShadow: t.shadow,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, background: dark ? 'rgba(244,236,224,0.06)' : 'rgba(26,31,46,0.04)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.ink, flexShrink: 0,
            }}>
              <s.Icon size={22} c={t.ink}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 17, color: t.ink, letterSpacing: -0.3 }}>{s.nick}</span>
                {s.live && <LiveDot/>}
              </div>
              <div style={{ fontSize: 12, color: t.ink3, marginTop: 2 }}>{s.place}</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {s.routes.map((r, j) => <RouteBadge key={j} num={r.n} mode={r.m} dark={dark} size="sm"/>)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 32, color: s.live ? t.red : t.ink,
                fontVariantNumeric: 'tabular-nums', letterSpacing: -1.2, lineHeight: 1,
              }}>{s.next}</div>
              <div style={{ fontSize: 10, color: t.ink3, marginTop: 1 }}>min</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '20px 20px 8px' }}>
        <SectionLabel dark={dark}>Quick plan</SectionLabel>
      </div>
      <div style={{ padding: '0 16px', display: 'flex', gap: 10 }}>
        {[{l:'Home',I:I.IconHome,t:'12 min'},{l:'Work',I:I.IconBriefcase,t:'24 min'},{l:'Mum\u2019s',I:I.IconHeart,t:'31 min'}].map((q,i)=>(
          <div key={i} style={{
            flex: 1, background: t.surface2, borderRadius: 14, padding: 14, boxShadow: t.shadow,
          }}>
            <q.I size={20} c={t.red}/>
            <div style={{ fontFamily: t.fontDisplay, fontWeight: 600, fontSize: 14, color: t.ink, marginTop: 8 }}>{q.l}</div>
            <div style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, marginTop: 2 }}>{q.t}</div>
          </div>
        ))}
      </div>
    </ScreenShell>
  );
};

// =====================================================================
// HOME — Variation C: Editorial / large numeric hero
// =====================================================================
const HomeC = ({ dark }) => {
  const t = T(dark);
  return (
    <ScreenShell dark={dark} tab="home">
      <div style={{ padding: '64px 20px 20px' }}>
        <div style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform: 'uppercase' }}>
          Tuesday, 18:42
        </div>
      </div>
      {/* Hero number */}
      <div style={{ padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <RouteBadge num="41" mode="tram" dark={dark} size="md"/>
          <span style={{ fontSize: 14, color: t.ink2 }}>arriving at <strong style={{ color: t.ink }}>Piața Romană</strong></span>
        </div>
        <div style={{
          fontFamily: t.fontDisplay, fontWeight: 800, fontStretch: '90%',
          fontSize: 180, lineHeight: 0.85, letterSpacing: -8, color: t.red,
          fontVariantNumeric: 'tabular-nums',
        }}>3</div>
        <div style={{ fontFamily: t.fontDisplay, fontWeight: 500, fontSize: 28, color: t.ink, letterSpacing: -0.6, marginTop: -8 }}>
          minutes — towards Drumul Taberei
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: 12, color: t.ink3, fontFamily: t.fontMono }}>
          <LiveDot/> LIVE · 8 stops away · running on time
        </div>
      </div>

      {/* Then... */}
      <div style={{ padding: '32px 20px 0' }}>
        <SectionLabel dark={dark}>Then</SectionLabel>
      </div>
      <div style={{ padding: '0 20px' }}>
        {[
          { num:'178', m:'bus', to:'Obor', eta:6 },
          { num:'79',  m:'trolley', to:'Republica', eta:12 },
          { num:'M2',  m:'m2', to:'Pipera', eta:14 },
        ].map((r,i)=>(
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0',
            borderBottom: `1px solid ${t.border}`,
          }}>
            <RouteBadge num={r.num} mode={r.m} dark={dark} size="sm"/>
            <span style={{ flex: 1, fontSize: 14, color: t.ink2 }}>to {r.to}</span>
            <span style={{
              fontFamily: t.fontMono, fontSize: 16, fontWeight: 600, color: t.ink,
              fontVariantNumeric: 'tabular-nums',
            }}>{r.eta} min</span>
          </div>
        ))}
      </div>
    </ScreenShell>
  );
};

// =====================================================================
// SEARCH — Variation A: Active typing, mixed results
// =====================================================================
const SearchA = ({ dark }) => {
  const t = T(dark);
  return (
    <ScreenShell dark={dark}>
      <div style={{ padding: '60px 16px 0', display:'flex', alignItems:'center', gap: 10 }}>
        <div style={{
          flex: 1, height: 48, background: t.surface2, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 14px', border: `1px solid ${t.border}`,
        }}>
          <I.IconSearch size={20} c={t.ink3}/>
          <span style={{ flex: 1, fontSize: 16, color: t.ink, fontFamily: t.fontText }}>univ</span>
          <span style={{ width: 1.5, height: 18, background: t.red, animation: 'mystb-pulse 1s steps(2) infinite' }}/>
          <I.IconClose size={18} c={t.ink3}/>
        </div>
        <span style={{ padding:'0 4px', fontSize: 15, color: t.ink2, fontWeight: 500 }}>Cancel</span>
      </div>

      <div style={{ padding: '20px 0 0' }}>
        <SectionLabel dark={dark}>Stops</SectionLabel>
        {[
          { name:'Piața Universității', lines:['M2','41','79'], dist:'320 m', kind: 'metro' },
          { name:'Universitate (P-ța Universității)', lines:['M2','M3'], dist:'350 m', kind: 'metro' },
          { name:'Universitatea Politehnica', lines:['M3','601'], dist:'1.4 km', kind: 'metro' },
        ].map((s,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 20px', borderTop: `1px solid ${t.border}` }}>
            <I.IconStop size={22} c={t.ink2}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:15, color:t.ink, fontWeight:500 }}>
                <span style={{ background: dark ? 'rgba(245,197,24,0.18)' : 'rgba(245,197,24,0.4)', padding:'1px 2px' }}>Univ</span>{s.name.replace(/^Univ/,'').replace(/^Univ.*[ăţ]/, m=>m.slice(4))}
              </div>
              <div style={{ display:'flex', gap:6, marginTop:4, alignItems:'center' }}>
                {s.lines.map((l,j)=>{
                  const m = l.startsWith('M') ? l.toLowerCase() : (Number(l) > 100 ? 'bus' : 'tram');
                  return <RouteBadge key={j} num={l} mode={m} dark={dark} size="sm"/>;
                })}
                <span style={{ fontSize:11, color:t.ink3, fontFamily:t.fontMono, marginLeft:'auto' }}>{s.dist}</span>
              </div>
            </div>
          </div>
        ))}

        <div style={{ marginTop: 18 }}><SectionLabel dark={dark}>Places</SectionLabel></div>
        {[
          { name:'Universitatea București', sub:'Bd. Mihail Kogălniceanu 36', dist:'380 m', I:I.IconBook },
          { name:'University Plaza Mall', sub:'Calea Floreasca', dist:'4.2 km', I:I.IconShop },
        ].map((p,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 20px', borderTop: `1px solid ${t.border}` }}>
            <p.I size={22} c={t.ink2}/>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:15, color:t.ink, fontWeight:500 }}>
                <span style={{ background: dark ? 'rgba(245,197,24,0.18)' : 'rgba(245,197,24,0.4)', padding:'1px 2px' }}>Univ</span>{p.name.replace(/^Univ/, '')}
              </div>
              <div style={{ fontSize:12, color:t.ink3, marginTop:2 }}>{p.sub}</div>
            </div>
            <span style={{ fontSize:11, color:t.ink3, fontFamily:t.fontMono }}>{p.dist}</span>
          </div>
        ))}

        <div style={{ marginTop: 18 }}><SectionLabel dark={dark}>Routes</SectionLabel></div>
        {[
          { num:'M2', m:'m2', name:'Berceni — Pipera' },
        ].map((r,i)=>(
          <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 20px', borderTop: `1px solid ${t.border}` }}>
            <RouteBadge num={r.num} mode={r.m} dark={dark} size="md"/>
            <div style={{ flex:1, fontSize:14, color:t.ink }}>{r.name}</div>
            <I.IconChevR size={18} c={t.ink3}/>
          </div>
        ))}
      </div>
    </ScreenShell>
  );
};

// =====================================================================
// SEARCH — Variation B: Empty / browse state with quick-access tiles
// =====================================================================
const SearchB = ({ dark, afterTen = false }) => {
  const t = T(dark);
  return (
    <ScreenShell dark={dark}>
      {/* Compact header w/ close (search is fullscreen modal from Home) */}
      <div style={{ padding: '60px 16px 0', display:'flex', alignItems:'center', gap:10 }}>
        <div style={{
          flex: 1, height: 48, background: t.surface2, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 14px', border: `1px solid ${t.border}`,
        }}>
          <I.IconSearch size={20} c={t.ink3}/>
          <span style={{ flex:1, fontSize: 16, color: t.ink3 }}>Search stops, routes, places…</span>
        </div>
        <span style={{ padding:'0 4px', fontSize: 15, color: t.ink2, fontWeight: 500 }}>Cancel</span>
      </div>

      {/* After-22:00 night prompt — only shown after that local time */}
      {afterTen && (
        <div style={{ margin: '16px 16px 0', padding: '12px 14px', borderRadius: 14,
                      background: dark ? 'rgba(245,197,24,0.10)' : 'rgba(245,197,24,0.18)',
                      border: `1px solid ${dark ? 'rgba(245,197,24,0.25)' : 'rgba(245,197,24,0.45)'}`,
                      display:'flex', alignItems:'center', gap: 12 }}>
          <I.IconClock size={20} c={t.yellow}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: t.ink, fontWeight: 600 }}>Night network is running</div>
            <div style={{ fontSize: 12, color: t.ink2, marginTop: 1 }}>Plan with night routes only</div>
          </div>
          <span style={{ fontSize: 12, color: t.red, fontWeight: 600 }}>Use →</span>
        </div>
      )}

      <div style={{ padding: '24px 20px 8px' }}><SectionLabel dark={dark}>Quick access</SectionLabel></div>
      <div style={{ padding: '0 16px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 10 }}>
        {[
          { l:'Home',    s:'Piața Romană',    I:I.IconHome,      enabled: true },
          { l:'Work',    s:'Aviatorilor',     I:I.IconBriefcase, enabled: true },
          { l:'Tonight', s:'After 22:00',     I:I.IconClock,     enabled: false },
        ].map((q,i)=>(
          <div key={i} style={{
            background: t.surface2, borderRadius: 16, padding: 12, boxShadow: q.enabled ? t.shadow : 'none',
            opacity: q.enabled ? 1 : 0.42, position: 'relative',
          }}>
            <q.I size={20} c={q.enabled ? t.red : t.ink3}/>
            <div style={{ fontFamily: t.fontDisplay, fontWeight: 600, fontSize: 14, color: t.ink, marginTop: 10, letterSpacing: -0.3 }}>{q.l}</div>
            <div style={{ fontSize: 11, color: t.ink3, marginTop: 2 }}>{q.s}</div>
            {!q.enabled && (
              <div style={{
                position:'absolute', top: 10, right: 10,
                fontSize: 9, fontFamily: t.fontMono, fontWeight: 700, color: t.ink3,
                letterSpacing: 0.6, textTransform: 'uppercase',
                padding:'2px 6px', borderRadius: 999, border:`1px solid ${t.border}`,
              }}>Soon</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ padding: '24px 20px 8px' }}><SectionLabel dark={dark}>Recent</SectionLabel></div>
      {[
        { name:'Piața Unirii', sub:'M1 · M2 · M3 · 6 lines', I:I.IconStop },
        { name:'Athénée Palace', sub:'Bd. Victoriei', I:I.IconShop },
        { name:'Tram 41 — Drumul Taberei → Pipera', sub:'Yesterday · 19:14', I:I.IconRoute },
      ].map((r,i)=>(
        <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'12px 20px', borderTop: `1px solid ${t.border}` }}>
          <r.I size={22} c={t.ink2}/>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:15, color:t.ink, fontWeight:500 }}>{r.name}</div>
            <div style={{ fontSize:12, color:t.ink3, marginTop:2 }}>{r.sub}</div>
          </div>
          <I.IconChevR size={18} c={t.ink3}/>
        </div>
      ))}

      <div style={{ padding: '24px 20px 8px' }}><SectionLabel dark={dark}>Popular routes</SectionLabel></div>
      <div style={{ padding: '0 20px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[['41','tram'],['178','bus'],['M2','m2'],['79','trolley'],['M3','m3'],['336','bus']].map(([n,m],i)=>(
          <RouteBadge key={i} num={n} mode={m} dark={dark} size="md"/>
        ))}
      </div>
    </ScreenShell>
  );
};

// =====================================================================
// STOP / ROUTE DETAIL — Var A: Stop with all live arrivals
// =====================================================================
// STOP DETAIL — final per Q1-Q5 decisions
// Q1 ETA order · Q2 both directions per row · Q3 inline expand on tap
// Q4 no notifications · Q5 walk time + distance in header
// =====================================================================
const StopDetailA = ({ dark }) => {
  const t = T(dark);
  // Both-directions data per Q2B
  const arrivals = [
    { num:'M2',  m:'m2',      a:{ to:'Pipera',         eta:'<1', live:true  }, b:{ to:'Berceni',        eta:4,  live:true  } },
    { num:'41',  m:'tram',    a:{ to:'Drumul Taberei', eta:3,    live:true  }, b:{ to:'Pipera',         eta:9,  live:true  }, expanded:true },
    { num:'178', m:'bus',     a:{ to:'Obor',           eta:6,    live:true  }, b:{ to:'Pța. Sudului',   eta:13, live:true  } },
    { num:'79',  m:'trolley', a:{ to:'Republica',      eta:12,   live:true  }, b:{ to:'Bucureștii Noi', eta:8,  live:true  } },
    { num:'301', m:'bus',     a:{ to:'Pantelimon',     eta:18,   live:false }, b:{ to:'Pța. Romană',    eta:22, live:false } },
  ];

  // 2-direction row (Q2B)
  const TwoWayRow = ({ row }) => {
    const Side = ({ d, side }) => (
      <div style={{ flex:1, display:'flex', alignItems:'center', gap: 8, minWidth: 0 }}>
        <span style={{ fontSize: 14, color: t.ink3, fontFamily: t.fontMono, fontWeight: 700 }}>{side}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12, color: t.ink, fontWeight: 600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.to}</div>
          <div style={{
            fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 22, color: d.live ? t.red : t.ink,
            fontVariantNumeric:'tabular-nums', letterSpacing: -0.6, lineHeight: 1.05,
          }}>{d.eta}<span style={{ fontSize: 10, color: t.ink3, marginLeft: 2, fontWeight: 500 }}>min</span></div>
        </div>
      </div>
    );
    return (
      <div style={{
        background: row.a.live || row.b.live ? t.liveTint : t.surface2,
        borderRadius: 14, padding: '10px 12px',
        display:'flex', alignItems:'center', gap: 10, boxShadow: t.shadow,
      }}>
        <RouteBadge num={row.num} mode={row.m} dark={dark} size="md"/>
        <Side d={row.a} side="←"/>
        <div style={{ width: 1, height: 32, background: t.border }}/>
        <Side d={row.b} side="→"/>
      </div>
    );
  };

  // Q3B expanded card for Tram 41
  const ExpandedCard = ({ row }) => (
    <div style={{ background: t.liveTint, borderRadius: 14, boxShadow: t.shadow, overflow: 'hidden',
                  border: `2px solid ${t.red}` }}>
      {/* Top: same as TwoWayRow but with chevron */}
      <div style={{ padding: '10px 12px', display:'flex', alignItems:'center', gap: 10 }}>
        <RouteBadge num={row.num} mode={row.m} dark={dark} size="md"/>
        <div style={{ flex:1, display:'flex', alignItems:'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: t.ink3, fontFamily: t.fontMono, fontWeight: 700 }}>←</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, color: t.ink, fontWeight: 600 }}>{row.a.to}</div>
            <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 22, color: t.red, fontVariantNumeric:'tabular-nums', letterSpacing: -0.6, lineHeight: 1.05 }}>
              {row.a.eta}<span style={{ fontSize: 10, color: t.ink3, marginLeft: 2, fontWeight: 500 }}>min</span>
            </div>
          </div>
        </div>
        <div style={{ width: 1, height: 32, background: t.border }}/>
        <div style={{ flex:1, display:'flex', alignItems:'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: t.ink3, fontFamily: t.fontMono, fontWeight: 700 }}>→</span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 12, color: t.ink, fontWeight: 600 }}>{row.b.to}</div>
            <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 22, color: t.red, fontVariantNumeric:'tabular-nums', letterSpacing: -0.6, lineHeight: 1.05 }}>
              {row.b.eta}<span style={{ fontSize: 10, color: t.ink3, marginLeft: 2, fontWeight: 500 }}>min</span>
            </div>
          </div>
        </div>
        <div style={{ transform: 'rotate(90deg)', color: t.ink2 }}><I.IconChevR size={14} c={t.ink2}/></div>
      </div>
      {/* Mini-map showing the next vehicle */}
      <div style={{ height: 120, position:'relative', borderTop: `1px solid ${t.border}` }}>
        <BucharestMap dark={dark} height={120}/>
        <div style={{ position:'absolute', top:'50%', left:'40%', width: 14, height: 14, borderRadius: 7, background: t.red, transform:'translate(-50%,-50%)', boxShadow:'0 0 0 4px rgba(212,49,15,0.3)' }}/>
        <div style={{ position:'absolute', top:'42%', left:'48%', padding:'2px 6px', background: t.red, color:'#fff', borderRadius: 999, fontFamily: t.fontMono, fontSize: 9, fontWeight: 700 }}>3 min · next</div>
      </div>
      {/* Following departures · both directions */}
      <div style={{ padding:'10px 14px', borderTop: `1px solid ${t.border}` }}>
        <div style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700, marginBottom: 6 }}>
          Following · ← Drumul Taberei
        </div>
        <div style={{ display:'flex', gap: 14 }}>
          {[11,19,28].map((n,i)=>(
            <div key={i}>
              <span style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 17, color: t.ink, fontVariantNumeric:'tabular-nums' }}>{n}</span>
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
      </div>
    </div>
  );

  return (
    <ScreenShell dark={dark}>
      {/* Compact header (no map hero — keep focus on the list) */}
      <div style={{ padding: '60px 20px 14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 14 }}>
          <div style={{ width:36,height:36,borderRadius:18,background:t.surface2,border:`1px solid ${t.border}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <span style={{ display:'inline-block', transform:'rotate(180deg)' }}><I.IconArrow size={16} c={t.ink}/></span>
          </div>
          <div style={{ display:'flex', gap: 8 }}>
            <div style={{ width:36,height:36,borderRadius:18,background:t.surface2,border:`1px solid ${t.border}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <I.IconShare size={16} c={t.ink}/>
            </div>
            <div style={{ width:36,height:36,borderRadius:18,background:t.red,display:'flex',alignItems:'center',justifyContent:'center'}}><I.IconBookmark size={16} c="#fff"/></div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase' }}>Stop · 1180</div>
        <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 30, color: t.ink, letterSpacing: -1, marginTop: 4 }}>Piața Romană</div>
        {/* Q5B walk-time header */}
        <div style={{ fontSize: 13, marginTop: 4, display:'inline-flex', alignItems:'center', gap: 6, flexWrap:'wrap' }}>
          <I.IconWalk size={14} c={t.ink2}/>
          <strong style={{ fontWeight: 700, color: t.ink }}>2 min walk</strong>
          <span style={{ color: t.ink3 }}>· 120 m · 5 lines</span>
        </div>
      </div>

      <div style={{ height: 1, background: t.border, margin: '0 20px' }}/>

      <div style={{ padding:'14px 24px 8px', display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
        <span style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700 }}>
          Arrivals · both directions
        </span>
        <span style={{ fontSize: 11, color: t.ink3, display:'inline-flex', alignItems:'center', gap: 4 }}>
          <LiveDot/> Live · 18:42
        </span>
      </div>

      {/* Live arrivals list — Q1 ETA order · Q2 two-way rows · Q3 one expanded */}
      <div style={{ padding: '0 16px', display:'flex', flexDirection:'column', gap: 8 }}>
        {arrivals.map((row, i) => row.expanded ? <ExpandedCard key={i} row={row}/> : <TwoWayRow key={i} row={row}/>)}
      </div>
      <div style={{ height: 40 }}/>
    </ScreenShell>
  );
};

// =====================================================================
// ROUTE DETAIL — final per Q6-Q9 decisions
// Q6 reverse pill · Q7 all vehicles w/ ETA · Q8 no schedule · Q9 top alert banner
// =====================================================================
const RouteDetailB = ({ dark }) => {
  const t = T(dark);
  // Vehicles attached to specific stops along the line
  const stops = [
    { name:'Drumul Taberei', sub:'Terminus' },
    { name:'Valea Ialomiței', vehicle:'14m' },
    { name:'Brașov' },
    { name:'Răzoare' },
    { name:'Eroilor', vehicle:'8m' },
    { name:'Operă' },
    { name:'Universitate', vehicle:'3m', label:'next' },
    { name:'Piața Romană', you:true, eta:3 },
    { name:'Iancului', eta:6 },
    { name:'Pipera', sub:'Terminus', eta:12 },
  ];
  return (
    <ScreenShell dark={dark}>
      {/* Header */}
      <div style={{ padding:'60px 16px 14px', display:'flex', alignItems:'center', gap: 12 }}>
        <div style={{ width:36,height:36,borderRadius:18,background:t.surface2,border:`1px solid ${t.border}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <span style={{ display:'inline-block', transform:'rotate(180deg)' }}><I.IconArrow size={16} c={t.ink}/></span>
        </div>
        <RouteBadge num="41" mode="tram" dark={dark} size="lg"/>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 18, color: t.ink, letterSpacing: -0.4 }}>Tram 41</div>
          <div style={{ fontSize: 12, color: t.ink2, marginTop: 1 }}>→ Pipera</div>
        </div>
        <I.IconBookmark size={20} c={t.ink2}/>
      </div>

      {/* Q9A — top service-alert banner */}
      <div style={{ margin:'0 16px 12px', padding:'12px 14px', borderRadius: 14,
                    background: dark ? 'rgba(245,197,24,0.12)' : 'rgba(245,197,24,0.18)',
                    border: `1px solid ${dark ? 'rgba(245,197,24,0.3)' : 'rgba(245,197,24,0.5)'}`,
                    display:'flex', alignItems:'flex-start', gap: 10 }}>
        <div style={{ width: 22, height: 22, borderRadius: 11, background: t.yellow,
                      color: t.bg, display:'flex', alignItems:'center', justifyContent:'center',
                      fontWeight: 800, fontSize: 14, flexShrink: 0 }}>!</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: t.ink, fontWeight: 700, marginBottom: 2 }}>Service alert</div>
          <div style={{ fontSize: 12, color: t.ink2, lineHeight: 1.4 }}>Reroutes via Drumul Sării — overhead works · until Fri, 22:00</div>
        </div>
      </div>

      <div style={{ height: 1, background: t.border, margin: '0 20px' }}/>

      {/* Q6B — section label with compact reverse pill */}
      <div style={{ padding:'14px 24px 8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 1, textTransform:'uppercase', fontWeight:700 }}>
          Stops · 3 vehicles en route
        </span>
        <div style={{ display:'inline-flex', alignItems:'center', gap: 6, padding:'6px 10px', background: t.surface2, borderRadius: 999, border: `1px solid ${t.border}` }}>
          <I.IconSwap size={14} c={t.ink}/>
          <span style={{ fontSize: 11, color: t.ink, fontWeight: 600 }}>Reverse</span>
        </div>
      </div>

      {/* Q7B — all vehicles on the schematic */}
      <div style={{ padding: '0 24px', position: 'relative' }}>
        <div style={{ position:'absolute', left: 32, top: 0, bottom: 0, width: 2, background: t.border }}/>
        {stops.map((s, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap: 14, padding: '8px 0', position:'relative' }}>
            <div style={{
              width: 14, height: 14, borderRadius: 7, marginLeft: 17, position:'relative', zIndex: 1,
              background: s.you ? t.red : t.surface,
              border: `2px solid ${s.you ? t.red : t.ink3}`,
              flexShrink: 0,
            }}/>
            {s.vehicle && (
              <div style={{ position:'absolute', left: 0, display:'flex', alignItems:'center', gap: 4 }}>
                <div style={{ width: 22, height: 22, borderRadius: 11, background: t.red, border:'2px solid #fff', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 2px 6px rgba(212,49,15,0.4)' }}>
                  <span style={{ fontSize: 11, color:'#fff' }}>🚊</span>
                </div>
                <div style={{ background: t.red, color:'#fff', fontFamily: t.fontMono, fontSize: 9, fontWeight: 700, padding:'2px 6px', borderRadius: 999, letterSpacing: 0.3 }}>
                  {s.vehicle}{s.label && ` · ${s.label}`}
                </div>
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
      <div style={{ height: 40 }}/>
    </ScreenShell>
  );
};

// =====================================================================
// PLAN — Variation A: From → To results list
// =====================================================================
const PlanA = ({ dark }) => {
  const t = T(dark);
  return (
    <ScreenShell dark={dark} tab="plan">
      {/* Inputs */}
      <div style={{ padding: '60px 16px 0' }}>
        <div style={{ background: t.surface2, borderRadius: 18, padding: 12, border: `1px solid ${t.border}`, position:'relative' }}>
          {/* From */}
          <div style={{ display:'flex', alignItems:'center', gap: 12, padding: '10px 8px' }}>
            <div style={{ width:10, height:10, borderRadius:5, border:`2.5px solid ${t.ink2}` }}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 0.6, textTransform: 'uppercase' }}>From</div>
              <div style={{ fontSize: 15, color: t.ink, fontWeight: 500 }}>Piața Romană (your stop)</div>
            </div>
          </div>
          {/* connector */}
          <div style={{ position:'absolute', left: 25, top: 36, height: 38, width: 0, borderLeft:`2px dotted ${t.ink3}`, opacity:0.4 }}/>
          <div style={{ height: 1, background: t.border, margin:'2px 8px' }}/>
          {/* To */}
          <div style={{ display:'flex', alignItems:'center', gap: 12, padding: '10px 8px' }}>
            <I.IconLocationDot size={18} c={t.red}/>
            <div style={{ flex:1 }}>
              <div style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 0.6, textTransform: 'uppercase' }}>To</div>
              <div style={{ fontSize: 15, color: t.ink, fontWeight: 500 }}>Aviatorilor (Work stop)</div>
            </div>
            <I.IconSwap size={18} c={t.ink3}/>
          </div>
        </div>

        {/* When chip */}
        <div style={{ display:'flex', gap: 8, marginTop: 12 }}>
          {['Now','Leave at','Arrive by'].map((l,i)=>(
            <div key={i} style={{
              padding:'8px 14px', borderRadius:999,
              background: i===0 ? t.ink : t.surface2, color: i===0 ? t.surface : t.ink2,
              fontSize: 13, fontWeight: 500, border:`1px solid ${i===0 ? t.ink : t.border}`,
            }}>{l}</div>
          ))}
        </div>
      </div>

      <SectionLabel dark={dark} action={<span style={{fontSize:11,fontFamily:t.fontMono,color:t.ink3}}>3 routes</span>}>
        Suggested
      </SectionLabel>

      {/* Result cards */}
      <div style={{ padding: '0 16px', display:'flex', flexDirection:'column', gap: 10 }}>
        {[
          { label:'Fastest', time:'18 min', arr:'19:00', steps:[
              {k:'walk', v:'3'},
              {k:'r', n:'M2', m:'m2', stops: 5},
              {k:'walk', v:'2'},
            ], best:true,
          },
          { label:'No transfer', time:'22 min', arr:'19:04', steps:[
              {k:'walk', v:'5'},
              {k:'r', n:'301', m:'bus', stops: 9},
              {k:'walk', v:'2'},
            ],
          },
          { label:'Walking', time:'34 min', arr:'19:16', steps:[
              {k:'walk', v:'34'},
            ],
          },
        ].map((r,i)=>(
          <div key={i} style={{
            background: r.best ? t.liveTint : t.surface2, borderRadius: 16, padding: '14px 16px',
            boxShadow: t.shadow,
          }}>
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize: 11, color: r.best ? t.red : t.ink3, fontFamily: t.fontMono, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>{r.label}</div>
                <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 28, color: t.ink, letterSpacing: -1, marginTop: 2 }}>{r.time}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono }}>arrives</div>
                <div style={{ fontFamily: t.fontMono, fontSize: 16, fontWeight: 600, color: t.ink, fontVariantNumeric:'tabular-nums' }}>{r.arr}</div>
              </div>
            </div>
            {/* steps */}
            <div style={{ display:'flex', alignItems:'center', gap: 8, marginTop: 12, flexWrap:'wrap' }}>
              {r.steps.map((s, j) => (
                <React.Fragment key={j}>
                  {s.k === 'walk' && (
                    <span style={{ display:'inline-flex',alignItems:'center',gap:4, fontSize:12, color: t.ink2, fontFamily: t.fontMono, fontWeight: 600 }}>
                      <I.IconWalk size={16} c={t.ink2}/>{s.v} min
                    </span>
                  )}
                  {s.k === 'r' && (
                    <span style={{ display:'inline-flex', alignItems:'center', gap: 6 }}>
                      <RouteBadge num={s.n} mode={s.m} dark={dark} size="sm"/>
                      <span style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono }}>{s.stops} stops</span>
                    </span>
                  )}
                  {j < r.steps.length - 1 && <I.IconChevR size={12} c={t.ink3}/>}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ScreenShell>
  );
};

// =====================================================================
// PLAN — Variation B: Step-by-step (one chosen route, expanded)
// =====================================================================
const PlanB = ({ dark }) => {
  const t = T(dark);
  return (
    <ScreenShell dark={dark} tab="plan">
      {/* Mini-map */}
      <div style={{ position:'relative', height: 220, overflow:'hidden' }}>
        <BucharestMap dark={dark} height={220} focus="plan" lines="all"/>
        {/* Drawn route highlight */}
        <svg style={{ position:'absolute', inset: 0 }} viewBox="0 0 402 220" width="100%" height="220">
          <path d="M 50 110 Q 100 100 160 110 Q 230 130 290 90 Q 340 70 380 80"
                stroke={t.red} strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray="0"/>
          <circle cx="50" cy="110" r="7" fill={t.surface} stroke={t.ink} strokeWidth="3"/>
          <circle cx="380" cy="80" r="7" fill={t.red} stroke="#fff" strokeWidth="3"/>
        </svg>
        {/* nav buttons */}
        <div style={{ position:'absolute', top:60, left:16 }}>
          <div style={{ width:40,height:40,borderRadius:20,background:t.surface2,boxShadow:t.shadow,display:'flex',alignItems:'center',justifyContent:'center',border:`1px solid ${t.border}`}}>
            <span style={{ transform:'rotate(180deg)', display:'inline-flex' }}><I.IconArrow size={18} c={t.ink}/></span>
          </div>
        </div>
      </div>

      {/* Header w/ time */}
      <div style={{ padding: '14px 20px 8px' }}>
        <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: t.red, fontFamily: t.fontMono, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>Fastest · arriving 19:00</div>
            <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 36, color: t.ink, letterSpacing: -1.4, marginTop: 2, lineHeight: 1 }}>
              18 min <span style={{ fontSize: 18, color: t.ink3, fontWeight: 500 }}>· 1 transfer</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step list (rail-style) */}
      <div style={{ padding: '12px 20px 0' }}>
        {[
          { k:'start', name:'Piața Romană', sub:'Now · 18:42', dot: t.ink },
          { k:'walk',  v:'3 min', sub:'120 m to platform' },
          { k:'ride',  badge:{n:'M2', m:'m2'}, head:'Pipera', stops: 5, dur:'10 min', leave:'18:46' },
          { k:'stop',  name:'Aviatorilor', sub:'Off · 18:56' },
          { k:'walk',  v:'2 min', sub:'150 m to destination' },
          { k:'end',   name:'Aviatorilor (Work stop)', sub:'Arrive 19:00', dot: t.red },
        ].map((s, i, arr) => (
          <div key={i} style={{ display:'flex', gap: 14, minHeight: s.k==='ride' ? 78 : 48, position:'relative' }}>
            <div style={{ width: 22, position:'relative', flexShrink: 0 }}>
              {i < arr.length - 1 && (
                <div style={{
                  position:'absolute', left: 10, top: 16, bottom: -8, width: 3,
                  background: s.k==='ride' ? (s.badge?.m === 'm2' ? t.metroM2 : t.red) : t.ink3,
                  opacity: s.k==='ride' ? 1 : 0.4,
                }}/>
              )}
              {(s.k==='start' || s.k==='end' || s.k==='stop') && (
                <div style={{
                  position:'absolute', left: 4, top: 6, width: 14, height: 14, borderRadius: 7,
                  background: s.k==='end' ? t.red : t.surface,
                  border: `3px solid ${s.dot || t.ink2}`, boxSizing:'border-box',
                }}/>
              )}
              {s.k==='walk' && (
                <div style={{ position:'absolute', left: 0, top: 6, width: 22, height: 22, display:'flex', alignItems:'center', justifyContent:'center', background: t.surface, borderRadius: 11 }}>
                  <I.IconWalk size={14} c={t.ink2}/>
                </div>
              )}
              {s.k==='ride' && (
                <div style={{ position:'absolute', left: 0, top: 8, width: 22, height: 22, borderRadius: 11, background: s.badge.m === 'm2' ? t.metroM2 : t.red, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontFamily: t.fontMono, fontSize: 9, fontWeight: 700 }}>
                  {s.badge.n}
                </div>
              )}
            </div>
            <div style={{ flex: 1, padding: '4px 0 14px' }}>
              {(s.k==='start' || s.k==='end' || s.k==='stop') && <>
                <div style={{ fontFamily: t.fontDisplay, fontWeight: 600, fontSize: 16, color: t.ink, letterSpacing: -0.3 }}>{s.name}</div>
                <div style={{ fontSize: 12, color: t.ink3, marginTop: 2, fontFamily: t.fontMono }}>{s.sub}</div>
              </>}
              {s.k==='walk' && <>
                <div style={{ fontSize: 14, color: t.ink, fontWeight: 600 }}>Walk · {s.v}</div>
                <div style={{ fontSize: 12, color: t.ink3, marginTop: 2 }}>{s.sub}</div>
              </>}
              {s.k==='ride' && (
                <div style={{ background: t.surface2, borderRadius: 12, padding: 12, border: `1px solid ${t.border}` }}>
                  <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                    <RouteBadge num={s.badge.n} mode={s.badge.m} dark={dark} size="sm"/>
                    <span style={{ fontSize: 14, color: t.ink, fontWeight: 600 }}>towards {s.head}</span>
                  </div>
                  <div style={{ fontSize: 12, color: t.ink3, marginTop: 6, fontFamily: t.fontMono }}>
                    {s.stops} stops · {s.dur} · departs {s.leave}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScreenShell>
  );
};

// =====================================================================
// SAVED — Variation A: Stops with nicknames (editorial)
// =====================================================================
const SavedA = ({ dark }) => {
  const t = T(dark);
  const stops = [
    { nick:'Home stop',  place:'Piața Romană',   I:I.IconHome,    routes:[['41','tram'],['178','bus']],     next: 3,  live: true },
    { nick:'Work stop',  place:'Aviatorilor',    I:I.IconBriefcase, routes:[['M2','m2'],['301','bus']],       next: 7,  live: true },
    { nick:'Gym',        place:'Universitate',   I:I.IconDumbbell, routes:[['M2','m2'],['M3','m3']],         next: 11, live: false },
    { nick:'Dad\u2019s', place:'Obor',           I:I.IconHeart,    routes:[['21','tram'],['253','bus']],     next: 18, live: false },
    { nick:'Library',    place:'Universitate',   I:I.IconBook,     routes:[['M2','m2']],                     next: 11, live: false },
  ];
  return (
    <ScreenShell dark={dark} tab="saved">
      <div style={{ padding: '64px 20px 14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
          <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 34, color: t.ink, letterSpacing: -1.2 }}>Saved</div>
          <div style={{
            width: 36, height: 36, borderRadius: 18, background: t.red, color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}><I.IconPlus size={20} c="#fff"/></div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{ display:'flex', gap: 4, fontFamily: t.fontText, fontSize: 14, fontWeight: 500 }}>
          {['Stops','Routes','Trips'].map((l,i)=>(
            <div key={i} style={{
              padding:'8px 14px', borderRadius: 999,
              background: i===0 ? t.ink : 'transparent', color: i===0 ? t.surface : t.ink3,
            }}>{l} {i===0 && <span style={{ marginLeft: 4, opacity: 0.6 }}>5</span>}</div>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: '0 16px', display:'flex', flexDirection:'column', gap: 8 }}>
        {stops.map((s, i) => (
          <div key={i} style={{
            background: t.surface2, borderRadius: 16, padding: '14px 16px',
            display:'flex', alignItems:'center', gap: 14, boxShadow: t.shadow,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14, background: dark ? 'rgba(244,236,224,0.06)' : 'rgba(26,31,46,0.04)',
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0,
            }}>
              <s.I size={22} c={t.ink}/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display:'flex', alignItems:'center', gap: 8 }}>
                <span style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 17, color: t.ink, letterSpacing: -0.3 }}>{s.nick}</span>
                {s.live && <LiveDot/>}
              </div>
              <div style={{ fontSize: 12, color: t.ink3, marginTop: 2 }}>{s.place}</div>
              <div style={{ display:'flex', gap: 6, marginTop: 8 }}>
                {s.routes.map(([n,m], j) => <RouteBadge key={j} num={n} mode={m} dark={dark} size="sm"/>)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 28, color: s.live ? t.red : t.ink,
                fontVariantNumeric: 'tabular-nums', letterSpacing: -1, lineHeight: 1,
              }}>{s.next}</div>
              <div style={{ fontSize: 10, color: t.ink3, marginTop: 1 }}>min</div>
            </div>
          </div>
        ))}
      </div>
    </ScreenShell>
  );
};

// =====================================================================
// SAVED — Variation B: Routes & Trips view (different sub-tab)
// =====================================================================
const SavedB = ({ dark }) => {
  const t = T(dark);
  return (
    <ScreenShell dark={dark} tab="saved">
      <div style={{ padding: '64px 20px 14px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
          <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 34, color: t.ink, letterSpacing: -1.2 }}>Saved</div>
          <div style={{ width: 36, height: 36, borderRadius: 18, background: t.red, color:'#fff', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <I.IconPlus size={20} c="#fff"/>
          </div>
        </div>
      </div>
      <div style={{ padding: '0 20px 14px' }}>
        <div style={{ display:'flex', gap: 4, fontFamily: t.fontText, fontSize: 14, fontWeight: 500 }}>
          <div style={{ padding:'8px 14px', borderRadius: 999, color: t.ink3 }}>Stops <span style={{ opacity: 0.5 }}>5</span></div>
          <div style={{ padding:'8px 14px', borderRadius: 999, background: t.ink, color: t.surface }}>Routes <span style={{ opacity: 0.6 }}>3</span></div>
          <div style={{ padding:'8px 14px', borderRadius: 999, color: t.ink3 }}>Trips <span style={{ opacity: 0.5 }}>2</span></div>
        </div>
      </div>

      {/* Routes */}
      <div style={{ padding: '0 16px', display:'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { num:'41', m:'tram',    name:'Drumul Taberei → Pipera',  freq:'every 6 min' },
          { num:'M2', m:'m2',      name:'Berceni → Pipera',         freq:'every 4 min' },
          { num:'178', m:'bus',    name:'Crângași → Obor',          freq:'every 11 min' },
        ].map((r, i) => (
          <div key={i} style={{
            background: t.surface2, borderRadius: 16, padding: '14px 16px',
            display:'flex', alignItems:'center', gap: 14, boxShadow: t.shadow,
          }}>
            <RouteBadge num={r.num} mode={r.m} dark={dark} size="lg"/>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 16, color: t.ink, letterSpacing: -0.3 }}>{r.name}</div>
              <div style={{ fontSize: 12, color: t.ink3, marginTop: 4, fontFamily: t.fontMono, display:'inline-flex', alignItems:'center', gap: 6 }}>
                <LiveDot size={6}/> {r.freq}
              </div>
            </div>
            <I.IconChevR size={18} c={t.ink3}/>
          </div>
        ))}
      </div>

      {/* Trips section preview */}
      <div style={{ padding: '24px 20px 8px' }}><SectionLabel dark={dark}>Recent trips</SectionLabel></div>
      <div style={{ padding: '0 16px', display:'flex', flexDirection: 'column', gap: 10 }}>
        {[
          { from:'Home stop', to:'Work stop', when:'Today · 09:14', time:'21 min' },
          { from:'Gym', to:'Home stop', when:'Yesterday · 21:02', time:'17 min' },
        ].map((tr, i) => (
          <div key={i} style={{
            background: t.surface2, borderRadius: 16, padding: '14px 16px', boxShadow: t.shadow,
          }}>
            <div style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, letterSpacing: 0.6, textTransform: 'uppercase' }}>{tr.when}</div>
            <div style={{ display:'flex', alignItems:'center', gap: 10, marginTop: 6 }}>
              <span style={{ fontFamily: t.fontDisplay, fontWeight: 600, fontSize: 16, color: t.ink, letterSpacing: -0.3 }}>{tr.from}</span>
              <I.IconArrow size={14} c={t.ink3}/>
              <span style={{ fontFamily: t.fontDisplay, fontWeight: 600, fontSize: 16, color: t.ink, letterSpacing: -0.3 }}>{tr.to}</span>
              <span style={{ marginLeft:'auto', fontFamily: t.fontMono, fontSize: 13, color: t.ink2, fontWeight: 600 }}>{tr.time}</span>
            </div>
          </div>
        ))}
      </div>
    </ScreenShell>
  );
};

// =====================================================================
// HOME — Variation D: HYBRID — fullscreen map + draggable POI sheet (mid)
// =====================================================================
// Default rest position: MID (~50%). User can drag handle up to FULL or
// down to PEEK. Sheet at FULL becomes the Saved tab content.
// Map shows: blue dot + saved-stop pins. Live vehicles only after tap.
const HomeD = ({ dark }) => {
  const t = T(dark);
  // Sheet at MID rest: top edge at ~440 (50% of 874).
  const SHEET_TOP = 430;
  const saved = [
    { nick:'Home stop',  place:'Piața Romană',   I:I.IconHome,    routes:[['41','tram'],['178','bus']], next: 3,  live: true },
    { nick:'Work stop',  place:'Aviatorilor',    I:I.IconBriefcase, routes:[['M2','m2'],['301','bus']],   next: 7,  live: true },
    { nick:'Gym',        place:'Universitate',   I:I.IconDumbbell, routes:[['M2','m2'],['M3','m3']],     next: 11, live: false },
    { nick:'Mum\u2019s', place:'Obor',           I:I.IconHeart,    routes:[['21','tram'],['253','bus']], next: 18, live: false },
  ];
  return (
    <ScreenShell dark={dark} tab="home">
      {/* Fullscreen map underneath (cropped by sheet) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 874, overflow: 'hidden' }}>
        <BucharestMap dark={dark} height={874} showVehicles={false}/>
        {/* Saved-stop pins overlay (illustrative) */}
        <svg style={{ position:'absolute', inset:0 }} viewBox="0 0 402 874" width="100%" height="874">
          {[
            { x:200, y:200, l:'Home',  c:t.red },
            { x:300, y:140, l:'Work',  c:t.red },
            { x:165, y:380, l:'Gym',   c:t.ink2 },
            { x:280, y:330, l:'Mum\u2019s', c:t.ink2 },
          ].map((p,i) => (
            <g key={i} transform={`translate(${p.x} ${p.y})`}>
              <circle r="9" fill={p.c} stroke={dark ? '#1A1F2E' : '#fff'} strokeWidth="2.5"/>
              <rect x="14" y="-10" width={p.l.length*6.5+10} height="18" rx="4"
                    fill={dark ? '#1A1F2E' : '#fff'} opacity="0.95"/>
              <text x={19} y="3" fontSize="10" fill={t.ink} fontFamily='"Space Grotesk"' fontWeight="600">{p.l}</text>
            </g>
          ))}
        </svg>
        {/* Search pill */}
        <div style={{ position: 'absolute', top: 60, left: 16, right: 16, display: 'flex', gap: 10 }}>
          <div style={{
            flex: 1, height: 44, background: t.surface2, borderRadius: 22, display: 'flex', alignItems: 'center', gap: 10,
            padding: '0 14px', boxShadow: t.shadow, border: `1px solid ${t.border}`,
          }}>
            <I.IconSearch size={18} c={t.ink3}/>
            <span style={{ color: t.ink3, fontSize: 14 }}>Where to?</span>
          </div>
          <div style={{
            width: 44, height: 44, borderRadius: 22, background: t.red,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: t.shadow, color: '#fff',
            fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 16, letterSpacing: -0.3,
          }}>A</div>
        </div>
        {/* Recenter (floating, lower-right of map) */}
        <div style={{
          position:'absolute', right: 16, top: 360,
          width: 44, height: 44, borderRadius: 22, background: t.surface2,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: t.shadow, border: `1px solid ${t.border}`,
        }}>
          <I.IconLocationDot size={20} c={t.red}/>
        </div>
      </div>

      {/* Bottom sheet — MID rest position */}
      <div style={{
        position: 'absolute', left: 0, right: 0, top: SHEET_TOP, bottom: 80,
        background: t.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22,
        boxShadow: dark ? '0 -10px 40px rgba(0,0,0,0.55)' : '0 -10px 40px rgba(26,31,46,0.14)',
        paddingTop: 8, overflow: 'hidden',
      }}>
        {/* Drag handle */}
        <div style={{ width: 40, height: 5, borderRadius: 3, background: t.ink3, opacity: 0.35, margin: '4px auto 14px' }}/>

        {/* Section header w/ snap-position hint */}
        <div style={{ padding: '0 20px 10px', display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
          <span style={{ fontFamily: t.fontMono, fontSize: 11, fontWeight: 700, color: t.ink3, letterSpacing: 1, textTransform:'uppercase' }}>
            Your stops · live
          </span>
          <span style={{ fontSize: 11, color: t.ink3, fontFamily: t.fontMono, opacity: 0.7 }}>drag up for all</span>
        </div>

        {/* Saved cards (compact, 4 fit at MID) */}
        <div style={{ padding: '0 16px', display:'flex', flexDirection:'column', gap: 8 }}>
          {saved.map((s, i) => (
            <div key={i} style={{
              background: s.live ? t.liveTint : t.surface2,
              borderRadius: 14, padding: '10px 14px',
              display:'flex', alignItems:'center', gap: 12, boxShadow: t.shadow,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 11, background: dark ? 'rgba(244,236,224,0.06)' : 'rgba(26,31,46,0.04)',
                display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0,
              }}>
                <s.I size={20} c={t.ink}/>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                  <span style={{ fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 15, color: t.ink, letterSpacing: -0.3 }}>{s.nick}</span>
                  {s.live && <LiveDot/>}
                </div>
                <div style={{ display:'flex', gap:5, marginTop:4 }}>
                  {s.routes.map(([n,m], j) => <RouteBadge key={j} num={n} mode={m} dark={dark} size="sm"/>)}
                  <span style={{ fontSize:11, color:t.ink3, marginLeft:6, alignSelf:'center' }}>· {s.place}</span>
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{
                  fontFamily: t.fontDisplay, fontWeight: 700, fontSize: 24, color: s.live ? t.red : t.ink,
                  fontVariantNumeric:'tabular-nums', letterSpacing: -0.8, lineHeight: 1,
                }}>{s.next}</div>
                <div style={{ fontSize: 10, color: t.ink3 }}>min</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScreenShell>
  );
};

Object.assign(window, {
  HomeA, HomeB, HomeC, HomeD,
  SearchA, SearchB,
  StopDetailA, RouteDetailB,
  PlanA, PlanB,
  SavedA, SavedB,
});
