# Implement Video Reviews

## Requirements

### Feature Flags

Implement the following feature structure:

- `reviews`: Top-level feature flag.
- `reviews--read`: Required to view reviews (dependent on `reviews`).
- `reviews--create`: Required to write reviews (dependent on `reviews`).

### User Story

- As a user, I expect to have the ability to write and read comments for individual videos associated with an asset.

### UI Requirements

- **Location**: Comment section under the video player.
- **Title**: "Comments".
- **Comment Display**:
  - Each comment should be a separate full-width block.
  - Simplified display: only content text (no sender name, no timestamp).
  - Styling: `<section tuiCardLarge="compact">Comment text</section>`.
  - Spacing: Gap between comments (1rem).
- **Input Area**:
  - Floating container at the bottom center of the screen (max-width 800px).
  - Rounded top corners, shadow, no bottom border.
  - Text area input with a send button (icon button with `send-horizontal` icon).

### Technical Implementation

- Backend:
  - Database schema for comments/reviews (linked to **Video ID**).
  - API endpoints for:
    - Listing reviews for a video: `GET /videos/{id}/reviews` (returns simplified JSON: id, content, created_at).
    - Creating a new review for a video: `POST /videos/{id}/reviews`.
  - Authorization middleware to check feature flags.
- Frontend:
  - Update `AssetDetails` page.
  - Implement comment list component that reloads when the video selection changes.
  - Implement comment input component.
