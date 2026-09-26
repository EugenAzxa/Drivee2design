// trailer-scenes.jsx — 30s product trailer for Drivee
// 9:16 (1080×1920), 30s total. Voiceover via window.claude... no wait, we use SpeechSynthesis.

const FONT = "'Plus Jakarta Sans', system-ui, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, monospace";
const SERIF = "'IBM Plex Serif', Georgia, serif";
const BLUE = "#2E64FF";
const BLUE_D = "#1A3FB8";
const INK = "#0B1430";
const PAPER = "#FFFFFF";
const BG = "#FAFBFD";
const RED = "#E1473D";
const GREEN = "#1FAB6B";

// ── Scene timing (30s total) ──────────────────────────────────
// 0.0 – 4.0   S1: cold open  → "Toronto. 5pm."
// 4.0 – 9.0   S2: ticket pain → "$65."
// 9.0 – 14.0  S3: scan it    → AI reads the receipt
// 14.0 – 19.0 S4: AI verdict → "74% win"
// 19.0 – 24.0 S5: hotspots map → "stay clear of red"
// 24.0 – 30.0 S6: payoff + CTA → "Drivee.ca"

// ─── Voiceover lines (matched to timing) ──────────────────────
const VO_LINES = [
  { start: 0.5,  text: "Toronto.  Five-PM.  You parked for two minutes." },
  { start: 4.2,  text: "And there it is.  Sixty-five dollars." },
  { start: 9.0,  text: "Snap it. Drivee reads it.  Files it." },
  { start: 14.0, text: "Our AI says you've got a seventy-four-percent shot." },
  { start: 19.0, text: "And it shows you where  not  to park next time." },
  { start: 24.5, text: "Drivee.  The driver's app for Toronto." },
];

// ─── Captions (typed on-screen, synced to VO) ─────────────────
const CAPTIONS = [
  { start: 0.3,  end: 4.0,  text: "TORONTO. 5PM." },
  { start: 4.2,  end: 9.0,  text: "$65 FOR TWO MINUTES." },
  { start: 9.0,  end: 13.8, text: "SCAN IT. WE READ IT." },
  { start: 14.0, end: 19.0, text: "74% WIN PROBABILITY." },
  { start: 19.2, end: 24.0, text: "KNOW THE HOTSPOTS." },
  { start: 24.5, end: 29.8, text: "DRIVEE.CA" },
];

// ────────────────────────────────────────────────────────────
// Voice-over engine (Web Speech API)
//   - Browsers block speech until first user gesture.
//   - We expose `window.__driveeVoiceReady` so a tap overlay can prime it.
// ────────────────────────────────────────────────────────────
function pickVoice() {
  const voices = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
  if (!voices.length) return null;
  // Prefer high-quality natural English voices, in order.
  const order = [
    /Google UK English Male/i,
    /Google US English/i,
    /Microsoft Guy.*Online/i,
    /Microsoft Davis.*Online/i,
    /Microsoft Aria.*Online/i,
    /Daniel.*en-GB/i,
    /Daniel/i,
    /Samantha/i,
    /Alex/i,
    /^en-(US|GB)/i,
  ];
  for (const re of order) {
    const v = voices.find(x => re.test(x.name) || re.test(x.lang));
    if (v) return v;
  }
  return voices[0];
}

function useVoiceover(playing, time, enabled) {
  const spokenRef = React.useRef(new Set());
  const lastTimeRef = React.useRef(0);

  // Reset on rewind / disable
  React.useEffect(() => {
    if (!enabled) {
      spokenRef.current = new Set();
      try { speechSynthesis.cancel(); } catch (e) {}
      return;
    }
    if (time < lastTimeRef.current - 0.3) {
      spokenRef.current = new Set();
      try { speechSynthesis.cancel(); } catch (e) {}
    }
    lastTimeRef.current = time;
  }, [time, enabled]);

  React.useEffect(() => {
    if (!enabled) return;
    if (!playing) {
      try { speechSynthesis.pause(); } catch (e) {}
      return;
    }
    try { speechSynthesis.resume(); } catch (e) {}

    VO_LINES.forEach((line, i) => {
      if (time >= line.start && time < line.start + 0.2 && !spokenRef.current.has(i)) {
        spokenRef.current.add(i);
        try {
          const u = new SpeechSynthesisUtterance(line.text);
          u.rate = 1.0;
          u.pitch = 0.92;
          u.volume = 1;
          const v = pickVoice();
          if (v) u.voice = v;
          speechSynthesis.speak(u);
        } catch (e) {}
      }
    });
  }, [time, playing, enabled]);

  React.useEffect(() => {
    return () => { try { speechSynthesis.cancel(); } catch (e) {} };
  }, []);
}

