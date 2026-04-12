-- Currency rates for testing: USD/EUR to TRY conversion
-- Run: psql -d your_db -f migrations/currency_rates_test_data.sql

-- 1. Insert test rates (approximate March 2025: USD ~34.50 TRY, EUR ~37.20 TRY)
INSERT INTO currency_rates (from_currency, to_currency, rate, date)
VALUES
  ('USD', 'TRY', 34.50, CURRENT_DATE),
  ('EUR', 'TRY', 37.20, CURRENT_DATE),
  ('TRY', 'USD', 0.029, CURRENT_DATE),
  ('TRY', 'EUR', 0.027, CURRENT_DATE)
ON CONFLICT (from_currency, to_currency, date) 
DO UPDATE SET rate = EXCLUDED.rate, updated_at = CURRENT_TIMESTAMP;

-- 2. Constraints for testing (run only if table allows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_currency_rate_positive'
  ) THEN
    ALTER TABLE currency_rates ADD CONSTRAINT chk_currency_rate_positive CHECK (rate > 0);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Constraint chk_currency_rate_positive may already exist or table structure differs: %', SQLERRM;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_currency_code_length'
  ) THEN
    ALTER TABLE currency_rates ADD CONSTRAINT chk_currency_code_length 
      CHECK (LENGTH(from_currency) = 3 AND LENGTH(to_currency) = 3);
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Constraint chk_currency_code_length may already exist: %', SQLERRM;
END $$;
