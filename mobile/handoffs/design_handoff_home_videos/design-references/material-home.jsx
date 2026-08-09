/* Strido — Material 3 home screen + Android device frame.
 * Material-native primitives that read per-frame --m-* theme tokens
 * (see material-themes.js). Exposes window.StridoMaterial.
 */
(function () {
const D = window.StridoData;

/* Lucide icon helper — renders an <i> that lucide.createIcons() swaps for an SVG. */
function Icon({ n, size = 20, color = 'currentColor', sw = 2, style }) {
  return <i data-lucide={n} style={{ width: size, height: size, color, strokeWidth: sw, display: 'inline-flex', flexShrink: 0, ...style }} />;
}

/* ── Material state-layer pressable (ripple-ish hover) ─────────────────── */
function Pressable({ children, onClick, style, round, label }) {
  return (
    <button onClick={onClick} aria-label={label} style={{
      all: 'unset', cursor: 'pointer', display: 'flex', boxSizing: 'border-box',
      borderRadius: round ? 999 : 16, WebkitTapHighlightColor: 'transparent', ...style,
    }}>{children}</button>
  );
}

/* ── Android status bar ────────────────────────────────────────────────── */
function StatusBar() {
  return (
    <div style={{ height: 34, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px 0 22px', color: 'var(--m-on-surface)' }}>
      <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '.01em' }}>9:41</span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <Icon n="signal" size={15} sw={2.4} />
        <Icon n="wifi" size={15} sw={2.4} />
        <Icon n="battery-full" size={20} sw={2} />
      </span>
    </div>
  );
}

/* ── Top app bar — personalised greeting (home) or plain title ─────────── */
function TopBar({ title, subtitle, avatar = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px 14px' }}>
      {avatar ? (
        <div style={{ width: 44, height: 44, borderRadius: 999, background: 'var(--m-primary-container)',
          color: 'var(--m-on-primary-container)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, fontWeight: 800, flexShrink: 0 }}>{D.user.initials}</div>
      ) : null}
      <div style={{ flex: 1, minWidth: 0 }}>
        {subtitle ? <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--m-on-surface-variant)', lineHeight: 1.1 }}>{subtitle}</div> : null}
        <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--m-on-surface)', letterSpacing: '-0.02em', lineHeight: 1.15,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      </div>
      <button aria-label="Benachrichtigungen" style={{ all: 'unset', cursor: 'pointer', position: 'relative',
        width: 44, height: 44, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--m-s2)' }}>
        <Icon n="bell" size={22} color="var(--m-on-surface)" sw={2} />
        {D.notifications ? (
          <span style={{ position: 'absolute', top: 8, right: 8, minWidth: 17, height: 17, padding: '0 4px', boxSizing: 'border-box',
            background: 'var(--m-primary)', color: 'var(--m-on-primary)', borderRadius: 999, fontSize: 10, fontWeight: 800,
            border: '2px solid var(--m-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{D.notifications}</span>
        ) : null}
      </button>
    </div>
  );
}

/* ── Hero — next session (filled primary-container card) ───────────────── */
function HeroSession() {
  const b = D.bookings.find((x) => x.status === 'pending') || D.bookings[0];
  return (
    <div style={{ margin: '0 16px', padding: 18, borderRadius: 28, background: 'var(--m-primary-container)',
      color: 'var(--m-on-primary-container)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800,
          letterSpacing: '.08em', textTransform: 'uppercase', opacity: .9 }}>
          <Icon n="calendar-clock" size={14} sw={2.4} />Nächste Session
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0,
          background: 'var(--m-surface)', color: 'var(--m-on-surface)' }}>in 2 Tagen</span>
      </div>
      <div style={{ marginTop: 12, fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.25 }}>
        Video-Review mit {b.who}
      </div>
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, opacity: .92 }}>
        <Icon n="clock" size={15} sw={2.2} />{b.when} · {b.mins} Min
      </div>
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          height: 44, borderRadius: 999, background: 'var(--m-primary)', color: 'var(--m-on-primary)',
          fontSize: 15, fontWeight: 700 }}>
          <Icon n="video" size={18} sw={2.2} />Beitreten
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 44, padding: '0 18px',
          borderRadius: 999, border: '1.5px solid currentColor', fontSize: 15, fontWeight: 700, opacity: .9 }}>
          Details
        </div>
      </div>
    </div>
  );
}

