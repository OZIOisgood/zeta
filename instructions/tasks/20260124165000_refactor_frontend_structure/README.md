# Refactor Frontend Structure

## Description

Refactor the frontend directory structure within `src/app/` to improve organization.
The application logic should be segmented into three main directories:

- `core`
- `pages`
- `shared`

## Requirements

- **`core/`**: Should contain global configurations, routing definitions (`app.routes.ts`), and the root application component (`app.component.ts`).
- **`pages/`**: Should contain page-level components (e.g., `AssetDetailsPageComponent`, `HomePageComponent`, `UploadVideoPageComponent`). Ensure all page components have a `-page` suffix.
- **`shared/`**: Should contain reusable components, directives, pipes, and services.

## Documentation

- [Taiga UI Documentation](https://taiga-ui.dev)
