# Task: implement dashboard ngx translate i18n

## Status
- [x] Defined
- [x] In Progress
- [x] Completed

## Description
As a dashboard user, I want interface copy to be resolved through a runtime
translation system instead of being hardcoded in English, so the dashboard can
honor my language preference.

## Context
- The dashboard is an Angular standalone-component application using Taiga UI.
- The signed-in user model already contains a `language` field.
- The implementation must use `ngx-translate`.
- This task does not introduce new backend permissions, database changes, or
  environment configuration.
- Automated tests are required for behavior touched by the review-status filter
  because the filter values were changed from display labels to stable keys.
- This task changes static copy and controls only. It does not introduce or
  modify asynchronous content loading states.

## Acceptance Criteria
- [x] Add `ngx-translate` dependencies and configure the dashboard translation
      provider.
- [x] Add runtime language selection from the user preference with browser and
      English fallbacks.
- [x] Add English and German dashboard translation bundles.
- [x] Replace primary dashboard hardcoded English copy with translation keys.
- [x] Preserve user-facing video terminology.
- [x] Update affected review-status filter tests.
- [x] Run the dashboard build.
