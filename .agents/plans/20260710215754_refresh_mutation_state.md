# Refresh mutation state

Context: newly created coaching sessions and uploaded videos remain absent from cached dashboard lists until a browser reload.

Scope: trace dashboard list caches and their mutation paths; update affected stores/pages so successful mutations immediately update the shared state used by list and home views.

Verification: focused unit tests, dashboard lint, and dashboard build.
