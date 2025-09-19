-- Update currency settings for Malaysia
UPDATE company_settings
SET setting_value = 'MYR'
WHERE setting_key = 'currency';

UPDATE company_settings
SET setting_value = 'Malaysia'
WHERE setting_key = 'country';

-- Add Malaysian-specific settings if they don't exist
INSERT INTO company_settings (setting_key, setting_value, description) VALUES
('country', 'Malaysia', 'Company country'),
('currency_symbol', 'RM', 'Currency symbol'),
('currency_code', 'MYR', 'ISO currency code'),
('tax_rate', '6.00', 'Default tax rate percentage (SST)'),
('company_registration', '', 'Company registration number')
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description;

SELECT 'Currency settings updated for Malaysia!' as status;