// Strido mobile UI kit — sample data (equestrian video coaching).
// Plain script: assigns window.StridoData. No bundle dependency.
window.StridoData = {
  user: { name: 'Mia Halvorsen', initials: 'MH', role: 'Rider', roleType: 'student',
    email: 'mia.halvorsen@example.com', language: 'de', timezone: 'Europe/Berlin' },

  groups: [
    { id: 'g1', name: 'Nord Eventing Academy', initials: 'NE', members: 14 },
    { id: 'g2', name: 'Trail & Dressage Club', initials: 'TD', members: 9 },
  ],

  videos: [
    { id: 'v1', title: 'Combination line — take 2', group: 'Nord Eventing Academy', gi: 'NE',
      status: 'pending', reviews: 3, duration: '0:48', desc: 'Two strides in, felt rushed to the oxer.' },
    { id: 'v2', title: 'Sitting trot — long side', group: 'Trail & Dressage Club', gi: 'TD',
      status: 'completed', reviews: 6, duration: '1:22', desc: 'Working on a steadier contact.' },
    { id: 'v3', title: 'Warm-up canter transitions', group: 'Nord Eventing Academy', gi: 'NE',
      status: 'pending', reviews: 1, duration: '2:05', desc: 'Left lead pickup is sticky.' },
    { id: 'v4', title: 'Grid work — bounce to one', group: 'Nord Eventing Academy', gi: 'NE',
      status: 'waiting_upload', reviews: 0, duration: '0:36', desc: '' },
  ],

  reviews: [
    { id: 'r1', author: 'Coach Petra', initials: 'CP', ts: '0:12', when: '2h ago',
      body: 'Good rhythm on the approach — eyes up a stride earlier and the distance comes to you.' },
    { id: 'r2', author: 'Coach Petra', initials: 'CP', ts: '0:31', when: '2h ago',
      body: 'Here you tipped forward over the first element. Keep your shoulders back and let the horse close the gap.',
      replies: [ { id: 'r2a', author: 'Mia Halvorsen', initials: 'MH', when: '1h ago', body: 'Makes sense — I felt the lean. Will drill it tomorrow.' } ] },
  ],

  bookings: [
    { id: 'b1', type: 'Video review session', who: 'Coach Petra', role: 'expert',
      when: 'Tue 18 Jun · 16:00', mins: 30, status: 'pending', joinable: true },
    { id: 'b2', type: 'Flatwork deep-dive', who: 'Coach Petra', role: 'expert',
      when: 'Fri 21 Jun · 09:30', mins: 45, status: 'pending', joinable: false },
    { id: 'b3', type: 'Jumping technique', who: 'Coach Lars', role: 'expert',
      when: 'Mon 10 Jun · 17:00', mins: 30, status: 'done', joinable: false, recording: 'ready' },
    { id: 'b4', type: 'Course walk-through', who: 'Coach Petra', role: 'expert',
      when: 'Thu 6 Jun · 14:00', mins: 30, status: 'cancelled', joinable: false, reason: 'Horse off work.' },
  ],

  notifications: 2,

  notificationList: [
    { id: 'n1', kind: 'review', unread: true, day: 'today', when: 'vor 2 Std',
      title: 'Neues Feedback von Coach Petra', body: '„Kombination — Versuch 2“ wurde kommentiert.' },
    { id: 'n2', kind: 'invite', unread: true, day: 'today', when: 'vor 5 Std',
      title: 'Einladung in eine Gruppe', body: 'Coach Petra hat dich in „Nord Eventing Academy“ eingeladen.', code: 'NEA-2K9' },
    { id: 'n3', kind: 'booking', unread: false, day: 'earlier', when: 'Gestern',
      title: 'Session bestätigt', body: 'Video-Review mit Coach Petra · Di 18 Jun, 16:00.' },
    { id: 'n4', kind: 'upload', unread: false, day: 'earlier', when: 'Gestern',
      title: 'Upload abgeschlossen', body: '„Aussitzen im Trab — lange Seite“ ist bereit.' },
    { id: 'n5', kind: 'system', unread: false, day: 'earlier', when: 'Mo',
      title: 'Willkommen bei Strido', body: 'Lade dein erstes Video hoch, um Feedback zu erhalten.' },
  ],

  // Group membership detail (keyed by group id) for the group-detail view.
  groupMembers: {
    g1: {
      desc: 'Eventing-Gruppe für Vielseitigkeitsreiter — wöchentliches Video-Feedback und Live-Coaching.',
      experts: [{ id: 'e1', name: 'Petra Nilsson', initials: 'PN', role: 'Cheftrainerin' }],
      students: [
        { id: 's1', name: 'Mia Halvorsen', initials: 'MH', role: 'Reiterin' },
        { id: 's2', name: 'Jonas Berg', initials: 'JB', role: 'Reiter' },
        { id: 's3', name: 'Lena Sund', initials: 'LS', role: 'Reiterin' },
      ],
    },
    g2: {
      desc: 'Dressur- und Geländegruppe für entspanntes, technisches Training.',
      experts: [{ id: 'e2', name: 'Lars Moen', initials: 'LM', role: 'Trainer' }],
      students: [
        { id: 's1', name: 'Mia Halvorsen', initials: 'MH', role: 'Reiterin' },
        { id: 's4', name: 'Erik Dahl', initials: 'ED', role: 'Reiter' },
      ],
    },
  },

  // Reports / activity summary (expert role view).
  reports: {
    period: 'März 2026',
    videoCount: 18, videoDur: '4 Std 12 Min',
    liveCount: 6, liveDur: '3 Std 30 Min',
    peopleCount: 9, groupCount: 2,
    events: [
      { id: 'a1', kind: 'video', title: 'Kombination — Versuch 2', who: 'Mia Halvorsen', group: 'Nord Eventing Academy', date: '18 Mär', dur: '0:48 Min' },
      { id: 'a2', kind: 'live', title: 'Live-Coaching', who: 'Jonas Berg', group: 'Nord Eventing Academy', date: '16 Mär', dur: '45 Min' },
      { id: 'a3', kind: 'video', title: 'Aussitzen im Trab', who: 'Lena Sund', group: 'Trail & Dressage Club', date: '14 Mär', dur: '1:22 Min' },
      { id: 'a4', kind: 'video', title: 'Galopp-Übergänge', who: 'Erik Dahl', group: 'Nord Eventing Academy', date: '11 Mär', dur: '2:05 Min' },
      { id: 'a5', kind: 'live', title: 'Live-Coaching', who: 'Mia Halvorsen', group: 'Trail & Dressage Club', date: '8 Mär', dur: '30 Min' },
    ],
  },

  // Expert availability management.
  availability: {
    sessionTypes: [
      { id: 'st1', name: 'Video-Review', mins: 30, desc: 'Detailliertes Feedback zu einem hochgeladenen Video.' },
      { id: 'st2', name: 'Live-Coaching', mins: 45, desc: 'Eins-zu-eins-Session in Echtzeit per Video.' },
    ],
    schedule: [
      { id: 'av1', day: 'Montag', from: '16:00', to: '19:00' },
      { id: 'av2', day: 'Mittwoch', from: '09:00', to: '12:00' },
      { id: 'av3', day: 'Freitag', from: '14:00', to: '18:00' },
    ],
    blocked: [
      { id: 'bl1', date: 'Fr 27 Jun', range: 'Ganzer Tag', reason: 'Turnier' },
      { id: 'bl2', date: 'Mi 2 Jul', range: '14:00 – 17:00', reason: '' },
    ],
  },

  // Coaching booking flow data.
  coaching: {
    experts: [
      { id: 'e1', name: 'Coach Petra', initials: 'CP' },
      { id: 'e2', name: 'Coach Lars', initials: 'CL' },
    ],
    sessionTypes: [
      { id: 'st1', name: 'Video-Review', mins: 30, desc: 'Detailliertes Feedback zu einem hochgeladenen Video.' },
      { id: 'st2', name: 'Live-Coaching', mins: 45, desc: 'Eins-zu-eins-Session in Echtzeit per Video.' },
    ],
    slotsByDay: [
      { day: 'Di 18 Jun', times: ['16:00 – 16:30', '16:45 – 17:15', '17:30 – 18:00'] },
      { day: 'Mi 19 Jun', times: ['09:00 – 09:30', '10:15 – 10:45'] },
      { day: 'Fr 21 Jun', times: ['14:00 – 14:30', '15:00 – 15:30', '16:30 – 17:00'] },
    ],
  },
};
