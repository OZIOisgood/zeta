# Dashboard Next

`web/dashboard-next` is the new Angular dashboard application created for the phased UX/UI rewrite. The current production dashboard remains in `web/dashboard` until the final deployment cutover.

## Scope

- Built with Angular 21.
- Uses Tailwind CSS as the primary styling layer.
- Uses Angular Primitives for unstyled accessible behaviours.
- Uses Transloco for dashboard localization.
- Uses NgRx Signal Store for feature state.
- Uses Storybook as a local design-system review tool.

## Local Commands

Run from this directory:

```bash
pnpm install
pnpm run start
pnpm run build
pnpm run test:ci
pnpm run storybook
pnpm run build-storybook
```

Or run from the repository root:

```bash
make web-next:start
make web-next:build
make web-next:test
make web-next:storybook
make web-next:storybook:build
```
