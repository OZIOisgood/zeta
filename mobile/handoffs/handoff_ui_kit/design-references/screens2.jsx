/* Strido mobile UI kit — additional screens (Material You).
 * Augments window.StridoScreens with the pushed/secondary views:
 * Notifications, Upload, BookSession, GroupDetail.
 * Reuses shared helpers (Icon, NavHeader, Screen, T) from screens.jsx.
 */
(function () {
const DS = window.StridoDesignSystem_dc14ef;
const PlatformState = (window.StridoPlatform = window.StridoPlatform || { current: 'material' });
const isIOS = () => PlatformState.current === 'ios';
const _w = (C) => function Platformed(props) { return React.createElement(C, Object.assign({ platform: PlatformState.current }, props)); };
const Button = _w(DS.Button), IconButton = _w(DS.IconButton), Card = _w(DS.Card), Chip = _w(DS.Chip), Stepper = _w(DS.Stepper), SegmentedButton = _w(DS.SegmentedButton), Textarea = _w(DS.Textarea), TextInput = _w(DS.TextInput), ListItem = _w(DS.ListItem), Divider = _w(DS.Divider), Select = _w(DS.Select), Dialog = _w(DS.Dialog), Snackbar = _w(DS.Snackbar);
const { Badge, Avatar, EmptyState, IconTile } = DS;
const D = window.StridoData;
const S = window.StridoScreens;
const { Icon, NavHeader, T } = S;

/* Full-height pushed-screen shell: fixed nav header + scroll body. */
function Sheet({ header, children, pad = 16, gap = 16, bottom = 28 }) {
  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: T.bg, color: T.strong }}>
      {header}
      <div className="m-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap, padding: `${pad}px ${pad}px ${bottom}px` }}>{children}</div>
      </div>
    </div>
  );
}

function SecTitle({ children }) {
  return <div style={{ fontSize: 16, fontWeight: 800, color: T.strong, letterSpacing: '-0.01em' }}>{children}</div>;
}

