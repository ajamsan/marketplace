-- Pendaftaran yang belum diverifikasi OTP. Akun user TIDAK dibuat sebelum OTP valid (PRD 5.1).
-- Baris lama untuk email yang sama dihapus saat pendaftaran baru dibuat.
CREATE TABLE pending_registrations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email_normalized text NOT NULL,
    username text NOT NULL,
    password_hash text NOT NULL,
    role text NOT NULL CHECK (role IN ('buyer','seller')),
    attempt_group_id uuid NOT NULL,
    verified_at timestamptz,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Hanya satu pendaftaran aktif (belum diverifikasi) per email.
CREATE UNIQUE INDEX pending_registrations_email_active_uk
    ON pending_registrations (email_normalized) WHERE verified_at IS NULL;
CREATE INDEX pending_registrations_expires_idx ON pending_registrations (expires_at);
