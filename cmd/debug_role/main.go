package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

func main() {
	if err := godotenv.Load(); err != nil {
		godotenv.Load("../../.env")
	}

	apiKey := os.Getenv("WORKOS_API_KEY")
	if apiKey == "" {
		log.Fatal("WORKOS_API_KEY not set")
	}
	usermanagement.SetAPIKey(apiKey)

	userID := "user_01KFQG1FPVQ81PXM4MB51RQ2RA"

	fmt.Printf("Checking memberships for user: %s\n", userID)

	memberships, err := usermanagement.ListOrganizationMemberships(context.Background(), usermanagement.ListOrganizationMembershipsOpts{
		UserID: userID,
	})
	if err != nil {
		log.Fatalf("Error listing memberships: %v", err)
	}

	if len(memberships.Data) == 0 {
		fmt.Println("User has no memberships.")
	} else {
		for _, m := range memberships.Data {
			fmt.Printf("Org: %s, Role: %s\n", m.OrganizationID, m.Role.Slug)
		}
	}
}
