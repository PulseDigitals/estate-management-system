-- Chart of Accounts Migration for Magodo Residents Association
-- Modified Cash-Based Accounting Model
-- This script replaces the existing chart of accounts with the new structure

-- Step 1: Deactivate all existing accounts (preserves historical data)
UPDATE accounts SET is_active = false WHERE is_system_account = false;

-- Step 2: Insert new Chart of Accounts

-- ======================
-- ASSETS (1000-1999)
-- ======================

-- Cash Accounts
INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES 
('1000', 'Cash – Operating Account', 'asset', 'Cash and Bank', 'debit', true, true, 'Main operating cash account for day-to-day operations'),
('1010', 'Cash – Project Account', 'asset', 'Cash and Bank', 'debit', true, false, 'Cash account for specific projects'),
('1020', 'Cash – Other Funds', 'asset', 'Cash and Bank', 'debit', true, false, 'Other cash funds'),
('1030', 'Cash – Special Account (Litigation)', 'asset', 'Cash and Bank', 'debit', true, false, 'Special account for litigation expenses');

-- Receivables
INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES 
('1100', 'Accounts Receivable – Dues', 'asset', 'Receivables', 'debit', true, true, 'Outstanding member dues receivable'),
('1110', 'Other Receivables', 'asset', 'Receivables', 'debit', true, false, 'Other amounts receivable'),
('1120', 'Staff Loans', 'asset', 'Receivables', 'debit', true, false, 'Loans advanced to staff members');

-- Prepaid and Other Current Assets
INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES 
('1200', 'Prepaid Expenses', 'asset', 'Prepaid and Other Assets', 'debit', true, false, 'Expenses paid in advance');

-- Property, Plant & Equipment
INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES 
('1300', 'Property, Plant & Equipment (Building)', 'asset', 'Fixed Assets', 'debit', true, false, 'Buildings and structures owned'),
('1310', 'Property, Plant & Equipment (Computers & Equipment)', 'asset', 'Fixed Assets', 'debit', true, false, 'Computer hardware and office equipment'),
('1320', 'Property, Plant & Equipment (CCTV, Solar Street Light & Solar Inverter)', 'asset', 'Fixed Assets', 'debit', true, false, 'Security and solar infrastructure'),
('1330', 'Property, Plant & Equipment (Furniture & Fittings)', 'asset', 'Fixed Assets', 'debit', true, false, 'Office furniture and fittings'),
('1340', 'Property, Plant & Equipment (Motor Vehicle)', 'asset', 'Fixed Assets', 'debit', true, false, 'Vehicles owned by the association'),
('1350', 'Property, Plant & Equipment (Transformer)', 'asset', 'Fixed Assets', 'debit', true, false, 'Electrical transformers'),
('1360', 'Property, Plant & Equipment (Generator)', 'asset', 'Fixed Assets', 'debit', true, false, 'Power generators');

-- Accumulated Depreciation and Investments
INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES 
('1400', 'Accumulated Depreciation', 'asset', 'Fixed Assets', 'credit', true, true, 'Accumulated depreciation on fixed assets'),
('1500', 'Investments', 'asset', 'Investments', 'debit', true, false, 'Long-term and short-term investments');

-- ======================
-- LIABILITIES (2000-2999)
-- ======================

-- Current Liabilities
INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES 
('2000', 'Accounts Payable – (Vendors)', 'liability', 'Current Liabilities', 'credit', true, true, 'Amounts owed to vendors and suppliers'),
('2100', 'Accrued Expenses', 'liability', 'Current Liabilities', 'credit', true, false, 'Expenses incurred but not yet paid'),
('2110', 'Accrued Audit Fees', 'liability', 'Current Liabilities', 'credit', true, false, 'Audit fees payable'),
('2120', 'Caution Dues/Refundable Deposits', 'liability', 'Current Liabilities', 'credit', true, false, 'Refundable security deposits from members'),
('2130', 'Other Accruals', 'liability', 'Current Liabilities', 'credit', true, false, 'Other accrued liabilities'),
('2140', 'Accrued Deductions – (PAYE, Pensions)', 'liability', 'Current Liabilities', 'credit', true, false, 'Tax and pension deductions payable'),
('2200', 'Deferred Revenue (Advance Dues)', 'liability', 'Current Liabilities', 'credit', true, false, 'Member dues received in advance');

