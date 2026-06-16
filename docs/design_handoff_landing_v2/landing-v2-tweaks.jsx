// landing-v2-tweaks.jsx — Tweaks island for the Strido v2 (equestrian) landing page.

const STRIDO_V2_DEFAULTS = /*EDITMODE-BEGIN*/{
  "heroLayout": "geteilt",
  "headline": "Dein Trainer sieht jeden Schritt — egal, wo dein Stall steht",
  "scale": "standard",
  "liveSektion": "dunkel",
  "logo": "wortmarke",
  "rahmen": "dezent",
  "hintergrund": "ruhig"
}/*EDITMODE-END*/;

const STRIDO_V2_HEADLINES = {
  "Dein Trainer sieht jeden Schritt — egal, wo dein Stall steht": {
    lead: "Lade Reitvideos hoch und erhalte sekundengenaues Feedback. Oder geht live ins 1:1-Coaching — die Aufzeichnung bleibt dir erhalten. Ohne Hängerfahrt, ohne Anfahrt, ohne Reisezeit."
  },
  "Besseres Reiten beginnt mit dem richtigen Blick": {
    lead: "Sekundengenaues Feedback zu Sitz, Hilfengebung und Takt — vom eigenen Stall aus. Asynchron hochladen oder live coachen, beides bleibt aufgezeichnet."
  },
  "Reit-Coaching ohne Hängerfahrt": {
    lead: "Hol dir Feedback von Spezialisten, egal wo dein Stall steht. Video hochladen, Analyse erhalten, live nacharbeiten — und für alle komplett kostenlos."
  }
};

function StridoV2TweaksApp() {
  const [t, setTweak] = useTweaks(STRIDO_V2_DEFAULTS);

  React.useEffect(() => {
    document.body.dataset.hero = t.heroLayout;
    document.body.dataset.scale = t.scale;
    document.body.dataset.live = t.liveSektion;
    document.body.dataset.logo = t.logo;
    document.body.dataset.rahmen = t.rahmen;
    document.body.dataset.bgRhythm = t.hintergrund;
    const entry = STRIDO_V2_HEADLINES[t.headline];
    if (entry) {
      if (window.StridoI18N && window.StridoI18N.setHeroText) {
        // keep i18n in sync: feed the German source, it re-applies the active language
        window.StridoI18N.setHeroText(t.headline, entry.lead);
      } else {
        const h = document.getElementById('hero-headline');
        const l = document.getElementById('hero-lead');
        if (h) { h.textContent = t.headline; }
        if (l) { l.textContent = entry.lead; }
      }
    }
  }, [t.heroLayout, t.scale, t.liveSektion, t.headline, t.logo, t.rahmen, t.hintergrund]);

  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Hero" />
      <TweakRadio
        label="Layout"
        value={t.heroLayout}
        options={['geteilt', 'zentriert']}
        onChange={(v) => setTweak('heroLayout', v)}
      />
      <TweakSelect
        label="Headline"
        value={t.headline}
        options={Object.keys(STRIDO_V2_HEADLINES)}
        onChange={(v) => setTweak('headline', v)}
      />
      <TweakSection label="Seite" />
      <TweakRadio
        label="Logo"
        value={t.logo}
        options={['wortmarke', 'bildmarke']}
        onChange={(v) => setTweak('logo', v)}
      />
      <TweakRadio
        label="Typo-Skala"
        value={t.scale}
        options={['standard', 'gross']}
        onChange={(v) => setTweak('scale', v)}
      />
      <TweakRadio
        label="Live-Sektion"
        value={t.liveSektion}
        options={['dunkel', 'hell']}
        onChange={(v) => setTweak('liveSektion', v)}
      />
      <TweakRadio
        label="Rahmen"
        value={t.rahmen}
        options={['dezent', 'distinkt']}
        onChange={(v) => setTweak('rahmen', v)}
      />
      <TweakRadio
        label="Hintergrund"
        value={t.hintergrund}
        options={['rhythmus', 'ruhig']}
        onChange={(v) => setTweak('hintergrund', v)}
      />
    </TweaksPanel>
  );
}

const stridoV2TweaksRoot = ReactDOM.createRoot(document.getElementById('tweaks-root'));
stridoV2TweaksRoot.render(<StridoV2TweaksApp />);
