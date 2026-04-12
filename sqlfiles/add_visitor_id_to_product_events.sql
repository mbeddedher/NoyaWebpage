-- Add visitor_id column to product_events for cross-session tracking
-- Run this if the table already exists without visitor_id

ALTER TABLE product_events ADD COLUMN IF NOT EXISTS visitor_id TEXT;

-- Optional: index for visitor-based queries
CREATE INDEX IF NOT EXISTS idx_product_events_visitor_id ON product_events(visitor_id);
