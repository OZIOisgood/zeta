# Task: foldable description in asset page

## Status

- [x] Defined
- [x] In Progress
- [x] Completed

## Description

The asset details page currently displays the full description text without any way to truncate or expand it. For assets with long descriptions, this creates a poor user experience by taking up excessive vertical space on the page.

**Requirements:**

- Implement a collapsible description component using Taiga UI's `TuiElasticContainer`
- Show a truncated version of the description by default
- Provide a "Show more" / "Show less" toggle button
- Follow the Taiga UI pattern and best practices

## Context

- Component to modify: `web/dashboard/src/app/pages/asset-details-page/`
- Reference implementation provided using `TuiElasticContainer` and `TuiLink`
- Taiga UI documentation: https://taiga-ui.dev/llms-full.txt

## Acceptance Criteria

- [ ] Description is initially shown in a truncated/shortened form
- [ ] User can click a toggle button to expand the full description
- [ ] User can click again to collapse back to the truncated form
- [ ] The component uses `TuiElasticContainer` and `TuiLink` from Taiga UI
- [ ] Frontend build completes successfully (`make web:build`)