// ── Tap-to-start overlay ────────────────────────────────────
function VoiceGate({ onStart }) {
  const [voicesReady, setVoicesReady] = React.useState(false);
  React.useEffect(() => {
    const check = () => {
      const list = window.speechSynthesis ? speechSynthesis.getVoices() : [];
      if (list.length) setVoicesReady(true);
    };
    check();
    if (window.speechSynthesis) {
      speechSynthesis.onvoiceschanged = check;
    }
  }, []);

  const start = () => {
    // Prime speech synthesis with a silent utterance to satisfy the gesture requirement.
    try {
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      speechSynthesis.speak(u);
    } catch (e) {}
    onStart();
  };

  return (
    <div onClick={start} style={{
      position: 'absolute', inset: 0, zIndex: 200,
      background: 'rgba(11,20,48,0.92)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexDirection: 'column', gap: 28,
      cursor: 'pointer', color: 'white',
      fontFamily: FONT,
    }}>
      <div style={{
        fontFamily: MONO, fontSize: 18, letterSpacing: '4px', fontWeight: 800,
        color: BLUE,
      }}>◆ DRIVEE.CA · TRAILER</div>
      <div style={{
        fontFamily: SERIF, fontSize: 90, fontWeight: 700, letterSpacing: '-3px', lineHeight: 1,
        textAlign: 'center',
      }}>
        Tap to play
      </div>
      <div style={{
        width: 140, height: 140, borderRadius: 999,
        background: BLUE,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 20px 60px rgba(46,100,255,0.6)`,
        animation: 'gatePulse 2s infinite',
      }}>
        <svg width="60" height="60" viewBox="0 0 24 24" fill="white">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </div>
      <div style={{
        fontFamily: MONO, fontSize: 14, letterSpacing: '2px', fontWeight: 700,
        color: 'rgba(255,255,255,0.5)',
      }}>
        WITH VOICEOVER · 30s · 9:16
      </div>
      <style>{`
        @keyframes gatePulse {
          0%,100% { transform: scale(1); box-shadow: 0 20px 60px rgba(46,100,255,0.6); }
          50% { transform: scale(1.06); box-shadow: 0 20px 80px rgba(46,100,255,0.9); }
        }
      `}</style>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Caption typewriter overlay
// ────────────────────────────────────────────────────────────
function Captions() {
  const time = useTime();
  const active = CAPTIONS.find(c => time >= c.start && time <= c.end);
  if (!active) return null;

  const local = time - active.start;
  const typeDur = Math.min(active.text.length * 0.04, 1.4);
  const typed = clamp(local / typeDur, 0, 1);
  const charCount = Math.floor(typed * active.text.length);
  const visible = active.text.slice(0, charCount);
  const cursor = local < (active.end - active.start - 0.3);

  // Fade out at end
  const fadeOut = active.end - active.start - 0.3;
  const opacity = local > fadeOut ? clamp(1 - (local - fadeOut) / 0.3, 0, 1) : 1;

  return (
    <div style={{
      position: 'absolute',
      left: 60, right: 60, bottom: 200,
      textAlign: 'center',
      opacity,
      zIndex: 50,
    }}>
      <div style={{
        display: 'inline-block',
        padding: '14px 24px',
        background: 'rgba(11, 20, 48, 0.85)',
        backdropFilter: 'blur(8px)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          fontFamily: MONO,
          fontSize: 36,
          fontWeight: 800,
          color: 'white',
          letterSpacing: '2px',
          lineHeight: 1.2,
        }}>
          {visible}
          {cursor && (
            <span style={{
              display: 'inline-block',
              width: 4, height: 36,
              background: BLUE,
              marginLeft: 4,
              verticalAlign: 'text-bottom',
              animation: 'blink 0.6s steps(1) infinite',
            }}/>
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Persistent chrome — top bar + bottom progress dots
// ────────────────────────────────────────────────────────────
function Chrome() {
  const time = useTime();
  return (
    <>
      {/* Top bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 80,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '30px 40px',
        zIndex: 60,
        color: 'white',
        textShadow: '0 2px 8px rgba(0,0,0,0.4)',
      }}>
        <div style={{
          fontFamily: MONO, fontSize: 14, fontWeight: 800, letterSpacing: '2px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <span style={{
            width: 10, height: 10, borderRadius: 999, background: '#E1473D',
            animation: 'rec 1.2s infinite',
          }}/>
          REC · 00:{String(Math.floor(time)).padStart(2, '0')}
        </div>
        <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 800, letterSpacing: '2px' }}>
          DRIVEE.CA
        </div>
      </div>

      {/* Bottom scene dots */}
      <div style={{
        position: 'absolute', bottom: 70, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 8,
        zIndex: 60,
      }}>
        {[0,5,10,15,20,25].map((s, i) => {
          const next = i < 5 ? [5,10,15,20,25,30][i] : 30;
          const active = time >= s && time < next;
          return (
            <div key={i} style={{
              width: active ? 32 : 8, height: 4, borderRadius: 999,
              background: active ? BLUE : 'rgba(255,255,255,0.4)',
              transition: 'all 0.3s',
            }}/>
          );
        })}
      </div>

      <style>{`
        @keyframes rec { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        @keyframes blink { 0%,50% { opacity: 1; } 51%,100% { opacity: 0; } }
      `}</style>
    </>
  );
}

// ════════════════════════════════════════════════════════════
// SCENE 1 — Cold open: city / parking moment (0–4s)
// ════════════════════════════════════════════════════════════
function Scene1() {
  const { localTime, progress } = useSprite();

  // Camera "drive" — gradient streaks moving down
  return (
    <Sprite start={0} end={4}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #0B1430 0%, #1A2348 50%, #0B1430 100%)',
        overflow: 'hidden',
      }}>
        {/* Animated street grid (warp) */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 1080 1920" preserveAspectRatio="none">
          <defs>
            <linearGradient id="street" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0B1430"/>
              <stop offset="40%" stopColor="#0B1430" stopOpacity="0"/>
              <stop offset="60%" stopColor="#0B1430" stopOpacity="0"/>
              <stop offset="100%" stopColor="#0B1430"/>
            </linearGradient>
          </defs>
          {/* Perspective lane lines */}
          {[...Array(12)].map((_, i) => {
            const baseY = (i * 200 + localTime * 600) % 2400 - 200;
            return (
              <g key={i} opacity={0.6}>
                <line x1="540" y1={baseY} x2={540 - (baseY - 0) * 0.5} y2={baseY + 60}
                  stroke="#2E64FF" strokeWidth="3" opacity={baseY / 2000}/>
                <line x1="540" y1={baseY} x2={540 + (baseY - 0) * 0.5} y2={baseY + 60}
                  stroke="#2E64FF" strokeWidth="3" opacity={baseY / 2000}/>
              </g>
            );
          })}
          {/* Center dashed line */}
          {[...Array(20)].map((_, i) => {
            const y = (i * 120 + localTime * 800) % 2200 - 100;
            const scale = y / 1920;
            return (
              <rect key={i} x={540 - 5 * scale} y={y} width={10 * scale} height={50 * scale}
                fill="white" opacity={scale * 0.7}/>
            );
          })}
          <rect width="1080" height="1920" fill="url(#street)"/>
        </svg>

        {/* Vignette */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(circle at 50% 50%, transparent 30%, rgba(0,0,0,0.6) 100%)',
        }}/>

        {/* Big text */}
        <Sprite start={0.6} end={3.8}>
          {({ localTime: lt }) => {
            const op = clamp(lt / 0.5, 0, 1) * (lt > 2.8 ? clamp(1 - (lt - 2.8) / 0.5, 0, 1) : 1);
            return (
              <div style={{
                position: 'absolute', left: 60, right: 60, top: '38%',
                opacity: op,
                color: 'white',
                fontFamily: SERIF,
                transform: `translateY(${(1 - clamp(lt / 0.6, 0, 1)) * 30}px)`,
              }}>
                <div style={{
                  fontFamily: MONO, fontSize: 22, fontWeight: 700, letterSpacing: '4px',
                  color: BLUE, marginBottom: 20,
                }}>
                  ◆ TORONTO · 5:02 PM
                </div>
                <div style={{ fontSize: 110, fontWeight: 700, lineHeight: 1.0, letterSpacing: '-3px' }}>
                  You parked
                </div>
                <div style={{ fontSize: 110, fontWeight: 700, lineHeight: 1.0, letterSpacing: '-3px' }}>
                  for two
                </div>
                <div style={{ fontSize: 110, fontWeight: 700, lineHeight: 1.0, letterSpacing: '-3px', color: BLUE }}>
                  minutes.
                </div>
              </div>
            );
          }}
        </Sprite>
      </div>
    </Sprite>
  );
}

// ════════════════════════════════════════════════════════════
// SCENE 2 — Ticket pain — paper ticket slams onto windshield (4–9s)
// ════════════════════════════════════════════════════════════
function Scene2() {
  return (
    <Sprite start={4} end={9}>
      {({ localTime }) => {
        // Bg pull-up
        const bgIn = clamp(localTime / 0.4, 0, 1);
        // Ticket slam
        const slamP = clamp((localTime - 0.2) / 0.5, 0, 1);
        const slam = Easing.easeOutBack(slamP);
        const ticketRot = -8 + slam * 6;
        const ticketScale = 0.3 + slam * 0.7;
        const ticketY = (1 - slam) * -800;
        // Stamp punch
        const stampP = clamp((localTime - 1.0) / 0.3, 0, 1);
        const stampS = stampP > 0 ? (1 + (1 - Easing.easeOutBack(stampP)) * 1.5) : 0;
        // $65 reveal
        const amtP = clamp((localTime - 1.6) / 0.6, 0, 1);

        return (
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(180deg, #1A2348 ${(1-bgIn)*100}%, #0B1430 100%)`,
          }}>
            {/* Faux dashboard / windshield grain */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at 50% 100%, rgba(46,100,255,0.15), transparent 50%)',
            }}/>

            {/* Paper ticket */}
            <div style={{
              position: 'absolute',
              left: '50%', top: '50%',
              width: 720, height: 1040,
              transform: `translate(-50%, -50%) translateY(${ticketY}px) rotate(${ticketRot}deg) scale(${ticketScale})`,
              background: '#FFFEF8',
              borderRadius: 6,
              boxShadow: '0 50px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.05)',
              padding: '60px 50px',
              fontFamily: MONO,
              color: '#1a1a1a',
            }}>
              {/* Header */}
              <div style={{ borderBottom: '3px double #1a1a1a', paddingBottom: 20, marginBottom: 24 }}>
                <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '3px' }}>CITY OF TORONTO</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4, letterSpacing: '2px' }}>PARKING INFRACTION NOTICE</div>
              </div>

              {/* Body lines */}
              <div style={{ fontSize: 18, lineHeight: 2, fontWeight: 600 }}>
                <div>NO. <span style={{fontWeight: 800}}>TR-2841093</span></div>
                <div>DATE  APR 30, 2026  17:02</div>
                <div>LOC   KING ST W (BATHURST)</div>
                <div>PLATE CRWZ 449</div>
                <div style={{ marginTop: 14 }}>OFFENCE</div>
                <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '1px' }}>NO STANDING ZONE</div>
              </div>

              {/* Stamp */}
              <div style={{
                position: 'absolute',
                right: 50, top: 240,
                opacity: stampP,
                transform: `rotate(-8deg) scale(${stampS})`,
                border: '6px solid ' + RED,
                color: RED,
                padding: '10px 18px',
                fontSize: 32, fontWeight: 800,
                letterSpacing: '4px',
                fontFamily: MONO,
              }}>
                DUE
              </div>

              {/* Amount */}
              <div style={{
                marginTop: 80,
                borderTop: '3px double #1a1a1a',
                paddingTop: 30,
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              }}>
                <div style={{ fontSize: 24, fontWeight: 700 }}>FINE DUE</div>
                <div style={{
                  fontSize: 130 * (0.6 + 0.4 * amtP),
                  fontWeight: 800,
                  letterSpacing: '-3px',
                  color: RED,
                  opacity: amtP,
                  transform: `scale(${0.7 + 0.3 * Easing.easeOutBack(amtP)})`,
                  transformOrigin: 'right center',
                }}>
                  $65
                </div>
              </div>

              {/* Bar code */}
              <div style={{ marginTop: 40, display: 'flex', gap: 1, height: 50 }}>
                {Array.from({length: 60}).map((_, i) => (
                  <div key={i} style={{
                    flex: Math.random() > 0.5 ? 1 : 2,
                    background: '#1a1a1a',
                    opacity: Math.random() > 0.3 ? 1 : 0.3,
                  }}/>
                ))}
              </div>
            </div>
          </div>
        );
      }}
    </Sprite>
  );
}

