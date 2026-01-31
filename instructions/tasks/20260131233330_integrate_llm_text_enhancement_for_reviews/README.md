# Task: Integrate LLM Text Enhancement for Reviews

## Status

- [x] Defined
- [x] In Progress
- [x] Completed

## Description

As a user, I want to have a new button available in the review edit dialog that integrates an LLM to fix and enhance review text. The button should have a sparkles icon, and when clicked, it should send the current textarea content to the backend, which will use OpenRouter to enhance the text with better grammar, professionalism, and clarity while maintaining the original language.

## Context

- Review edit dialog exists in `/Users/test/Documents/zeta/web/dashboard/src/app/pages/asset-details-page/asset-details-page.component.html` (lines 160-180)
- Review service exists in `/Users/test/Documents/zeta/web/dashboard/src/app/shared/services/asset.service.ts`
- Review backend handler exists in `/Users/test/Documents/zeta/internal/reviews/handler.go`
- OpenRouter API documentation: https://openrouter.ai/docs/llms.txt
- Must follow project constitution for Balenciaga-style UI (sharp, black & white)

## Acceptance Criteria

- [x] Add OpenRouter configuration to backend environment
- [x] Create LLM service in backend for text enhancement
- [x] Add new endpoint `/api/reviews/enhance` for text enhancement
- [x] Add sparkles icon button to review edit dialog
- [x] Integrate frontend with new enhancement endpoint
- [x] LLM should maintain original language and improve professionalism
- [x] Handle errors gracefully (network issues, API failures)
- [x] Build passes (`make web:build` and `make api:build`)
- [x] Follow project logging standards using slog
