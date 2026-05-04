package coaching

import (
	"testing"

	muxgo "github.com/muxinc/mux-go"
)

func TestPublicPlaybackID(t *testing.T) {
	got := publicPlaybackID([]muxgo.PlaybackId{
		{Id: "signed-id", Policy: muxgo.SIGNED},
		{Id: "public-id", Policy: muxgo.PUBLIC},
	})
	if got != "public-id" {
		t.Fatalf("publicPlaybackID() = %q, want public-id", got)
	}
}
