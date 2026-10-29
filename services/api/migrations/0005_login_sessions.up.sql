-- Sesi login: refresh token disimpan sebagai hash; rotasi mendeteksi reuse token lama
-- lalu mencabut seluruh keluarga token (AUTH-09). is_current dihitung dari session ID
-- pada access token, bukan flag mutable (PRD 9.1).
CREATE TABLE login_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash text NOT NULL,
    previous_refresh_token_hash text,
    token_family_id uuid NOT NULL,
    csrf_token_hash text NOT NULL,
    user_agent_summary text,
    platform text,
    ip_masked text,
    ip_hash text,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz NOT NULL DEFAULT now(),
    expires_at timestamptz NOT NULL,
    absolute_expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    revoke_reason text
);

CREATE INDEX login_sessions_user_idx ON login_sessions (user_id, revoked_at, expires_at);
CREATE INDEX login_sessions_refresh_idx ON login_sessions (refresh_token_hash);
CREATE INDEX login_sessions_family_idx ON login_sessions (token_family_id);
