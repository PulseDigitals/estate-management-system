-- Complete Chart of Accounts Migration for Magodo Residents Association
-- Modified Cash-Based Accounting Model
-- Uses UPSERT (INSERT ... ON CONFLICT) to handle existing accounts

-- Step 1: Deactivate only old system accounts that are being replaced
-- Preserve any custom accounts created by users
UPDATE accounts 
SET is_active = false 
WHERE account_number IN ('1010', '1020', '2010', '3010') 
  AND is_system_account = true;

-- Step 2: Insert or Update all accounts with UPSERT

-- Cash Accounts
INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('1000', 'Cash – Operating Account', 'asset', 'Cash and Bank', 'debit', true, true, 'Main operating cash account for day-to-day operations')
ON CONFLICT (account_number) DO UPDATE SET 
  account_name = EXCLUDED.account_name,
  account_type = EXCLUDED.account_type,
  category = EXCLUDED.category,
  normal_balance = EXCLUDED.normal_balance,
  is_active = EXCLUDED.is_active,
  is_system_account = EXCLUDED.is_system_account,
  description = EXCLUDED.description;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('1010', 'Cash – Project Account', 'asset', 'Cash and Bank', 'debit', true, false, 'Cash account for specific projects')
ON CONFLICT (account_number) DO UPDATE SET 
  account_name = EXCLUDED.account_name,
  account_type = EXCLUDED.account_type,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  is_system_account = EXCLUDED.is_system_account;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('1020', 'Cash – Other Funds', 'asset', 'Cash and Bank', 'debit', true, false, 'Other cash funds')
ON CONFLICT (account_number) DO UPDATE SET 
  account_name = EXCLUDED.account_name,
  account_type = EXCLUDED.account_type,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active,
  is_system_account = EXCLUDED.is_system_account;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('1030', 'Cash – Special Account (Litigation)', 'asset', 'Cash and Bank', 'debit', true, false, 'Special account for litigation expenses')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true, is_system_account = false;

-- Receivables
INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('1100', 'Accounts Receivable – Dues', 'asset', 'Receivables', 'debit', true, true, 'Outstanding member dues receivable')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true, is_system_account = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('1110', 'Other Receivables', 'asset', 'Receivables', 'debit', true, false, 'Other amounts receivable')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true, is_system_account = false;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('1120', 'Staff Loans', 'asset', 'Receivables', 'debit', true, false, 'Loans advanced to staff members')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true, is_system_account = false;

-- Prepaid
INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('1200', 'Prepaid Expenses', 'asset', 'Prepaid and Other Assets', 'debit', true, false, 'Expenses paid in advance')
ON CONFLICT (account_number) DO UPDATE SET is_active = true, is_system_account = false;

-- Fixed Assets
INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('1300', 'Property, Plant & Equipment (Building)', 'asset', 'Fixed Assets', 'debit', true, false, 'Buildings and structures owned')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('1310', 'Property, Plant & Equipment (Computers & Equipment)', 'asset', 'Fixed Assets', 'debit', true, false, 'Computer hardware and office equipment')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('1320', 'Property, Plant & Equipment (CCTV, Solar Street Light & Solar Inverter)', 'asset', 'Fixed Assets', 'debit', true, false, 'Security and solar infrastructure')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('1330', 'Property, Plant & Equipment (Furniture & Fittings)', 'asset', 'Fixed Assets', 'debit', true, false, 'Office furniture and fittings')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('1340', 'Property, Plant & Equipment (Motor Vehicle)', 'asset', 'Fixed Assets', 'debit', true, false, 'Vehicles owned by the association')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('1350', 'Property, Plant & Equipment (Transformer)', 'asset', 'Fixed Assets', 'debit', true, false, 'Electrical transformers')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('1360', 'Property, Plant & Equipment (Generator)', 'asset', 'Fixed Assets', 'debit', true, false, 'Power generators')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('1400', 'Accumulated Depreciation', 'asset', 'Fixed Assets', 'credit', true, true, 'Accumulated depreciation on fixed assets')
ON CONFLICT (account_number) DO UPDATE SET is_active = true, is_system_account = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('1500', 'Investments', 'asset', 'Investments', 'debit', true, false, 'Long-term and short-term investments')
ON CONFLICT (account_number) DO UPDATE SET is_active = true;

