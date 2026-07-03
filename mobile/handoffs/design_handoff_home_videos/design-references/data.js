// Strido mobile UI kit — sample data (equestrian video coaching).
// Plain script: assigns window.StridoData. No bundle dependency.
window.StridoData = {
  user: { name: 'Mia Halvorsen', initials: 'MH', role: 'Rider' },

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
};