/* ── Notifications ──────────────────────────────────────────────────────── */
const NOTIF_ICON = {
  review: 'message-circle', invite: 'user-plus', booking: 'calendar-check',
  upload: 'check-circle-2', system: 'sparkles',
};
function NotifRow({ n, onAccept, onDecline }) {
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: 12, borderRadius: 'var(--radius-tile)',
      background: n.unread ? 'var(--role-surface-1)' : 'transparent' }}>
      <div style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: n.unread ? 'var(--role-accent-container)' : 'var(--role-surface-2)' }}>
        <Icon n={NOTIF_ICON[n.kind] || 'bell'} size={19} color={n.unread ? 'var(--role-on-accent-container)' : T.muted} sw={2.2} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 14.5, fontWeight: 700, color: T.strong }}>{n.title}</span>
          {n.unread ? <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--role-accent)', flexShrink: 0 }} /> : null}
        </div>
        <div style={{ marginTop: 3, fontSize: 13.5, lineHeight: 1.45, color: T.muted }}>{n.body}</div>
        <div style={{ marginTop: 6, fontSize: 12, color: T.muted }}>{n.when}</div>
        {n.kind === 'invite' ? (
          <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
            <Button label="Annehmen" onClick={onAccept} style={{ padding: '8px 18px' }} />
            <Button label="Ablehnen" variant="secondary" onClick={onDecline} style={{ padding: '8px 18px' }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
function Notifications({ onBack }) {
  const [filter, setFilter] = React.useState('all');
  const [items, setItems] = React.useState(D.notificationList);
  const list = filter === 'unread' ? items.filter((n) => n.unread) : items;
  const today = list.filter((n) => n.day === 'today');
  const earlier = list.filter((n) => n.day !== 'today');
  const unread = items.filter((n) => n.unread).length;
  const markAll = () => setItems((xs) => xs.map((n) => ({ ...n, unread: false })));
  const resolveInvite = (id) => setItems((xs) => xs.filter((n) => n.id !== id));

  const right = unread ? (
    <button onClick={markAll} aria-label="Alle als gelesen markieren" style={{ all: 'unset', cursor: 'pointer', width: 44, height: 44, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon n="check-check" size={22} color={T.primaryStrong} />
    </button>
  ) : null;

  function Group({ label, rows }) {
    if (!rows.length) return null;
    return (
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: T.muted, padding: '0 4px 6px' }}>{label}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {rows.map((n) => <NotifRow key={n.id} n={n} onAccept={() => resolveInvite(n.id)} onDecline={() => resolveInvite(n.id)} />)}
        </div>
      </div>
    );
  }

  return (
    <Sheet header={<NavHeader title="Benachrichtigungen" onBack={onBack} right={right} />} gap={18}>
      <SegmentedButton activeId={filter} onChange={setFilter} segments={[
        { id: 'all', label: 'Alle' },
        { id: 'unread', label: `Ungelesen${unread ? ` (${unread})` : ''}` },
      ]} />
      {list.length ? (
        <>
          <Group label="Heute" rows={today} />
          <Group label="Früher" rows={earlier} />
        </>
      ) : (
        <div style={{ paddingTop: 40 }}>
          <EmptyState title="Alles gelesen" description="Du bist auf dem neuesten Stand." icon={<Icon n="bell" size={24} color={T.primary} />} />
        </div>
      )}
    </Sheet>
  );
}

/* ── Upload (3-step) ────────────────────────────────────────────────────── */
function Upload({ onBack }) {
  const STEPS = ['files', 'details', 'review'];
  const [step, setStep] = React.useState('files');
  const [picked, setPicked] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [groupId, setGroupId] = React.useState(D.groups[0].id);
  const idx = STEPS.indexOf(step);
  const stState = (s) => { const i = STEPS.indexOf(s); return i < idx ? 'completed' : i === idx ? 'active' : 'upcoming'; };
  const groupName = D.groups.find((g) => g.id === groupId)?.name || '';

  return (
    <Sheet header={<NavHeader title="Video hochladen" onBack={onBack} right={
      <button onClick={onBack} aria-label="Abbrechen" style={{ all: 'unset', cursor: 'pointer', padding: '0 14px', height: 44, display: 'inline-flex', alignItems: 'center', fontSize: 14, fontWeight: 700, color: T.muted }}>Abbrechen</button>
    } />}>
      <Stepper steps={[
        { label: 'Datei', state: stState('files') },
        { label: 'Details', state: stState('details') },
        { label: 'Hochladen', state: stState('review') },
      ]} />

      {step === 'files' ? (
        <Card tone="surface" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <button onClick={() => setPicked(true)} style={{ all: 'unset', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '28px 16px', borderRadius: 16, border: '1.5px dashed var(--role-outline)', color: T.muted }}>
            <Icon n="upload-cloud" size={30} color={T.primaryStrong} sw={1.8} />
            <span style={{ fontSize: 14, fontWeight: 700, color: T.strong }}>Video auswählen</span>
            <span style={{ fontSize: 12.5 }}>MP4 oder MOV · auch mehrteilig</span>
          </button>
          {picked ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: 'var(--role-surface-2)' }}>
              <Icon n="file-video" size={18} color={T.primaryStrong} />
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: T.strong, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>combination-line-2.mp4</span>
              <IconButton label="Entfernen" variant="ghost" size="sm" onClick={() => setPicked(false)}><Icon n="x" size={16} color={T.muted} /></IconButton>
            </div>
          ) : null}
          <Button label="Weiter" disabled={!picked} onClick={() => setStep('details')} style={{ alignSelf: 'flex-end' }} />
        </Card>
      ) : null}

      {step === 'details' ? (
        <Card tone="surface" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.strong, marginBottom: 6 }}>Titel</div>
            <TextInput value={title} onChange={setTitle} placeholder="z. B. Kombination — Versuch 3" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.strong, marginBottom: 6 }}>Beschreibung</div>
            <Textarea value={desc} onChange={setDesc} rows={3} placeholder="Worauf soll der Coach achten?" />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.strong, marginBottom: 8 }}>Gruppe</div>
            <Select value={groupId} onChange={setGroupId} options={D.groups.map((g) => ({ value: g.id, label: g.name }))} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button label="Zurück" variant="secondary" onClick={() => setStep('files')} />
            <Button label="Weiter" onClick={() => setStep('review')} />
          </div>
        </Card>
      ) : null}

      {step === 'review' ? (
        <Card tone="surface" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--role-accent-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon n="check" size={20} color="var(--role-on-accent-container)" sw={2.6} />
            </div>
            <div style={{ flex: 1 }}>
              <SecTitle>Bereit zum Hochladen</SecTitle>
              <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>Der Upload läuft im Hintergrund weiter.</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 14, borderRadius: 12, border: '1px solid var(--role-outline)' }}>
            <Row k="Titel" v={title || '—'} />
            <Row k="Gruppe" v={groupName} />
            <Row k="Dateien" v="1" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button label="Zurück" variant="secondary" onClick={() => setStep('details')} />
            <Button label="Upload starten" icon={<Icon n="upload" size={16} color="currentColor" />} onClick={onBack} />
          </div>
        </Card>
      ) : null}
    </Sheet>
  );
}
function Row({ k, v }) {
  return (
    <div style={{ fontSize: 13.5, color: 'var(--role-on-surface)' }}>
      <span style={{ fontWeight: 700 }}>{k}: </span>{v}
    </div>
  );
}

