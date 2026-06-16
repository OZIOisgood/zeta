/* ============================================================
   STRIDO — i18n for the legal / content sub-pages
   Same node-walking engine as the landing page, with the
   sub-pages' own German→EN/FR/NL dictionary. Shares the
   language choice via the "strido_lang" localStorage key.
   Also translates input/textarea placeholders.
   ============================================================ */
(function () {
  "use strict";

  var LANGS = [
    { code: "de", short: "DE" },
    { code: "en", short: "EN" },
    { code: "fr", short: "FR" },
    { code: "nl", short: "NL" }
  ];
  var STORAGE_KEY = "strido_lang";

  var DICT = {
    en: {
      // shared
      "Rechtliches": "Legal",
      "Zurück zur Startseite": "Back to home",
      "Video-Coaching für den Reitsport. © 2026 Strido": "Video coaching for equestrian sport. © 2026 Strido",
      "Impressum": "Imprint",
      "Datenschutz": "Privacy",
      // impressum
      "Angaben gemäß § 5 DDG": "Information pursuant to § 5 DDG",
      "Platzhalter-Inhalt. Bitte vor Veröffentlichung durch die echten Unternehmensangaben und einen geprüften Rechtstext ersetzen.": "Placeholder content. Before publishing, replace this with your real company details and a reviewed legal text.",
      "Diensteanbieter": "Service provider",
      "Unternehmen": "Company",
      "Anschrift": "Address",
      "Deutschland": "Germany",
      "Vertretung": "Represented by",
      "Max Mustermann (Geschäftsführer)": "Max Mustermann (Managing Director)",
      "Handelsregister": "Commercial register",
      "Amtsgericht Musterstadt, HRB 000000": "Musterstadt Local Court, HRB 000000",
      "USt-IdNr.": "VAT ID",
      "Telefon: +49 (0) 000 0000000": "Phone: +49 (0) 000 0000000",
      "E-Mail:": "Email:",
      "Verantwortlich für den Inhalt": "Responsible for the content",
      "Nach § 18 Abs. 2 MStV: Max Mustermann, Musterstraße 1, 12345 Musterstadt.": "Pursuant to § 18 (2) MStV: Max Mustermann, Musterstraße 1, 12345 Musterstadt.",
      "EU-Streitschlichtung": "EU dispute resolution",
      "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit. Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.": "The European Commission provides a platform for online dispute resolution (ODR). We are neither obliged nor willing to take part in dispute resolution proceedings before a consumer arbitration board.",
      "Haftung für Inhalte und Links": "Liability for content and links",
      "Die Inhalte dieser Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Für Inhalte externer Links sind ausschließlich deren Betreiber verantwortlich.": "The contents of these pages were created with the greatest care. However, we cannot guarantee the accuracy, completeness or timeliness of the content. The operators of linked external sites are solely responsible for their content.",
      // datenschutz
      "Datenschutzerklärung": "Privacy Policy",
      "Stand: Juni 2026": "Last updated: June 2026",
      "Platzhalter-Inhalt. Diese Datenschutzerklärung ist ein Muster und ersetzt keine Rechtsberatung — bitte vor Veröffentlichung anwaltlich prüfen und an die tatsächliche Datenverarbeitung anpassen.": "Placeholder content. This privacy policy is a template and does not constitute legal advice — please have it reviewed by a lawyer before publishing and adapt it to your actual data processing.",
      "1. Verantwortlicher": "1. Controller",
      "Verantwortlich für die Datenverarbeitung auf dieser Website ist die Strido GmbH, Musterstraße 1, 12345 Musterstadt, E-Mail:": "The controller for data processing on this website is Strido GmbH, Musterstraße 1, 12345 Musterstadt, email:",
      "2. Überblick der Verarbeitung": "2. Overview of processing",
      "Wir verarbeiten personenbezogene Daten, um unseren Video-Coaching-Dienst bereitzustellen. Dazu gehören insbesondere:": "We process personal data to provide our video coaching service. This includes in particular:",
      "Konto- und Profildaten (z. B. Name, E-Mail-Adresse)": "Account and profile data (e.g. name, email address)",
      "Hochgeladene Trainingsvideos und zugehörige Kommentare": "Uploaded training videos and associated comments",
      "Termin- und Sitzungsdaten für Live-Coaching": "Appointment and session data for live coaching",
      "Technische Zugriffsdaten (z. B. IP-Adresse, Browsertyp)": "Technical access data (e.g. IP address, browser type)",
      "3. Rechtsgrundlagen": "3. Legal bases",
      "Wir verarbeiten Daten auf Grundlage von Art. 6 Abs. 1 DSGVO — insbesondere zur Vertragserfüllung (lit. b), zur Erfüllung rechtlicher Pflichten (lit. c), auf Basis berechtigter Interessen (lit. f) sowie ggf. Ihrer Einwilligung (lit. a).": "We process data on the basis of Art. 6 (1) GDPR — in particular for the performance of a contract (lit. b), to comply with legal obligations (lit. c), on the basis of legitimate interests (lit. f) and, where applicable, your consent (lit. a).",
      "4. Hosting und Videospeicherung": "4. Hosting and video storage",
      "Unsere Anwendung und hochgeladene Videos werden bei spezialisierten Dienstleistern innerhalb der EU gehostet. Mit diesen Anbietern bestehen Verträge zur Auftragsverarbeitung nach Art. 28 DSGVO.": "Our application and uploaded videos are hosted by specialized providers within the EU. Data processing agreements pursuant to Art. 28 GDPR are in place with these providers.",
      "5. Cookies und Reichweitenmessung": "5. Cookies and analytics",
      "Diese Website verwendet technisch notwendige Cookies bzw. lokalen Speicher (z. B. zur Speicherung Ihrer Sprachauswahl). Optionale Analyse- oder Marketing-Cookies werden nur mit Ihrer Einwilligung gesetzt.": "This website uses technically necessary cookies or local storage (e.g. to store your language choice). Optional analytics or marketing cookies are only set with your consent.",
      "6. Ihre Rechte": "6. Your rights",
      "Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie Widerspruch. Zudem können Sie sich bei einer Datenschutz-Aufsichtsbehörde beschweren.": "You have the right to access, rectification, erasure, restriction of processing, data portability and objection. You may also lodge a complaint with a data protection supervisory authority.",
      "Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO)": "Access to your stored data (Art. 15 GDPR)",
      "Berichtigung unrichtiger Daten (Art. 16 DSGVO)": "Rectification of inaccurate data (Art. 16 GDPR)",
      "Löschung („Recht auf Vergessenwerden“, Art. 17 DSGVO)": "Erasure (“right to be forgotten”, Art. 17 GDPR)",
      "Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft": "Withdrawal of consent given, with effect for the future",
      "7. Kontakt zum Datenschutz": "7. Data protection contact",
      "Bei Fragen zum Datenschutz erreichen Sie uns unter": "For privacy questions, you can reach us at",
      // kontakt
      "Schreib uns": "Write to us",
      "Wir melden uns in der Regel innerhalb von ein bis zwei Werktagen.": "We usually reply within one to two business days.",
      "Platzhalter-Seite. Die Kontaktdaten sind Beispiele und das Formular ist noch nicht angebunden — bitte vor Veröffentlichung ersetzen bzw. mit einem Backend verbinden.": "Placeholder page. The contact details are examples and the form is not yet connected — please replace them before publishing or connect the form to a backend.",
      "E-Mail": "Email",
      "Support für Trainer & Reiter": "Support for trainers & riders",
      "Telefon": "Phone",
      "Mo–Fr, 9–17 Uhr": "Mon–Fri, 9 am–5 pm",
      "Adresse": "Address",
      "Nachricht senden": "Send message",
      "Fragen, Feedback oder Interesse an einer Zusammenarbeit? Schreib uns direkt.": "Questions, feedback or interested in working together? Write to us directly.",
      "Nachricht": "Message",
      "Demo-Formular — wird noch nicht versendet.": "Demo form — not sent yet.",
      "Dein Name": "Your name",
      "du@beispiel.de": "you@example.com",
      "Wie können wir helfen?": "How can we help?"
    },

    fr: {
      "Rechtliches": "Mentions légales",
      "Zurück zur Startseite": "Retour à l’accueil",
      "Video-Coaching für den Reitsport. © 2026 Strido": "Coaching vidéo pour l’équitation. © 2026 Strido",
      "Impressum": "Mentions légales",
      "Datenschutz": "Confidentialité",
      "Angaben gemäß § 5 DDG": "Informations conformément à l’art. 5 DDG",
      "Platzhalter-Inhalt. Bitte vor Veröffentlichung durch die echten Unternehmensangaben und einen geprüften Rechtstext ersetzen.": "Contenu provisoire. Avant publication, remplacez-le par les véritables informations de l’entreprise et un texte juridique vérifié.",
      "Diensteanbieter": "Fournisseur du service",
      "Unternehmen": "Société",
      "Anschrift": "Adresse",
      "Deutschland": "Allemagne",
      "Vertretung": "Représentant",
      "Max Mustermann (Geschäftsführer)": "Max Mustermann (gérant)",
      "Handelsregister": "Registre du commerce",
      "Amtsgericht Musterstadt, HRB 000000": "Tribunal de Musterstadt, HRB 000000",
      "USt-IdNr.": "N° de TVA",
      "Telefon: +49 (0) 000 0000000": "Téléphone : +49 (0) 000 0000000",
      "E-Mail:": "E-mail :",
      "Web:": "Web :",
      "Verantwortlich für den Inhalt": "Responsable du contenu",
      "Nach § 18 Abs. 2 MStV: Max Mustermann, Musterstraße 1, 12345 Musterstadt.": "Conformément à l’art. 18 al. 2 MStV : Max Mustermann, Musterstraße 1, 12345 Musterstadt.",
      "EU-Streitschlichtung": "Règlement des litiges en ligne (UE)",
      "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit. Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.": "La Commission européenne met à disposition une plateforme de règlement en ligne des litiges (RLL). Nous ne sommes ni tenus ni disposés à participer à une procédure de règlement des litiges devant un organe de conciliation des consommateurs.",
      "Haftung für Inhalte und Links": "Responsabilité des contenus et des liens",
      "Die Inhalte dieser Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Für Inhalte externer Links sind ausschließlich deren Betreiber verantwortlich.": "Les contenus de ces pages ont été élaborés avec le plus grand soin. Nous ne pouvons toutefois garantir leur exactitude, leur exhaustivité ni leur actualité. Les exploitants des sites externes liés sont seuls responsables de leur contenu.",
      "Datenschutzerklärung": "Politique de confidentialité",
      "Stand: Juni 2026": "Dernière mise à jour : juin 2026",
      "Platzhalter-Inhalt. Diese Datenschutzerklärung ist ein Muster und ersetzt keine Rechtsberatung — bitte vor Veröffentlichung anwaltlich prüfen und an die tatsächliche Datenverarbeitung anpassen.": "Contenu provisoire. Cette politique de confidentialité est un modèle et ne constitue pas un conseil juridique — faites-la vérifier par un avocat avant publication et adaptez-la au traitement réel des données.",
      "1. Verantwortlicher": "1. Responsable du traitement",
      "Verantwortlich für die Datenverarbeitung auf dieser Website ist die Strido GmbH, Musterstraße 1, 12345 Musterstadt, E-Mail:": "Le responsable du traitement des données sur ce site est Strido GmbH, Musterstraße 1, 12345 Musterstadt, e-mail :",
      "2. Überblick der Verarbeitung": "2. Aperçu du traitement",
      "Wir verarbeiten personenbezogene Daten, um unseren Video-Coaching-Dienst bereitzustellen. Dazu gehören insbesondere:": "Nous traitons des données à caractère personnel pour fournir notre service de coaching vidéo. Cela comprend notamment :",
      "Konto- und Profildaten (z. B. Name, E-Mail-Adresse)": "Données de compte et de profil (p. ex. nom, adresse e-mail)",
      "Hochgeladene Trainingsvideos und zugehörige Kommentare": "Vidéos d’entraînement téléversées et commentaires associés",
      "Termin- und Sitzungsdaten für Live-Coaching": "Données de rendez-vous et de séance pour le coaching live",
      "Technische Zugriffsdaten (z. B. IP-Adresse, Browsertyp)": "Données techniques d’accès (p. ex. adresse IP, type de navigateur)",
      "3. Rechtsgrundlagen": "3. Bases légales",
      "Wir verarbeiten Daten auf Grundlage von Art. 6 Abs. 1 DSGVO — insbesondere zur Vertragserfüllung (lit. b), zur Erfüllung rechtlicher Pflichten (lit. c), auf Basis berechtigter Interessen (lit. f) sowie ggf. Ihrer Einwilligung (lit. a).": "Nous traitons les données sur la base de l’art. 6, par. 1 du RGPD — notamment pour l’exécution du contrat (let. b), le respect d’obligations légales (let. c), sur la base d’intérêts légitimes (let. f) et, le cas échéant, de votre consentement (let. a).",
      "4. Hosting und Videospeicherung": "4. Hébergement et stockage des vidéos",
      "Unsere Anwendung und hochgeladene Videos werden bei spezialisierten Dienstleistern innerhalb der EU gehostet. Mit diesen Anbietern bestehen Verträge zur Auftragsverarbeitung nach Art. 28 DSGVO.": "Notre application et les vidéos téléversées sont hébergées par des prestataires spécialisés au sein de l’UE. Des contrats de sous-traitance conformes à l’art. 28 du RGPD ont été conclus avec ces prestataires.",
      "5. Cookies und Reichweitenmessung": "5. Cookies et mesure d’audience",
      "Diese Website verwendet technisch notwendige Cookies bzw. lokalen Speicher (z. B. zur Speicherung Ihrer Sprachauswahl). Optionale Analyse- oder Marketing-Cookies werden nur mit Ihrer Einwilligung gesetzt.": "Ce site utilise des cookies ou un stockage local techniquement nécessaires (p. ex. pour enregistrer votre choix de langue). Les cookies d’analyse ou de marketing facultatifs ne sont déposés qu’avec votre consentement.",
      "6. Ihre Rechte": "6. Vos droits",
      "Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie Widerspruch. Zudem können Sie sich bei einer Datenschutz-Aufsichtsbehörde beschweren.": "Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation du traitement, de portabilité des données et d’opposition. Vous pouvez en outre déposer une réclamation auprès d’une autorité de contrôle de la protection des données.",
      "Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO)": "Accès à vos données enregistrées (art. 15 RGPD)",
      "Berichtigung unrichtiger Daten (Art. 16 DSGVO)": "Rectification des données inexactes (art. 16 RGPD)",
      "Löschung („Recht auf Vergessenwerden“, Art. 17 DSGVO)": "Effacement (« droit à l’oubli », art. 17 RGPD)",
      "Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft": "Retrait des consentements donnés, avec effet pour l’avenir",
      "7. Kontakt zum Datenschutz": "7. Contact protection des données",
      "Bei Fragen zum Datenschutz erreichen Sie uns unter": "Pour toute question relative à la protection des données, vous pouvez nous contacter à",
      "Schreib uns": "Écris-nous",
      "Wir melden uns in der Regel innerhalb von ein bis zwei Werktagen.": "Nous répondons généralement sous un à deux jours ouvrés.",
      "Platzhalter-Seite. Die Kontaktdaten sind Beispiele und das Formular ist noch nicht angebunden — bitte vor Veröffentlichung ersetzen bzw. mit einem Backend verbinden.": "Page provisoire. Les coordonnées sont des exemples et le formulaire n’est pas encore connecté — remplacez-les avant publication ou reliez le formulaire à un backend.",
      "E-Mail": "E-mail",
      "Support für Trainer & Reiter": "Support pour coachs et cavaliers",
      "Telefon": "Téléphone",
      "Mo–Fr, 9–17 Uhr": "Lun–Ven, 9 h–17 h",
      "Adresse": "Adresse",
      "Nachricht senden": "Envoyer le message",
      "Fragen, Feedback oder Interesse an einer Zusammenarbeit? Schreib uns direkt.": "Des questions, un retour ou une envie de collaborer ? Écris-nous directement.",
      "Name": "Nom",
      "Nachricht": "Message",
      "Demo-Formular — wird noch nicht versendet.": "Formulaire de démonstration — pas encore envoyé.",
      "Dein Name": "Ton nom",
      "du@beispiel.de": "toi@exemple.fr",
      "Wie können wir helfen?": "Comment pouvons-nous aider ?"
    },

    nl: {
      "Rechtliches": "Juridisch",
      "Zurück zur Startseite": "Terug naar de startpagina",
      "Video-Coaching für den Reitsport. © 2026 Strido": "Videocoaching voor de paardensport. © 2026 Strido",
      "Impressum": "Colofon",
      "Angaben gemäß § 5 DDG": "Gegevens conform § 5 DDG",
      "Platzhalter-Inhalt. Bitte vor Veröffentlichung durch die echten Unternehmensangaben und einen geprüften Rechtstext ersetzen.": "Tijdelijke inhoud. Vervang dit vóór publicatie door de echte bedrijfsgegevens en een gecontroleerde juridische tekst.",
      "Diensteanbieter": "Dienstaanbieder",
      "Unternehmen": "Onderneming",
      "Anschrift": "Adres",
      "Deutschland": "Duitsland",
      "Vertretung": "Vertegenwoordiging",
      "Max Mustermann (Geschäftsführer)": "Max Mustermann (directeur)",
      "Amtsgericht Musterstadt, HRB 000000": "Rechtbank Musterstadt, HRB 000000",
      "USt-IdNr.": "Btw-nummer",
      "Telefon: +49 (0) 000 0000000": "Telefoon: +49 (0) 000 0000000",
      "E-Mail:": "E-mail:",
      "Verantwortlich für den Inhalt": "Verantwoordelijk voor de inhoud",
      "Nach § 18 Abs. 2 MStV: Max Mustermann, Musterstraße 1, 12345 Musterstadt.": "Conform § 18 lid 2 MStV: Max Mustermann, Musterstraße 1, 12345 Musterstadt.",
      "EU-Streitschlichtung": "EU-geschillenbeslechting",
      "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit. Wir sind nicht verpflichtet und nicht bereit, an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.": "De Europese Commissie biedt een platform voor onlinegeschillenbeslechting (ODR). Wij zijn niet verplicht en niet bereid om deel te nemen aan een geschillenbeslechtingsprocedure voor een consumentengeschillencommissie.",
      "Haftung für Inhalte und Links": "Aansprakelijkheid voor inhoud en links",
      "Die Inhalte dieser Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Für Inhalte externer Links sind ausschließlich deren Betreiber verantwortlich.": "De inhoud van deze pagina’s is met de grootste zorg samengesteld. Wij kunnen echter niet instaan voor de juistheid, volledigheid en actualiteit van de inhoud. Voor de inhoud van externe links zijn uitsluitend de beheerders ervan verantwoordelijk.",
      "Datenschutzerklärung": "Privacyverklaring",
      "Stand: Juni 2026": "Bijgewerkt: juni 2026",
      "Platzhalter-Inhalt. Diese Datenschutzerklärung ist ein Muster und ersetzt keine Rechtsberatung — bitte vor Veröffentlichung anwaltlich prüfen und an die tatsächliche Datenverarbeitung anpassen.": "Tijdelijke inhoud. Deze privacyverklaring is een sjabloon en vormt geen juridisch advies — laat deze vóór publicatie door een jurist controleren en pas hem aan op de werkelijke gegevensverwerking.",
      "1. Verantwortlicher": "1. Verwerkingsverantwoordelijke",
      "Verantwortlich für die Datenverarbeitung auf dieser Website ist die Strido GmbH, Musterstraße 1, 12345 Musterstadt, E-Mail:": "Verwerkingsverantwoordelijke voor de gegevensverwerking op deze website is Strido GmbH, Musterstraße 1, 12345 Musterstadt, e-mail:",
      "2. Überblick der Verarbeitung": "2. Overzicht van de verwerking",
      "Wir verarbeiten personenbezogene Daten, um unseren Video-Coaching-Dienst bereitzustellen. Dazu gehören insbesondere:": "Wij verwerken persoonsgegevens om onze videocoachingdienst te leveren. Daartoe behoren met name:",
      "Konto- und Profildaten (z. B. Name, E-Mail-Adresse)": "Account- en profielgegevens (bijv. naam, e-mailadres)",
      "Hochgeladene Trainingsvideos und zugehörige Kommentare": "Geüploade trainingsvideo’s en bijbehorende opmerkingen",
      "Termin- und Sitzungsdaten für Live-Coaching": "Afspraak- en sessiegegevens voor live coaching",
      "Technische Zugriffsdaten (z. B. IP-Adresse, Browsertyp)": "Technische toegangsgegevens (bijv. IP-adres, browsertype)",
      "3. Rechtsgrundlagen": "3. Rechtsgronden",
      "Wir verarbeiten Daten auf Grundlage von Art. 6 Abs. 1 DSGVO — insbesondere zur Vertragserfüllung (lit. b), zur Erfüllung rechtlicher Pflichten (lit. c), auf Basis berechtigter Interessen (lit. f) sowie ggf. Ihrer Einwilligung (lit. a).": "Wij verwerken gegevens op grond van art. 6 lid 1 AVG — met name voor de uitvoering van de overeenkomst (sub b), het nakomen van wettelijke verplichtingen (sub c), op basis van gerechtvaardigde belangen (sub f) en eventueel uw toestemming (sub a).",
      "4. Hosting und Videospeicherung": "4. Hosting en videopslag",
      "Unsere Anwendung und hochgeladene Videos werden bei spezialisierten Dienstleistern innerhalb der EU gehostet. Mit diesen Anbietern bestehen Verträge zur Auftragsverarbeitung nach Art. 28 DSGVO.": "Onze applicatie en geüploade video’s worden gehost door gespecialiseerde dienstverleners binnen de EU. Met deze aanbieders zijn verwerkersovereenkomsten conform art. 28 AVG gesloten.",
      "5. Cookies und Reichweitenmessung": "5. Cookies en bereikmeting",
      "Diese Website verwendet technisch notwendige Cookies bzw. lokalen Speicher (z. B. zur Speicherung Ihrer Sprachauswahl). Optionale Analyse- oder Marketing-Cookies werden nur mit Ihrer Einwilligung gesetzt.": "Deze website gebruikt technisch noodzakelijke cookies of lokale opslag (bijv. om uw taalkeuze te bewaren). Optionele analyse- of marketingcookies worden alleen met uw toestemming geplaatst.",
      "6. Ihre Rechte": "6. Uw rechten",
      "Sie haben das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit sowie Widerspruch. Zudem können Sie sich bei einer Datenschutz-Aufsichtsbehörde beschweren.": "U hebt recht op inzage, rectificatie, wissing, beperking van de verwerking, gegevensoverdraagbaarheid en bezwaar. Daarnaast kunt u een klacht indienen bij een toezichthoudende autoriteit voor gegevensbescherming.",
      "Auskunft über Ihre gespeicherten Daten (Art. 15 DSGVO)": "Inzage in uw opgeslagen gegevens (art. 15 AVG)",
      "Berichtigung unrichtiger Daten (Art. 16 DSGVO)": "Rectificatie van onjuiste gegevens (art. 16 AVG)",
      "Löschung („Recht auf Vergessenwerden“, Art. 17 DSGVO)": "Wissing („recht op vergetelheid”, art. 17 AVG)",
      "Widerruf erteilter Einwilligungen mit Wirkung für die Zukunft": "Intrekking van gegeven toestemming met werking voor de toekomst",
      "7. Kontakt zum Datenschutz": "7. Contact gegevensbescherming",
      "Bei Fragen zum Datenschutz erreichen Sie uns unter": "Voor vragen over gegevensbescherming kunt u ons bereiken via",
      "Schreib uns": "Schrijf ons",
      "Wir melden uns in der Regel innerhalb von ein bis zwei Werktagen.": "We reageren meestal binnen één tot twee werkdagen.",
      "Platzhalter-Seite. Die Kontaktdaten sind Beispiele und das Formular ist noch nicht angebunden — bitte vor Veröffentlichung ersetzen bzw. mit einem Backend verbinden.": "Tijdelijke pagina. De contactgegevens zijn voorbeelden en het formulier is nog niet gekoppeld — vervang ze vóór publicatie of koppel het formulier aan een backend.",
      "E-Mail": "E-mail",
      "Support für Trainer & Reiter": "Support voor trainers & ruiters",
      "Telefon": "Telefoon",
      "Mo–Fr, 9–17 Uhr": "Ma–Vr, 9–17 uur",
      "Adresse": "Adres",
      "Nachricht senden": "Bericht versturen",
      "Fragen, Feedback oder Interesse an einer Zusammenarbeit? Schreib uns direkt.": "Vragen, feedback of interesse in samenwerking? Schrijf ons direct.",
      "Name": "Naam",
      "Nachricht": "Bericht",
      "Demo-Formular — wird noch nicht versendet.": "Demoformulier — wordt nog niet verzonden.",
      "Dein Name": "Je naam",
      "du@beispiel.de": "jij@voorbeeld.nl",
      "Wie können wir helfen?": "Hoe kunnen we helpen?"
    }
  };

  // ---- engine ----
  var tracked = [];   // text nodes: { node, original }
  var attrs = [];     // placeholders: { el, original }
  var current = "de";

  function shouldSkip(el) {
    while (el && el.nodeType) {
      if (el.nodeType === 1) {
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
    var ph = root.querySelectorAll("[placeholder]");
    for (var i = 0; i < ph.length; i++) {
      if (!shouldSkip(ph[i])) attrs.push({ el: ph[i], original: ph[i].getAttribute("placeholder") });
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
    for (var j = 0; j < attrs.length; j++) {
      attrs[j].el.setAttribute("placeholder", translateValue(attrs[j].original, current));
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

  // ---- switcher ----
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
    var b = w.querySelector(".lp-lang-btn");
    if (b) b.setAttribute("aria-expanded", "true");
  }
  function closeMenu() {
    var w = document.querySelector(".lp-lang");
    if (!w) return;
    w.classList.remove("open");
    var b = w.querySelector(".lp-lang-btn");
    if (b) b.setAttribute("aria-expanded", "false");
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

  window.StridoLegalI18N = { setLang: setLang, getLang: function () { return current; } };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
