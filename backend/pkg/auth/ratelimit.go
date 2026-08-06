package auth

import (
	"sync"
	"time"
)

// SlidingWindowLimiter is a simple process-local rate limiter.
// Replace with Redis when multi-instance rate limits are required.
type SlidingWindowLimiter struct {
	mu      sync.Mutex
	limit   int
	window  time.Duration
	entries map[string][]time.Time
}

func NewSlidingWindowLimiter(limitPerWindow int, window time.Duration) *SlidingWindowLimiter {
	if limitPerWindow <= 0 {
		limitPerWindow = 20
	}
	if window <= 0 {
		window = time.Minute
	}
	return &SlidingWindowLimiter{
		limit:   limitPerWindow,
		window:  window,
		entries: make(map[string][]time.Time),
	}
}

// Allow returns true if key is under the limit.
func (l *SlidingWindowLimiter) Allow(key string) bool {
	now := time.Now()
	cutoff := now.Add(-l.window)

	l.mu.Lock()
	defer l.mu.Unlock()

	times := l.entries[key]
	n := 0
	for _, t := range times {
		if t.After(cutoff) {
			times[n] = t
			n++
		}
	}
	times = times[:n]
	if len(times) >= l.limit {
		l.entries[key] = times
		return false
	}
	l.entries[key] = append(times, now)
	return true
}
