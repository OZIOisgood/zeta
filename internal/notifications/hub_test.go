package notifications

import (
	"testing"
	"time"
)

func TestHubPublishDeliversToSubscriber(t *testing.T) {
	hub := NewHub()
	ch := hub.Subscribe("user-1")
	defer hub.Unsubscribe("user-1", ch)

	hub.Publish("user-1", []byte("hello"))

	select {
	case msg := <-ch:
		if string(msg) != "hello" {
			t.Fatalf("got %q, want %q", msg, "hello")
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for message")
	}
}

func TestHubPublishOnlyToMatchingRecipient(t *testing.T) {
	hub := NewHub()
	a := hub.Subscribe("user-a")
	b := hub.Subscribe("user-b")
	defer hub.Unsubscribe("user-a", a)
	defer hub.Unsubscribe("user-b", b)

	hub.Publish("user-a", []byte("for-a"))

	select {
	case <-b:
		t.Fatal("user-b should not receive user-a's message")
	case <-time.After(50 * time.Millisecond):
	}

	select {
	case msg := <-a:
		if string(msg) != "for-a" {
			t.Fatalf("got %q, want %q", msg, "for-a")
		}
	case <-time.After(time.Second):
		t.Fatal("user-a did not receive its message")
	}
}

func TestHubUnsubscribeClosesChannel(t *testing.T) {
	hub := NewHub()
	ch := hub.Subscribe("user-1")
	hub.Unsubscribe("user-1", ch)

	if _, ok := <-ch; ok {
		t.Fatal("expected channel to be closed after Unsubscribe")
	}

	// Publishing to a recipient with no subscribers must not panic.
	hub.Publish("user-1", []byte("ignored"))
}

func TestHubPublishDoesNotBlockOnFullBuffer(t *testing.T) {
	hub := NewHub()
	ch := hub.Subscribe("user-1")
	defer hub.Unsubscribe("user-1", ch)

	// Far more than the channel buffer; must return without blocking.
	done := make(chan struct{})
	go func() {
		for i := 0; i < 1000; i++ {
			hub.Publish("user-1", []byte("x"))
		}
		close(done)
	}()

	select {
	case <-done:
	case <-time.After(time.Second):
		t.Fatal("Publish blocked on a full subscriber buffer")
	}
}