/* ── Book a session — SOTA stepped flow ─────────────────────────────────────
 * Reworked from the old single-scroll accordion (decorative stepper + bare
 * expert chips + global time-chips + buried CTA). Now: one decision per step,
 * the mental order What → Who → When, a working/tappable progress indicator,
 * per-expert availability with a date rail + time grid, and a persistent
 * summary bar that always shows price + selection and carries the one CTA.
 */
function fmtPrice(n) { return `${n} €`; }
function addMins(hhmm, mins) {
  const [h, m] = hhmm.split(':').map(Number);
  const t = h * 60 + m + mins;
  return `${String(Math.floor(t / 60) % 24).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

/* Rich, tappable selection row used for session type + expert. */
function PickRow({ selected, onClick, leading, title, meta, sub, trailing }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={selected} style={{
      all: 'unset', cursor: 'pointer', boxSizing: 'border-box', width: '100%',
      display: 'flex', alignItems: 'center', gap: 12, padding: 14,
      borderRadius: 'var(--radius-card)',
      background: selected ? 'var(--role-accent-container)' : 'var(--role-surface-1)',
      color: selected ? 'var(--role-on-accent-container)' : T.strong,
      boxShadow: selected ? 'inset 0 0 0 2px var(--role-accent)' : 'none',
      transition: 'background-color .14s ease, box-shadow .14s ease',
    }}>
      {leading}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 15.5, fontWeight: 800, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
          {meta}
        </div>
        {sub ? <div style={{ fontSize: 13, lineHeight: 1.4, color: selected ? 'inherit' : T.muted, opacity: selected ? 0.85 : 1, marginTop: 3 }}>{sub}</div> : null}
      </div>
      {trailing}
    </button>
  );
}

function Stars({ rating, reviews, on }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, fontWeight: 700, color: on ? 'inherit' : T.strong }}>
      <Icon n="star" size={13} color="var(--role-warning)" sw={2.4} />
      {rating.toFixed(1)}
      <span style={{ fontWeight: 600, color: on ? 'inherit' : T.muted, opacity: on ? 0.8 : 1 }}>({reviews})</span>
    </span>
  );
}

function BookSession({ onBack }) {
  const C = D.coaching;
  const [step, setStep] = React.useState(1);     // 1 Art · 2 Experte · 3 Zeit · 4 Bestätigen
  const [reached, setReached] = React.useState(1);
  const [typeId, setTypeId] = React.useState('');
  const [expertId, setExpertId] = React.useState('');  // '' | 'any' | eN
  const [dayId, setDayId] = React.useState('');
  const [time, setTime] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [booked, setBooked] = React.useState(false);

  const type = C.sessionTypes.find((t) => t.id === typeId);

  // Which concrete experts can serve on a given day, and the resolved expert
  // when the rider picked "egal" (first available that day).
  const expertsOnDay = (dId) => C.experts.filter((e) => (C.availability[e.id] || {})[dId]);
  const resolvedExpertId = expertId === 'any'
    ? (dayId ? (expertsOnDay(dayId)[0] || {}).id : C.experts[0].id)
    : expertId;
  const expert = C.experts.find((e) => e.id === resolvedExpertId);

  // Availability for the date rail depends on the chosen expert (or "egal" = union).
  const dayHasSlots = (dId) => expertId === 'any'
    ? expertsOnDay(dId).length > 0
    : !!(C.availability[expertId] || {})[dId];
  const slotsForDay = (dId) => {
    if (!dId) return [];
    if (expertId === 'any') {
      const all = new Set();
      expertsOnDay(dId).forEach((e) => (C.availability[e.id][dId] || []).forEach((t) => all.add(t)));
      return [...all].sort();
    }
    return ((C.availability[expertId] || {})[dId] || []).slice().sort();
  };
  const day = C.days.find((d) => d.id === dayId);
  const dayTimes = slotsForDay(dayId);

  const goStep = (n) => { setStep(n); setReached((r) => Math.max(r, n)); };
  const reset = () => { setExpertId(''); setDayId(''); setTime(''); };

  // Per-step gate for the summary-bar CTA.
  const canNext = step === 1 ? !!typeId : step === 2 ? !!expertId : step === 3 ? !!time : true;
  const next = () => { if (step < 4) goStep(step + 1); else setBooked(true); };
  const smartBack = () => { if (step > 1) setStep(step - 1); else onBack(); };

  const stState = (i) => (i + 1 < step ? 'completed' : i + 1 === step ? 'active' : 'upcoming');
  const onStepPress = (i) => { if (i + 1 <= reached) setStep(i + 1); };

  /* ---- Confirmation ---- */
  if (booked) {
    return (
      <Sheet header={<NavHeader title="Gebucht" />}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18, padding: '52px 20px 16px' }}>
          <div style={{ width: 64, height: 64, borderRadius: 22, background: 'var(--role-success-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon n="check" size={32} color="var(--role-on-success-container)" sw={2.8} />
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: T.strong, letterSpacing: '-0.015em' }}>Termin bestätigt</div>
            <div style={{ fontSize: 14, lineHeight: 1.5, color: T.muted, maxWidth: 290, marginTop: 6 }}>
              Wir haben dir und {expert?.name} eine Bestätigung geschickt. Eine Erinnerung folgt 24 Std vorher.
            </div>
          </div>
          <Card tone="surface" style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar fallback={expert?.initials} alt={expert?.name} size={44} shape="circle" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: T.strong }}>{type?.name}</div>
              <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>{day?.dow} {day?.date}. {day?.month} · {time}–{addMins(time, type.mins)}</div>
            </div>
            <Badge label={fmtPrice(type.price)} tone="primary" />
          </Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', marginTop: 4 }}>
            <Button label="Zum Kalender hinzufügen" variant="secondary" icon={<Icon n="calendar-plus" size={16} color={T.strong} />} style={{ width: '100%' }} />
            <Button label="Fertig" onClick={onBack} style={{ width: '100%' }} />
          </div>
        </div>
      </Sheet>
    );
  }

  const STEP_LABELS = ['Art', 'Experte', 'Zeit', 'Details'];

  /* ---- Step bodies ---- */
  let bodyContent = null;
  if (step === 1) {
    bodyContent = (
      <div>
        <SecTitle>Was möchtest du buchen?</SecTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          {C.sessionTypes.map((st) => (
            <PickRow key={st.id} selected={typeId === st.id}
              onClick={() => { setTypeId(st.id); reset(); }}
              leading={<IconTile tone={typeId === st.id ? 'accent' : 'neutral'} icon={<Icon n={st.icon} size={20} color={typeId === st.id ? 'var(--role-on-accent-container)' : T.primaryStrong} />} />}
              title={st.name}
              meta={<span style={{ fontSize: 15, fontWeight: 800 }}>{fmtPrice(st.price)}</span>}
              sub={`${st.mins} Min · ${st.desc}`} />
          ))}
        </div>
      </div>
    );
  } else if (step === 2) {
    bodyContent = (
      <div>
        <SecTitle>Mit wem?</SecTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
          <PickRow selected={expertId === 'any'}
            onClick={() => { setExpertId('any'); setDayId(''); setTime(''); }}
            leading={<IconTile tone={expertId === 'any' ? 'accent' : 'neutral'} icon={<Icon n="sparkles" size={20} color={expertId === 'any' ? 'var(--role-on-accent-container)' : T.primaryStrong} />} />}
            title="Erste*r verfügbare*r"
            sub="Schnellster Termin — Trainer*in wird automatisch zugewiesen" />
          {C.experts.map((e) => (
            <PickRow key={e.id} selected={expertId === e.id}
              onClick={() => { setExpertId(e.id); setDayId(''); setTime(''); }}
              leading={<Avatar fallback={e.initials} alt={e.name} size={44} shape="circle" />}
              title={e.name}
              meta={<Stars rating={e.rating} reviews={e.reviews} on={expertId === e.id} />}
              sub={`${e.role} · ${e.specialty}`} />
          ))}
        </div>
      </div>
    );
  } else if (step === 3) {
    bodyContent = (
      <div>
        <SecTitle>Wann passt es dir?</SecTitle>
        {/* Date rail */}
        <div className="m-scroll" style={{ display: 'flex', gap: 8, overflowX: 'auto', margin: '12px -16px 0', padding: '0 16px 2px' }}>
          {C.days.map((d) => {
            const avail = dayHasSlots(d.id);
            const sel = dayId === d.id;
            return (
              <button key={d.id} type="button" disabled={!avail}
                onClick={() => { setDayId(d.id); setTime(''); }}
                style={{ all: 'unset', flexShrink: 0, cursor: avail ? 'pointer' : 'not-allowed', width: 54, padding: '10px 0', borderRadius: 16, textAlign: 'center',
                  background: sel ? 'var(--role-accent)' : 'var(--role-surface-1)',
                  color: sel ? 'var(--role-on-accent)' : avail ? T.strong : T.muted,
                  opacity: avail ? 1 : 0.4, transition: 'background-color .14s ease' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', opacity: 0.8 }}>{d.isToday ? 'Heute' : d.dow}</div>
                <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.2, marginTop: 2 }}>{d.date}</div>
                <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.75 }}>{d.month}</div>
              </button>
            );
          })}
        </div>
        {/* Time grid */}
        {!dayId ? (
          <div style={{ fontSize: 13.5, color: T.muted, marginTop: 16, padding: '0 2px' }}>Wähle zuerst einen Tag.</div>
        ) : dayTimes.length === 0 ? (
          <div style={{ fontSize: 13.5, color: T.muted, marginTop: 16 }}>Keine freien Termine an diesem Tag.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 16 }}>
            {dayTimes.map((tm) => {
              const sel = time === tm;
              return (
                <button key={tm} type="button" onClick={() => setTime(tm)}
                  style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', padding: '12px 0', borderRadius: 12, fontSize: 14.5, fontWeight: 700,
                    background: sel ? 'var(--role-accent)' : 'var(--role-surface-1)',
                    color: sel ? 'var(--role-on-accent)' : T.strong,
                    boxShadow: sel ? 'none' : 'inset 0 0 0 1px var(--role-outline)',
                    transition: 'background-color .14s ease' }}>{tm}</button>
              );
            })}
          </div>
        )}
        {dayId && dayTimes.length > 0 ? (
          <div style={{ fontSize: 12.5, color: T.muted, marginTop: 12 }}>Dauer {type.mins} Min{expertId === 'any' ? ' · Trainer*in wird zugewiesen' : ''}</div>
        ) : null}
      </div>
    );
  } else {
    bodyContent = (
      <div>
        <SecTitle>Stimmt das so?</SecTitle>
        <Card tone="surface" style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 0 }}>
          <SummaryRow icon={type.icon} k="Session" v={`${type.name} · ${type.mins} Min`} />
          <Divider />
          <SummaryRow avatar={expert} k={expertId === 'any' ? 'Trainer*in (zugewiesen)' : 'Trainer*in'} v={expert?.name} sub={expert?.specialty} />
          <Divider />
          <SummaryRow icon="calendar-clock" k="Termin" v={`${day?.isToday ? 'Heute' : day?.dow} ${day?.date}. ${day?.month}`} sub={`${time}–${addMins(time, type.mins)} Uhr`} />
        </Card>
        <div style={{ marginTop: 14 }}>
          <SecTitle>Notiz an die*den Trainer*in</SecTitle>
          <div style={{ marginTop: 10 }}>
            <Textarea value={notes} onChange={setNotes} rows={3} placeholder="z. B. Woran möchtest du arbeiten? (optional)" />
          </div>
        </div>
      </div>
    );
  }

  /* ---- Summary bar (persistent footer) ---- */
  const ctaLabel = step < 4 ? 'Weiter' : `Buchen · ${fmtPrice(type ? type.price : 0)}`;
  const footer = (
    <div style={{ flexShrink: 0, borderTop: '1px solid var(--role-outline)', background: T.bg, padding: '12px 16px', paddingBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {type ? (
          <>
            <div style={{ fontSize: 17, fontWeight: 800, color: T.strong, letterSpacing: '-0.01em' }}>{fmtPrice(type.price)}</div>
            <div style={{ fontSize: 12.5, color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {type.name}{expert ? ` · ${expert.name}` : ''}{time ? ` · ${time}` : ''}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: T.muted }}>Wähle eine Session-Art</div>
        )}
      </div>
      <Button label={ctaLabel} disabled={!canNext} onClick={next} style={{ minWidth: 132 }} />
    </div>
  );

  return (
    <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', background: T.bg, color: T.strong }}>
      <NavHeader title="Session buchen" onBack={smartBack} right={
        <button onClick={onBack} aria-label="Abbrechen" style={{ all: 'unset', cursor: 'pointer', padding: '0 14px', height: 44, display: 'inline-flex', alignItems: 'center', fontSize: 14, fontWeight: 700, color: T.muted }}>Abbrechen</button>
      } />
      <div style={{ padding: '4px 8px 14px' }}>
        <Stepper onStepPress={onStepPress} steps={STEP_LABELS.map((l, i) => ({ label: l, state: stState(i) }))} />
      </div>
      <div className="m-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ padding: '4px 16px 20px' }}>{bodyContent}</div>
      </div>
      {footer}
    </div>
  );
}

/* Summary line for the confirm step (icon or avatar · label · value · sub). */
function SummaryRow({ icon, avatar, k, v, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
      {avatar
        ? <Avatar fallback={avatar.initials} alt={avatar.name} size={38} shape="circle" />
        : <IconTile tone="neutral" size={38} icon={<Icon n={icon} size={18} color={T.primaryStrong} />} />}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{k}</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.strong, marginTop: 1 }}>{v}</div>
        {sub ? <div style={{ fontSize: 12.5, color: T.muted, marginTop: 1 }}>{sub}</div> : null}
      </div>
    </div>
  );
}

/* ── Group detail ───────────────────────────────────────────────────────── */
function MemberRow({ m }) {
  return (
    <ListItem
      leading={<Avatar fallback={m.initials} alt={m.name} size={38} shape="circle" />}
      title={m.name} subtitle={m.role} />
  );
}
function MemberCard({ icon, title, count, desc, members }) {
  return (
    <Card tone="surface">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <IconTile tone="neutral" icon={<Icon n={icon} size={19} color={T.primaryStrong} />} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <SecTitle>{title}</SecTitle>
            <Badge label={String(count)} />
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>{desc}</div>
        </div>
      </div>
      <div style={{ marginTop: 6 }}>
        {members.map((m, i) => (
          <div key={m.id}>
            {i ? <Divider inset={50} /> : null}
            <MemberRow m={m} />
          </div>
        ))}
      </div>
    </Card>
  );
}
function GroupDetail({ id, onBack }) {
  const g = D.groups.find((x) => x.id === id) || D.groups[0];
  const detail = D.groupMembers[g.id] || { desc: '', experts: [], students: [] };
  const [leave, setLeave] = React.useState(false);
  const [snack, setSnack] = React.useState(false);
  const settings = (
    <button aria-label="Einstellungen" onClick={() => S.navTo({ push: { screen: 'groupPrefs', id: g.id } })} style={{ all: 'unset', cursor: 'pointer', width: 44, height: 44, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon n="settings" size={22} color={T.primaryStrong} />
    </button>
  );
  return (
    <Sheet header={<NavHeader title={g.name} onBack={onBack} right={settings} />} gap={16}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Avatar fallback={g.initials} alt={g.name} size={56} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: T.strong, letterSpacing: '-0.01em' }}>{g.name}</div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>{g.members} Mitglieder</div>
        </div>
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.5, color: T.muted }}>{detail.desc}</div>

      <Card tone="surface">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <IconTile tone="neutral" icon={<Icon n="qr-code" size={19} color={T.primaryStrong} />} />
          <div style={{ flex: 1 }}>
            <SecTitle>Mitglieder einladen</SecTitle>
            <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>Teile einen Link oder QR-Code, um Reiter hinzuzufügen.</div>
          </div>
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 76, height: 76, flexShrink: 0, borderRadius: 12, border: '1px dashed var(--role-outline)', background: 'var(--role-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon n="qr-code" size={40} color={T.muted} sw={1.5} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Button label="Link kopieren" variant="tonal" icon={<Icon n="copy" size={16} color="var(--role-on-secondary-container)" />} onClick={() => setSnack(true)} style={{ width: '100%' }} />
            <Button label="QR teilen" variant="secondary" icon={<Icon n="share-2" size={16} color={T.strong} />} style={{ width: '100%' }} />
          </div>
        </div>
      </Card>

      <MemberCard icon="award" title="Experten" count={detail.experts.length} desc="Trainer, die Videos prüfen und Coaching anbieten." members={detail.experts} />
      <MemberCard icon="users" title="Reiter" count={detail.students.length} desc="Mitglieder dieser Gruppe." members={detail.students} />

      <Button label="Gruppe verlassen" variant="secondary" icon={<Icon n="log-out" size={16} color="var(--role-danger)" />}
        onClick={() => setLeave(true)} style={{ width: '100%', color: 'var(--role-danger)', borderColor: 'var(--role-danger)' }} />

      <Dialog open={leave} tone="danger" title="Gruppe verlassen?"
        description={`Du verlierst den Zugriff auf Videos und Coaching von „${g.name}“.`}
        confirmLabel="Verlassen" cancelLabel="Abbrechen"
        onConfirm={() => { setLeave(false); onBack(); }} onCancel={() => setLeave(false)} />
      <Snackbar open={snack} tone="success" message="Einladungslink kopiert." actionLabel="OK" onAction={() => setSnack(false)} />
    </Sheet>
  );
}

Object.assign(window.StridoScreens, { Notifications, Upload, BookSession, GroupDetail });
})();
