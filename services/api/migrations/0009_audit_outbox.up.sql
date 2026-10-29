-- Audit tindakan sensitif (SESS-04): hanya metadata allowlist, tanpa rahasia/OTP/password.
CREATE TABLE audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id uuid REFERENCES users(id),
    action text NOT NULL,
    resource_type text NOT NULL,
    resource_id text,
    outcome text NOT NULL,
    request_id text,
    metadata_redacted jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_created_idx ON audit_logs (created_at DESC);
CREATE INDEX audit_logs_actor_idx ON audit_logs (actor_user_id, created_at DESC);

-- Transactional outbox: permintaan kirim email OTP dibuat dalam transaksi yang sama
-- dengan tantangan OTP; worker mengirim dengan retry/backoff (PRD 9.1).
-- payload_redacted TIDAK boleh berisi kode OTP.
CREATE TABLE email_outbox (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    purpose text NOT NULL,
    recipient text NOT NULL,
    template_key text NOT NULL,
    payload_redacted jsonb NOT NULL DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
    attempt_count integer NOT NULL DEFAULT 0,
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    provider_message_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    sent_at timestamptz
);

CREATE INDEX email_outbox_due_idx ON email_outbox (status, next_attempt_at);
