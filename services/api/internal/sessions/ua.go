package sessions

import "strings"

// Summarize menghasilkan label browser/platform PERKIRAAN dari User-Agent
// (SESS-01, §12.2). User-Agent bisa dipalsukan; UI menampilkan "perkiraan".

func label(ua string) string {
	b := browser(ua)
	p := platform(ua)
	return b + " · " + p
}

func platform(ua string) string {
	u := strings.ToLower(ua)
	switch {
	case strings.Contains(u, "android"):
		return "Android"
	case strings.Contains(u, "iphone"), strings.Contains(u, "ipad"):
		return "iOS"
	case strings.Contains(u, "windows"):
		return "Windows"
	case strings.Contains(u, "mac os"), strings.Contains(u, "macintosh"):
		return "macOS"
	case strings.Contains(u, "linux"):
		return "Linux"
	default:
		return "Perangkat lain"
	}
}

func browser(ua string) string {
	u := strings.ToLower(ua)
	switch {
	case strings.Contains(u, "edg/"), strings.Contains(u, "edge/"):
		return "Edge"
	case strings.Contains(u, "opr/"), strings.Contains(u, "opera"):
		return "Opera"
	case strings.Contains(u, "chrome/"):
		return "Chrome"
	case strings.Contains(u, "firefox/"):
		return "Firefox"
	case strings.Contains(u, "safari/"):
		return "Safari"
	default:
		return "Browser"
	}
}
