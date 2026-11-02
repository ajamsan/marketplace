package db

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

// Open membuat pool koneksi PostgreSQL via driver pgx (mode database/sql).
// Membuka pool PostgreSQL dan memverifikasi koneksi sebelum dipakai layanan.
func Open(ctx context.Context, dsn string) (*sql.DB, error) {
	d, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, err
	}
	d.SetMaxOpenConns(10)
	d.SetMaxIdleConns(5)
	d.SetConnMaxLifetime(30 * time.Minute)

	deadline := time.Now().Add(60 * time.Second)
	for {
		pingCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
		err = d.PingContext(pingCtx)
		cancel()
		if err == nil {
			return d, nil
		}
		if time.Now().After(deadline) {
			return nil, fmt.Errorf("database tidak siap dalam 60 detik: %w", err)
		}
		time.Sleep(2 * time.Second)
	}
}

// DBTX menyatukan akses *sql.DB dan *sql.Tx untuk repository.
type DBTX interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}

// WithTx menjalankan fn dalam satu transaksi; rollback otomatis saat error/panic.
// Menjalankan callback dalam transaksi dan membatalkan perubahan saat gagal.
func WithTx(ctx context.Context, d *sql.DB, fn func(tx *sql.Tx) error) (err error) {
	tx, err := d.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback()
			panic(p)
		}
	}()
	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}
