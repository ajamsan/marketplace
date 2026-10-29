package httpx

import (
	"sync"
	"time"
)

// Limiter adalah token bucket in-memory per kunci (misal "ip|route-group").
// Ini lapisan pertama; kebijakan lockout spesifik alur auth ada di auth_throttles
// (persisten, PRD §6.2). Setelah restart proses counter in-memory hilang —
// tidak menggantikan lockout database.
type Limiter struct {
	mu      sync.Mutex
	rps     float64
	burst   int
	buckets map[string]*bucket
	now     func() time.Time
}

type bucket struct {
	tokens float64
	last   time.Time
}

func NewLimiter(rps float64, burst int) *Limiter {
	if rps <= 0 {
		rps = 1
	}
	if burst <= 0 {
		burst = 1
	}
	return &Limiter{rps: rps, burst: burst, buckets: map[string]*bucket{}, now: time.Now}
}

func (l *Limiter) Allow(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	now := l.now()
	b, ok := l.buckets[key]
	if !ok {
		b = &bucket{tokens: float64(l.burst), last: now}
		l.buckets[key] = b
		if len(l.buckets) > 100000 {
			// batas praktis untuk dev; key berbasis IP pada skala kecil.
			l.buckets = map[string]*bucket{key: b}
		}
	}
	elapsed := now.Sub(b.last).Seconds()
	b.last = now
	b.tokens += elapsed * l.rps
	if b.tokens > float64(l.burst) {
		b.tokens = float64(l.burst)
	}
	if b.tokens < 1 {
		return false
	}
	b.tokens--
	return true
}
