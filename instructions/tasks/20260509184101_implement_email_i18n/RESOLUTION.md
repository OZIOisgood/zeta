# Resolution: Email i18n

## Summary

Implemented per-user email internationalisation for all transactional emails sent by the Zeta API using `go-i18n/v2`. Users now receive emails in the language stored in their `user_preferences.language` column (en/de/fr). External recipients (invitation emails to unknown addresses) fall back to the `DEFAULT_LANGUAGE` env var.

## Changes

### New package: `internal/i18n`

- **`bundle.go`** — Singleton `go-i18n/v2` bundle loaded from embedded locale files. Public helpers: `For(lang)`, `Default()`, `DefaultLang()`, `T(loc, key, data...)`.
- **`bundle_test.go`** — 6 unit tests covering fallback, en/de/fr translation, template data substitution, and DEFAULT_LANGUAGE env fallback.
- **`locales/email.en.json`** — English translations for all email keys.
- **`locales/email.de.json`** — German translations.
- **`locales/email.fr.json`** — French translations.

Translation keys follow the flat format `"email.<template>.<field>"` (e.g. `"email.booking_confirmed.subject"`). Template variables use Go template syntax: `{{.InviterName}}`.

### Updated: `internal/preferences/email.go`

Added `UserLang(ctx, q, log, userID)` which fetches `user_preferences.language` via `GetUserPreferences` and returns the language code string, falling back to `DEFAULT_LANGUAGE` on any error.

### Updated: `internal/email/renderer.go`

Redesigned `Message` struct to decouple copy from structure:

```go
// Before
type Message struct {
    Preheader  string
    Heading    string
    Intro      string
    Details    []Detail
    Action     *Action   // Action{Label, URL}
    FooterNote string
}

// After
type Copy struct { Preheader, Title, Intro, Button, FooterNote string }
type Action struct { URL string }  // Label removed; caller puts it in Copy.Button
type Message struct { Copy Copy; Details []Detail; Action *Action }
```

HTML templates now render pre-translated copy via `{{.Copy.Title}}`, `{{.Copy.Intro}}`, etc. No i18n concern in templates.

### Updated: HTML templates

- `layout.html`: `{{.Message.Heading}}` → `{{.Copy.Title}}`, `{{.Message.Preheader}}` → `{{.Copy.Preheader}}`
- `notification.html`: All `{{.Message.*}}` → `{{.Copy.*}}`, `{{.Details}}`, `{{.Action}}`

### Updated: call sites

| File                                 | Emails                               | Language source                            |
| ------------------------------------ | ------------------------------------ | ------------------------------------------ |
| `internal/coaching/booking_email.go` | booking_confirmed, booking_cancelled | `UserLang(recipientID)`                    |
| `internal/coaching/reminder.go`      | coaching_reminder                    | `UserLang(recipientID)` per-recipient loop |
| `internal/invitations/handler.go`    | invitation (external)                | `Default()` (DEFAULT_LANGUAGE)             |
| `internal/invitations/handler.go`    | invitation_accepted                  | `UserLang(inviterID)`                      |
| `internal/users/handler.go`          | member_removed                       | `UserLang(targetUserID)`                   |
| `internal/assets/handler.go`         | video_uploaded                       | `UserLang(ownerID)`                        |
| `internal/assets/handler.go`         | video_reviewed                       | `UserLang(ownerID)`                        |

### Updated: tests

- `internal/email/service_test.go` — updated to new `Copy`/`Action` struct shape.
- `internal/coaching/booking_email_test.go` — added `GetUserPreferences` mock expectations for language resolution.

### Updated: `cmd/email-preview/main.go`

All 8 scenarios (including new `invitation-accepted`) updated to new `email.Message{Copy: ..., Details: ..., Action: ...}` struct.

## Design decisions

1. **External invitation emails** use `i18n.Default()` (reads `DEFAULT_LANGUAGE` env var, defaults to "en"). Finding a user by email address in WorkOS requires an additional API call and the email might not be registered yet, so DEFAULT_LANGUAGE is the pragmatic boundary.

2. **Reminder emails** changed from a single batched `SendTemplate` to per-recipient individual sends to allow per-user language selection.

3. **`UserLang` fallback chain**: DB preference → `DEFAULT_LANGUAGE` env → "en". Errors are logged at Warn level and never block email delivery.

4. **`T()` fallback**: On any translation error (unknown key, template error), the message ID is returned verbatim. Email rendering is never blocked by a missing translation.

## Dependency changes

- Added `github.com/nicksnyder/go-i18n/v2 v2.6.1` as a direct dependency.
- Upgraded `golang.org/x/text` to `v0.37.0` (required by go-i18n for language tag matching).

## Verification

- [x] Build passed with `go build ./cmd/api`.
- [x] Email-preview command builds with `go build ./cmd/email-preview`.
- [x] All 14 test packages pass with `go test ./...` (0 failures).
- [x] `internal/i18n` 6 unit tests verify en/de/fr translation, template data substitution, and DEFAULT_LANGUAGE fallback.

## Next Steps

- None.