// ════════════════════════════════════════════════════════════
// SCENE 3 — Scan it (9–14s) — phone scanning the ticket
// ════════════════════════════════════════════════════════════
function Scene3() {
  return (
    <Sprite start={9} end={14}>
      {({ localTime }) => {
        const phoneP = Easing.easeOutBack(clamp(localTime / 0.6, 0, 1));
        const scanLineY = ((localTime - 0.8) % 1.4) / 1.4;
        const ocrP = clamp((localTime - 1.6) / 1.0, 0, 1);
        const fileP = clamp((localTime - 3.2) / 0.6, 0, 1);

        return (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, #0B1430 0%, #1A2348 100%)',
          }}>
            {/* Grid bg */}
            <div style={{
              position: 'absolute', inset: 0,
              backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '60px 60px',
            }}/>

            {/* Phone frame */}
            <div style={{
              position: 'absolute',
              left: '50%', top: '50%',
              width: 680, height: 1280,
              transform: `translate(-50%, -50%) scale(${phoneP})`,
              background: '#0B1430',
              borderRadius: 56,
              border: '8px solid #1a2348',
              boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}>
              {/* Inner screen */}
              <div style={{
                position: 'absolute', inset: 16,
                borderRadius: 40,
                background: '#0B1430',
                overflow: 'hidden',
              }}>
                {/* Camera viewfinder bg */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(135deg, #0B1430, #1A2348)',
                }}/>

                {/* Scanned ticket inside viewfinder */}
                <div style={{
                  position: 'absolute',
                  left: 80, right: 80, top: 180,
                  height: 760,
                  background: '#FFFEF8',
                  borderRadius: 6,
                  padding: '36px 30px',
                  fontFamily: MONO,
                  color: '#1a1a1a',
                  boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
                  transform: 'rotate(-1.5deg)',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: '2px', borderBottom: '2px double #1a1a1a', paddingBottom: 8 }}>
                    CITY OF TORONTO
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 4, letterSpacing: '1px' }}>PARKING INFRACTION</div>
                  <div style={{ fontSize: 11, lineHeight: 1.8, fontWeight: 600, marginTop: 18 }}>
                    {[
                      { lbl: "NO.", val: "TR-2841093" },
                      { lbl: "DATE", val: "APR 30 17:02" },
                      { lbl: "LOC", val: "KING ST W" },
                      { lbl: "PLATE", val: "CRWZ 449" },
                    ].map((row, i) => {
                      const reveal = clamp(ocrP * 4 - i * 0.8, 0, 1);
                      return (
                        <div key={i} style={{
                          display: 'flex', gap: 12,
                          background: reveal > 0 && reveal < 1 ? `linear-gradient(90deg, rgba(46,100,255,0.3) ${reveal*100}%, transparent ${reveal*100}%)` : 'transparent',
                          padding: '2px 0',
                        }}>
                          <span style={{ width: 60, fontWeight: 800 }}>{row.lbl}</span>
                          <span>{row.val}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ marginTop: 14, fontSize: 11, fontWeight: 800 }}>OFFENCE</div>
                  <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '1px' }}>NO STANDING</div>
                  <div style={{
                    marginTop: 30, paddingTop: 14, borderTop: '2px double #1a1a1a',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 800 }}>FINE</span>
                    <span style={{ fontSize: 56, fontWeight: 800, color: RED, letterSpacing: '-2px' }}>$65</span>
                  </div>
                </div>

                {/* Scan corners */}
                <div style={{ position: 'absolute', left: 60, right: 60, top: 160, bottom: 160 }}>
                  {[
                    { tl: true,  pos: { top: 0, left: 0 } },
                    { tr: true,  pos: { top: 0, right: 0 } },
                    { bl: true,  pos: { bottom: 0, left: 0 } },
                    { br: true,  pos: { bottom: 0, right: 0 } },
                  ].map((c, i) => (
                    <div key={i} style={{
                      position: 'absolute', ...c.pos,
                      width: 60, height: 60,
                      borderTop: c.tl || c.tr ? `5px solid ${BLUE}` : 'none',
                      borderBottom: c.bl || c.br ? `5px solid ${BLUE}` : 'none',
                      borderLeft: c.tl || c.bl ? `5px solid ${BLUE}` : 'none',
                      borderRight: c.tr || c.br ? `5px solid ${BLUE}` : 'none',
                      borderRadius: c.tl ? '12px 0 0 0' : c.tr ? '0 12px 0 0' : c.bl ? '0 0 0 12px' : '0 0 12px 0',
                      filter: 'drop-shadow(0 0 8px ' + BLUE + ')',
                    }}/>
                  ))}

                  {/* Scan line */}
                  <div style={{
                    position: 'absolute', left: 0, right: 0,
                    top: `${scanLineY * 100}%`,
                    height: 4,
                    background: `linear-gradient(90deg, transparent, ${BLUE}, transparent)`,
                    boxShadow: `0 0 20px ${BLUE}`,
                  }}/>
                </div>

                {/* OCR detection box */}
                {ocrP > 0.4 && (
                  <div style={{
                    position: 'absolute',
                    left: 100, top: 720, right: 100,
                    padding: '10px 14px',
                    background: 'rgba(46,100,255,0.95)',
                    borderRadius: 8,
                    color: 'white',
                    fontFamily: MONO,
                    fontSize: 14,
                    fontWeight: 800,
                    letterSpacing: '1.5px',
                    opacity: clamp((ocrP - 0.4) / 0.3, 0, 1),
                    boxShadow: '0 8px 24px rgba(46,100,255,0.5)',
                  }}>
                    ✓ DETECTED · NO STANDING · $65
                  </div>
                )}

                {/* Filed banner */}
                {fileP > 0 && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: `rgba(31,171,107,${0.3 * fileP})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      background: 'white', padding: '24px 36px', borderRadius: 16,
                      transform: `scale(${Easing.easeOutBack(fileP)})`,
                      boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                      textAlign: 'center',
                    }}>
                      <div style={{
                        width: 70, height: 70, borderRadius: 999,
                        background: GREEN, color: 'white',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 40, marginBottom: 10, fontWeight: 800,
                      }}>✓</div>
                      <div style={{ fontFamily: FONT, fontSize: 22, fontWeight: 800, color: INK }}>FILED</div>
                      <div style={{ fontFamily: MONO, fontSize: 12, color: '#4A5267', marginTop: 4 }}>REMINDER ADDED</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      }}
    </Sprite>
  );
}

// ════════════════════════════════════════════════════════════
// SCENE 4 — AI Verdict (14–19s)
// ════════════════════════════════════════════════════════════
function Scene4() {
  return (
    <Sprite start={14} end={19}>
      {({ localTime }) => {
        const cardP = Easing.easeOutBack(clamp(localTime / 0.6, 0, 1));
        const ringP = clamp((localTime - 0.8) / 1.5, 0, 1);
        const eased = Easing.easeOutCubic(ringP);
        const pct = Math.floor(eased * 74);
        const reasonP = clamp((localTime - 2.0) / 1.5, 0, 1);

        const reasons = [
          { t: 0.0, txt: "✓ Sign was obstructed (camera evidence)" },
          { t: 0.3, txt: "✓ Permit hours mis-stated on notice" },
          { t: 0.6, txt: "✓ 12 similar cases dismissed in 2025" },
        ];

        return (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, #0B1430 0%, #1A2348 100%)',
          }}>
            {/* Bg glow */}
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(circle at 50% 40%, rgba(46,100,255,0.3), transparent 60%)',
            }}/>

            {/* AI sparkles */}
            <div style={{
              position: 'absolute', top: 240, left: '50%', transform: 'translateX(-50%)',
              fontFamily: MONO, fontSize: 18, fontWeight: 800, color: BLUE, letterSpacing: '4px',
              opacity: cardP,
            }}>
              ◆ DRIVEE AI · VERDICT
            </div>

            {/* Big ring */}
            <div style={{
              position: 'absolute',
              left: '50%', top: '50%',
              width: 540, height: 540,
              transform: `translate(-50%, -50%) scale(${cardP})`,
            }}>
              <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
                <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8"/>
                <circle cx="100" cy="100" r="90" fill="none" stroke={BLUE} strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={`${eased * 565.5} 565.5`}
                  transform="rotate(-90 100 100)"
                  style={{ filter: `drop-shadow(0 0 12px ${BLUE})` }}
                />
              </svg>
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexDirection: 'column', color: 'white',
              }}>
                <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, letterSpacing: '3px', opacity: 0.7 }}>WIN PROBABILITY</div>
                <div style={{ fontFamily: FONT, fontSize: 220, fontWeight: 800, letterSpacing: '-10px', lineHeight: 1, color: BLUE }}>
                  {pct}<span style={{ fontSize: 100, color: 'white' }}>%</span>
                </div>
                <div style={{ fontFamily: MONO, fontSize: 16, fontWeight: 700, letterSpacing: '3px', color: GREEN, marginTop: 6 }}>★ FIGHT IT</div>
              </div>
            </div>

            {/* Reasons */}
            <div style={{
              position: 'absolute', left: 60, right: 60, bottom: 360,
              opacity: reasonP,
            }}>
              {reasons.map((r, i) => {
                const lp = clamp((reasonP * 1.5 - r.t * 1.5), 0, 1);
                return (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(4px)',
                    padding: '14px 20px',
                    borderRadius: 12,
                    color: 'white',
                    fontFamily: FONT, fontSize: 22, fontWeight: 600,
                    marginBottom: 10,
                    opacity: lp,
                    transform: `translateX(${(1 - lp) * 40}px)`,
                  }}>
                    {r.txt}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }}
    </Sprite>
  );
}

// ════════════════════════════════════════════════════════════
// SCENE 5 — Hotspots map (19–24s)
// ════════════════════════════════════════════════════════════
function Scene5() {
  return (
    <Sprite start={19} end={24}>
      {({ localTime }) => {
        const mapP = Easing.easeOutCubic(clamp(localTime / 0.6, 0, 1));
        const pinsP = clamp((localTime - 0.8) / 1.5, 0, 1);

        const pins = [
          { x: 280, y: 480, type: 'red',   label: '$8.4K'  },
          { x: 720, y: 580, type: 'red',   label: '$11K'   },
          { x: 480, y: 800, type: 'amber', label: '$3.2K'  },
          { x: 820, y: 980, type: 'red',   label: '$6.7K'  },
          { x: 220, y: 1100, type: 'green', label: 'FREE'  },
          { x: 600, y: 1200, type: 'amber', label: '$2.8K' },
          { x: 380, y: 1380, type: 'green', label: 'FREE'  },
        ];

        const pinColor = (t) => t === 'red' ? RED : t === 'amber' ? '#E89B22' : GREEN;

        return (
          <div style={{
            position: 'absolute', inset: 0,
            background: '#0B1430',
            overflow: 'hidden',
          }}>
            {/* Map */}
            <div style={{
              position: 'absolute', inset: 0,
              opacity: mapP,
              transform: `scale(${0.95 + 0.05 * mapP})`,
            }}>
              <svg viewBox="0 0 1080 1920" style={{ width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid slice">
                <defs>
                  <pattern id="mapGrid" width="60" height="60" patternUnits="userSpaceOnUse">
                    <path d="M60 0H0v60" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
                  </pattern>
                </defs>
                <rect width="1080" height="1920" fill="#0B1430"/>
                <rect width="1080" height="1920" fill="url(#mapGrid)"/>

                {/* Streets */}
                <g stroke="rgba(255,255,255,0.15)" strokeWidth="3" fill="none">
                  <path d="M0 480 Q 400 460 1080 500"/>
                  <path d="M0 800 Q 400 780 1080 820"/>
                  <path d="M0 1120 Q 400 1100 1080 1140"/>
                  <path d="M0 1440 Q 400 1420 1080 1460"/>
                  <path d="M280 0 Q 320 960 280 1920"/>
                  <path d="M540 0 Q 580 960 540 1920"/>
                  <path d="M820 0 Q 860 960 820 1920"/>
                </g>

                {/* Highlighted route */}
                <path d="M540 200 Q 580 600 600 900 Q 620 1200 540 1700" 
                  stroke={BLUE} strokeWidth="6" fill="none"
                  strokeDasharray="800"
                  strokeDashoffset={800 - (pinsP * 800)}
                  style={{ filter: `drop-shadow(0 0 8px ${BLUE})` }}
                />
              </svg>
            </div>

            {/* Overlay text */}
            <div style={{
              position: 'absolute', top: 200, left: 60, right: 60,
              opacity: mapP,
            }}>
              <div style={{
                fontFamily: MONO, fontSize: 18, fontWeight: 800, color: BLUE, letterSpacing: '4px',
              }}>
                ◆ TICKET HEATMAP · KING + SPADINA
              </div>
              <div style={{
                fontFamily: SERIF, fontSize: 70, fontWeight: 700, color: 'white', letterSpacing: '-2px',
                marginTop: 16, lineHeight: 1.05,
              }}>
                Don't park<br/>where they <span style={{color: RED}}>hunt</span>.
              </div>
            </div>

            {/* Pins */}
            {pins.map((p, i) => {
              const local = clamp(pinsP * 3 - i * 0.3, 0, 1);
              const eased = Easing.easeOutBack(local);
              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: p.x, top: p.y,
                  transform: `translate(-50%, -50%) scale(${eased})`,
                  opacity: local,
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 999,
                    background: pinColor(p.type),
                    border: '4px solid white',
                    boxShadow: `0 0 20px ${pinColor(p.type)}, 0 6px 16px rgba(0,0,0,0.4)`,
                  }}/>
                  <div style={{
                    position: 'absolute', top: -42, left: '50%', transform: 'translateX(-50%)',
                    background: 'white',
                    padding: '4px 10px',
                    borderRadius: 6,
                    fontFamily: MONO, fontSize: 13, fontWeight: 800, color: INK,
                    whiteSpace: 'nowrap',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}>
                    {p.label}
                  </div>
                  {/* Pulse */}
                  {p.type === 'red' && (
                    <div style={{
                      position: 'absolute', top: -10, left: -10,
                      width: 50, height: 50, borderRadius: 999,
                      background: pinColor(p.type),
                      opacity: 0.4,
                      animation: 'pulse 1.4s infinite',
                    }}/>
                  )}
                </div>
              );
            })}

            <style>{`
              @keyframes pulse {
                0% { transform: scale(0.6); opacity: 0.5; }
                100% { transform: scale(2); opacity: 0; }
              }
            `}</style>
          </div>
        );
      }}
    </Sprite>
  );
}

// ════════════════════════════════════════════════════════════
// SCENE 6 — Logo / CTA (24–30s)
// ════════════════════════════════════════════════════════════
function Scene6() {
  return (
    <Sprite start={24} end={30}>
      {({ localTime }) => {
        const bgP = clamp(localTime / 0.4, 0, 1);
        const logoP = clamp((localTime - 0.4) / 0.6, 0, 1);
        const tagP = clamp((localTime - 1.4) / 0.5, 0, 1);
        const ctaP = clamp((localTime - 2.2) / 0.5, 0, 1);

        return (
          <div style={{
            position: 'absolute', inset: 0,
            background: `linear-gradient(135deg, ${INK} 0%, #1A2348 50%, ${INK} 100%)`,
          }}>
            {/* Spotlight */}
            <div style={{
              position: 'absolute', inset: 0,
              background: `radial-gradient(circle at 50% 50%, rgba(46,100,255,${0.4 * bgP}), transparent 50%)`,
            }}/>

            {/* Stars */}
            {Array.from({length: 30}).map((_, i) => {
              const x = (i * 137) % 1080;
              const y = (i * 211) % 1920;
              const tw = ((localTime + i * 0.1) % 2) / 2;
              return (
                <div key={i} style={{
                  position: 'absolute',
                  left: x, top: y,
                  width: 3, height: 3, borderRadius: 999,
                  background: 'white',
                  opacity: tw * 0.7,
                  boxShadow: '0 0 6px white',
                }}/>
              );
            })}

            {/* Logo */}
            <div style={{
              position: 'absolute', left: 0, right: 0, top: '32%',
              textAlign: 'center',
              opacity: logoP,
              transform: `translateY(${(1 - logoP) * 30}px) scale(${0.9 + 0.1 * logoP})`,
            }}>
              <div style={{
                fontFamily: FONT, fontSize: 280, fontWeight: 800,
                letterSpacing: '-12px',
                color: 'white',
                lineHeight: 1,
                textShadow: '0 10px 40px rgba(46,100,255,0.5)',
              }}>
                Drivee<span style={{ color: BLUE }}>.</span>
              </div>
            </div>

            {/* Tagline */}
            <div style={{
              position: 'absolute', left: 60, right: 60, top: '58%',
              textAlign: 'center',
              opacity: tagP,
              transform: `translateY(${(1 - tagP) * 20}px)`,
            }}>
              <div style={{
                fontFamily: SERIF, fontSize: 56, fontWeight: 600, fontStyle: 'italic',
                color: 'white', letterSpacing: '-1px', lineHeight: 1.2,
              }}>
                The driver's app for Toronto.
              </div>
            </div>

            {/* URL */}
            <div style={{
              position: 'absolute', left: 0, right: 0, top: '74%',
              textAlign: 'center',
              opacity: ctaP,
              transform: `translateY(${(1 - ctaP) * 20}px)`,
            }}>
              <div style={{
                display: 'inline-block',
                padding: '24px 48px',
                background: BLUE,
                borderRadius: 16,
                color: 'white',
                fontFamily: MONO, fontSize: 32, fontWeight: 800, letterSpacing: '3px',
                boxShadow: `0 20px 60px rgba(46,100,255,0.6)`,
              }}>
                DRIVEE.CA
              </div>
              <div style={{
                marginTop: 24,
                fontFamily: MONO, fontSize: 18, fontWeight: 700, letterSpacing: '4px',
                color: 'rgba(255,255,255,0.5)',
              }}>
                FREE · NO ACCOUNT · BETA
              </div>
            </div>

            {/* App store badges (placeholder) */}
            <div style={{
              position: 'absolute', left: 0, right: 0, bottom: 180,
              display: 'flex', justifyContent: 'center', gap: 16,
              opacity: ctaP,
            }}>
              {['APP STORE', 'GOOGLE PLAY'].map((s, i) => (
                <div key={i} style={{
                  padding: '12px 24px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderRadius: 10,
                  fontFamily: MONO, fontSize: 14, fontWeight: 800, color: 'white',
                  letterSpacing: '2px',
                }}>
                  ▼ {s}
                </div>
              ))}
            </div>
          </div>
        );
      }}
    </Sprite>
  );
}

// ════════════════════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════════════════════
function VoiceoverDriver({ enabled }) {
  const { time, playing } = useTimeline();
  useVoiceover(playing, time, enabled);
  return null;
}

function GateLayer({ started, onStart }) {
  const { setTime, setPlaying } = useTimeline();
  if (started) return null;
  return <VoiceGate onStart={() => {
    setTime(0);
    setPlaying(true);
    onStart();
  }}/>;
}

function DriveeTrailer() {
  const [started, setStarted] = React.useState(false);
  return (
    <Stage
      width={1080}
      height={1920}
      duration={30}
      background="#0B1430"
      loop={true}
      autoplay={false}
      persistKey="drivee-trailer"
    >
      <Scene1/>
      <Scene2/>
      <Scene3/>
      <Scene4/>
      <Scene5/>
      <Scene6/>

      <Captions/>
      <Chrome/>
      <VoiceoverDriver enabled={started}/>
      <GateLayer started={started} onStart={() => setStarted(true)}/>
    </Stage>
  );
}

window.DriveeTrailer = DriveeTrailer;