-- ======================
-- EQUITY / FUND BALANCES (3000-3999)
-- ======================

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES 
('3000', 'Accumulated Funds', 'equity', 'Fund Balances', 'credit', true, true, 'Accumulated surplus or deficit'),
('3100', 'Operating Fund Balance', 'equity', 'Fund Balances', 'credit', true, false, 'Current year operating fund balance'),
('3200', 'Reserve Fund Balance', 'equity', 'Fund Balances', 'credit', true, false, 'Reserve funds for future use');

-- ======================
-- INCOME (4000-4999)
-- ======================

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES 
('4000', 'Member Dues', 'revenue', 'Member Income', 'credit', true, true, 'Regular membership dues'),
('4100', 'Recovered Dues', 'revenue', 'Member Income', 'credit', true, false, 'Previously written-off dues recovered'),
('4200', 'Development Levy', 'revenue', 'Member Income', 'credit', true, false, 'Special development levies'),
('4300', 'Demolition Fees', 'revenue', 'Other Income', 'credit', true, false, 'Fees from demolition services'),
('4400', 'Interest Income', 'revenue', 'Other Income', 'credit', true, false, 'Interest earned on investments and savings'),
('4500', 'Other Income (Donations, Sponsorships, Fines)', 'revenue', 'Other Income', 'credit', true, false, 'Miscellaneous income including donations, sponsorships, and fines');

-- ======================
-- EXPENSES (5000-5999)
-- ======================

INSERT INTO accounts (account_number, account_name, account_type, category, normal_balance, is_active, is_system_account, description)
VALUES 
('5000', 'Administrative Expenses (Staff Salaries, Donations & Gifts)', 'expense', 'Administrative', 'debit', true, false, 'Staff salaries, donations, and gifts'),
('5100', 'Utilities (Electricity, Water, Internet for Common Areas)', 'expense', 'Utilities', 'debit', true, false, 'Electricity, water, and internet for common areas'),
('5200', 'Maintenance & Repairs (Landscaping – Road Construction, Plumbing, Electrical – Street Light & Zonal Office)', 'expense', 'Maintenance', 'debit', true, false, 'General maintenance and repairs including landscaping, roads, plumbing, electrical'),
('5210', 'Transformer/Generator Maintenance', 'expense', 'Maintenance', 'debit', true, false, 'Maintenance of transformers and generators'),
('5300', 'Security Services (Guards, CCTV, Access Control)', 'expense', 'Security', 'debit', true, false, 'Security personnel, CCTV monitoring, and access control'),
('5400', 'Office Running (Supplies)', 'expense', 'Administrative', 'debit', true, false, 'Office supplies and running costs'),
('5500', 'Professional Fees (Legal, Audit, Consulting)', 'expense', 'Professional Services', 'debit', true, false, 'Legal, audit, and consulting fees'),
('5600', 'Community Events (Festivals, Meetings, Social Activities)', 'expense', 'Community', 'debit', true, false, 'Community events, festivals, meetings, and social activities'),
('5700', 'Financial Charges', 'expense', 'Financial', 'debit', true, false, 'Bank charges, transaction fees, and other financial charges'),
('5800', 'Remittance to MRA', 'expense', 'Administrative', 'debit', true, false, 'Remittances to Magodo Residents Association main body'),
('5900', 'Depreciation', 'expense', 'Non-Cash', 'debit', true, true, 'Depreciation expense on fixed assets');

-- Note: This migration preserves historical data by deactivating old accounts instead of deleting them
-- All new accounts are created with fresh balances (starting at 0)
-- System accounts (is_system_account = true) are critical accounts that cannot be deleted from the UI
