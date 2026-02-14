ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS company_vat text,
  ADD COLUMN IF NOT EXISTS company_email text,
  ADD COLUMN IF NOT EXISTS company_address_line1 text,
  ADD COLUMN IF NOT EXISTS company_address_line2 text,
  ADD COLUMN IF NOT EXISTS company_city text,
  ADD COLUMN IF NOT EXISTS company_state text,
  ADD COLUMN IF NOT EXISTS company_postal_code text,
  ADD COLUMN IF NOT EXISTS company_country text;
