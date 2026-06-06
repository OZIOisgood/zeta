package notifications

import "sync"

// Hub is an in-process fan-out of notification events to connected SSE clients,
// keyed by recipient (WorkOS user id). One Hub lives per API instance; the
// Listener publishes into it, the SSE handler subscribes/unsubscribes.
type Hub struct {
	mu   sync.RWMutex
	subs map[string]map[chan []byte]struct{}
}

func NewHub() *Hub {
	return &Hub{subs: make(map[string]map[chan []byte]struct{})}
}

// Subscribe registers a new client channel for recipientID and returns it.
func (h *Hub) Subscribe(recipientID string) chan []byte {
	ch := make(chan []byte, 8)
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.subs[recipientID] == nil {
		h.subs[recipientID] = make(map[chan []byte]struct{})
	}
	h.subs[recipientID][ch] = struct{}{}
	return ch
}

// Unsubscribe removes and closes a client channel.
func (h *Hub) Unsubscribe(recipientID string, ch chan []byte) {
	h.mu.Lock()
	defer h.mu.Unlock()
	conns, ok := h.subs[recipientID]
	if !ok {
		return
	}
	if _, ok := conns[ch]; ok {
		delete(conns, ch)
		close(ch)
	}
	if len(conns) == 0 {
		delete(h.subs, recipientID)
	}
}

// Publish delivers msg to all of recipientID's connected clients without
// blocking: a client whose buffer is full is skipped so one slow consumer can
// never stall the listener loop. Guarded by RLock, so it cannot race a
// concurrent close in Unsubscribe (which holds the write lock).
func (h *Hub) Publish(recipientID string, msg []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()
	for ch := range h.subs[recipientID] {
		select {
		case ch <- msg:
		default:
		}
	}
}
