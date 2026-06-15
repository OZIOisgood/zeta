/* ============================================================
   STRIDO LANDINGPAGE v2 — i18n engine (DE / EN / FR / NL)
   Node-walking translator keyed by the German source text.
   German is the base (keys); only differing strings are listed
   per language — anything missing falls back to German.
   ============================================================ */
(function () {
  "use strict";

  var LANGS = [
    { code: "de", label: "Deutsch", short: "DE" },
    { code: "en", label: "English", short: "EN" },
    { code: "fr", label: "Français", short: "FR" },
    { code: "nl", label: "Nederlands", short: "NL" }
  ];
  var STORAGE_KEY = "strido_lang";

  var DICT = {
    en: {
      // --- nav / header ---
      "So funktioniert's": "How it works",
      "Funktionen": "Features",
      "Für wen": "For whom",
      "Kostenlos": "Free",
      "Anmelden": "Sign in",
      "Kostenlos starten": "Start for free",
      // --- hero ---
      "Video-Coaching für den Reitsport": "Video coaching for equestrian sport",
      "Dein Trainer sieht jeden Schritt — egal, wo dein Stall steht": "Your trainer sees every step — wherever your stable is",
      "Lade Reitvideos hoch und erhalte sekundengenaues Feedback. Oder geht live ins 1:1-Coaching — die Aufzeichnung bleibt dir erhalten. Ohne Hängerfahrt, ohne Anfahrt, ohne Reisezeit.": "Upload riding videos and get feedback down to the second. Or go live in 1-on-1 coaching — the recording stays yours. No horse-box trip, no travel, no commute.",
      "Schau auf deine Schulterachse — sie kippt nach vorn. Becken mit der Bewegung mitgehen lassen.": "Watch your shoulder axis — it’s tipping forward. Let your pelvis move with the motion.",
      // hero headline variants
      "Besseres Reiten beginnt mit dem richtigen Blick": "Better riding starts with the right eye",
      "Sekundengenaues Feedback zu Sitz, Hilfengebung und Takt — vom eigenen Stall aus. Asynchron hochladen oder live coachen, beides bleibt aufgezeichnet.": "Feedback down to the second on seat, aids and rhythm — from your own stable. Upload asynchronously or coach live, both stay recorded.",
      "Reit-Coaching ohne Hängerfahrt": "Riding coaching without the horse-box trip",
      "Hol dir Feedback von Spezialisten, egal wo dein Stall steht. Video hochladen, Analyse erhalten, live nacharbeiten — und für alle komplett kostenlos.": "Get feedback from specialists, wherever your stable is. Upload a video, get the analysis, follow up live — and completely free for everyone.",
      // --- free band ---
      "Komplett": "Completely",
      "kostenlos": "free",
      ". Für Trainer und Reiter.": ". For trainers and riders.",
      "Keine versteckten Kosten, keine Folgekosten, kein Abo. Alle Funktionen, von Anfang an frei.": "No hidden costs, no follow-up fees, no subscription. All features, free from the start.",
      "Keine Kreditkarte nötig": "No credit card needed",
      "Keine versteckten oder Folgekosten": "No hidden or follow-up costs",
      "Alle Funktionen für alle freigeschaltet": "All features unlocked for everyone",
      // --- two ways ---
      "Zwei Wege zu besserem Reiten": "Two paths to better riding",
      "Schnelles Feedback auf Abruf — oder live im 1:1. Beides an einem Ort, beides kostenlos.": "Quick feedback on demand — or live one-on-one. Both in one place, both free.",
      "Asynchron": "Asynchronous",
      "Video-Feedback, wann es passt": "Video feedback whenever it suits you",
      "Film deinen Ritt am Stall mit dem Handy und hol dir die Analyse — unabhängig von Hallenzeiten und Anfahrt.": "Film your ride at the stable with your phone and get the analysis — independent of arena times and travel.",
      "Video hochladen": "Upload video",
      "Trainingsritt hochladen — bei Bedarf in mehreren Teilen.": "Upload your training ride — in several parts if needed.",
      "Sekundengenaues Feedback": "Feedback to the second",
      "Dein Trainer kommentiert direkt an der richtigen Stelle im Video.": "Your trainer comments right at the relevant spot in the video.",
      "Beliebig oft nachschauen": "Rewatch as often as you like",
      "Feedback bleibt erhalten — anschauen, so oft du willst.": "Feedback stays — watch it as often as you want.",
      "Live": "Live",
      "Live-Coaching, das erhalten bleibt": "Live coaching that stays with you",
      "Manches klärt man am besten im Gespräch. Der Call wird aufgezeichnet — und ihr arbeitet danach weiter daran.": "Some things are best sorted out in conversation. The call is recorded — and you keep working on it afterwards.",
      "Session buchen": "Book a session",
      "Freien Termin in den Verfügbarkeiten deines Trainers wählen.": "Pick a free slot from your trainer’s availability.",
      "Live im 1:1-Call": "Live in a 1-on-1 call",
      "Direkt im Browser — Live-Feedback in Echtzeit.": "Right in the browser — live feedback in real time.",
      "Aufzeichnung wird archiviert": "Recording gets archived",
      "Die Session landet automatisch in deinem Archiv.": "The session lands automatically in your archive.",
      "Nachträgliches Review": "Review afterwards",
      "Aufzeichnung erneut ansehen und zeitgestempeltes Text-Feedback ergänzen.": "Rewatch the recording and add time-stamped text feedback.",
      // --- feedback ---
      "Kommentare, die auf der Sekunde sitzen": "Comments that land on the exact second",
      "Kein „bei ungefähr Minute zwei“ mehr. Jeder Kommentar ist mit dem exakten Moment im Video verknüpft — vom Aufsteigen bis zur Landung.": "No more “around minute two.” Every comment is linked to the exact moment in the video — from mounting to landing.",
      "Zeitgestempelte Kommentare": "Time-stamped comments",
      "Ein Klick auf den Zeitstempel springt genau zur richtigen Stelle.": "One click on the timestamp jumps straight to the right spot.",
      "Immer wieder anschauen": "Watch again and again",
      "Anders als die Vor-Ort-Stunde bleibt das Feedback dauerhaft erhalten.": "Unlike an in-person lesson, the feedback stays for good.",
      "Status „Überprüft“": "Status “Reviewed”",
      "Auf einen Blick sehen, welche Videos noch Feedback brauchen.": "See at a glance which videos still need feedback.",
      "Dressur — Trab-Traversale": "Dressage — trot half-pass",
      "hochgeladen von Jonas": "uploaded by Jonas",
      "Zu überprüfen": "To review",
      "Schöner Takt in der Anlehnung. Treib das Pferd etwas mehr ans äußere Bein.": "Nice rhythm in the contact. Ride the horse a bit more into the outside leg.",
      "Hier kippt die Schulterachse nach vorn — vergleiche es mit deinem Video von letzter Woche.": "Here the shoulder axis tips forward — compare it with your video from last week.",
      "Antwort": "Reply",
      "Verstanden — beim nächsten Mal halte ich die Schulter länger.": "Got it — next time I’ll hold the shoulder longer.",
      "Kommentar hinzufügen…": "Add a comment…",
      // --- live ---
      "Live-Coaching": "Live coaching",
      "Live sprechen — und danach in Ruhe nacharbeiten": "Talk live — then work through it calmly afterwards",
      "Coaches legen ihre Verfügbarkeiten fest, Reiter buchen direkt. Der Call läuft in Strido — und jede Session wird archiviert, damit nichts verloren geht.": "Coaches set their availability, riders book directly. The call runs in Strido — and every session is archived so nothing gets lost.",
      "1:1 live im Browser": "1-on-1 live in the browser",
      "Direkt verbinden — ohne zusätzliche Software, ohne Installation.": "Connect directly — no extra software, no installation.",
      "Aufzeichnung & Archiv": "Recording & archive",
      "Jede Live-Session wird aufgezeichnet und bleibt abrufbar.": "Every live session is recorded and stays available.",
      "Nachträgliches Text-Feedback": "Text feedback afterwards",
      "Aufzeichnung erneut ansehen und zeitgestempelte Notizen ergänzen.": "Rewatch the recording and add time-stamped notes.",
      // --- booking ---
      "Buchung": "Booking",
      "Live-Session buchen — in unter einer Minute": "Book a live session — in under a minute",
      "Dein Trainer gibt seine Zeiten frei, du buchst den passenden Slot. Ohne Nachrichten hin und her, ohne Telefonieren.": "Your trainer opens up their times, you book the slot that fits. No back-and-forth messages, no phone calls.",
      "Verfügbarkeiten in Echtzeit": "Availability in real time",
      "Dein Trainer legt seine freien Zeiten fest — du siehst sofort, was offen ist.": "Your trainer sets their free times — you instantly see what’s open.",
      "In einem Schritt buchen": "Book in one step",
      "Slot wählen, bestätigen — fertig. Keine Abstimmung per Nachricht nötig.": "Pick a slot, confirm — done. No coordinating by message needed.",
      "Bestätigung & Erinnerung": "Confirmation & reminder",
      "Beide bekommen die Bestätigung und eine Erinnerung vor dem Termin.": "Both get the confirmation and a reminder before the session.",
      "Call-Link automatisch": "Call link automatically",
      "Zur richtigen Zeit ist der 1:1-Call startbereit — ohne Suchen.": "At the right time the 1-on-1 call is ready to start — no searching.",
      "Live-Session buchen": "Book a live session",
      "Coach Marie · diese Woche": "Coach Marie · this week",
      "4 frei": "4 free",
      "Mi 18.": "Wed 18",
      "Do 19.": "Thu 19",
      "Fr 20.": "Fri 20",
      "Do 19. · 18:30": "Thu 19 · 18:30",
      "45 Min · Schwungkontrolle": "45 min · impulsion check",
      "Buchen": "Book",
      // --- groups ---
      "Stall & Gruppen": "Stable & groups",
      "Dein Stall, deine Reiter — an einem Ort": "Your stable, your riders — in one place",
      "Als Trainer lädst du deine Reiter selbst ein und organisierst sie in Gruppen. Keine fremden Augen, kein offener Marktplatz — nur dein Team.": "As a trainer you invite your riders yourself and organize them into groups. No strangers, no open marketplace — just your team.",
      "Reiter per Einladung": "Riders by invitation",
      "Du entscheidest, wer dazugehört — Einladung per Link, ein Klick zum Beitritt.": "You decide who belongs — invite by link, one click to join.",
      "Trainer & Reiter, klare Rollen": "Trainers & riders, clear roles",
      "Trainer geben Feedback, Reiter reichen ihre Videos ein.": "Trainers give feedback, riders submit their videos.",
      "Gruppeneinstellungen": "Group settings",
      "Lege fest, wer Videos sehen und überprüfen darf.": "Set who may view and review videos.",
      "Dressurstall Lindenhof": "Lindenhof Dressage Stable",
      "5 Mitglieder · 1 offene Einladung": "5 members · 1 open invite",
      "Trainer": "Trainer",
      "Zuletzt aktiv vor 2 Std.": "Last active 2 hrs ago",
      "3 Videos eingereicht": "3 videos submitted",
      "Reiter": "Rider",
      "1 Video wartet auf Feedback": "1 video awaiting feedback",
      "Offene Einladung": "Open invitation",
      "Gültig bis 30. Juni": "Valid until June 30",
      "Ausstehend": "Pending",
      "Gruppe": "Group",
      // --- progress ---
      "Fortschritt": "Progress",
      "Sieh die Entwicklung — über Wochen und Monate": "See the progress — over weeks and months",
      "Ein Pferd-Reiter-Paar wächst über die Zeit. Strido fasst Videos, Feedback und Sessions in einer Übersicht zusammen — als PDF teilbar.": "A horse-and-rider pair grows over time. Strido brings videos, feedback and sessions together in one overview — shareable as a PDF.",
      "Aktivität pro Zeitraum": "Activity per period",
      "Videos, Feedback und Sessions im Monats- oder Wochenblick.": "Videos, feedback and sessions by month or week.",
      "Als PDF exportieren": "Export as PDF",
      "Berichte teilen — mit Reitern, Eltern oder dem Verein.": "Share reports — with riders, parents or the club.",
      "Fortschritt · Mai 2026": "Progress · May 2026",
      "Jonas Schmid · Dressurstall Lindenhof": "Jonas Schmid · Lindenhof Dressage Stable",
      "Live-Sessions": "Live sessions",
      "5,2 Std.": "5.2 hrs",
      "Coaching-Zeit diesen Monat": "Coaching time this month",
      // --- for whom ---
      "Klare Vorteile — für beide Seiten": "Clear benefits — for both sides",
      "Für Reiter": "For riders",
      "Hol dir Feedback von Spezialisten — ohne Hängerfahrt, ohne weite Wege.": "Get feedback from specialists — no horse-box trip, no long journeys.",
      "Zugang zu Trainern, die nicht um die Ecke wohnen": "Access to trainers who don’t live around the corner",
      "Keine Hängerfahrt — trainiere im eigenen Stall": "No horse-box trip — train at your own stable",
      "Feedback wann es passt, abends hochgeladen, morgens da": "Feedback when it suits you — upload at night, it’s there by morning",
      "Sekundengenaues Feedback zum immer wieder Ansehen": "Feedback to the second, to watch again and again",
      "Dokumentierter Fortschritt übers ganze Jahr": "Documented progress across the whole year",
      "Für Trainer": "For trainers",
      "Erreiche mehr Reiter, ohne mehr zu fahren — und gib schneller besseres Feedback.": "Reach more riders without driving more — and give better feedback faster.",
      "Keine Reisezeit zwischen Höfen — coache von überall": "No travel time between yards — coach from anywhere",
      "Reichweite über den eigenen Umkreis hinaus": "Reach beyond your own area",
      "Text mit KI verbessern — schneller klar formuliert": "Improve text with AI — clearly worded, faster",
      "Verfügbarkeiten selbst steuern, mehr Reiter betreuen": "Control your own availability, coach more riders",
      "Gruppen, Fortschritt & Reports im Blick": "Groups, progress & reports at a glance",
      // --- sports ---
      "Disziplinen & Sportarten": "Disciplines & sports",
      "Zuhause im Sattel — offen für jeden Sport": "At home in the saddle — open to every sport",
      "Strido funktioniert für jeden Sport, bei dem visuelles Feedback zu Technik und Form wichtig ist — vom Reitsport bis weit darüber hinaus.": "Strido works for any sport where visual feedback on technique and form matters — from equestrian sport and far beyond.",
      "Im Reitsport": "In equestrian sport",
      "Dressur": "Dressage",
      "Springen": "Show jumping",
      "Vielseitigkeit": "Eventing",
      "Westernreiten": "Western riding",
      "Freizeitreiten": "Leisure riding",
      "Und für jeden Sport mit Technik & Form": "And for any sport with technique & form",
      "Leichtathletik": "Athletics",
      "Turnen": "Gymnastics",
      "Schwimmen": "Swimming",
      "Gewichtheben": "Weightlifting",
      "Tanzen": "Dance",
      "Kampfsport": "Martial arts",
      // --- roadmap ---
      "Ausblick": "What’s next",
      "Das kommt als Nächstes": "Coming up next",
      "Schon stark, und wir bauen weiter. Diese Funktionen sind in Arbeit.": "Already strong, and we keep building. These features are in the works.",
      "Kommt bald": "Coming soon",
      "Annotation aufs Video": "Annotate on the video",
      "Linien, Winkel und Markierungen direkt ins Bild zeichnen — Sitz und Hilfengebung sichtbar machen.": "Draw lines, angles and markers straight onto the frame — make seat and aids visible.",
      "Sprach-Feedback übers Video": "Voice feedback over the video",
      "Statt zu tippen einfach einsprechen — dein Trainer kommentiert den Ritt mit der Stimme.": "Instead of typing, just speak — your trainer comments on the ride by voice.",
      "Fest geplant": "Firmly planned",
      "Apps für iOS & Android": "Apps for iOS & Android",
      "Dedizierte Apps fürs Filmen und Feedback direkt am Stall — fest eingeplant.": "Dedicated apps for filming and feedback right at the stable — firmly planned.",
      "Trainingspläne": "Training plans",
      "Trainer legen Pläne mit klaren Schritten an — etwa Turnieraufgaben. Reiter reiten sie nach und laden ihre Videos direkt zum Plan hoch.": "Trainers create plans with clear steps — such as competition tests. Riders follow them and upload their videos straight to the plan.",
      // --- testimonials ---
      "Stimmen": "Voices",
      "Was Trainer und Reiter sagen": "What trainers and riders say",
      "„Ich betreue jetzt Reiter aus drei Bundesländern, ohne ins Auto zu steigen. Das Feedback geht abends raus, wenn die Kinder im Bett sind.“": "“I now coach riders from three different regions without getting in the car. The feedback goes out in the evening once the kids are in bed.”",
      "Dressurtrainerin": "Dressage trainer",
      "„Endlich sehe ich genau, an welcher Stelle meine Schulter wegkippt. Ich schaue mir das Feedback vor jedem Training nochmal an.“": "“I can finally see exactly where my shoulder tips away. I rewatch the feedback before every training session.”",
      "Amateurreiterin, Springen": "Amateur rider, show jumping",
      "„Kein Hänger, kein Stress fürs Pferd. Wir besprechen den Ritt live und ich kann mir die Aufzeichnung danach in Ruhe nochmal ansehen.“": "“No horse-box, no stress for the horse. We discuss the ride live and I can rewatch the recording calmly afterwards.”",
      "Vielseitigkeitsreiter": "Eventing rider",
      "Platzhalter-Stimmen — werden später durch echte Zitate ersetzt.": "Placeholder voices — to be replaced with real quotes later.",
      // --- cta ---
      "Dein erstes Reitvideo ist schnell hochgeladen": "Your first riding video is uploaded in no time",
      "Erstelle ein kostenloses Konto, lade einen Ritt hoch und erhalte Feedback, das den Moment trifft. Keine Kreditkarte nötig.": "Create a free account, upload a ride and get feedback that hits the moment. No credit card needed.",
      "Komplett kostenlos — für Trainer und Reiter": "Completely free — for trainers and riders",
      // --- footer ---
      "Video-Coaching für den Reitsport. © 2026 Strido": "Video coaching for equestrian sport. © 2026 Strido",
      "Impressum": "Imprint",
      "Datenschutz": "Privacy",
      "Kontakt": "Contact"
    },

    fr: {
      "So funktioniert's": "Comment ça marche",
      "Funktionen": "Fonctionnalités",
      "Für wen": "Pour qui",
      "Kostenlos": "Gratuit",
      "Anmelden": "Se connecter",
      "Kostenlos starten": "Commencer gratuitement",
      "Video-Coaching für den Reitsport": "Coaching vidéo pour l’équitation",
      "Dein Trainer sieht jeden Schritt — egal, wo dein Stall steht": "Ton coach voit chaque foulée — où que soit ton écurie",
      "Lade Reitvideos hoch und erhalte sekundengenaues Feedback. Oder geht live ins 1:1-Coaching — die Aufzeichnung bleibt dir erhalten. Ohne Hängerfahrt, ohne Anfahrt, ohne Reisezeit.": "Téléverse tes vidéos d’équitation et reçois un feedback à la seconde près. Ou passe en coaching live en tête-à-tête — l’enregistrement te reste. Sans van, sans trajet, sans déplacement.",
      "Schau auf deine Schulterachse — sie kippt nach vorn. Becken mit der Bewegung mitgehen lassen.": "Surveille l’axe de tes épaules — il bascule vers l’avant. Laisse ton bassin suivre le mouvement.",
      "Besseres Reiten beginnt mit dem richtigen Blick": "Mieux monter commence par le bon regard",
      "Sekundengenaues Feedback zu Sitz, Hilfengebung und Takt — vom eigenen Stall aus. Asynchron hochladen oder live coachen, beides bleibt aufgezeichnet.": "Un feedback à la seconde près sur l’assiette, les aides et la cadence — depuis ta propre écurie. Téléverse en différé ou coache en direct, tout reste enregistré.",
      "Reit-Coaching ohne Hängerfahrt": "Du coaching équestre sans van",
      "Hol dir Feedback von Spezialisten, egal wo dein Stall steht. Video hochladen, Analyse erhalten, live nacharbeiten — und für alle komplett kostenlos.": "Obtiens le feedback de spécialistes, où que soit ton écurie. Téléverse une vidéo, reçois l’analyse, retravaille en direct — et entièrement gratuit pour tous.",
      "Komplett": "Entièrement",
      "kostenlos": "gratuit",
      ". Für Trainer und Reiter.": ". Pour coachs et cavaliers.",
      "Keine versteckten Kosten, keine Folgekosten, kein Abo. Alle Funktionen, von Anfang an frei.": "Aucun coût caché, aucun frais ultérieur, aucun abonnement. Toutes les fonctionnalités, gratuites dès le départ.",
      "Keine Kreditkarte nötig": "Aucune carte bancaire requise",
      "Keine versteckten oder Folgekosten": "Aucun coût caché ni ultérieur",
      "Alle Funktionen für alle freigeschaltet": "Toutes les fonctionnalités débloquées pour tous",
      "Zwei Wege zu besserem Reiten": "Deux voies vers une meilleure équitation",
      "Schnelles Feedback auf Abruf — oder live im 1:1. Beides an einem Ort, beides kostenlos.": "Un feedback rapide à la demande — ou en direct en tête-à-tête. Les deux au même endroit, les deux gratuits.",
      "Asynchron": "En différé",
      "Video-Feedback, wann es passt": "Un feedback vidéo quand ça t’arrange",
      "Film deinen Ritt am Stall mit dem Handy und hol dir die Analyse — unabhängig von Hallenzeiten und Anfahrt.": "Filme ta séance à l’écurie avec ton téléphone et reçois l’analyse — sans contrainte d’horaires de manège ni de trajet.",
      "Video hochladen": "Téléverser la vidéo",
      "Trainingsritt hochladen — bei Bedarf in mehreren Teilen.": "Téléverse ta séance — en plusieurs parties si besoin.",
      "Sekundengenaues Feedback": "Un feedback à la seconde près",
      "Dein Trainer kommentiert direkt an der richtigen Stelle im Video.": "Ton coach commente directement au bon moment de la vidéo.",
      "Beliebig oft nachschauen": "Revoir autant de fois que tu veux",
      "Feedback bleibt erhalten — anschauen, so oft du willst.": "Le feedback reste — regarde-le autant que tu veux.",
      "Live": "En direct",
      "Live-Coaching, das erhalten bleibt": "Un coaching live qui reste",
      "Manches klärt man am besten im Gespräch. Der Call wird aufgezeichnet — und ihr arbeitet danach weiter daran.": "Certaines choses se règlent mieux en parlant. L’appel est enregistré — et vous continuez à y travailler ensuite.",
      "Session buchen": "Réserver une séance",
      "Freien Termin in den Verfügbarkeiten deines Trainers wählen.": "Choisis un créneau libre dans les disponibilités de ton coach.",
      "Live im 1:1-Call": "En direct en appel tête-à-tête",
      "Direkt im Browser — Live-Feedback in Echtzeit.": "Directement dans le navigateur — un feedback en temps réel.",
      "Aufzeichnung wird archiviert": "L’enregistrement est archivé",
      "Die Session landet automatisch in deinem Archiv.": "La séance arrive automatiquement dans ton archive.",
      "Nachträgliches Review": "Revue a posteriori",
      "Aufzeichnung erneut ansehen und zeitgestempeltes Text-Feedback ergänzen.": "Revois l’enregistrement et ajoute un feedback écrit horodaté.",
      "Kommentare, die auf der Sekunde sitzen": "Des commentaires précis à la seconde",
      "Kein „bei ungefähr Minute zwei“ mehr. Jeder Kommentar ist mit dem exakten Moment im Video verknüpft — vom Aufsteigen bis zur Landung.": "Fini le « vers la deuxième minute ». Chaque commentaire est lié au moment exact de la vidéo — du montoir à la réception.",
      "Zeitgestempelte Kommentare": "Commentaires horodatés",
      "Ein Klick auf den Zeitstempel springt genau zur richtigen Stelle.": "Un clic sur l’horodatage saute pile au bon endroit.",
      "Immer wieder anschauen": "Revoir encore et encore",
      "Anders als die Vor-Ort-Stunde bleibt das Feedback dauerhaft erhalten.": "Contrairement au cours en présentiel, le feedback reste pour de bon.",
      "Status „Überprüft“": "Statut « Vérifié »",
      "Auf einen Blick sehen, welche Videos noch Feedback brauchen.": "Vois d’un coup d’œil quelles vidéos attendent encore un feedback.",
      "Dressur — Trab-Traversale": "Dressage — appuyer au trot",
      "hochgeladen von Jonas": "téléversé par Jonas",
      "Zu überprüfen": "À vérifier",
      "Schöner Takt in der Anlehnung. Treib das Pferd etwas mehr ans äußere Bein.": "Belle cadence dans le contact. Pousse un peu plus le cheval sur la jambe extérieure.",
      "Hier kippt die Schulterachse nach vorn — vergleiche es mit deinem Video von letzter Woche.": "Ici l’axe des épaules bascule vers l’avant — compare avec ta vidéo de la semaine dernière.",
      "Antwort": "Réponse",
      "Verstanden — beim nächsten Mal halte ich die Schulter länger.": "Compris — la prochaine fois je tiendrai l’épaule plus longtemps.",
      "Kommentar hinzufügen…": "Ajouter un commentaire…",
      "Live-Coaching": "Coaching en direct",
      "Live sprechen — und danach in Ruhe nacharbeiten": "Échanger en direct — puis retravailler tranquillement ensuite",
      "Coaches legen ihre Verfügbarkeiten fest, Reiter buchen direkt. Der Call läuft in Strido — und jede Session wird archiviert, damit nichts verloren geht.": "Les coachs définissent leurs disponibilités, les cavaliers réservent directement. L’appel se déroule dans Strido — et chaque séance est archivée pour que rien ne se perde.",
      "1:1 live im Browser": "Tête-à-tête en direct dans le navigateur",
      "Direkt verbinden — ohne zusätzliche Software, ohne Installation.": "Connecte-toi directement — sans logiciel supplémentaire, sans installation.",
      "Aufzeichnung & Archiv": "Enregistrement et archive",
      "Jede Live-Session wird aufgezeichnet und bleibt abrufbar.": "Chaque séance en direct est enregistrée et reste accessible.",
      "Nachträgliches Text-Feedback": "Feedback écrit a posteriori",
      "Aufzeichnung erneut ansehen und zeitgestempelte Notizen ergänzen.": "Revois l’enregistrement et ajoute des notes horodatées.",
      "Buchung": "Réservation",
      "Live-Session buchen — in unter einer Minute": "Réserve une séance live — en moins d’une minute",
      "Dein Trainer gibt seine Zeiten frei, du buchst den passenden Slot. Ohne Nachrichten hin und her, ohne Telefonieren.": "Ton coach ouvre ses créneaux, tu réserves celui qui te convient. Sans échanges de messages, sans téléphone.",
      "Verfügbarkeiten in Echtzeit": "Disponibilités en temps réel",
      "Dein Trainer legt seine freien Zeiten fest — du siehst sofort, was offen ist.": "Ton coach définit ses créneaux libres — tu vois aussitôt ce qui est disponible.",
      "In einem Schritt buchen": "Réserver en une étape",
      "Slot wählen, bestätigen — fertig. Keine Abstimmung per Nachricht nötig.": "Choisis un créneau, confirme — c’est fait. Aucune coordination par message.",
      "Bestätigung & Erinnerung": "Confirmation et rappel",
      "Beide bekommen die Bestätigung und eine Erinnerung vor dem Termin.": "Les deux reçoivent la confirmation et un rappel avant la séance.",
      "Call-Link automatisch": "Lien d’appel automatique",
      "Zur richtigen Zeit ist der 1:1-Call startbereit — ohne Suchen.": "Au bon moment, l’appel tête-à-tête est prêt — sans rien chercher.",
      "Live-Session buchen": "Réserver une séance live",
      "Coach Marie · diese Woche": "Coach Marie · cette semaine",
      "4 frei": "4 libres",
      "Mi 18.": "Mer 18",
      "Do 19.": "Jeu 19",
      "Fr 20.": "Ven 20",
      "Do 19. · 18:30": "Jeu 19 · 18:30",
      "45 Min · Schwungkontrolle": "45 min · contrôle de l’impulsion",
      "Buchen": "Réserver",
      "Stall & Gruppen": "Écurie et groupes",
      "Dein Stall, deine Reiter — an einem Ort": "Ton écurie, tes cavaliers — au même endroit",
      "Als Trainer lädst du deine Reiter selbst ein und organisierst sie in Gruppen. Keine fremden Augen, kein offener Marktplatz — nur dein Team.": "En tant que coach, tu invites toi-même tes cavaliers et les organises en groupes. Aucun regard extérieur, aucune place de marché ouverte — juste ton équipe.",
      "Reiter per Einladung": "Des cavaliers sur invitation",
      "Du entscheidest, wer dazugehört — Einladung per Link, ein Klick zum Beitritt.": "Tu décides qui en fait partie — invitation par lien, un clic pour rejoindre.",
      "Trainer & Reiter, klare Rollen": "Coachs et cavaliers, des rôles clairs",
      "Trainer geben Feedback, Reiter reichen ihre Videos ein.": "Les coachs donnent le feedback, les cavaliers soumettent leurs vidéos.",
      "Gruppeneinstellungen": "Paramètres du groupe",
      "Lege fest, wer Videos sehen und überprüfen darf.": "Définis qui peut voir et vérifier les vidéos.",
      "Dressurstall Lindenhof": "Écurie de dressage Lindenhof",
      "5 Mitglieder · 1 offene Einladung": "5 membres · 1 invitation en attente",
      "Trainer": "Coach",
      "Zuletzt aktiv vor 2 Std.": "Actif il y a 2 h",
      "3 Videos eingereicht": "3 vidéos soumises",
      "Reiter": "Cavalier",
      "1 Video wartet auf Feedback": "1 vidéo en attente de feedback",
      "Offene Einladung": "Invitation en attente",
      "Gültig bis 30. Juni": "Valable jusqu’au 30 juin",
      "Ausstehend": "En attente",
      "Gruppe": "Groupe",
      "Fortschritt": "Progrès",
      "Sieh die Entwicklung — über Wochen und Monate": "Vois la progression — au fil des semaines et des mois",
      "Ein Pferd-Reiter-Paar wächst über die Zeit. Strido fasst Videos, Feedback und Sessions in einer Übersicht zusammen — als PDF teilbar.": "Un couple cheval-cavalier progresse avec le temps. Strido réunit vidéos, feedback et séances dans une vue d’ensemble — partageable en PDF.",
      "Aktivität pro Zeitraum": "Activité par période",
      "Videos, Feedback und Sessions im Monats- oder Wochenblick.": "Vidéos, feedback et séances par mois ou par semaine.",
      "Als PDF exportieren": "Exporter en PDF",
      "Berichte teilen — mit Reitern, Eltern oder dem Verein.": "Partage les rapports — avec les cavaliers, les parents ou le club.",
      "Fortschritt · Mai 2026": "Progrès · mai 2026",
      "Jonas Schmid · Dressurstall Lindenhof": "Jonas Schmid · Écurie de dressage Lindenhof",
      "Videos": "Vidéos",
      "Live-Sessions": "Séances live",
      "5,2 Std.": "5,2 h",
      "Coaching-Zeit diesen Monat": "Temps de coaching ce mois-ci",
      "Klare Vorteile — für beide Seiten": "Des avantages clairs — pour les deux côtés",
      "Für Reiter": "Pour les cavaliers",
      "Hol dir Feedback von Spezialisten — ohne Hängerfahrt, ohne weite Wege.": "Obtiens le feedback de spécialistes — sans van, sans longs trajets.",
      "Zugang zu Trainern, die nicht um die Ecke wohnen": "Accès à des coachs qui n’habitent pas au coin de la rue",
      "Keine Hängerfahrt — trainiere im eigenen Stall": "Sans van — entraîne-toi dans ta propre écurie",
      "Feedback wann es passt, abends hochgeladen, morgens da": "Un feedback quand ça t’arrange — envoyé le soir, prêt le matin",
      "Sekundengenaues Feedback zum immer wieder Ansehen": "Un feedback à la seconde près, à revoir encore et encore",
      "Dokumentierter Fortschritt übers ganze Jahr": "Une progression documentée tout au long de l’année",
      "Für Trainer": "Pour les coachs",
      "Erreiche mehr Reiter, ohne mehr zu fahren — und gib schneller besseres Feedback.": "Touche plus de cavaliers sans rouler davantage — et donne un meilleur feedback plus vite.",
      "Keine Reisezeit zwischen Höfen — coache von überall": "Aucun temps de trajet entre les écuries — coache de partout",
      "Reichweite über den eigenen Umkreis hinaus": "Une portée au-delà de ta région",
      "Text mit KI verbessern — schneller klar formuliert": "Améliore le texte avec l’IA — formulé clairement, plus vite",
      "Verfügbarkeiten selbst steuern, mehr Reiter betreuen": "Gère tes disponibilités, suis plus de cavaliers",
      "Gruppen, Fortschritt & Reports im Blick": "Groupes, progrès et rapports en un coup d’œil",
      "Disziplinen & Sportarten": "Disciplines et sports",
      "Zuhause im Sattel — offen für jeden Sport": "Chez soi en selle — ouvert à tous les sports",
      "Strido funktioniert für jeden Sport, bei dem visuelles Feedback zu Technik und Form wichtig ist — vom Reitsport bis weit darüber hinaus.": "Strido fonctionne pour tout sport où le feedback visuel sur la technique et la posture compte — de l’équitation et bien au-delà.",
      "Im Reitsport": "En équitation",
      "Dressur": "Dressage",
      "Springen": "Saut d’obstacles",
      "Vielseitigkeit": "Concours complet",
      "Westernreiten": "Équitation western",
      "Freizeitreiten": "Équitation de loisir",
      "Und für jeden Sport mit Technik & Form": "Et pour tout sport de technique et de posture",
      "Leichtathletik": "Athlétisme",
      "Turnen": "Gymnastique",
      "Schwimmen": "Natation",
      "Gewichtheben": "Haltérophilie",
      "Tanzen": "Danse",
      "Kampfsport": "Arts martiaux",
      "Ausblick": "À venir",
      "Das kommt als Nächstes": "Ce qui arrive ensuite",
      "Schon stark, und wir bauen weiter. Diese Funktionen sind in Arbeit.": "Déjà solide, et on continue. Ces fonctionnalités sont en préparation.",
      "Kommt bald": "Bientôt disponible",
      "Annotation aufs Video": "Annoter la vidéo",
      "Linien, Winkel und Markierungen direkt ins Bild zeichnen — Sitz und Hilfengebung sichtbar machen.": "Trace lignes, angles et repères directement sur l’image — rends l’assiette et les aides visibles.",
      "Sprach-Feedback übers Video": "Feedback vocal sur la vidéo",
      "Statt zu tippen einfach einsprechen — dein Trainer kommentiert den Ritt mit der Stimme.": "Au lieu de taper, il suffit de parler — ton coach commente la séance à la voix.",
      "Fest geplant": "Planifié",
      "Apps für iOS & Android": "Applis pour iOS et Android",
      "Dedizierte Apps fürs Filmen und Feedback direkt am Stall — fest eingeplant.": "Des applis dédiées pour filmer et donner du feedback directement à l’écurie — déjà planifiées.",
      "Trainingspläne": "Plans d’entraînement",
      "Trainer legen Pläne mit klaren Schritten an — etwa Turnieraufgaben. Reiter reiten sie nach und laden ihre Videos direkt zum Plan hoch.": "Les coachs créent des plans aux étapes claires — comme des reprises de concours. Les cavaliers les suivent et téléversent leurs vidéos directement sur le plan.",
      "Stimmen": "Témoignages",
      "Was Trainer und Reiter sagen": "Ce que disent coachs et cavaliers",
      "„Ich betreue jetzt Reiter aus drei Bundesländern, ohne ins Auto zu steigen. Das Feedback geht abends raus, wenn die Kinder im Bett sind.“": "« Je suis désormais des cavaliers de trois régions sans monter en voiture. Le feedback part le soir, une fois les enfants couchés. »",
      "Dressurtrainerin": "Coach de dressage",
      "„Endlich sehe ich genau, an welcher Stelle meine Schulter wegkippt. Ich schaue mir das Feedback vor jedem Training nochmal an.“": "« Je vois enfin précisément où mon épaule bascule. Je revois le feedback avant chaque entraînement. »",
      "Amateurreiterin, Springen": "Cavalière amateur, saut d’obstacles",
      "„Kein Hänger, kein Stress fürs Pferd. Wir besprechen den Ritt live und ich kann mir die Aufzeichnung danach in Ruhe nochmal ansehen.“": "« Pas de van, pas de stress pour le cheval. On débriefe la séance en direct et je peux revoir l’enregistrement tranquillement ensuite. »",
      "Vielseitigkeitsreiter": "Cavalier de concours complet",
      "Platzhalter-Stimmen — werden später durch echte Zitate ersetzt.": "Témoignages provisoires — à remplacer par de vraies citations plus tard.",
      "Dein erstes Reitvideo ist schnell hochgeladen": "Ta première vidéo d’équitation se téléverse en un clin d’œil",
      "Erstelle ein kostenloses Konto, lade einen Ritt hoch und erhalte Feedback, das den Moment trifft. Keine Kreditkarte nötig.": "Crée un compte gratuit, téléverse une séance et reçois un feedback qui vise juste. Aucune carte bancaire requise.",
      "Komplett kostenlos — für Trainer und Reiter": "Entièrement gratuit — pour coachs et cavaliers",
      "Video-Coaching für den Reitsport. © 2026 Strido": "Coaching vidéo pour l’équitation. © 2026 Strido",
      "Impressum": "Mentions légales",
      "Datenschutz": "Confidentialité",
      "Kontakt": "Contact"
    },

    nl: {
      "So funktioniert's": "Zo werkt het",
      "Funktionen": "Functies",
      "Für wen": "Voor wie",
      "Kostenlos": "Gratis",
      "Anmelden": "Inloggen",
      "Kostenlos starten": "Gratis starten",
      "Video-Coaching für den Reitsport": "Videocoaching voor de paardensport",
      "Dein Trainer sieht jeden Schritt — egal, wo dein Stall steht": "Je trainer ziet elke stap — waar je stal ook staat",
      "Lade Reitvideos hoch und erhalte sekundengenaues Feedback. Oder geht live ins 1:1-Coaching — die Aufzeichnung bleibt dir erhalten. Ohne Hängerfahrt, ohne Anfahrt, ohne Reisezeit.": "Upload je rijvideo’s en krijg feedback tot op de seconde. Of ga live in 1-op-1-coaching — de opname blijft van jou. Geen trailerrit, geen reis, geen reistijd.",
      "Schau auf deine Schulterachse — sie kippt nach vorn. Becken mit der Bewegung mitgehen lassen.": "Let op je schouderas — die kantelt naar voren. Laat je bekken meebewegen.",
      "Besseres Reiten beginnt mit dem richtigen Blick": "Beter rijden begint met de juiste blik",
      "Sekundengenaues Feedback zu Sitz, Hilfengebung und Takt — vom eigenen Stall aus. Asynchron hochladen oder live coachen, beides bleibt aufgezeichnet.": "Feedback tot op de seconde over zit, hulpen en tact — vanuit je eigen stal. Asynchroon uploaden of live coachen, beide blijven opgenomen.",
      "Reit-Coaching ohne Hängerfahrt": "Rijcoaching zonder trailerrit",
      "Hol dir Feedback von Spezialisten, egal wo dein Stall steht. Video hochladen, Analyse erhalten, live nacharbeiten — und für alle komplett kostenlos.": "Krijg feedback van specialisten, waar je stal ook staat. Video uploaden, analyse ontvangen, live nawerken — en helemaal gratis voor iedereen.",
      "Komplett": "Volledig",
      "kostenlos": "gratis",
      ". Für Trainer und Reiter.": ". Voor trainers en ruiters.",
      "Keine versteckten Kosten, keine Folgekosten, kein Abo. Alle Funktionen, von Anfang an frei.": "Geen verborgen kosten, geen vervolgkosten, geen abonnement. Alle functies, vanaf het begin gratis.",
      "Keine Kreditkarte nötig": "Geen creditcard nodig",
      "Keine versteckten oder Folgekosten": "Geen verborgen of vervolgkosten",
      "Alle Funktionen für alle freigeschaltet": "Alle functies voor iedereen vrijgeschakeld",
      "Zwei Wege zu besserem Reiten": "Twee wegen naar beter rijden",
      "Schnelles Feedback auf Abruf — oder live im 1:1. Beides an einem Ort, beides kostenlos.": "Snelle feedback op aanvraag — of live 1-op-1. Allebei op één plek, allebei gratis.",
      "Asynchron": "Asynchroon",
      "Video-Feedback, wann es passt": "Videofeedback wanneer het jou uitkomt",
      "Film deinen Ritt am Stall mit dem Handy und hol dir die Analyse — unabhängig von Hallenzeiten und Anfahrt.": "Film je rit op stal met je telefoon en ontvang de analyse — los van hal-tijden en reizen.",
      "Video hochladen": "Video uploaden",
      "Trainingsritt hochladen — bei Bedarf in mehreren Teilen.": "Upload je trainingsrit — indien nodig in meerdere delen.",
      "Sekundengenaues Feedback": "Feedback tot op de seconde",
      "Dein Trainer kommentiert direkt an der richtigen Stelle im Video.": "Je trainer reageert direct op de juiste plek in de video.",
      "Beliebig oft nachschauen": "Zo vaak terugkijken als je wilt",
      "Feedback bleibt erhalten — anschauen, so oft du willst.": "Feedback blijft bewaard — bekijk het zo vaak je wilt.",
      "Live": "Live",
      "Live-Coaching, das erhalten bleibt": "Live coaching dat bewaard blijft",
      "Manches klärt man am besten im Gespräch. Der Call wird aufgezeichnet — und ihr arbeitet danach weiter daran.": "Sommige dingen bespreek je het best in gesprek. De call wordt opgenomen — en daarna werk je er verder aan.",
      "Session buchen": "Sessie boeken",
      "Freien Termin in den Verfügbarkeiten deines Trainers wählen.": "Kies een vrij moment in de beschikbaarheid van je trainer.",
      "Live im 1:1-Call": "Live in een 1-op-1-call",
      "Direkt im Browser — Live-Feedback in Echtzeit.": "Direct in de browser — live feedback in realtime.",
      "Aufzeichnung wird archiviert": "Opname wordt gearchiveerd",
      "Die Session landet automatisch in deinem Archiv.": "De sessie belandt automatisch in je archief.",
      "Nachträgliches Review": "Review achteraf",
      "Aufzeichnung erneut ansehen und zeitgestempeltes Text-Feedback ergänzen.": "Bekijk de opname opnieuw en voeg getimede tekstfeedback toe.",
      "Kommentare, die auf der Sekunde sitzen": "Opmerkingen die op de seconde kloppen",
      "Kein „bei ungefähr Minute zwei“ mehr. Jeder Kommentar ist mit dem exakten Moment im Video verknüpft — vom Aufsteigen bis zur Landung.": "Geen „rond minuut twee” meer. Elke opmerking is gekoppeld aan het exacte moment in de video — van opstijgen tot landing.",
      "Zeitgestempelte Kommentare": "Getimede opmerkingen",
      "Ein Klick auf den Zeitstempel springt genau zur richtigen Stelle.": "Eén klik op de tijdstempel springt precies naar de juiste plek.",
      "Immer wieder anschauen": "Steeds opnieuw bekijken",
      "Anders als die Vor-Ort-Stunde bleibt das Feedback dauerhaft erhalten.": "Anders dan een les ter plaatse blijft de feedback voorgoed bewaard.",
      "Status „Überprüft“": "Status „Beoordeeld”",
      "Auf einen Blick sehen, welche Videos noch Feedback brauchen.": "Zie in één oogopslag welke video’s nog feedback nodig hebben.",
      "Dressur — Trab-Traversale": "Dressuur — appuyement in draf",
      "hochgeladen von Jonas": "geüpload door Jonas",
      "Zu überprüfen": "Te beoordelen",
      "Schöner Takt in der Anlehnung. Treib das Pferd etwas mehr ans äußere Bein.": "Mooie tact in de aanleuning. Rijd het paard iets meer naar het buitenbeen.",
      "Hier kippt die Schulterachse nach vorn — vergleiche es mit deinem Video von letzter Woche.": "Hier kantelt de schouderas naar voren — vergelijk het met je video van vorige week.",
      "Antwort": "Antwoord",
      "Verstanden — beim nächsten Mal halte ich die Schulter länger.": "Begrepen — volgende keer houd ik de schouder langer.",
      "Kommentar hinzufügen…": "Opmerking toevoegen…",
      "Live-Coaching": "Live coaching",
      "Live sprechen — und danach in Ruhe nacharbeiten": "Live praten — en daarna rustig nawerken",
      "Coaches legen ihre Verfügbarkeiten fest, Reiter buchen direkt. Der Call läuft in Strido — und jede Session wird archiviert, damit nichts verloren geht.": "Coaches stellen hun beschikbaarheid in, ruiters boeken direct. De call draait in Strido — en elke sessie wordt gearchiveerd zodat er niets verloren gaat.",
      "1:1 live im Browser": "1-op-1 live in de browser",
      "Direkt verbinden — ohne zusätzliche Software, ohne Installation.": "Direct verbinden — zonder extra software, zonder installatie.",
      "Aufzeichnung & Archiv": "Opname & archief",
      "Jede Live-Session wird aufgezeichnet und bleibt abrufbar.": "Elke live sessie wordt opgenomen en blijft beschikbaar.",
      "Nachträgliches Text-Feedback": "Tekstfeedback achteraf",
      "Aufzeichnung erneut ansehen und zeitgestempelte Notizen ergänzen.": "Bekijk de opname opnieuw en voeg getimede notities toe.",
      "Buchung": "Boeken",
      "Live-Session buchen — in unter einer Minute": "Boek een live sessie — in minder dan een minuut",
      "Dein Trainer gibt seine Zeiten frei, du buchst den passenden Slot. Ohne Nachrichten hin und her, ohne Telefonieren.": "Je trainer geeft zijn tijden vrij, jij boekt het passende moment. Zonder heen-en-weer berichten, zonder bellen.",
      "Verfügbarkeiten in Echtzeit": "Beschikbaarheid in realtime",
      "Dein Trainer legt seine freien Zeiten fest — du siehst sofort, was offen ist.": "Je trainer stelt zijn vrije tijden in — jij ziet meteen wat open is.",
      "In einem Schritt buchen": "In één stap boeken",
      "Slot wählen, bestätigen — fertig. Keine Abstimmung per Nachricht nötig.": "Kies een moment, bevestig — klaar. Geen afstemming via berichten nodig.",
      "Bestätigung & Erinnerung": "Bevestiging & herinnering",
      "Beide bekommen die Bestätigung und eine Erinnerung vor dem Termin.": "Beiden krijgen de bevestiging en een herinnering vóór de afspraak.",
      "Call-Link automatisch": "Call-link automatisch",
      "Zur richtigen Zeit ist der 1:1-Call startbereit — ohne Suchen.": "Op het juiste moment staat de 1-op-1-call klaar — zonder zoeken.",
      "Live-Session buchen": "Live sessie boeken",
      "Coach Marie · diese Woche": "Coach Marie · deze week",
      "4 frei": "4 vrij",
      "Mi 18.": "Wo 18",
      "Fr 20.": "Vr 20",
      "45 Min · Schwungkontrolle": "45 min · schwungcontrole",
      "Buchen": "Boeken",
      "Stall & Gruppen": "Stal & groepen",
      "Dein Stall, deine Reiter — an einem Ort": "Je stal, je ruiters — op één plek",
      "Als Trainer lädst du deine Reiter selbst ein und organisierst sie in Gruppen. Keine fremden Augen, kein offener Marktplatz — nur dein Team.": "Als trainer nodig je je ruiters zelf uit en organiseer je ze in groepen. Geen pottenkijkers, geen open marktplaats — alleen jouw team.",
      "Reiter per Einladung": "Ruiters op uitnodiging",
      "Du entscheidest, wer dazugehört — Einladung per Link, ein Klick zum Beitritt.": "Jij bepaalt wie erbij hoort — uitnodiging via link, één klik om deel te nemen.",
      "Trainer & Reiter, klare Rollen": "Trainers & ruiters, duidelijke rollen",
      "Trainer geben Feedback, Reiter reichen ihre Videos ein.": "Trainers geven feedback, ruiters dienen hun video’s in.",
      "Gruppeneinstellungen": "Groepsinstellingen",
      "Lege fest, wer Videos sehen und überprüfen darf.": "Bepaal wie video’s mag bekijken en beoordelen.",
      "Dressurstall Lindenhof": "Dressuurstal Lindenhof",
      "5 Mitglieder · 1 offene Einladung": "5 leden · 1 openstaande uitnodiging",
      "Trainer": "Trainer",
      "Zuletzt aktiv vor 2 Std.": "Laatst actief 2 u geleden",
      "3 Videos eingereicht": "3 video’s ingediend",
      "Reiter": "Ruiter",
      "1 Video wartet auf Feedback": "1 video wacht op feedback",
      "Offene Einladung": "Openstaande uitnodiging",
      "Gültig bis 30. Juni": "Geldig tot 30 juni",
      "Ausstehend": "In afwachting",
      "Gruppe": "Groep",
      "Fortschritt": "Voortgang",
      "Sieh die Entwicklung — über Wochen und Monate": "Zie de ontwikkeling — over weken en maanden",
      "Ein Pferd-Reiter-Paar wächst über die Zeit. Strido fasst Videos, Feedback und Sessions in einer Übersicht zusammen — als PDF teilbar.": "Een paard-ruitercombinatie groeit in de loop van de tijd. Strido brengt video’s, feedback en sessies samen in één overzicht — deelbaar als pdf.",
      "Aktivität pro Zeitraum": "Activiteit per periode",
      "Videos, Feedback und Sessions im Monats- oder Wochenblick.": "Video’s, feedback en sessies per maand of week.",
      "Als PDF exportieren": "Exporteren als pdf",
      "Berichte teilen — mit Reitern, Eltern oder dem Verein.": "Deel rapporten — met ruiters, ouders of de vereniging.",
      "Fortschritt · Mai 2026": "Voortgang · mei 2026",
      "Jonas Schmid · Dressurstall Lindenhof": "Jonas Schmid · Dressuurstal Lindenhof",
      "Videos": "Video’s",
      "Live-Sessions": "Live sessies",
      "5,2 Std.": "5,2 u",
      "Coaching-Zeit diesen Monat": "Coachingtijd deze maand",
      "Klare Vorteile — für beide Seiten": "Duidelijke voordelen — voor beide kanten",
      "Für Reiter": "Voor ruiters",
      "Hol dir Feedback von Spezialisten — ohne Hängerfahrt, ohne weite Wege.": "Krijg feedback van specialisten — zonder trailerrit, zonder lange ritten.",
      "Zugang zu Trainern, die nicht um die Ecke wohnen": "Toegang tot trainers die niet om de hoek wonen",
      "Keine Hängerfahrt — trainiere im eigenen Stall": "Geen trailerrit — train in je eigen stal",
      "Feedback wann es passt, abends hochgeladen, morgens da": "Feedback wanneer het uitkomt — ’s avonds geüpload, ’s ochtends binnen",
      "Sekundengenaues Feedback zum immer wieder Ansehen": "Feedback tot op de seconde, steeds opnieuw te bekijken",
      "Dokumentierter Fortschritt übers ganze Jahr": "Gedocumenteerde voortgang het hele jaar door",
      "Für Trainer": "Voor trainers",
      "Erreiche mehr Reiter, ohne mehr zu fahren — und gib schneller besseres Feedback.": "Bereik meer ruiters zonder meer te rijden — en geef sneller betere feedback.",
      "Keine Reisezeit zwischen Höfen — coache von überall": "Geen reistijd tussen stallen — coach vanaf overal",
      "Reichweite über den eigenen Umkreis hinaus": "Bereik buiten je eigen omgeving",
      "Text mit KI verbessern — schneller klar formuliert": "Tekst verbeteren met AI — sneller helder verwoord",
      "Verfügbarkeiten selbst steuern, mehr Reiter betreuen": "Beheer je eigen beschikbaarheid, begeleid meer ruiters",
      "Gruppen, Fortschritt & Reports im Blick": "Groepen, voortgang & rapporten in beeld",
      "Disziplinen & Sportarten": "Disciplines & sporten",
      "Zuhause im Sattel — offen für jeden Sport": "Thuis in het zadel — open voor elke sport",
      "Strido funktioniert für jeden Sport, bei dem visuelles Feedback zu Technik und Form wichtig ist — vom Reitsport bis weit darüber hinaus.": "Strido werkt voor elke sport waarbij visuele feedback op techniek en vorm belangrijk is — van de paardensport en ver daarbuiten.",
      "Im Reitsport": "In de paardensport",
      "Dressur": "Dressuur",
      "Springen": "Springen",
      "Vielseitigkeit": "Eventing",
      "Westernreiten": "Westernrijden",
      "Freizeitreiten": "Recreatierijden",
      "Und für jeden Sport mit Technik & Form": "En voor elke sport met techniek & vorm",
      "Leichtathletik": "Atletiek",
      "Schwimmen": "Zwemmen",
      "Gewichtheben": "Gewichtheffen",
      "Tanzen": "Dansen",
      "Kampfsport": "Vechtsport",
      "Ausblick": "Vooruitblik",
      "Das kommt als Nächstes": "Dit komt er straks aan",
      "Schon stark, und wir bauen weiter. Diese Funktionen sind in Arbeit.": "Nu al sterk, en we bouwen door. Aan deze functies wordt gewerkt.",
      "Kommt bald": "Binnenkort",
      "Annotation aufs Video": "Annotaties op de video",
      "Linien, Winkel und Markierungen direkt ins Bild zeichnen — Sitz und Hilfengebung sichtbar machen.": "Teken lijnen, hoeken en markeringen direct op het beeld — maak zit en hulpen zichtbaar.",
      "Sprach-Feedback übers Video": "Spraakfeedback over de video",
      "Statt zu tippen einfach einsprechen — dein Trainer kommentiert den Ritt mit der Stimme.": "In plaats van typen gewoon inspreken — je trainer becommentarieert de rit met zijn stem.",
      "Fest geplant": "Vast ingepland",
      "Apps für iOS & Android": "Apps voor iOS & Android",
      "Dedizierte Apps fürs Filmen und Feedback direkt am Stall — fest eingeplant.": "Speciale apps voor filmen en feedback direct op stal — vast ingepland.",
      "Trainingspläne": "Trainingsplannen",
      "Trainer legen Pläne mit klaren Schritten an — etwa Turnieraufgaben. Reiter reiten sie nach und laden ihre Videos direkt zum Plan hoch.": "Trainers maken plannen met duidelijke stappen — zoals wedstrijdproeven. Ruiters rijden ze na en uploaden hun video’s direct bij het plan.",
      "Stimmen": "Stemmen",
      "Was Trainer und Reiter sagen": "Wat trainers en ruiters zeggen",
      "„Ich betreue jetzt Reiter aus drei Bundesländern, ohne ins Auto zu steigen. Das Feedback geht abends raus, wenn die Kinder im Bett sind.“": "„Ik begeleid nu ruiters uit drie provincies zonder in de auto te stappen. De feedback gaat ’s avonds de deur uit, als de kinderen in bed liggen.”",
      "Dressurtrainerin": "Dressuurtrainer",
      "„Endlich sehe ich genau, an welcher Stelle meine Schulter wegkippt. Ich schaue mir das Feedback vor jedem Training nochmal an.“": "„Eindelijk zie ik precies waar mijn schouder wegkantelt. Ik bekijk de feedback voor elke training opnieuw.”",
      "Amateurreiterin, Springen": "Amateurruiter, springen",
      "„Kein Hänger, kein Stress fürs Pferd. Wir besprechen den Ritt live und ich kann mir die Aufzeichnung danach in Ruhe nochmal ansehen.“": "„Geen trailer, geen stress voor het paard. We bespreken de rit live en ik kan de opname daarna rustig terugkijken.”",
      "Vielseitigkeitsreiter": "Eventingruiter",
      "Platzhalter-Stimmen — werden später durch echte Zitate ersetzt.": "Tijdelijke citaten — worden later vervangen door echte quotes.",
      "Dein erstes Reitvideo ist schnell hochgeladen": "Je eerste rijvideo is zo geüpload",
      "Erstelle ein kostenloses Konto, lade einen Ritt hoch und erhalte Feedback, das den Moment trifft. Keine Kreditkarte nötig.": "Maak een gratis account, upload een rit en krijg feedback die het moment raakt. Geen creditcard nodig.",
      "Komplett kostenlos — für Trainer und Reiter": "Volledig gratis — voor trainers en ruiters",
      "Video-Coaching für den Reitsport. © 2026 Strido": "Videocoaching voor de paardensport. © 2026 Strido",
      "Impressum": "Colofon",
      "Datenschutz": "Privacy",
      "Kontakt": "Contact"
    }
  };

  // ---- engine ----
  var tracked = [];      // { node, original }
  var current = "de";

  function shouldSkip(el) {
    while (el && el.nodeType) {
      if (el.nodeType === 1) {
        if (el.id === "tweaks-root") return true;
        if (el.hasAttribute && el.hasAttribute("data-i18n-skip")) return true;
        var tag = el.tagName;
        if (tag === "SCRIPT" || tag === "STYLE" || tag === "TEMPLATE" || tag === "NOSCRIPT") return true;
      }
      el = el.parentNode;
    }
    return false;
  }

  function collect(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        if (shouldSkip(n.parentNode)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n;
    while ((n = walker.nextNode())) {
      tracked.push({ node: n, original: n.nodeValue });
    }
  }

  function translateValue(original, lang) {
    if (lang === "de") return original;
    var table = DICT[lang];
    if (!table) return original;
    var lead = original.match(/^\s*/)[0];
    var trail = original.match(/\s*$/)[0];
    var key = original.trim();
    if (Object.prototype.hasOwnProperty.call(table, key)) {
      return lead + table[key] + trail;
    }
    return original;
  }

  function apply() {
    for (var i = 0; i < tracked.length; i++) {
      tracked[i].node.nodeValue = translateValue(tracked[i].original, current);
    }
    document.documentElement.lang = current;
    updateSwitcher();
  }

  function setLang(lang) {
    if (lang === current) { closeMenu(); return; }
    current = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
    apply();
    closeMenu();
  }

  // hero headline tweak coordination: update the stored German original then re-apply
  function setHeroText(headlineDe, leadDe) {
    setOriginalFor("hero-headline", headlineDe);
    setOriginalFor("hero-lead", leadDe);
    apply();
  }
  function setOriginalFor(id, text) {
    var el = document.getElementById(id);
    if (!el) return;
    var tn = null;
    for (var c = el.firstChild; c; c = c.nextSibling) {
      if (c.nodeType === 3 && c.nodeValue && c.nodeValue.trim()) { tn = c; break; }
    }
    if (!tn) {
      tn = document.createTextNode(text);
      el.appendChild(tn);
      tracked.push({ node: tn, original: text });
      return;
    }
    for (var i = 0; i < tracked.length; i++) {
      if (tracked[i].node === tn) { tracked[i].original = text; return; }
    }
    tracked.push({ node: tn, original: text });
  }

  // ---- language switcher UI ----
  function shortFor(code) {
    for (var i = 0; i < LANGS.length; i++) { if (LANGS[i].code === code) return LANGS[i].short; }
    return code.toUpperCase();
  }
  function updateSwitcher() {
    var code = document.querySelector(".lp-lang-code");
    if (code) code.textContent = shortFor(current);
    var opts = document.querySelectorAll(".lp-lang-option");
    for (var i = 0; i < opts.length; i++) {
      opts[i].setAttribute("aria-selected", opts[i].getAttribute("data-lang") === current ? "true" : "false");
    }
  }
  function openMenu() {
    var w = document.querySelector(".lp-lang");
    if (!w) return;
    w.classList.add("open");
    var btn = w.querySelector(".lp-lang-btn");
    if (btn) btn.setAttribute("aria-expanded", "true");
  }
  function closeMenu() {
    var w = document.querySelector(".lp-lang");
    if (!w) return;
    w.classList.remove("open");
    var btn = w.querySelector(".lp-lang-btn");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }
  function wireSwitcher() {
    var wrap = document.querySelector(".lp-lang");
    if (!wrap) return;
    var btn = wrap.querySelector(".lp-lang-btn");
    if (btn) {
      btn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (wrap.classList.contains("open")) closeMenu(); else openMenu();
      });
    }
    var opts = wrap.querySelectorAll(".lp-lang-option");
    for (var i = 0; i < opts.length; i++) {
      opts[i].addEventListener("click", function (e) {
        e.stopPropagation();
        setLang(this.getAttribute("data-lang"));
      });
    }
    document.addEventListener("click", function () { closeMenu(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeMenu(); });
  }

  function init() {
    collect(document.body);
    wireSwitcher();
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
    if (saved === "de" || (saved && DICT[saved])) current = saved;
    apply();
  }

  window.StridoI18N = {
    setLang: setLang,
    setHeroText: setHeroText,
    getLang: function () { return current; }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
