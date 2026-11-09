ALTER TABLE order_stall_fulfillments
    DROP COLUMN in_preparation_at,
    DROP COLUMN ready_for_pickup_at,
    DROP COLUMN completed_at;
