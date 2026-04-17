# Task: implement_review_timestamp_and_thumbnail

## Status

- [x] Defined
- [x] In Progress
- [x] Completed

## Description

As a user, I want to be able to add a review comment to a video with a timestamp so that I can reference specific moments in the video.

**User Flow:**

1. User plays a video
2. At a specific time (e.g., 01:15 / 75 seconds), user adds a review
3. The review is saved with the current timestamp
4. The comment card displays a thumbnail of the video at that timestamp
5. The timestamp is shown overlaid on the thumbnail (top-right corner)

## Context

- Video thumbnails use Mux API: `https://image.mux.com/{playback_id}/thumbnail.png?width=214&height=121&time={seconds}`
- Reviews are stored in `video_reviews` table
- Asset details page uses mux-player component

## Acceptance Criteria

- [x] Database schema updated to store `timestamp_seconds` for reviews
- [x] Backend API accepts and returns timestamp in review endpoints
- [x] Current video time is tracked from the player
- [x] Timestamp indicator with clock icon shown next to comment input
- [x] Timestamp is always saved with review (including 00:00)
- [x] Comment cards display video thumbnail at the review's timestamp
- [x] Timestamp displayed as overlay on thumbnail (top-right corner)
- [x] Responsive layout: thumbnail on top (mobile), thumbnail on left (desktop)
