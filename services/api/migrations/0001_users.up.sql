-- Akun utama dan preferensi pengguna yang dipakai lintas alur aplikasi.
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username text NOT NULL UNIQUE,
    email_normalized text NOT NULL UNIQUE,
    password_hash text NOT NULL,
    role text NOT NULL CHECK (role IN ('buyer','seller','admin')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('pending','active','suspended','deleted')),
    email_verified_at timestamptz,
    profile_image_key text,
    preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX users_role_status_idx ON users (role, status);
