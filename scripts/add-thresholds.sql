-- Add configurable thresholds to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS warning_threshold NUMERIC DEFAULT 10;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS high_risk_threshold NUMERIC DEFAULT 15;

-- Set default values for existing companies
UPDATE companies SET warning_threshold = 10, high_risk_threshold = 15 WHERE warning_threshold IS NULL;
