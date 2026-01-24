# Resolution

## Summary

Refactored the Angular application structure.

### Changes

- Created `core/`, `pages/`, and `shared/` directories in `src/app/`.
- Moved global app files (config, routes, root component) to `core/`.
- Moved page components to `pages/` and renamed them with `-page` suffix (e.g., `HomePageComponent`).
- Moved reusable components and services to `shared/`.
- Updated imports and routing configuration to reflect the new structure.

## Commits

- `d4d34d2` feat: restructure application core with new routing, components, and upload video functionality
