# Resolution

## Summary
- Replaced small and supportive dashboard button appearances from `flat` to `secondary`.
- Preserved `primary` and `destructive` appearances for primary submissions and destructive actions.

## Technical Details
- Updated page header actions, stepper Back buttons, dialog cancellation actions, group action buttons, availability management actions, dropdown trigger buttons, and comparable small icon buttons.
- Removed `flat` from `IllustratedMessageButton` appearance typing so new illustrated-message buttons follow the updated appearance set.

## Verification
- [x] Ran `make web:build`.

## Tests
- No automated tests were added because this is a declarative visual consistency change.

## Next Steps
- None.
