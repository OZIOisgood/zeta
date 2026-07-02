/* Strido mobile UI kit — screens (Material You).
 * Composes the design-system primitives from window.StridoDesignSystem_dc14ef.
 * Exposes window.StridoScreens, consumed by index.html.
 * German copy, matching the approved Home/Videos redesign.
 */
(function () {
const DS = window.StridoDesignSystem_dc14ef;

/* Platform switch (driven by the Tweaks panel via setPlatform). The wrapped DS
   components auto-inject the current platform, so every screen renders the
   Material or the iOS variant from one source. Components with no native iOS
   divergence (Fab, Badge, Avatar, EmptyState, IconTile) are used unwrapped. */
let PLATFORM = 'material';
const PlatformState = (window.StridoPlatform = window.StridoPlatform || { current: 'material' });
function setPlatform(p) { PLATFORM = p === 'ios' ? 'ios' : 'material'; PlatformState.current = PLATFORM; }
const isIOS = () => PlatformState.current === 'ios';
const _w = (C) => function Platformed(props) { return React.createElement(C, Object.assign({ platform: PlatformState.current }, props)); };

const Button = _w(DS.Button);
const IconButton = _w(DS.IconButton);
const Card = _w(DS.Card);
const Chip = _w(DS.Chip);
const SegmentedButton = _w(DS.SegmentedButton);
const Stepper = _w(DS.Stepper);
const ProgressBar = _w(DS.ProgressBar);
const Textarea = _w(DS.Textarea);
const ListItem = _w(DS.ListItem);
const Switch = _w(DS.Switch);
const Divider = _w(DS.Divider);
const { Fab, Badge, Avatar, EmptyState, IconTile, LargeTitleBar } = DS;

const D = window.StridoData;

/* Lucide icon helper — renders an <i> Lucide replaces with an SVG after mount. */
function Icon({ n, size = 20, color = 'currentColor', sw = 2, style }) {
  return <i data-lucide={n} style={{ width: size, height: size, color, strokeWidth: sw, display: 'inline-flex', flexShrink: 0, ...style }} />;
}

const T = {
  strong: 'var(--role-on-surface)',
  muted: 'var(--role-on-surface-variant)',
  primary: 'var(--role-accent)',
  primaryStrong: 'var(--role-accent-strong)',
  bg: 'var(--role-background)',
};

/* Tiny nav bus so leaf components (e.g. the header bell) can push screens
   without threading the go() callback through every screen. App registers go(). */
let _nav = null;
function setNav(fn) { _nav = fn; }
function navTo(action) { if (_nav) _nav(action); }

/* German labels for the English sample data ------------------------------- */
const TYPE_DE = {
  'Video review session': 'Video-Review',
  'Flatwork deep-dive': 'Dressur-Deep-Dive',
  'Jumping technique': 'Spring-Technik',
  'Course walk-through': 'Parcours-Begehung',
};
const VIDEO_DE = {
  'Combination line — take 2': 'Kombination — Versuch 2',
  'Sitting trot — long side': 'Aussitzen im Trab — lange Seite',
  'Warm-up canter transitions': 'Galopp-Übergänge im Warm-up',
  'Grid work — bounce to one': 'Gymnastikreihe — Bounce',
};
const dt = (s) => TYPE_DE[s] || s;
const dv = (s) => VIDEO_DE[s] || s;

function videoStatus(status) {
  if (status === 'completed') return { tone: 'success', label: 'Geprüft', icon: 'check-circle-2' };
  if (status === 'pending') return { tone: 'primary', label: 'In Prüfung', icon: 'clock' };
  return { tone: 'neutral', label: 'Lädt hoch', icon: 'upload-cloud' };
}

/* ── Shared screen shell: fixed header + scroll area ────────────────────── */
function Screen({ header, children, pad = 16, gap = 22, bottom = 116 }) {
  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column', background: T.bg, color: T.strong }}>
      {header}
      <div className="m-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap, padding: `0 0 ${bottom}px`, }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap, padding: `${pad}px ${pad}px 0` }}>{children}</div>
      </div>
    </div>
  );
}

/* Plain title top app bar (Videos / Sessions / Groups / Profile). */
/* Plain title top app bar (Material) / large-title nav bar (iOS). `action` is
   the screen's primary action — on iOS it surfaces as a nav-bar button (iOS has
   no FAB); on Material it's null (the FAB in index.html handles it). */
function bellNode() {
  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
      <Icon n="bell" size={23} color="var(--role-accent)" />
      {D.notifications ? <span style={{ position: 'absolute', top: -1, right: -1, width: 9, height: 9, borderRadius: 999, background: 'var(--role-danger)', border: '1.5px solid var(--role-background)' }} /> : null}
    </span>
  );
}
function TopBar({ title, action }) {
  if (isIOS()) {
    const actions = [];
    if (action) actions.push({ id: 'primary', label: action.label, icon: <Icon n={action.icon} size={26} color="var(--role-accent)" />, onPress: action.onPress });
    actions.push({ id: 'bell', label: 'Benachrichtigungen', icon: bellNode(), onPress: () => navTo({ push: { screen: 'notifications' } }) });
    return <LargeTitleBar platform="ios" title={title} actions={actions} />;
  }
  if (DS.TopAppBar) {
    return <DS.TopAppBar platform="material" title={title} trailing={<Bell />} style={{ background: T.bg }} />;
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px 12px' }}>
      <div style={{ flex: 1, minWidth: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: T.strong, whiteSpace: 'nowrap' }}>{title}</div>
      <Bell />
    </div>
  );
}

