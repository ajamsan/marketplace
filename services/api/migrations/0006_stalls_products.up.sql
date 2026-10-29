-- Stan + keanggotaan seller + produk. Stan baru berstatus pending_review dan
-- hanya menjadi aktif setelah admin menyetujui (keputusan desain D11/D12).
CREATE TABLE stalls (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    location_label text,
    status text NOT NULL DEFAULT 'pending_review'
        CHECK (status IN ('pending_review','active','inactive')),
    created_by uuid REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE seller_stalls (
    seller_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    stall_id uuid NOT NULL REFERENCES stalls(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner','staff')),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (seller_id, stall_id)
);

CREATE TABLE products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stall_id uuid NOT NULL REFERENCES stalls(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    price_minor bigint NOT NULL CHECK (price_minor >= 0),
    currency char(3) NOT NULL DEFAULT 'IDR',
    availability_status text NOT NULL DEFAULT 'available'
        CHECK (availability_status IN ('available','unavailable')),
    image_key text,
    created_by uuid REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    archived_at timestamptz
);

CREATE INDEX products_stall_avail_idx ON products (stall_id, availability_status) WHERE archived_at IS NULL;
CREATE INDEX products_name_lower_idx ON products (lower(name)) WHERE archived_at IS NULL;
