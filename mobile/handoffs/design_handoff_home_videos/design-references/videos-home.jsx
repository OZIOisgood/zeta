/* Strido — Material 3 "Videos" screen (orange light + dark).
 * Reuses shared primitives from window.StridoMaterial. Exposes window.StridoVideos.
 */
(function () {
const D = window.StridoData;
const M = window.StridoMaterial;
const { Icon, TopBar, NavBar, Fab } = M;

/* status → Material chip tones (reads --m-* tokens) */
function statusChip(status) {
  if (status === 'completed') return { bg: 'var(--m-success-container)', fg: 'var(--m-on-success-container)', label: 'Geprüft', icon: 'check-circle-2' };
  if (status === 'pending') return { bg: 'var(--m-secondary-container)', fg: 'var(--m-on-secondary-container)', label: 'In Prüfung', icon: 'loader' };
  return { bg: 'var(--m-s3)', fg: 'var(--m-on-surface-variant)', label: 'Lädt hoch', icon: 'upload-cloud' };
}

/* ── Filter — Material 3 segmented button (full width) ──────────────────── */
function SegmentedFilter({ active }) {
  const reviewed = D.videos.filter((v) => v.status === 'completed').length;
  const segs = [
    { id: 'all', label: 'Alle' },
    { id: 'toReview', label: 'Zu prüfen' },
    { id: 'reviewed', label: 'Geprüft' },
  ];
  return (
    <div style={{ margin: '0 16px', display: 'flex', height: 42, borderRadius: 999, border: '1.4px solid var(--m-outline)', overflow: 'hidden' }}>
      {segs.map((s, i) => {
        const on = s.id === active;
        return (
          <div key={s.id} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            background: on ? 'var(--m-secondary-container)' : 'transparent',
            color: on ? 'var(--m-on-secondary-container)' : 'var(--m-on-surface-variant)',
            borderLeft: i ? '1.4px solid var(--m-outline)' : 'none', fontSize: 13.5, fontWeight: 700 }}>
            {on ? <Icon n="check" size={15} sw={2.8} color="var(--m-on-secondary-container)" /> : null}
            <span style={{ whiteSpace: 'nowrap' }}>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Video card (richer than the home tile) ────────────────────────────── */
function VideoCard({ v }) {
  const s = statusChip(v.status);
  const uploading = v.status === 'waiting_upload';
  return (
    <div style={{ display: 'flex', gap: 13, alignItems: 'center', padding: 12, borderRadius: 22, background: 'var(--m-s1)' }}>
      <div style={{ position: 'relative', width: 104, height: 70, borderRadius: 16, overflow: 'hidden', flexShrink: 0,
        background: 'linear-gradient(135deg,#5a3a22,#241509)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {uploading ? (
          <Icon n="upload-cloud" size={22} color="rgba(255,255,255,.9)" sw={2.2} />
        ) : (
          <div style={{ width: 34, height: 34, borderRadius: 999, background: 'rgba(255,255,255,.18)', display: 'flex',
            alignItems: 'center', justifyContent: 'center' }}>
            <Icon n="play" size={17} color="#fff" sw={2.4} style={{ marginLeft: 2 }} />
          </div>
        )}
        {!uploading ? (
          <span style={{ position: 'absolute', right: 5, bottom: 5, fontSize: 10, fontWeight: 700, color: '#fff',
            background: 'rgba(0,0,0,.6)', padding: '1px 5px', borderRadius: 6 }}>{v.duration}</span>
        ) : null}
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--m-on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--m-on-surface-variant)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {v.group}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 1 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 700, padding: '3px 9px 3px 7px',
            borderRadius: 999, whiteSpace: 'nowrap', flexShrink: 0, background: s.bg, color: s.fg }}>
            <Icon n={s.icon} size={13} color={s.fg} sw={2.4} />{s.label}
          </span>
          {v.reviews ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--m-on-surface-variant)' }}>
              <Icon n="message-circle" size={14} color="var(--m-on-surface-variant)" />{v.reviews}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ── Composed Videos screen ────────────────────────────────────────────── */
function MaterialVideos() {
  return (
    <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column',
      background: 'var(--m-bg)', color: 'var(--m-on-surface)' }}>
      <TopBar title="Videos" avatar={false} />
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 116 }}
        className="m-scroll">
        <SegmentedFilter active="all" />
        <div style={{ padding: '0 16px 2px', fontSize: 12.5, fontWeight: 700, color: 'var(--m-on-surface-variant)',
          letterSpacing: '.04em', textTransform: 'uppercase' }}>{D.videos.length} Videos</div>
        <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {D.videos.map((v) => <VideoCard key={v.id} v={v} />)}
        </div>
      </div>
      <Fab />
      <NavBar active="videos" />
    </div>
  );
}

window.StridoVideos = { MaterialVideos, VideoCard };
})();