function Bell() {
  return (
    <button aria-label="Benachrichtigungen" onClick={() => navTo({ push: { screen: 'notifications' } })} style={{ all: 'unset', cursor: 'pointer', position: 'relative',
      width: 44, height: 44, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--role-surface-2)' }}>
      <Icon n="bell" size={22} color={T.strong} />
      {D.notifications ? (
        <span style={{ position: 'absolute', top: 8, right: 8, minWidth: 17, height: 17, padding: '0 4px', boxSizing: 'border-box',
          background: 'var(--role-accent)', color: 'var(--role-on-accent)', borderRadius: 999, fontSize: 10, fontWeight: 800,
          border: '2px solid var(--role-background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{D.notifications}</span>
      ) : null}
    </button>
  );
}

function SectionHeader({ title, action, onAction }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px' }}>
      <span style={{ fontSize: 17, fontWeight: 800, color: T.strong, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{title}</span>
      <span style={{ flex: 1 }} />
      {action ? <button onClick={onAction} style={{ all: 'unset', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: T.primaryStrong }}>{action}</button> : null}
    </div>
  );
}

/* ── Reusable nav header for pushed screens ─────────────────────────────── */
function NavHeader({ title, onBack, right }) {
  if (isIOS()) {
    return (
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', minHeight: 44, padding: '6px 10px', background: T.bg }}>
        {onBack ? (
          <button onClick={onBack} aria-label="Zurück" style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 1, color: 'var(--role-accent)', zIndex: 1 }}>
            <Icon n="chevron-left" size={27} color="var(--role-accent)" sw={2.4} />
            <span style={{ fontSize: 17, letterSpacing: '-0.01em' }}>Zurück</span>
          </button>
        ) : <div style={{ width: 8 }} />}
        <div style={{ position: 'absolute', left: 56, right: 56, textAlign: 'center', fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', color: T.strong, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', pointerEvents: 'none' }}>{title}</div>
        <div style={{ marginLeft: 'auto', zIndex: 1 }}>{right}</div>
      </div>
    );
  }
  if (DS.TopAppBar) {
    return (
      <DS.TopAppBar platform="material" title={title} style={{ background: T.bg }}
        leading={onBack ? (
          <IconButton variant="ghost" label="Zurück" onClick={onBack}>
            <Icon n="arrow-left" size={24} color={T.strong} />
          </IconButton>
        ) : null}
        trailing={right} />
    );
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 8px 8px 4px', background: T.bg }}>
      {onBack ? (
        <button onClick={onBack} aria-label="Zurück" style={{ all: 'unset', cursor: 'pointer', width: 44, height: 44, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon n="arrow-left" size={24} color={T.strong} />
        </button>
      ) : <div style={{ width: 8 }} />}
      <div style={{ flex: 1, minWidth: 0, fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em', color: T.strong, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</div>
      {right}
    </div>
  );
}

/* ── Video tile (Material filled) ───────────────────────────────────────── */
function VideoTile({ v, onClick }) {
  const s = videoStatus(v.status);
  const uploading = v.status === 'waiting_upload';
  const ios = isIOS();
  const tileStyle = ios
    ? { borderRadius: 14, background: 'var(--role-surface)', boxShadow: '0 1px 3px rgba(38,24,15,0.05), 0 8px 22px -10px rgba(38,24,15,0.13), 0 0 0 0.5px rgba(38,24,15,0.05)' }
    : { borderRadius: 'var(--radius-tile)', background: 'var(--role-surface-1)' };
  return (
    <button onClick={onClick} style={{ all: 'unset', cursor: 'pointer', display: 'flex', gap: 13, alignItems: 'center',
      padding: 11, ...tileStyle }}>
      <div style={{ position: 'relative', width: 100, height: 66, borderRadius: 14, overflow: 'hidden', flexShrink: 0,
        background: 'linear-gradient(135deg,#5a3a22,#241509)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {uploading ? <Icon n="upload-cloud" size={22} color="rgba(255,255,255,.9)" /> : (
          <div style={{ width: 32, height: 32, borderRadius: 999, background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon n="play" size={16} color="#fff" sw={2.4} style={{ marginLeft: 2 }} />
          </div>
        )}
        {!uploading ? <span style={{ position: 'absolute', right: 5, bottom: 5, fontSize: 10, fontWeight: 700, color: '#fff', background: 'rgba(0,0,0,.6)', padding: '1px 5px', borderRadius: 6 }}>{v.duration}</span> : null}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.strong, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{dv(v.title)}</div>
        <div style={{ fontSize: 12.5, color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.group}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Badge tone={s.tone} label={s.label} />
          {v.reviews ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: T.muted }}>
              <Icon n="message-circle" size={14} color={T.muted} />{v.reviews}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}

/* ── Login ──────────────────────────────────────────────────────────────── */
function Login({ onSignIn }) {
  const [busy, setBusy] = React.useState(false);
  function go() { setBusy(true); setTimeout(() => { setBusy(false); onSignIn(); }, 700); }
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: T.bg }}>
      <div style={{ width: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 4, marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'var(--role-accent-container)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--role-on-accent-container)' }}>S</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, color: T.strong, letterSpacing: '-0.02em' }}>Strido</div>
          <div style={{ fontSize: 14, color: T.muted }}>Video-Coaching für Reiter</div>
        </div>
        <Card tone="surface" style={{ padding: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: T.strong, letterSpacing: '-0.01em' }}>Willkommen zurück</h2>
          <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.6, color: T.muted }}>
            Lade Reitvideos hoch und erhalte sekundengenaues Feedback — oder geh live, eins zu eins.
          </p>
          <div style={{ marginTop: 22 }}>
            <Button label="Anmelden" loading={busy} onClick={go} style={{ width: '100%' }} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Button label="Konto erstellen" variant="tonal" onClick={go} style={{ width: '100%' }} />
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ── Home ───────────────────────────────────────────────────────────────── */
function HeroSession({ go }) {
  const b = D.bookings.find((x) => x.status === 'pending') || D.bookings[0];
  return (
    <Card tone="accent" hero padding={18}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, letterSpacing: '.08em', textTransform: 'uppercase', opacity: .9 }}>
          <Icon n="calendar-clock" size={14} sw={2.4} />Nächste Session
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap', background: 'var(--role-surface)', color: T.strong }}>in 2 Tagen</span>
      </div>
      <div style={{ marginTop: 12, fontSize: 19, fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 1.25 }}>{dt(b.type)} mit {b.who}</div>
      <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, opacity: .92 }}>
        <Icon n="clock" size={15} sw={2.2} />{b.when} · {b.mins} Min
      </div>
      <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Button label="Beitreten" icon={<Icon n="video" size={18} color="currentColor" />} onClick={() => go({ push: { screen: 'call', id: b.id } })} style={{ flex: 1 }} />
        <Button label="Details" variant="secondary" onClick={() => go({ tab: 'sessions' })} style={{ background: 'transparent', borderColor: 'currentColor', color: 'inherit' }} />
      </div>
    </Card>
  );
}

