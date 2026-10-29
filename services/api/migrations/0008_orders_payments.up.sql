-- Order + snapshot item + pemenuhan per stan + pembayaran per stan.
-- public_code: kode pendek untuk disebut di kasir; BUKAN token akses (ORD-08).
CREATE TABLE orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    public_code text NOT NULL UNIQUE,
    buyer_id uuid NOT NULL REFERENCES users(id),
    status text NOT NULL CHECK (status IN
        ('awaiting_payment','confirmed','in_preparation','ready_for_pickup','completed','cancelled','expired','rejected')),
    currency char(3) NOT NULL DEFAULT 'IDR',
    subtotal_minor bigint NOT NULL CHECK (subtotal_minor >= 0),
    total_minor bigint NOT NULL CHECK (total_minor >= 0),
    idempotency_key text,
    request_hash text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    cancelled_at timestamptz,
    UNIQUE (buyer_id, idempotency_key)
);

CREATE INDEX orders_buyer_created_idx ON orders (buyer_id, created_at DESC);
CREATE INDEX orders_status_created_idx ON orders (status, created_at DESC);

CREATE TABLE order_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id uuid REFERENCES products(id),
    stall_id uuid NOT NULL REFERENCES stalls(id),
    product_name_snapshot text NOT NULL,
    unit_price_minor bigint NOT NULL CHECK (unit_price_minor >= 0),
    quantity integer NOT NULL CHECK (quantity > 0),
    line_total_minor bigint NOT NULL CHECK (line_total_minor >= 0),
    currency char(3) NOT NULL DEFAULT 'IDR',
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX order_items_order_idx ON order_items (order_id);
CREATE INDEX order_items_stall_idx ON order_items (stall_id);

CREATE TABLE order_stall_fulfillments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    stall_id uuid NOT NULL REFERENCES stalls(id),
    fulfillment_status text NOT NULL DEFAULT 'pending'
        CHECK (fulfillment_status IN ('pending','in_preparation','ready_for_pickup','completed','cancelled')),
    updated_by uuid REFERENCES users(id),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (order_id, stall_id)
);

CREATE INDEX order_fulfillments_stall_idx ON order_stall_fulfillments (stall_id);

-- Pembayaran per stan; tunai: cash_due -> cash_paid hanya oleh seller yang menerima uang.
-- qris_placeholder TIDAK PERNAH otomatis paid (ORD-06).
CREATE TABLE payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    stall_id uuid NOT NULL REFERENCES stalls(id),
    method text NOT NULL CHECK (method IN ('cash','qris_placeholder')),
    status text NOT NULL CHECK (status IN ('cash_due','cash_paid','void','unavailable','awaiting_external_confirmation')),
    amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
    currency char(3) NOT NULL DEFAULT 'IDR',
    paid_at timestamptz,
    confirmed_by uuid REFERENCES users(id),
    expires_at timestamptz,
    external_reference text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payments_order_idx ON payments (order_id);
CREATE INDEX payments_stall_idx ON payments (stall_id);

-- Append-only: perubahan pembayaran dicatat lengkap (dari status apa, ke status apa,
-- aktor, waktu). Tidak ada UPDATE/DELETE dari aplikasi (ORD-03, SESS-04).
CREATE TABLE payment_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    from_status text NOT NULL,
    to_status text NOT NULL,
    actor_user_id uuid REFERENCES users(id),
    reason_code text,
    request_id text,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX payment_events_payment_idx ON payment_events (payment_id);
