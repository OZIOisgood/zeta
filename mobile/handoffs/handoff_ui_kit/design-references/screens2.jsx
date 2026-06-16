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

/* ── Book a session (5-step guided flow) ────────────────────────────────── */
function BookSession({ onBack }) {
  const C = D.coaching;
  const [expertId, setExpertId] = React.useState('');
  const [typeId, setTypeId] = React.useState('');
  const [slot, setSlot] = React.useState(null);
  const [notes, setNotes] = React.useState('');
  const [booked, setBooked] = React.useState(false);

  const expert = C.experts.find((e) => e.id === expertId);
  const type = C.sessionTypes.find((t) => t.id === typeId);
  const activeStep = slot ? 4 : typeId ? 3 : expertId ? 2 : 1;
  const stState = (i) => (i < activeStep ? 'completed' : i === activeStep ? 'active' : 'upcoming');

  if (booked) {
    return (
      <Sheet header={<NavHeader title="Session buchen" onBack={onBack} />}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 16, padding: '48px 16px' }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: 'var(--role-accent-container)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon n="check" size={28} color="var(--role-on-accent-container)" sw={2.6} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.strong, letterSpacing: '-0.01em' }}>Session gebucht</div>
          <div style={{ fontSize: 14, lineHeight: 1.5, color: T.muted, maxWidth: 280 }}>
            {type?.name} mit {expert?.name} · {slot?.day}, {slot?.time}. Du erhältst eine Erinnerung.
          </div>
          <Button label="Zu meinen Sessions" onClick={onBack} />
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet header={<NavHeader title="Session buchen" onBack={onBack} right={
      <button onClick={onBack} aria-label="Abbrechen" style={{ all: 'unset', cursor: 'pointer', padding: '0 14px', height: 44, display: 'inline-flex', alignItems: 'center', fontSize: 14, fontWeight: 700, color: T.muted }}>Abbrechen</button>
    } />} gap={22}>
      <Stepper steps={[
        { label: 'Experte', state: stState(1) },
        { label: 'Art', state: stState(2) },
        { label: 'Zeit', state: stState(3) },
        { label: 'Bestätigen', state: stState(4) },
      ]} />

      <div>
        <SecTitle>Experte wählen</SecTitle>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
          {C.experts.map((e) => (
            <Chip key={e.id} label={e.name} selected={expertId === e.id}
              onClick={() => { setExpertId(e.id); setTypeId(''); setSlot(null); }} />
          ))}
        </div>
      </div>

      {expertId ? (
        <div>
          <SecTitle>Art der Session</SecTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            {C.sessionTypes.map((st) => {
              const sel = typeId === st.id;
              return (
                <Card key={st.id} tone={sel ? 'accent' : 'surface'} onClick={() => { setTypeId(st.id); setSlot(null); }}
                  style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{st.name}</span>
                    <Badge label={`${st.mins} Min`} tone={sel ? 'neutral' : 'primary'} />
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.45, color: sel ? 'inherit' : T.muted, opacity: sel ? 0.9 : 1 }}>{st.desc}</div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      {typeId ? (
        <div>
          <SecTitle>Zeit wählen</SecTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
            {C.slotsByDay.map((d) => (
              <div key={d.day}>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.muted, marginBottom: 8 }}>{d.day}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {d.times.map((tm) => {
                    const key = `${d.day} ${tm}`;
                    return <Chip key={key} label={tm} selected={slot && `${slot.day} ${slot.time}` === key}
                      onClick={() => setSlot({ day: d.day, time: tm })} />;
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {slot ? (
        <Card tone="surface" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <SecTitle>Bestätigen</SecTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <Row k="Experte" v={expert?.name} />
            <Row k="Art" v={type?.name} />
            <Row k="Zeit" v={`${slot.day} · ${slot.time}`} />
          </div>
          <Textarea value={notes} onChange={setNotes} rows={3} placeholder="Notiz an den Experten (optional)" />
          <Button label="Session buchen" onClick={() => setBooked(true)} style={{ width: '100%' }} />
        </Card>
      ) : null}
    </Sheet>
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
