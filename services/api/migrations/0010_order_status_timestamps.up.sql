-- Waktu aktual per tahap pemenuhan + penanda pembayaran tunai tercatat.
-- Dipakai timeline pesanan agar tidak mengarang waktu transisi.
ALTER TABLE order_stall_fulfillments
    ADD COLUMN in_preparation_at timestamptz,
    ADD COLUMN ready_for_pickup_at timestamptz,
    ADD COLUMN completed_at timestamptz;
