package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/OZIOisgood/zeta/internal/email"
)

type scenario struct {
	name    string
	message email.Message
}

func main() {
	outDir := flag.String("out", "build/email-previews", "Directory where rendered HTML previews are saved")
	scenarioName := flag.String("scenario", "all", "Preview scenario to render, or all")
	stdout := flag.Bool("stdout", false, "Print a single rendered preview to stdout instead of writing files")
	flag.Parse()

	scenarios := previewScenarios()
	selected, err := selectScenarios(scenarios, *scenarioName)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
	if *stdout && len(selected) != 1 {
		fmt.Fprintln(os.Stderr, "-stdout requires a single -scenario value")
		os.Exit(1)
	}
	if !*stdout {
		if err := os.MkdirAll(*outDir, 0o755); err != nil {
			fmt.Fprintf(os.Stderr, "create preview directory: %v\n", err)
			os.Exit(1)
		}
	}

	for _, s := range selected {
		rendered, err := email.RenderTemplate(email.TemplateNotification, s.message)
		if err != nil {
			fmt.Fprintf(os.Stderr, "render %s: %v\n", s.name, err)
			os.Exit(1)
		}

		if *stdout {
			fmt.Print(rendered.HTML)
			continue
		}

		path := filepath.Join(*outDir, s.name+".html")
		if err := os.WriteFile(path, []byte(rendered.HTML), 0o644); err != nil {
			fmt.Fprintf(os.Stderr, "write %s: %v\n", path, err)
			os.Exit(1)
		}
		fmt.Printf("wrote %s\n", path)
	}
}

func selectScenarios(scenarios []scenario, name string) ([]scenario, error) {
	if name == "all" {
		return scenarios, nil
	}
	for _, s := range scenarios {
		if s.name == name {
			return []scenario{s}, nil
		}
	}

	names := make([]string, 0, len(scenarios))
	for _, s := range scenarios {
		names = append(names, s.name)
	}
	sort.Strings(names)
	return nil, fmt.Errorf("unknown scenario %q; available scenarios: %s", name, strings.Join(names, ", "))
}

func previewScenarios() []scenario {
	return []scenario{
		{
			name: "group-invitation",
			message: email.Message{
				Copy: email.Copy{
					Preheader:  "Alex Morgan invited you to join a group on Zeta.",
					Title:      "You have been invited to join a group",
					Intro:      "Alex Morgan invited you to join a group on Zeta.",
					Button:     "Accept invitation",
					FooterNote: "This invitation was sent from Zeta because someone entered this email address while sharing a group.",
				},
				Details: []email.Detail{
					{Label: "Invitation link", Value: "http://localhost:4200/groups?invite=AbC123"},
				},
				Action: &email.Action{URL: "http://localhost:4200/groups?invite=AbC123"},
			},
		},
		{
			name: "invitation-accepted",
			message: email.Message{
				Copy: email.Copy{
					Preheader: "Jamie Lee has accepted your invitation and joined Advanced Tennis.",
					Title:     "Invitation accepted",
					Intro:     "Jamie Lee has accepted your invitation and joined Advanced Tennis.",
				},
				Details: []email.Detail{
					{Label: "Member", Value: "Jamie Lee"},
					{Label: "Group", Value: "Advanced Tennis"},
				},
			},
		},
		{
			name: "video-uploaded",
			message: email.Message{
				Copy: email.Copy{
					Preheader: "Jamie Lee uploaded a new video.",
					Title:     "New video uploaded",
					Intro:     "Jamie Lee uploaded a new video to your group.",
				},
				Details: []email.Detail{
					{Label: "Video", Value: "Backhand drill, set 3"},
					{Label: "Group", Value: "Advanced Tennis"},
					{Label: "Uploaded by", Value: "Jamie Lee"},
				},
			},
		},
		{
			name: "video-reviewed",
			message: email.Message{
				Copy: email.Copy{
					Preheader: "Your video Backhand drill, set 3 has been reviewed.",
					Title:     "Your video has been reviewed",
					Intro:     "Your video has been reviewed and is now finalized.",
				},
				Details: []email.Detail{
					{Label: "Video", Value: "Backhand drill, set 3"},
				},
			},
		},
		{
			name: "booking-confirmed",
			message: email.Message{
				Copy: email.Copy{
					Preheader: "Your live coaching session has been confirmed.",
					Title:     "Live coaching session confirmed",
					Intro:     "Your live coaching session has been confirmed.",
				},
				Details: []email.Detail{
					{Label: "Session", Value: "Technique review"},
					{Label: "With", Value: "Alex Morgan"},
					{Label: "Group", Value: "Advanced Tennis"},
					{Label: "Date and time", Value: "Friday, May 8, 2026 at 15:00 UTC"},
					{Label: "Duration", Value: "45 min"},
					{Label: "Notes", Value: "Please focus on the serve motion."},
				},
			},
		},
		{
			name: "booking-cancelled",
			message: email.Message{
				Copy: email.Copy{
					Preheader: "A coaching session has been cancelled.",
					Title:     "Live coaching session cancelled",
					Intro:     "A coaching session has been cancelled.",
				},
				Details: []email.Detail{
					{Label: "Session", Value: "Technique review"},
					{Label: "Group", Value: "Advanced Tennis"},
					{Label: "Date and time", Value: "Friday, May 8, 2026 at 15:00 UTC"},
					{Label: "Duration", Value: "45 min"},
					{Label: "Cancelled by", Value: "Jamie Lee"},
					{Label: "Reason", Value: "Schedule conflict"},
				},
			},
		},
		{
			name: "coaching-reminder",
			message: email.Message{
				Copy: email.Copy{
					Preheader: "You have an upcoming coaching session.",
					Title:     "Coaching session reminder",
					Intro:     "Your session starts in 1 hour.",
					Button:    "Join session",
				},
				Details: []email.Detail{
					{Label: "Date and time", Value: "Friday, May 8, 2026 at 15:00 UTC"},
					{Label: "Duration", Value: "45 min"},
				},
				Action: &email.Action{URL: "http://localhost:4200/sessions/group-id/booking-id/call"},
			},
		},
		{
			name: "group-member-removed",
			message: email.Message{
				Copy: email.Copy{
					Preheader: "You have been removed from Advanced Tennis.",
					Title:     "Group membership updated",
					Intro:     "You have been removed from a group.",
				},
				Details: []email.Detail{
					{Label: "Group", Value: "Advanced Tennis"},
				},
			},
		},
	}
}