const STEPS = [
  { done: true, label: 'Gruppe beigetreten', desc: 'Du kannst in deiner Gruppe Videos hochladen und Coaching buchen.' },
  { done: false, label: 'Erstes Video hochladen', desc: 'Teile ein Trainingsvideo, damit ein Experte es prüfen kann.' },
  { done: false, label: 'Live-Coaching buchen', desc: 'Reserviere einen Termin, wenn dein Experte verfügbar ist.' },
];
function StepRow({ s }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0' }}>
      <div style={{ width: 24, height: 24, borderRadius: 999, flexShrink: 0, marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: s.done ? 'var(--role-accent)' : 'transparent', border: s.done ? 'none' : '2px solid var(--role-outline)' }}>
        {s.done ? <Icon n="check" size={14} color="var(--role-on-accent)" sw={3} /> : null}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: s.done ? T.muted : T.strong }}>{s.label}</div>
        <div style={{ fontSize: 13, lineHeight: 1.45, color: T.muted, marginTop: 2 }}>{s.desc}</div>
      </div>
      {!s.done ? <Icon n="chevron-right" size={18} color={T.muted} style={{ marginTop: 3 }} /> : null}
    </div>
  );
}
function StepsCard() {
  const done = STEPS.filter((s) => s.done).length;
  return (
    <Card tone="surface" padding={0} style={{ padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: T.strong, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>Erste Schritte</span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: T.muted }}>{done}/{STEPS.length}</span>
      </div>
      <div style={{ marginTop: 12 }}><ProgressBar value={done} max={STEPS.length} /></div>
      <div style={{ marginTop: 4 }}>
        {STEPS.map((s, i) => (
          <div key={s.label} style={{ borderTop: i ? '1px solid var(--role-outline)' : 'none' }}><StepRow s={s} /></div>
        ))}
      </div>
    </Card>
  );
}

