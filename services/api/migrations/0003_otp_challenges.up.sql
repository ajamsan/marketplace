-- Tantangan OTP: kode hanya disimpan sebagai hash/HMAC, bukan teks biasa (AUTH-05).
CREATE TABLE otp_challenges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES users(id) ON DELETE CASCADE,
    pending_registration_id uuid REFERENCES pending_registrations(id) ON DELETE CASCADE,
    email_normalized text NOT NULL,
    purpose text NOT NULL CHECK (purpose IN ('register','login')),
    otp_hash text NOT NULL,
    pre_auth_token_hash text,
    attempt_count integer NOT NULL DEFAULT 0,
    round_number integer NOT NULL DEFAULT 1,
    request_ip_hash text,
    expires_at timestamptz NOT NULL,
    consumed_at timestamptz,
    superseded_at timestamptz,
    last_sent_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX otp_challenges_lookup_idx ON otp_challenges (email_normalized, purpose, created_at DESC);
CREATE INDEX otp_challenges_active_expires_idx ON otp_challenges (expires_at) WHERE consumed_at IS NULL;
CREATE INDEX otp_challenges_preauth_idx ON otp_challenges (pre_auth_token_hash)
    WHERE pre_auth_token_hash IS NOT NULL AND consumed_at IS NULL;
