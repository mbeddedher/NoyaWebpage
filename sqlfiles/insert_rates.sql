-- First, insert rates if they don't exist for today
INSERT INTO currency_rates (from_currency, to_currency, rate, date)
SELECT 'USD', 'TRY', 31.23, CURRENT_DATE
WHERE NOT EXISTS (
    SELECT 1 FROM currency_rates 
    WHERE from_currency = 'USD' AND to_currency = 'TRY' AND date = CURRENT_DATE
);

INSERT INTO currency_rates (from_currency, to_currency, rate, date)
SELECT 'EUR', 'TRY', 33.95, CURRENT_DATE
WHERE NOT EXISTS (
    SELECT 1 FROM currency_rates 
    WHERE from_currency = 'EUR' AND to_currency = 'TRY' AND date = CURRENT_DATE
);

INSERT INTO currency_rates (from_currency, to_currency, rate, date)
SELECT 'TRY', 'USD', 1/31.23, CURRENT_DATE
WHERE NOT EXISTS (
    SELECT 1 FROM currency_rates 
    WHERE from_currency = 'TRY' AND to_currency = 'USD' AND date = CURRENT_DATE
);

INSERT INTO currency_rates (from_currency, to_currency, rate, date)
SELECT 'TRY', 'EUR', 1/33.95, CURRENT_DATE
WHERE NOT EXISTS (
    SELECT 1 FROM currency_rates 
    WHERE from_currency = 'TRY' AND to_currency = 'EUR' AND date = CURRENT_DATE
);

INSERT INTO currency_rates (from_currency, to_currency, rate, date)
SELECT 'USD', 'EUR', 31.23/33.95, CURRENT_DATE
WHERE NOT EXISTS (
    SELECT 1 FROM currency_rates 
    WHERE from_currency = 'USD' AND to_currency = 'EUR' AND date = CURRENT_DATE
);

INSERT INTO currency_rates (from_currency, to_currency, rate, date)
SELECT 'EUR', 'USD', 33.95/31.23, CURRENT_DATE
WHERE NOT EXISTS (
    SELECT 1 FROM currency_rates 
    WHERE from_currency = 'EUR' AND to_currency = 'USD' AND date = CURRENT_DATE
);

-- Then update any existing rates
UPDATE currency_rates 
SET rate = 31.23, updated_at = CURRENT_TIMESTAMP 
WHERE from_currency = 'USD' AND to_currency = 'TRY' AND date = CURRENT_DATE;

UPDATE currency_rates 
SET rate = 33.95, updated_at = CURRENT_TIMESTAMP 
WHERE from_currency = 'EUR' AND to_currency = 'TRY' AND date = CURRENT_DATE;

UPDATE currency_rates 
SET rate = 1/31.23, updated_at = CURRENT_TIMESTAMP 
WHERE from_currency = 'TRY' AND to_currency = 'USD' AND date = CURRENT_DATE;

UPDATE currency_rates 
SET rate = 1/33.95, updated_at = CURRENT_TIMESTAMP 
WHERE from_currency = 'TRY' AND to_currency = 'EUR' AND date = CURRENT_DATE;

UPDATE currency_rates 
SET rate = 31.23/33.95, updated_at = CURRENT_TIMESTAMP 
WHERE from_currency = 'USD' AND to_currency = 'EUR' AND date = CURRENT_DATE;

UPDATE currency_rates 
SET rate = 33.95/31.23, updated_at = CURRENT_TIMESTAMP 
WHERE from_currency = 'EUR' AND to_currency = 'USD' AND date = CURRENT_DATE; 