function Home({ go }) {
  return (
    <Screen header={<TopBar title="Strido" />}>
      <HeroSession go={go} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SectionHeader title="Deine Videos" action="Alle ansehen" onAction={() => go({ tab: 'videos' })} />
        {D.videos.slice(0, 2).map((v) => <VideoTile key={v.id} v={v} onClick={() => go({ push: { screen: 'asset', id: v.id } })} />)}
      </div>
      <StepsCard />
    </Screen>
  );
}

/* ── Videos ─────────────────────────────────────────────────────────────── */
function Videos({ go, primaryAction }) {
  const [filter, setFilter] = React.useState('all');
  const reviewed = D.videos.filter((v) => v.status === 'completed').length;
  const list = filter === 'all' ? D.videos : filter === 'reviewed'
    ? D.videos.filter((v) => v.status === 'completed')
    : D.videos.filter((v) => v.status !== 'completed');
  return (
    <Screen header={<TopBar title="Videos" action={primaryAction} />} gap={14}>
      <SegmentedButton activeId={filter} onChange={setFilter} segments={[
        { id: 'all', label: 'Alle' },
        { id: 'toReview', label: 'Zu prüfen' },
        { id: 'reviewed', label: 'Geprüft' },
      ]} />
      <div style={{ fontSize: 12.5, fontWeight: 700, color: T.muted, letterSpacing: '.04em', textTransform: 'uppercase', padding: '0 4px' }}>{list.length} Videos</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {list.map((v) => <VideoTile key={v.id} v={v} onClick={() => go({ push: { screen: 'asset', id: v.id } })} />)}
      </div>
    </Screen>
  );
}

