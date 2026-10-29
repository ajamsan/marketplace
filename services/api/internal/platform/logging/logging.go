package logging

import (
	"log/slog"
	"os"
	"strings"
)

// New mengembalikan logger terstruktur JSON dengan level dari LOG_LEVEL.
// Aplikasi wajib tidak pernah mencatat OTP, password, atau token (PRD §6.2).
func New(level string) *slog.Logger {
	var lvl slog.Level
	switch strings.ToLower(level) {
	case "debug":
		lvl = slog.LevelDebug
	case "warn":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}
	h := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: lvl})
	return slog.New(h)
}
