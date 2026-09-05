-- Add phlebotomist assignment to orders
ALTER TABLE orders.orders
    ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(36);

CREATE INDEX IF NOT EXISTS idx_order_assigned ON orders.orders (tenant_id, assigned_to)
    WHERE assigned_to IS NOT NULL AND deleted_at IS NULL;