/* ── Asset detail ───────────────────────────────────────────────────────── */
function ReviewBlock({ r, isReply }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <Avatar fallback={r.initials} alt={r.author} size={isReply ? 28 : 36} shape="circle" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.strong }}>{r.author}</span>
          {r.ts ? (
            <button aria-label={`Zu ${r.ts} springen`} style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, height: 24, padding: '0 9px 0 7px', borderRadius: 12, background: 'var(--role-accent-container)', color: 'var(--role-on-accent-container)', fontSize: 12.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
              <Icon n="play" size={11} color="var(--role-on-accent-container)" sw={2.6} style={{ marginLeft: 0 }} />{r.ts}
            </button>
          ) : null}
        </div>
        <div style={{ marginTop: 2, fontSize: 14, lineHeight: 1.55, color: T.strong }}>{r.body}</div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 12, color: T.muted }}>{r.when}</span>
          {!isReply ? (
            <button style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: T.muted }}>
              <Icon n="reply" size={14} color={T.muted} /> Antworten
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AssetDetail({ id, onBack }) {
  const v = D.videos.find((x) => x.id === id) || D.videos[0];
  const [draft, setDraft] = React.useState('');
  const [atTime, setAtTime] = React.useState(false);
  const parts = v.parts || [];
  const hasParts = parts.length > 1;
  const manyParts = parts.length > 5;
  const firstReady = Math.max(0, parts.findIndex((p) => p.status !== 'processing'));
  const [activePart, setActivePart] = React.useState(hasParts ? firstReady : 0);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [descOpen, setDescOpen] = React.useState(false);
  const descLong = (v.desc || '').length > 90;
  const cur = hasParts ? parts[activePart] : null;
  const s = videoStatus(v.status);
  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column', background: T.bg, color: T.strong }}>
      <NavHeader title={dv(v.title)} onBack={onBack} />
      <div className="m-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {/* Player */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '16 / 9', background: 'linear-gradient(135deg,#3a2417,#1a0f08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon n="play" size={26} color="#fff" sw={2.2} style={{ marginLeft: 3 }} />
          </div>
          <div style={{ position: 'absolute', left: 14, right: 14, bottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11, color: '#fff' }}>0:12</span>
            <div style={{ flex: 1 }}><ProgressBar value={0.28} height={4} /></div>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>{cur ? cur.duration : v.duration}</span>
          </div>
        </div>

        {/* Part switcher — subtle for a few clips; collapses to a sheet trigger when many */}
        {hasParts && !manyParts ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px 0', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <span style={{ flex: 'none', fontSize: 12, fontWeight: 700, color: T.muted }}>Teile</span>
            {parts.map((p, i) => {
              const active = i === activePart;
              const proc = p.status === 'processing';
              return (
                <button key={p.id} onClick={() => { if (!proc) setActivePart(i); }} aria-label={`Teil ${i + 1}${proc ? ', wird verarbeitet' : ', ' + p.duration}`} style={{ all: 'unset', flex: 'none', cursor: proc ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, height: 30, padding: '0 12px', borderRadius: 15, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', fontWeight: active ? 700 : 600, color: proc ? T.muted : (active ? 'var(--role-on-secondary-container)' : T.strong), background: active ? 'var(--role-secondary-container)' : 'transparent', border: active ? '1px solid transparent' : '1px solid var(--role-outline)', opacity: proc ? 0.7 : 1 }}>
                  {proc ? <Icon n="loader" size={12} color={T.muted} /> : null}
                  Teil {i + 1}{proc ? null : <span style={{ opacity: 0.7 }}> · {p.duration}</span>}
                </button>
              );
            })}
          </div>
        ) : null}
        {hasParts && manyParts ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px 0' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: T.muted }}>Teile</span>
            <button onClick={() => setSheetOpen(true)} aria-label={`Teil ${activePart + 1} von ${parts.length} — alle Teile anzeigen`} style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 6px 0 12px', borderRadius: 16, border: '1px solid var(--role-outline)', color: T.strong, fontSize: 13, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              <span style={{ fontWeight: 700 }}>Teil {activePart + 1}</span> von {parts.length}
              <Icon n="chevron-down" size={16} color={T.muted} />
            </button>
          </div>
        ) : null}

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card tone="surface" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar fallback={v.gi} alt={v.group} size={24} shape="circle" />
              <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 700, color: T.strong, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.group}</span>
              <Badge tone={s.tone} label={s.label} />
            </div>
            {v.desc ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                <div style={descOpen || !descLong ? { fontSize: 14, color: T.muted, lineHeight: 1.5 } : { fontSize: 14, color: T.muted, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.desc}</div>
                {descLong ? (
                  <button onClick={() => setDescOpen((o) => !o)} style={{ all: 'unset', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: T.primaryStrong }}>{descOpen ? 'Weniger anzeigen' : 'Mehr anzeigen'}</button>
                ) : null}
              </div>
            ) : null}
          </Card>

          <Card tone="surface" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon n="message-circle" size={18} color={T.primaryStrong} />
              <span style={{ fontSize: 16, fontWeight: 800, color: T.strong }}>Kommentare</span>
              <Badge label={D.reviews.length} />
            </div>
            {D.reviews.map((r) => (
              <div key={r.id} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <ReviewBlock r={r} />
                {(r.replies || []).map((rr) => <div key={rr.id} style={{ paddingLeft: 22 }}><ReviewBlock r={rr} isReply /></div>)}
              </div>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Textarea value={draft} onChange={setDraft} rows={2} placeholder="Kommentar hinzufügen…" />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Chip label="Bei 0:12" selected={atTime} showCheck={false} onClick={() => setAtTime((a) => !a)} />
                <span style={{ flex: 1 }} />
                <IconButton label="Verbessern" variant="ghost" size="sm" disabled={!draft.trim()}><Icon n="sparkles" size={18} color={T.muted} /></IconButton>
                <IconButton label="Senden" variant="primary" size="sm" disabled={!draft.trim()}><Icon n="send" size={18} color="currentColor" /></IconButton>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom sheet — full part list when there are many clips */}
      {sheetOpen ? (
        <div onClick={() => setSheetOpen(false)} style={{ position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(0,0,0,.4)', display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '72%', background: 'var(--role-surface-1)', borderRadius: '28px 28px 0 0', display: 'flex', flexDirection: 'column', paddingBottom: 8, boxShadow: '0 -8px 30px rgba(0,0,0,.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--role-outline)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 16px 10px' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: T.strong }}>Teile</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.muted }}>{parts.length}</span>
            </div>
            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              {parts.map((p, i) => {
                const active = i === activePart;
                const proc = p.status === 'processing';
                return (
                  <button key={p.id} onClick={() => { if (!proc) { setActivePart(i); setSheetOpen(false); } }} style={{ all: 'unset', cursor: proc ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: active ? 'var(--role-secondary-container)' : 'transparent', opacity: proc ? 0.6 : 1 }}>
                    <span style={{ width: 22, display: 'inline-flex', justifyContent: 'center' }}>
                      {active ? <Icon n="check" size={18} color="var(--role-on-secondary-container)" sw={2.6} /> : <span style={{ fontSize: 13, fontWeight: 700, color: T.muted, fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>}
                    </span>
                    <span style={{ flex: 1, fontSize: 15, fontWeight: active ? 700 : 600, color: active ? 'var(--role-on-secondary-container)' : T.strong }}>Teil {i + 1}</span>
                    {proc ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 700, color: T.muted }}>
                        <Icon n="loader" size={13} color={T.muted} />Wird verarbeitet
                      </span>
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--role-on-secondary-container)' : T.muted, fontVariantNumeric: 'tabular-nums' }}>{p.duration}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ── Sessions ───────────────────────────────────────────────────────────── */
function bookingStatus(status) {
  if (status === 'cancelled') return { tone: 'danger', label: 'Storniert' };
  if (status === 'done') return { tone: 'neutral', label: 'Erledigt' };
  return { tone: 'primary', label: 'Anstehend' };
}
function BookingCard({ b, onJoin }) {
  const s = bookingStatus(b.status);
  return (
    <Card tone="surface" style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: T.strong, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>{dt(b.type)}</span>
        <Badge tone={s.tone} label={s.label} />
        {b.recording === 'ready' ? <Badge tone="success" label="Aufnahme bereit" /> : null}
      </div>
      <div style={{ fontSize: 13.5, color: T.muted }}>Experte: {b.who}</div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: T.muted }}>
        <Icon n="clock" size={14} color={T.muted} />{b.when} · {b.mins} Min
      </div>
      {b.reason ? <div style={{ fontSize: 13.5, color: 'var(--role-danger)' }}>Grund: {b.reason}</div> : null}
      {(b.joinable || b.recording === 'ready') ? (
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          {b.joinable ? <Button label="Beitreten" icon={<Icon n="video" size={16} color="currentColor" />} onClick={onJoin} /> : null}
          {b.recording === 'ready' ? <Button label="Aufnahme ansehen" variant="tonal" icon={<Icon n="play" size={16} color="var(--role-on-secondary-container)" />} /> : null}
        </div>
      ) : null}
    </Card>
  );
}

function Sessions({ go, primaryAction }) {
  const [tab, setTab] = React.useState('upcoming');
  const upcoming = D.bookings.filter((b) => b.status === 'pending');
  const past = D.bookings.filter((b) => b.status === 'done');
  const cancelled = D.bookings.filter((b) => b.status === 'cancelled');
  const list = tab === 'past' ? past : tab === 'cancelled' ? cancelled : upcoming;
  const empty = { upcoming: 'anstehenden', past: 'vergangenen', cancelled: 'stornierten' }[tab];
  return (
    <Screen header={<TopBar title="Sessions" action={primaryAction} />} gap={14}>
      <SegmentedButton activeId={tab} onChange={setTab} segments={[
        { id: 'upcoming', label: 'Anstehend' },
        { id: 'past', label: 'Vergangen' },
        { id: 'cancelled', label: 'Storniert' },
      ]} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {list.length ? list.map((b) => (
          <BookingCard key={b.id} b={b} onJoin={() => go({ push: { screen: 'call', id: b.id } })} />
        )) : (
          <EmptyState title={`Keine ${empty} Sessions`} description="Deine Sessions erscheinen hier." icon={<Icon n="calendar-clock" size={24} color={T.primary} />} />
        )}
      </div>
    </Screen>
  );
}

/* ── Call ───────────────────────────────────────────────────────────────── */
function Call({ id, onLeave }) {
  const b = D.bookings.find((x) => x.id === id) || D.bookings[0];
  const [mic, setMic] = React.useState(true);
  const [cam, setCam] = React.useState(true);
  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative', background: '#0c0704', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, background: 'radial-gradient(120% 80% at 50% 35%, #3a2417, #0c0704)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <Avatar fallback="CP" alt={b.who} size={84} shape="circle" />
          <div style={{ marginTop: 12, fontSize: 16, fontWeight: 700, color: '#fff' }}>{b.who}</div>
          <div style={{ marginTop: 4, fontSize: 13, color: 'rgba(255,255,255,.6)' }}>Warte auf den anderen Teilnehmer…</div>
        </div>
      </div>
      <div style={{ position: 'absolute', right: 14, top: 14, width: 84, height: 116, borderRadius: 16, overflow: 'hidden',
        background: cam ? 'linear-gradient(135deg,#5a3a22,#26180f)' : '#1a0f08', border: '1px solid rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!cam ? <Icon n="video-off" size={22} color="rgba(255,255,255,.5)" /> : <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>Du</span>}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 14, padding: '18px 0 28px' }}>
        <IconButton label="Mikrofon" variant="secondary" size="lg" shape="circle" onClick={() => setMic(!mic)}>
          <Icon n={mic ? 'mic' : 'mic-off'} size={22} color={mic ? T.strong : 'var(--role-danger)'} />
        </IconButton>
        <IconButton label="Kamera" variant="secondary" size="lg" shape="circle" onClick={() => setCam(!cam)}>
          <Icon n={cam ? 'video' : 'video-off'} size={22} color={cam ? T.strong : 'var(--role-danger)'} />
        </IconButton>
        <IconButton label="Kamera wechseln" variant="secondary" size="lg" shape="circle">
          <Icon n="switch-camera" size={22} color={T.strong} />
        </IconButton>
        <IconButton label="Verlassen" variant="primary" size="lg" shape="circle" onClick={onLeave} style={{ background: 'var(--role-danger)', border: 'none' }}>
          <Icon n="phone-off" size={22} color="#fff" />
        </IconButton>
      </div>
    </div>
  );
}

/* ── Groups ─────────────────────────────────────────────────────────────── */
/* iOS inset-grouped list: a white card with hairline separators between rows.
   On Material it preserves each screen's existing look (a filled card, or a
   plain gap-stacked list when materialWrap=false). */
function GroupedRows({ items, inset = 60, materialWrap = true }) {
  if (isIOS()) {
    return (
      <Card padding={0} style={{ overflow: 'hidden' }}>
        {items.map((it, i) => (
          <React.Fragment key={i}>
            {i ? <Divider inset={inset} /> : null}
            {it}
          </React.Fragment>
        ))}
      </Card>
    );
  }
  if (materialWrap) return <Card tone="surface" padding={0} style={{ padding: '6px 8px' }}>{items}</Card>;
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{items}</div>;
}

function Groups({ go, primaryAction }) {
  const items = D.groups.map((g) => (
    <ListItem key={g.id} onClick={() => go({ push: { screen: 'group', id: g.id } })}
      leading={<Avatar fallback={g.initials} alt={g.name} size={44} />}
      title={g.name} subtitle={`${g.members} Mitglieder`}
      trailing={<Icon n="chevron-right" size={18} color={T.muted} />} />
  ));
  return (
    <Screen header={<TopBar title="Gruppen" action={primaryAction} />} gap={14}>
      <GroupedRows items={items} inset={73} materialWrap={false} />
    </Screen>
  );
}

/* ── Profile ────────────────────────────────────────────────────────────── */
function Profile({ onSignOut }) {
  const [notify, setNotify] = React.useState(true);
  const rows = [
    { i: 'user-round', l: 'Persönliche Daten', a: { push: { screen: 'preferences' } } },
    { i: 'bar-chart-3', l: 'Berichte', a: { push: { screen: 'reports' } } },
    { i: 'calendar-cog', l: 'Verfügbarkeit verwalten', a: { push: { screen: 'availability' } } },
  ];
  const items = [
    ...rows.map((r) => (
      <ListItem key={r.l} onClick={() => r.a && navTo(r.a)}
        leading={<IconTile tone="neutral" icon={<Icon n={r.i} size={20} color={T.primaryStrong} />} />}
        title={r.l} trailing={<Icon n="chevron-right" size={18} color={T.muted} />} />
    )),
    <ListItem key="notify"
      leading={<IconTile tone="neutral" icon={<Icon n="mail" size={20} color={T.primaryStrong} />} />}
      title="E-Mail-Benachrichtigungen"
      trailing={<Switch checked={notify} onChange={setNotify} ariaLabel="E-Mail-Benachrichtigungen" />} />,
  ];
  return (
    <Screen header={<TopBar title="Profil" />} gap={16}>
      <Card tone="accent" hero style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Avatar fallback={D.user.initials} alt={D.user.name} size={56} shape="circle" />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.01em' }}>{D.user.name}</div>
          <div style={{ fontSize: 13, fontWeight: 600, opacity: .9 }}>Reiterin · Nord Eventing Academy</div>
        </div>
      </Card>
      <GroupedRows items={items} inset={58} />
      <Button label="Abmelden" variant="secondary" icon={<Icon n="log-out" size={16} color={T.strong} />} onClick={onSignOut} style={{ width: '100%' }} />
    </Screen>
  );
}

window.StridoScreens = { Login, Home, Videos, AssetDetail, Sessions, Call, Groups, Profile, Icon, NavHeader, Screen, TopBar, SectionHeader, Bell, videoStatus, T, setNav, navTo, setPlatform };
})();