/* ── Section header ────────────────────────────────────────────────────── */
function SectionHeader({ title, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', marginBottom: 10 }}>
      <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--m-on-surface)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{title}</span>
      <span style={{ flex: 1 }} />
      {action ? (
        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--m-primary)' }}>{action}</span>
      ) : null}
    </div>
  );
}

/* ── Video list item (filled tile) ─────────────────────────────────────── */
function VideoItem({ v }) {
  const done = v.status === 'completed';
  const chipBg = done ? 'var(--m-success-container)' : 'var(--m-secondary-container)';
  const chipFg = done ? 'var(--m-on-success-container)' : 'var(--m-on-secondary-container)';
  const chipLabel = done ? 'Geprüft' : 'In Prüfung';
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 10, borderRadius: 20, background: 'var(--m-s1)' }}>
      <div style={{ position: 'relative', width: 92, height: 62, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
        background: 'linear-gradient(135deg,#5a3a22,#241509)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon n="play" size={22} color="rgba(255,255,255,.92)" sw={2.2} />
        <span style={{ position: 'absolute', right: 5, bottom: 5, fontSize: 10, fontWeight: 700, color: '#fff',
          background: 'rgba(0,0,0,.55)', padding: '1px 5px', borderRadius: 6 }}>{v.duration}</span>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--m-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</div>
        <div style={{ fontSize: 13, color: 'var(--m-on-surface-variant)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.group}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 1 }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0, background: chipBg, color: chipFg }}>{chipLabel}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--m-on-surface-variant)' }}>
            <Icon n="message-circle" size={14} color="var(--m-on-surface-variant)" />{v.reviews}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── First-steps progress card ─────────────────────────────────────────── */
const STEPS = [
  { done: true, label: 'Gruppe erstellt', desc: 'Deine erste Gruppe ist bereit für Schüler und Videos.' },
  { done: false, label: 'Erstes Video hochladen', desc: 'Teile ein Trainingsvideo, damit ein Experte es überprüfen kann.' },
  { done: false, label: 'Eingereichte Videos überprüfen', desc: 'Videos von Schülern, die auf Feedback warten, erscheinen hier.' },
  { done: false, label: 'Coaching-Verfügbarkeit festlegen', desc: 'Erstelle Terminarten und Verfügbarkeiten, damit Schüler buchen können.' },
];
function StepItem({ s, last }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0',
      borderTop: last ? 'none' : undefined }}>
      <div style={{ width: 24, height: 24, borderRadius: 999, flexShrink: 0, marginTop: 1,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: s.done ? 'var(--m-primary)' : 'transparent',
        border: s.done ? 'none' : '2px solid var(--m-outline)' }}>
        {s.done ? <Icon n="check" size={14} color="var(--m-on-primary)" sw={3} /> : null}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: s.done ? 'var(--m-on-surface-variant)' : 'var(--m-on-surface)' }}>{s.label}</div>
        <div style={{ fontSize: 13, lineHeight: 1.45, color: 'var(--m-on-surface-variant)', marginTop: 2 }}>{s.desc}</div>
      </div>
      {!s.done ? <Icon n="chevron-right" size={18} color="var(--m-on-surface-variant)" style={{ marginTop: 3 }} /> : null}
    </div>
  );
}
function StepsCard() {
  const doneN = STEPS.filter((s) => s.done).length;
  const pct = Math.round((doneN / STEPS.length) * 100);
  return (
    <div style={{ margin: '0 16px', padding: '16px 18px', borderRadius: 24, background: 'var(--m-s1)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--m-on-surface)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>Erste Schritte</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--m-on-surface-variant)' }}>{doneN}/{STEPS.length}</span>
      </div>
      <div style={{ marginTop: 12, height: 6, borderRadius: 999, background: 'var(--m-outline-variant)', overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', borderRadius: 999, background: 'var(--m-primary)' }} />
      </div>
      <div style={{ marginTop: 4 }}>
        {STEPS.map((s, i) => (
          <div key={s.label} style={{ borderTop: i ? '1px solid var(--m-outline-variant)' : 'none' }}>
            <StepItem s={s} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Extended FAB — primary action: upload ─────────────────────────────── */
function Fab() {
  return (
    <div style={{ position: 'absolute', right: 16, bottom: 88, zIndex: 30 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: 56, padding: '0 20px', borderRadius: 18,
        background: 'var(--m-primary-container)', color: 'var(--m-on-primary-container)', fontSize: 15, fontWeight: 800,
        boxShadow: '0 6px 16px -4px var(--m-shadow), 0 2px 6px -2px var(--m-shadow)' }}>
        <Icon n="upload" size={20} sw={2.2} />Hochladen
      </div>
    </div>
  );
}

/* ── Material navigation bar ───────────────────────────────────────────── */
const NAV = [
  { id: 'home', label: 'Home', icon: 'house' },
  { id: 'videos', label: 'Videos', icon: 'video' },
  { id: 'sessions', label: 'Sessions', icon: 'calendar-clock' },
  { id: 'groups', label: 'Gruppen', icon: 'users' },
  { id: 'profile', label: 'Profil', icon: 'user-round' },
];
function NavBar({ active = 'home' }) {
  return (
    <div style={{ flexShrink: 0, display: 'flex', background: 'var(--m-nav)', paddingBottom: 12, paddingTop: 10 }}>
      {NAV.map((t) => {
        const on = t.id === active;
        return (
          <div key={t.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 56, height: 30, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: on ? 'var(--m-secondary-container)' : 'transparent' }}>
              <Icon n={t.icon} size={22} sw={on ? 2.4 : 2}
                color={on ? 'var(--m-on-secondary-container)' : 'var(--m-on-surface-variant)'} />
            </div>
            <span style={{ fontSize: 11.5, fontWeight: on ? 800 : 600,
              color: on ? 'var(--m-on-surface)' : 'var(--m-on-surface-variant)' }}>{t.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Composed Material home ────────────────────────────────────────────── */
function MaterialHome() {
  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column',
      background: 'var(--m-bg)', color: 'var(--m-on-surface)' }}>
      <TopBar title={D.user.name.split(' ')[0]} subtitle="Guten Morgen" />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 22, paddingBottom: 116 }}
        className="m-scroll">
        <HeroSession />
        <div>
          <div style={{ padding: '0 20px' }}>
            <SectionHeader title="Deine Videos" action="Alle ansehen" />
          </div>
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {D.videos.slice(0, 2).map((v) => <VideoItem key={v.id} v={v} />)}
          </div>
        </div>
        <StepsCard />
      </div>
      <Fab />
      <NavBar active="home" />
    </div>
  );
}

/* ── Android device frame ──────────────────────────────────────────────── */
function PhoneFrame({ theme, screen }) {
  const t = window.MThemes[theme];
  const cssVars = { ...t.vars };
  return (
    <div style={{ ...cssVars, width: 360, height: 760, position: 'relative', flexShrink: 0,
      background: 'var(--m-bg)', borderRadius: 40, overflow: 'hidden',
      boxShadow: t.dark
        ? '0 0 0 2px #000, 0 0 0 11px #1c1c1f, 0 30px 60px -22px rgba(0,0,0,.7)'
        : '0 0 0 2px #2a2320, 0 0 0 11px #3a3330, 0 30px 60px -22px rgba(40,24,15,.45)',
      display: 'flex', flexDirection: 'column', fontFamily: 'var(--font-sans), system-ui, sans-serif' }}>
      {/* punch-hole camera */}
      <div style={{ position: 'absolute', top: 11, left: '50%', transform: 'translateX(-50%)',
        width: 11, height: 11, borderRadius: 999, background: '#000', zIndex: 60, opacity: .85 }} />
      <StatusBar />
      {screen || <MaterialHome />}
    </div>
  );
}

window.StridoMaterial = { PhoneFrame, MaterialHome, Icon, StatusBar, TopBar, NavBar, Fab, SectionHeader, VideoItem };
})();