-- LIABILITIES
INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('2000', 'Accounts Payable – (Vendors)', 'liability', 'Current Liabilities', 'credit', true, true, 'Amounts owed to vendors and suppliers')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true, is_system_account = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('2100', 'Accrued Expenses', 'liability', 'Current Liabilities', 'credit', true, false, 'Expenses incurred but not yet paid')
ON CONFLICT (account_number) DO UPDATE SET is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('2110', 'Accrued Audit Fees', 'liability', 'Current Liabilities', 'credit', true, false, 'Audit fees payable')
ON CONFLICT (account_number) DO UPDATE SET is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('2120', 'Caution Dues/Refundable Deposits', 'liability', 'Current Liabilities', 'credit', true, false, 'Refundable security deposits from members')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('2130', 'Other Accruals', 'liability', 'Current Liabilities', 'credit', true, false, 'Other accrued liabilities')
ON CONFLICT (account_number) DO UPDATE SET is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('2140', 'Accrued Deductions – (PAYE, Pensions)', 'liability', 'Current Liabilities', 'credit', true, false, 'Tax and pension deductions payable')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('2200', 'Deferred Revenue (Advance Dues)', 'liability', 'Current Liabilities', 'credit', true, true, 'Member dues billed but not yet received - revenue deferred until cash collected')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true, is_system_account = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('2300', 'WHT Payable', 'liability', 'Tax Liabilities', 'credit', true, true, 'Withholding tax deducted from vendor payments, payable to tax authority')
ON CONFLICT (account_number) DO UPDATE SET is_active = true, is_system_account = true;

-- EQUITY
INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('3000', 'Accumulated Funds', 'equity', 'Fund Balances', 'credit', true, true, 'Accumulated surplus or deficit')
ON CONFLICT (account_number) DO UPDATE SET is_active = true, is_system_account = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('3100', 'Operating Fund Balance', 'equity', 'Fund Balances', 'credit', true, false, 'Current year operating fund balance')
ON CONFLICT (account_number) DO UPDATE SET is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('3200', 'Reserve Fund Balance', 'equity', 'Fund Balances', 'credit', true, false, 'Reserve funds for future use')
ON CONFLICT (account_number) DO UPDATE SET is_active = true;

-- INCOME
INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('4000', 'Member Dues', 'revenue', 'Member Income', 'credit', true, true, 'Regular membership dues')
ON CONFLICT (account_number) DO UPDATE SET is_active = true, is_system_account = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('4100', 'Recovered Dues', 'revenue', 'Member Income', 'credit', true, false, 'Previously written-off dues recovered')
ON CONFLICT (account_number) DO UPDATE SET is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('4200', 'Development Levy', 'revenue', 'Member Income', 'credit', true, false, 'Special development levies')
ON CONFLICT (account_number) DO UPDATE SET is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('4300', 'Demolition Fees', 'revenue', 'Other Income', 'credit', true, false, 'Fees from demolition services')
ON CONFLICT (account_number) DO UPDATE SET is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('4400', 'Interest Income', 'revenue', 'Other Income', 'credit', true, false, 'Interest earned on investments and savings')
ON CONFLICT (account_number) DO UPDATE SET is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('4500', 'Other Income (Donations, Sponsorships, Fines)', 'revenue', 'Other Income', 'credit', true, false, 'Miscellaneous income including donations, sponsorships, and fines')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true;

-- EXPENSES
INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('5000', 'Administrative Expenses (Staff Salaries, Donations & Gifts)', 'expense', 'Administrative', 'debit', true, false, 'Staff salaries, donations, and gifts')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('5100', 'Utilities (Electricity, Water, Internet for Common Areas)', 'expense', 'Utilities', 'debit', true, false, 'Electricity, water, and internet for common areas')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('5200', 'Maintenance & Repairs (Landscaping – Road Construction, Plumbing, Electrical – Street Light & Zonal Office)', 'expense', 'Maintenance', 'debit', true, false, 'General maintenance and repairs including landscaping, roads, plumbing, electrical')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('5210', 'Transformer/Generator Maintenance', 'expense', 'Maintenance', 'debit', true, false, 'Maintenance of transformers and generators')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('5300', 'Security Services (Guards, CCTV, Access Control)', 'expense', 'Security', 'debit', true, false, 'Security personnel, CCTV monitoring, and access control')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('5400', 'Office Running (Supplies)', 'expense', 'Administrative', 'debit', true, false, 'Office supplies and running costs')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('5500', 'Professional Fees (Legal, Audit, Consulting)', 'expense', 'Professional Services', 'debit', true, false, 'Legal, audit, and consulting fees')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('5600', 'Community Events (Festivals, Meetings, Social Activities)', 'expense', 'Community', 'debit', true, false, 'Community events, festivals, meetings, and social activities')
ON CONFLICT (account_number) DO UPDATE SET account_name = EXCLUDED.account_name, is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('5700', 'Financial Charges', 'expense', 'Financial', 'debit', true, false, 'Bank charges, transaction fees, and other financial charges')
ON CONFLICT (account_number) DO UPDATE SET is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('5800', 'Remittance to MRA', 'expense', 'Administrative', 'debit', true, false, 'Remittances to Magodo Residents Association main body')
ON CONFLICT (account_number) DO UPDATE SET is_active = true;

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES ('5900', 'Depreciation', 'expense', 'Non-Cash', 'debit', true, true, 'Depreciation expense on fixed assets')
ON CONFLICT (account_number) DO UPDATE SET is_active = true, is_system_account = true;
