# Resolution

## Summary
Updated the project constitution with a Product Terminology section that clarifies the relationship between database/API terms and user-facing product language.

## Technical Details
- Defined `asset` as the parent reviewable submission in the database/API model.
- Defined `video` as the child media row in the database/API model.
- Documented that user-facing copy should describe the parent submission as a video and child media rows as video parts or clips.
- Documented a bridging rule for task docs, comments, and API documentation.
- Added guidance to avoid broad technical renames solely for product-copy alignment.

## Verification
- [x] Ran `make api:build`.
- [x] Reviewed the updated constitution wording.

## Tests

No automated tests were added because this is a documentation-only update.

## Next Steps

None.
