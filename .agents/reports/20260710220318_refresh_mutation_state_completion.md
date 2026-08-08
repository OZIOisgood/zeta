# Refresh mutation state completion

Context: newly booked sessions and uploaded videos remained absent from shared dashboard lists until a browser reload because root stores only loaded while idle.

Decision: write successful bookings and uploads into their shared list stores immediately, and revalidate videos, sessions, and Home whenever those pages are entered.

Files: session booking/overview stores, video store/upload flow, Home, sessions, and videos pages; focused store tests.

Verification: `make web-next:test`, `make web-next:lint`, `make web-next:build` (all passed).

Follow-up: none.
