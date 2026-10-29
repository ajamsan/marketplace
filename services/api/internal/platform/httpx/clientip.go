package httpx

import (
	"net"
	"net/http"
	"strings"
)

// ClientIP mengambil IP koneksi yang dipercaya. Header X-Forwarded-For hanya
// dibaca bila koneksi datang dari proxy terkonfigurasi (PRD §6.2).
func ClientIP(r *http.Request, trusted []*net.IPNet) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	ip := net.ParseIP(host)
	if ip == nil {
		return host
	}
	if len(trusted) == 0 {
		return host
	}
	for _, n := range trusted {
		if n.Contains(ip) {
			xff := r.Header.Get("X-Forwarded-For")
			if xff == "" {
				return host
			}
			parts := strings.Split(xff, ",")
			last := strings.TrimSpace(parts[len(parts)-1])
			if last != "" {
				return last
			}
			return host
		}
	}
	return host
}

// MaskIP menyamarkan IP untuk ditampilkan ke pengguna; IP publik tidak
// ditampilkan apa adanya (SESS-01, §12.2).
func MaskIP(ip string) string {
	parsed := net.ParseIP(ip)
	if parsed == nil {
		return "tidak diketahui"
	}
	if v4 := parsed.To4(); v4 != nil {
		parts := strings.Split(v4.String(), ".")
		if len(parts) == 4 {
			return parts[0] + "." + parts[1] + ".x.x"
		}
		return "IPv4"
	}
	hextets := strings.Split(parsed.String(), ":")
	if len(hextets) >= 2 {
		return hextets[0] + ":" + hextets[1] + ":…"
	}
	return "IPv6"
}
