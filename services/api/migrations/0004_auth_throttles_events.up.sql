-- Counter percobaan persisten server-side (PRD 6.2). Tantangan baru tidak boleh
-- menghapus lock aktif; counter hanya di-reset oleh kebijakan eksplisit.
CREATE TABLE auth_throttles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    scope_type text NOT NULL CHECK (scope_type IN ('email','ip','email_ip','challenge')),
    scope_key_hash text NOT NULL,
    flow text NOT NULL CHECK (flow IN ('password','otp_register','otp_login','otp_resend','register_start')),
    failure_count integer NOT NULL DEFAULT 0,
    wave_number integer NOT NULL DEFAULT 0,
    window_started_at timestamptz NOT NULL DEFAULT now(),
    locked_until timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT auth_throttles_scope_uk UNIQUE (flow, scope_type, scope_key_hash)
);

CREATE TABLE auth_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    flow text NOT NULL,
    event text NOT NULL,
    outcome text NOT NULL,
    email_hash text,
    ip_hash text,
    request_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX auth_events_created_idx ON auth_events (created_at DESC);
