/* Strido mobile UI kit — secondary screens, part 3 (Material You ↔ iOS).
 * Adds the five flows the click-through was missing — each one wired to a
 * previously dead-end entry point:
 *   CreateGroup     ← Gruppen → „Gruppe erstellen“
 *   GroupPreferences ← GruppenDetail → Zahnrad
 *   Invite          ← Gruppen → „Gruppe beitreten“ (QR/Code)
 *   Reports         ← Profil → „Berichte“
 *   Availability    ← Profil → „Verfügbarkeit verwalten“
 * Reuses shared helpers (Icon, NavHeader, T) from screens.jsx.
 */
(function () {
const DS = window.StridoDesignSystem_dc14ef;
const PlatformState = (window.StridoPlatform = window.StridoPlatform || { current: 'material' });
const isIOS = () => PlatformState.current === 'ios';
const _w = (C) => function Platformed(props) { return React.createElement(C, Object.assign({ platform: PlatformState.current }, props)); };
const Button = _w(DS.Button), IconButton = _w(DS.IconButton), Card = _w(DS.Card), Chip = _w(DS.Chip),
  Tabs = _w(DS.Tabs), TextInput = _w(DS.TextInput), Textarea = _w(DS.Textarea), Select = _w(DS.Select),
  ListItem = _w(DS.ListItem), Divider = _w(DS.Divider), Dialog = _w(DS.Dialog), Snackbar = _w(DS.Snackbar),
  Switch = _w(DS.Switch), FieldLabel = _w(DS.FieldLabel);
const { FieldError, Badge, Avatar, EmptyState, IconTile, Fab } = DS;
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
function CancelBtn({ onBack }) {
  return (
    <button onClick={onBack} aria-label="Abbrechen" style={{ all: 'unset', cursor: 'pointer', padding: '0 14px', height: 44, display: 'inline-flex', alignItems: 'center', fontSize: 14, fontWeight: 700, color: T.muted }}>Abbrechen</button>
  );
}

/* Round avatar picker (create / edit group). Tappable; toggles a filled state to
   stand in for a chosen image. Pflichtfeld — drives the parent's submit guard. */
function AvatarInput({ filled, onPick, initials = '', size = 88 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <button onClick={onPick} aria-label="Gruppenbild wählen" style={{ all: 'unset', cursor: 'pointer', position: 'relative', width: size, height: size, borderRadius: 999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: filled ? 'var(--role-accent-container)' : 'var(--role-surface-2)',
        border: filled ? 'none' : '1.5px dashed var(--role-outline)' }}>
        {filled
          ? <span style={{ fontSize: size * 0.34, fontWeight: 800, color: 'var(--role-on-accent-container)' }}>{initials || 'NG'}</span>
          : <Icon n="camera" size={26} color={T.muted} sw={1.8} />}
        <span style={{ position: 'absolute', right: 0, bottom: 0, width: 30, height: 30, borderRadius: 999, background: 'var(--role-accent)', border: '2.5px solid var(--role-background)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon n={filled ? 'pencil' : 'plus'} size={15} color="var(--role-on-accent)" sw={2.4} />
        </span>
      </button>
      <span style={{ fontSize: 12.5, color: T.muted }}>{filled ? 'Bild ändern' : 'Gruppenbild (erforderlich)'}</span>
    </div>
  );
}

/* Reusable labelled field wrapper. */
function Field({ label, hint, error, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <FieldLabel>{label}</FieldLabel>
      {children}
      {error ? <FieldError>{error}</FieldError> : hint ? <div style={{ fontSize: 12.5, color: T.muted }}>{hint}</div> : null}
    </div>
  );
}

/* ── Create group ───────────────────────────────────────────────────────── */
function CreateGroup({ onBack }) {
  const [name, setName] = React.useState('');
  const [avatar, setAvatar] = React.useState(false);
  const [desc, setDesc] = React.useState('');
  const [touched, setTouched] = React.useState(false);
  const nameEmpty = name.trim().length === 0;
  const initials = name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  function submit() {
    setTouched(true);
    if (nameEmpty || !avatar) return;
    onBack();
  }
  return (
    <Sheet header={<NavHeader title="Gruppe erstellen" onBack={onBack} right={<CancelBtn onBack={onBack} />} />} gap={20}>
      <div style={{ paddingTop: 4 }}><AvatarInput filled={avatar} initials={initials} onPick={() => setAvatar((v) => !v)} /></div>
      {touched && !avatar ? <div style={{ textAlign: 'center', marginTop: -8 }}><FieldError>Ein Gruppenbild ist erforderlich.</FieldError></div> : null}
      <Card tone="surface" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Name" error={touched && nameEmpty ? 'Bitte gib einen Namen ein.' : null}>
          <TextInput value={name} onChange={setName} placeholder="z. B. Nord Eventing Academy" invalid={touched && nameEmpty} />
        </Field>
        <Field label="Beschreibung" hint="Optional — wofür ist diese Gruppe?">
          <Textarea value={desc} onChange={setDesc} rows={3} placeholder="Kurzbeschreibung der Gruppe…" />
        </Field>
      </Card>
      <Button label="Gruppe erstellen" disabled={nameEmpty || !avatar} onClick={submit} style={{ width: '100%' }} />
    </Sheet>
  );
}

/* ── Group preferences (edit + danger zone) ─────────────────────────────── */
function GroupPreferences({ id, onBack }) {
  const g = D.groups.find((x) => x.id === id) || D.groups[0];
  const detail = D.groupMembers[g.id] || { desc: '' };
  const [name, setName] = React.useState(g.name);
  const [desc, setDesc] = React.useState(detail.desc || '');
  const [del, setDel] = React.useState(false);
  const [leave, setLeave] = React.useState(false);
  const [snack, setSnack] = React.useState(false);
  const dirty = name.trim() !== g.name || (desc || '') !== (detail.desc || '');

  const save = (
    <button onClick={() => dirty && setSnack(true)} aria-label="Speichern" disabled={!dirty}
      style={{ all: 'unset', cursor: dirty ? 'pointer' : 'default', padding: '0 14px', height: 44, display: 'inline-flex', alignItems: 'center', fontSize: 15, fontWeight: 700, color: dirty ? T.primaryStrong : T.muted }}>Speichern</button>
  );
  return (
    <Sheet header={<NavHeader title="Einstellungen" onBack={onBack} right={save} />} gap={20}>
      <div style={{ paddingTop: 4 }}><AvatarInput filled initials={g.initials} onPick={() => {}} /></div>
      <Card tone="surface" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Name"><TextInput value={name} onChange={setName} placeholder="Gruppenname" /></Field>
        <Field label="Beschreibung"><Textarea value={desc} onChange={setDesc} rows={3} placeholder="Kurzbeschreibung der Gruppe…" /></Field>
      </Card>

      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--role-danger)', padding: '4px 4px 0' }}>Gefahrenzone</div>
      <Card tone="surface" padding={0} style={{ padding: '4px 8px', border: '1px solid var(--role-danger-container)' }}>
        <ListItem onClick={() => setLeave(true)}
          leading={<IconTile tone="neutral" icon={<Icon n="log-out" size={19} color="var(--role-danger)" />} />}
          title={<span style={{ color: 'var(--role-danger)', fontWeight: 700 }}>Gruppe verlassen</span>}
          subtitle="Du verlierst den Zugriff auf Videos und Coaching." />
        <Divider inset={58} />
        <ListItem onClick={() => setDel(true)}
          leading={<IconTile tone="neutral" icon={<Icon n="trash-2" size={19} color="var(--role-danger)" />} />}
          title={<span style={{ color: 'var(--role-danger)', fontWeight: 700 }}>Gruppe löschen</span>}
          subtitle="Endgültig — kann nicht rückgängig gemacht werden." />
      </Card>

      <Dialog open={leave} tone="danger" title="Gruppe verlassen?"
        description={`Du verlierst den Zugriff auf „${g.name}“.`}
        confirmLabel="Verlassen" cancelLabel="Abbrechen"
        onConfirm={() => { setLeave(false); onBack(); }} onCancel={() => setLeave(false)} />
      <Dialog open={del} tone="danger" title="Gruppe löschen?"
        description={`„${g.name}“ und alle Videos und Sessions werden dauerhaft entfernt.`}
        confirmLabel="Löschen" cancelLabel="Abbrechen"
        onConfirm={() => { setDel(false); onBack(); }} onCancel={() => setDel(false)} />
      <Snackbar open={snack} tone="success" message="Änderungen gespeichert." actionLabel="OK" onAction={() => setSnack(false)} />
    </Sheet>
  );
}

/* ── Invite (scan QR / enter code → confirm) ────────────────────────────── */
function Invite({ onBack }) {
  const [code, setCode] = React.useState('');
  const [confirm, setConfirm] = React.useState(null); // group object once a code resolves
  const [bad, setBad] = React.useState(false);

  function lookup(raw) {
    const c = (raw || code).trim().toUpperCase();
    if (c.length < 4) { setBad(true); return; }
    setBad(false);
    // Resolve to a sample group (any code is accepted in the kit).
    setConfirm(D.groups[0]);
  }

  if (confirm) {
    const det = D.groupMembers[confirm.id] || { desc: '' };
    return (
      <Sheet header={<NavHeader title="Einladung" onBack={() => setConfirm(null)} />}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8, padding: '28px 8px 8px' }}>
          <Avatar fallback={confirm.initials} alt={confirm.name} size={72} />
          <div style={{ fontSize: 21, fontWeight: 800, color: T.strong, letterSpacing: '-0.01em' }}>{confirm.name}</div>
          <div style={{ fontSize: 13.5, color: T.muted }}>{confirm.members} Mitglieder · Eingeladen von Coach Petra</div>
        </div>
        <Card tone="surface"><div style={{ fontSize: 14, lineHeight: 1.5, color: T.muted }}>{det.desc}</div></Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Button label="Gruppe beitreten" icon={<Icon n="check" size={18} color="currentColor" sw={2.4} />} onClick={onBack} style={{ width: '100%' }} />
          <Button label="Ablehnen" variant="secondary" onClick={() => setConfirm(null)} style={{ width: '100%' }} />
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet header={<NavHeader title="Gruppe beitreten" onBack={onBack} right={<CancelBtn onBack={onBack} />} />} gap={20}>
      {/* Camera viewport placeholder */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', borderRadius: 20, overflow: 'hidden',
        background: 'repeating-linear-gradient(135deg, #241509 0 14px, #1a0f08 14px 28px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 168, height: 168, borderRadius: 24, border: '3px solid rgba(255,255,255,.9)', boxShadow: '0 0 0 9999px rgba(0,0,0,.28)' }} />
        <div style={{ position: 'absolute', bottom: 16, left: 0, right: 0, textAlign: 'center', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <Icon n="qr-code" size={22} color="rgba(255,255,255,.9)" />QR-Code im Rahmen platzieren
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--role-outline)' }} />
        <span style={{ fontSize: 12.5, fontWeight: 700, color: T.muted }}>oder Code eingeben</span>
        <div style={{ flex: 1, height: 1, background: 'var(--role-outline)' }} />
      </div>

      <Card tone="surface" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Einladungscode" error={bad ? 'Code ungültig — bitte prüfen.' : null}>
          <TextInput value={code} onChange={(v) => { setCode(v); setBad(false); }} placeholder="z. B. NEA-2K9" invalid={bad} />
        </Field>
        <Button label="Beitreten" disabled={!code.trim()} onClick={() => lookup()} style={{ width: '100%' }} />
      </Card>
    </Sheet>
  );
}

/* ── Reports (activity summary) ─────────────────────────────────────────── */
function StatTile({ icon, tone, label, count, footer }) {
  return (
    <Card tone="surface" padding={0} style={{ flex: 1, minWidth: 0, padding: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <IconTile tone={tone} icon={icon} />
      <div style={{ fontSize: 26, fontWeight: 800, color: T.strong, letterSpacing: '-0.02em', lineHeight: 1 }}>{count}</div>
      <div style={{ fontSize: 12, fontWeight: 700, color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
      <div style={{ marginTop: 2 }}>{footer}</div>
    </Card>
  );
}
function Reports({ onBack }) {
  const R = D.reports;
  const [gran, setGran] = React.useState('month');
  return (
    <Sheet header={<NavHeader title="Berichte" onBack={onBack} />} gap={18}>
      <Card tone="surface" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Tabs activeId={gran} onChange={setGran} tabs={[
          { id: 'month', label: 'Monat' }, { id: 'quarter', label: 'Quartal' }, { id: 'year', label: 'Jahr' },
        ]} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton label="Vorheriger Zeitraum" variant="ghost" size="sm"><Icon n="chevron-left" size={20} color={T.muted} /></IconButton>
          <span style={{ fontSize: 15, fontWeight: 700, color: T.strong }}>{R.period}</span>
          <IconButton label="Nächster Zeitraum" variant="ghost" size="sm" disabled><Icon n="chevron-right" size={20} color="var(--role-outline)" /></IconButton>
        </div>
      </Card>

      <div style={{ display: 'flex', gap: 10 }}>
        <StatTile tone="neutral" icon={<Icon n="film" size={20} color={T.primaryStrong} />} label="Videos" count={R.videoCount}
          footer={<Badge label={R.videoDur} />} />
        <StatTile tone="neutral" icon={<Icon n="video" size={20} color="var(--role-success)" />} label="Live-Coaching" count={R.liveCount}
          footer={<Badge tone="success" label={R.liveDur} />} />
        <StatTile tone="neutral" icon={<Icon n="users" size={20} color={T.primaryStrong} />} label="Reiter" count={R.peopleCount}
          footer={<Badge label={`in ${R.groupCount} Gruppen`} />} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 4px' }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: T.strong, letterSpacing: '-0.01em' }}>Aktivität</span>
        <span style={{ flex: 1 }} />
        <Badge label={`${R.events.length} im ${R.period}`} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {R.events.map((e) => {
          const vid = e.kind === 'video';
          return (
            <Card key={e.id} tone="surface" padding={0} style={{ padding: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
              <IconTile tone={vid ? 'neutral' : 'success'} icon={<Icon n={vid ? 'film' : 'video'} size={18} color={vid ? T.primaryStrong : 'var(--role-success)'} />} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.strong, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.title}</div>
                <div style={{ fontSize: 12.5, color: T.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.who} · {e.group} · {e.date}</div>
              </div>
              <Badge tone={vid ? 'neutral' : 'success'} label={e.dur} />
            </Card>
          );
        })}
      </div>
    </Sheet>
  );
}

/* ── Availability (manage session types / schedule / blocked) ───────────────
   Rethought for mobile (Heinrich): the intro card and the full-width add button
   are gone; sections are a single grouped list (hairline dividers, M3 style)
   and the section-aware create action is a Material FAB (iOS → nav-bar "+"). */
function Availability({ onBack }) {
  const A = D.availability;
  const ios = isIOS();
  const [groupId, setGroupId] = React.useState(D.groups[0].id);
  const [tab, setTab] = React.useState('types');
  const [add, setAdd] = React.useState(null);   // which add-dialog is open
  const [del, setDel] = React.useState(null);   // pending delete label
  const [fullDay, setFullDay] = React.useState(true);

  function rows() {
    if (tab === 'types') return A.sessionTypes.map((st) => ({
      key: st.id, del: st.name, edit: () => setAdd('types'),
      node: (
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ flex: '0 1 auto', minWidth: 0, fontSize: 15, fontWeight: 700, color: T.strong, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{st.name}</span>
            <span style={{ flexShrink: 0 }}><Badge tone="primary" label={`${st.mins} Min`} /></span>
          </div>
          <div style={{ fontSize: 13, color: T.muted, marginTop: 3, lineHeight: 1.4 }}>{st.desc}</div>
        </div>
      ),
    }));
    if (tab === 'schedule') return A.schedule.map((s) => ({
      key: s.id, del: s.day, edit: () => setAdd('schedule'),
      node: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <IconTile tone="neutral" icon={<Icon n="calendar" size={18} color={T.primaryStrong} />} />
          <div><div style={{ fontSize: 15, fontWeight: 700, color: T.strong }}>{s.day}</div><div style={{ fontSize: 13, color: T.muted, marginTop: 1 }}>{s.from} – {s.to}</div></div>
        </div>
      ),
    }));
    return A.blocked.map((b) => ({
      key: b.id, del: b.date, edit: null,
      node: (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <IconTile tone="neutral" icon={<Icon n="calendar-off" size={18} color="var(--role-danger)" />} />
          <div><div style={{ fontSize: 15, fontWeight: 700, color: T.strong }}>{b.date}</div><div style={{ fontSize: 13, color: T.muted, marginTop: 1 }}>{b.range}{b.reason ? ` · ${b.reason}` : ''}</div></div>
        </div>
      ),
    }));
  }
  const list = rows();
  const addAtTab = (
    <button onClick={() => setAdd(tab)} aria-label="Hinzufügen" style={{ all: 'unset', cursor: 'pointer', width: 44, height: 44, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--role-accent)' }}>
      <Icon n="plus" size={24} color="var(--role-accent)" sw={2.4} />
    </button>
  );

  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column', background: T.bg, color: T.strong }}>
      <NavHeader title="Verfügbarkeit" onBack={onBack} right={ios ? addAtTab : null} />
      <div className="m-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '12px 16px 104px' }}>
          <Field label="Gruppe">
            <Select value={groupId} onChange={setGroupId} options={D.groups.map((g) => ({ value: g.id, label: g.name }))} />
          </Field>
          <Tabs activeId={tab} onChange={setTab} tabs={[
            { id: 'types', label: 'Session-Typen' }, { id: 'schedule', label: 'Wochenplan' }, { id: 'blocked', label: 'Geblockt' },
          ]} />
          <Card tone="surface" padding={0} style={{ padding: '2px 6px' }}>
            {list.map((r, i) => (
              <React.Fragment key={r.key}>
                {i ? <Divider inset={16} /> : null}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 6px 10px 10px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>{r.node}</div>
                  {r.edit ? <IconButton label="Bearbeiten" variant="ghost" size="sm" onClick={r.edit}><Icon n="pencil" size={17} color={T.muted} /></IconButton> : null}
                  <IconButton label="Löschen" variant="ghost" size="sm" onClick={() => setDel(r.del)}><Icon n="trash-2" size={17} color="var(--role-danger)" /></IconButton>
                </div>
              </React.Fragment>
            ))}
          </Card>
        </div>
      </div>

      {/* M3 FAB — section-aware create action (mirrors the app's Android FAB). */}
      {!ios ? (
        <div style={{ position: 'absolute', right: 16, bottom: 24, zIndex: 30 }}>
          <Fab extended icon={<Icon n="plus" size={20} color="var(--role-on-accent)" sw={2.4} />} label="Hinzufügen" onClick={() => setAdd(tab)} />
        </div>
      ) : null}

      {/* Add dialogs — compact forms per tab. */}
      <Dialog open={add === 'types'} title="Session-Typ" confirmLabel="Speichern" cancelLabel="Abbrechen" onConfirm={() => setAdd(null)} onCancel={() => setAdd(null)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
          <Field label="Name"><TextInput placeholder="z. B. Video-Review" /></Field>
          <Field label="Dauer"><Select value="30" options={[{ value: '30', label: '30 Minuten' }, { value: '45', label: '45 Minuten' }, { value: '60', label: '60 Minuten' }]} /></Field>
          <Field label="Beschreibung"><Textarea rows={2} placeholder="Was umfasst diese Session?" /></Field>
        </div>
      </Dialog>
      <Dialog open={add === 'schedule'} title="Zeitfenster" confirmLabel="Speichern" cancelLabel="Abbrechen" onConfirm={() => setAdd(null)} onCancel={() => setAdd(null)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
          <Field label="Wochentag"><Select value="mon" options={[{ value: 'mon', label: 'Montag' }, { value: 'tue', label: 'Dienstag' }, { value: 'wed', label: 'Mittwoch' }, { value: 'thu', label: 'Donnerstag' }, { value: 'fri', label: 'Freitag' }]} /></Field>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><Field label="Von"><TextInput placeholder="16:00" /></Field></div>
            <div style={{ flex: 1 }}><Field label="Bis"><TextInput placeholder="19:00" /></Field></div>
          </div>
        </div>
      </Dialog>
      <Dialog open={add === 'blocked'} title="Tag blockieren" confirmLabel="Speichern" cancelLabel="Abbrechen" onConfirm={() => setAdd(null)} onCancel={() => setAdd(null)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
          <Field label="Datum"><TextInput placeholder="Fr 27 Jun" /></Field>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: T.strong }}>Ganzer Tag</span>
            <Switch checked={fullDay} onChange={setFullDay} ariaLabel="Ganzer Tag" />
          </div>
          {!fullDay ? (
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}><Field label="Von"><TextInput placeholder="14:00" /></Field></div>
              <div style={{ flex: 1 }}><Field label="Bis"><TextInput placeholder="17:00" /></Field></div>
            </div>
          ) : null}
          <Field label="Grund" hint="Optional"><TextInput placeholder="z. B. Turnier" /></Field>
        </div>
      </Dialog>

      <Dialog open={!!del} tone="danger" title="Wirklich löschen?" description={del ? `„${del}“ wird entfernt.` : ''}
        confirmLabel="Löschen" cancelLabel="Abbrechen" onConfirm={() => setDel(null)} onCancel={() => setDel(null)} />
    </div>
  );
}

/* ── Preferences (personal data + email prefs) — the Profil → „Persönliche
   Daten“ destination, mirroring the app's profile preferences. ─────────────── */
function Preferences({ onBack }) {
  const u = D.user;
  const [name, setName] = React.useState(u.name);
  const [lang, setLang] = React.useState(u.language);
  const [tz, setTz] = React.useState(u.timezone);
  const [prefs, setPrefs] = React.useState({ feedback: true, bookings: true, invites: false });
  const [snack, setSnack] = React.useState(false);
  const toggle = (k) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  const save = (
    <button onClick={() => setSnack(true)} aria-label="Speichern" style={{ all: 'unset', cursor: 'pointer', padding: '0 14px', height: 44, display: 'inline-flex', alignItems: 'center', fontSize: 15, fontWeight: 700, color: T.primaryStrong }}>Speichern</button>
  );
  const NOTES = [
    { k: 'feedback', l: 'Neues Feedback', d: 'Wenn ein Experte dein Video kommentiert.' },
    { k: 'bookings', l: 'Buchungsbestätigungen', d: 'Bestätigungen und Erinnerungen.' },
    { k: 'invites', l: 'Gruppeneinladungen', d: 'Einladungen in neue Gruppen.' },
  ];
  return (
    <Sheet header={<NavHeader title="Persönliche Daten" onBack={onBack} right={save} />} gap={18}>
      <div style={{ paddingTop: 4 }}><AvatarInput filled initials={u.initials} onPick={() => {}} /></div>
      <Card tone="surface" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Name"><TextInput value={name} onChange={setName} placeholder="Dein Name" /></Field>
        <Field label="E-Mail" hint="Wird für die Anmeldung verwendet."><TextInput value={u.email} onChange={() => {}} disabled /></Field>
        <Field label="Sprache"><Select value={lang} onChange={setLang} options={[{ value: 'de', label: 'Deutsch' }, { value: 'en', label: 'English' }, { value: 'fr', label: 'Français' }]} /></Field>
        <Field label="Zeitzone"><Select value={tz} onChange={setTz} options={[
          { value: 'Europe/Berlin', label: 'Berlin (MEZ)' }, { value: 'Europe/London', label: 'London (GMT)' }, { value: 'Europe/Zurich', label: 'Zürich (MEZ)' }, { value: 'America/New_York', label: 'New York (EST)' }, { value: 'Asia/Tokyo', label: 'Tokio (JST)' },
        ]} /></Field>
      </Card>

      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', color: T.muted, padding: '4px 4px 0' }}>E-Mail-Benachrichtigungen</div>
      <Card tone="surface" padding={0} style={{ padding: '2px 6px' }}>
        {NOTES.map((r, i) => (
          <React.Fragment key={r.k}>
            {i ? <Divider inset={16} /> : null}
            <ListItem title={r.l} subtitle={r.d} trailing={<Switch checked={prefs[r.k]} onChange={() => toggle(r.k)} ariaLabel={r.l} />} />
          </React.Fragment>
        ))}
      </Card>
      <Snackbar open={snack} tone="success" message="Profil gespeichert." actionLabel="OK" onAction={() => setSnack(false)} />
    </Sheet>
  );
}

Object.assign(window.StridoScreens, { CreateGroup, GroupPreferences, Invite, Reports, Availability, Preferences });
})();
