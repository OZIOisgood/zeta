package coaching

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"
	_ "time/tzdata" // Embed IANA data for the minimal Alpine runtime image.

	goi18n "github.com/nicksnyder/go-i18n/v2/i18n"

	"github.com/OZIOisgood/zeta/internal/i18n"
	"github.com/OZIOisgood/zeta/internal/logger"
)

type recipientLocalization struct {
	localizer *goi18n.Localizer
	location  *time.Location
	timezone  string
}

var emailWeekdayKeys = [...]string{
	"email.datetime.weekday.sunday",
	"email.datetime.weekday.monday",
	"email.datetime.weekday.tuesday",
	"email.datetime.weekday.wednesday",
	"email.datetime.weekday.thursday",
	"email.datetime.weekday.friday",
	"email.datetime.weekday.saturday",
}

var emailMonthKeys = [...]string{
	"",
	"email.datetime.month.january",
	"email.datetime.month.february",
	"email.datetime.month.march",
	"email.datetime.month.april",
	"email.datetime.month.may",
	"email.datetime.month.june",
	"email.datetime.month.july",
	"email.datetime.month.august",
	"email.datetime.month.september",
	"email.datetime.month.october",
	"email.datetime.month.november",
	"email.datetime.month.december",
}

func newRecipientLocalization(language, timezone string) (recipientLocalization, error) {
	language = strings.TrimSpace(language)
	if language == "" {
		language = i18n.DefaultLang()
	}

	timezone = strings.TrimSpace(timezone)
	if timezone == "" {
		return recipientLocalization{
			localizer: i18n.For(language),
			location:  time.UTC,
			timezone:  "UTC",
		}, errors.New("timezone is empty")
	}

	location, err := time.LoadLocation(timezone)
	if err != nil {
		return recipientLocalization{
			localizer: i18n.For(language),
			location:  time.UTC,
			timezone:  "UTC",
		}, fmt.Errorf("load timezone %q: %w", timezone, err)
	}

	return recipientLocalization{
		localizer: i18n.For(language),
		location:  location,
		timezone:  timezone,
	}, nil
}

func (h *Handler) resolveRecipientLocalization(ctx context.Context, userID string) recipientLocalization {
	log := logger.From(ctx, h.logger)
	prefs, err := h.q.GetUserPreferences(ctx, userID)
	if err != nil {
		log.WarnContext(ctx, "coaching_email_preferences_fallback",
			slog.String("component", "coaching"),
			slog.String("user_id", userID),
			slog.Any("err", err),
		)
		localization, _ := newRecipientLocalization(i18n.DefaultLang(), "UTC")
		return localization
	}

	localization, err := newRecipientLocalization(string(prefs.Language), prefs.Timezone)
	if err != nil {
		log.WarnContext(ctx, "coaching_email_timezone_fallback",
			slog.String("component", "coaching"),
			slog.String("user_id", userID),
			slog.String("timezone", prefs.Timezone),
			slog.Any("err", err),
		)
	}
	return localization
}

func formatEmailDateTime(value time.Time, localization recipientLocalization) string {
	local := value.In(localization.location)
	_, offsetSeconds := local.Zone()

	return i18n.T(localization.localizer, "email.datetime.long", map[string]any{
		"Weekday":  i18n.T(localization.localizer, emailWeekdayKeys[local.Weekday()]),
		"Month":    i18n.T(localization.localizer, emailMonthKeys[local.Month()]),
		"Day":      local.Day(),
		"Year":     local.Year(),
		"Time":     local.Format("15:04"),
		"Timezone": localization.timezone,
		"Offset":   formatUTCOffset(offsetSeconds),
	})
}

func formatEmailDuration(minutes int32, localization recipientLocalization) string {
	hours := minutes / 60
	remainingMinutes := minutes % 60

	var hourPart string
	if hours > 0 {
		key := "email.duration.hours"
		if hours == 1 {
			key = "email.duration.hour"
		}
		hourPart = i18n.T(localization.localizer, key, map[string]any{"Count": hours})
	}

	var minutePart string
	if remainingMinutes > 0 || hours == 0 {
		key := "email.duration.minutes"
		if remainingMinutes == 1 {
			key = "email.duration.minute"
		}
		minutePart = i18n.T(localization.localizer, key, map[string]any{"Count": remainingMinutes})
	}

	if hourPart == "" {
		return minutePart
	}
	if minutePart == "" {
		return hourPart
	}
	return i18n.T(localization.localizer, "email.duration.join", map[string]any{
		"Hours":   hourPart,
		"Minutes": minutePart,
	})
}

func formatUTCOffset(offsetSeconds int) string {
	sign := "+"
	if offsetSeconds < 0 {
		sign = "-"
		offsetSeconds = -offsetSeconds
	}
	hours := offsetSeconds / int(time.Hour/time.Second)
	minutes := (offsetSeconds % int(time.Hour/time.Second)) / int(time.Minute/time.Second)
	return fmt.Sprintf("%s%02d:%02d", sign, hours, minutes)
}
