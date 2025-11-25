import { storage } from "./storage";

/**
 * Seed Chart of Accounts and Transaction Templates
 * for Estate/Residents' Association Accounting System
 * 
 * Structure tailored for estate management with focus on:
 * - Service charge collection and tracking
 * - Operational expenses (security, cleaning, utilities, maintenance)
 * - Minimal revenue accounts (associations typically operate at break-even)
 */

async function seedAccounting() {
  console.log("Starting estate association accounting system seed...");

  try {
    const existingAccounts = await storage.getAllAccounts();
    if (existingAccounts.length > 0) {
      console.log("Accounts already exist. Skipping seed.");
      return;
    }

    console.log("Creating Chart of Accounts...");

    // ==================== ASSET ACCOUNTS (1000-1999) ====================
    
    const bankAccount = await storage.createAccount({
      accountNumber: "1010",
      accountName: "Bank Account",
      accountType: "asset",
      category: "Cash and Bank",
      description: "Main estate bank account for all operations",
      normalBalance: "debit",
      isSystemAccount: true,
    });

    const accountsReceivableAccount = await storage.createAccount({
      accountNumber: "1020",
      accountName: "Accounts Receivable – Residents",
      accountType: "asset",
      category: "Receivables",
      description: "Outstanding service charges and fees owed by residents",
      normalBalance: "debit",
      isSystemAccount: true,
    });

    const prepaidExpensesAccount = await storage.createAccount({
      accountNumber: "1030",
      accountName: "Prepaid Expenses",
      accountType: "asset",
      category: "Prepayments",
      description: "Insurance, contracts, and other expenses paid in advance",
      normalBalance: "debit",
      isSystemAccount: false,
    });

    // ==================== LIABILITY ACCOUNTS (2000-2999) ====================
    
    const maintenanceFundAccount = await storage.createAccount({
      accountNumber: "2010",
      accountName: "Estate Maintenance Fund",
      accountType: "liability",
      category: "Funds",
      description: "Service charge collections held for estate maintenance",
      normalBalance: "credit",
      isSystemAccount: true,
    });

    const sinkingFundAccount = await storage.createAccount({
      accountNumber: "2020",
      accountName: "Sinking Fund",
      accountType: "liability",
      category: "Funds",
      description: "Long-term capital project reserves",
      normalBalance: "credit",
      isSystemAccount: false,
    });

    const accountsPayableAccount = await storage.createAccount({
      accountNumber: "2030",
      accountName: "Accounts Payable",
      accountType: "liability",
      category: "Payables",
      description: "Amounts owed to vendors and service providers",
      normalBalance: "credit",
      isSystemAccount: false,
    });

    const accruedExpensesAccount = await storage.createAccount({
      accountNumber: "2040",
      accountName: "Accrued Expenses",
      accountType: "liability",
      category: "Accruals",
      description: "Expenses incurred but not yet paid",
      normalBalance: "credit",
      isSystemAccount: false,
    });

    const whtPayableAccount = await storage.createAccount({
      accountNumber: "2300",
      accountName: "WHT Payable",
      accountType: "liability",
      category: "Tax Liabilities",
      description: "Withholding tax deducted from vendor payments, payable to tax authority",
      normalBalance: "credit",
      isSystemAccount: true,
    });

    // ==================== EQUITY ACCOUNTS (3000-3999) ====================
    
    const retainedEarningsAccount = await storage.createAccount({
      accountNumber: "3010",
      accountName: "Retained Earnings",
      accountType: "equity",
      category: "Equity",
      description: "Accumulated surplus from prior years",
      normalBalance: "credit",
      isSystemAccount: true,
    });

    // ==================== REVENUE/INCOME ACCOUNTS (4000-4999) ====================
    
    const administrativeChargesAccount = await storage.createAccount({
      accountNumber: "4010",
      accountName: "Administrative Charges",
      accountType: "revenue",
      category: "Revenue",
      description: "Administrative fees charged to residents (if any)",
      normalBalance: "credit",
      isSystemAccount: false,
    });

    const penaltiesAccount = await storage.createAccount({
      accountNumber: "4020",
      accountName: "Penalties / Late Payment Fees",
      accountType: "revenue",
      category: "Revenue",
      description: "Late payment penalties and other fines",
      normalBalance: "credit",
      isSystemAccount: false,
    });

    // ==================== EXPENSE ACCOUNTS (5000-5999) ====================
    
    const securityExpenseAccount = await storage.createAccount({
      accountNumber: "5010",
      accountName: "Security & Guards",
      accountType: "expense",
      category: "Security",
      description: "Security personnel salaries and equipment",
      normalBalance: "debit",
      isSystemAccount: false,
    });

    const cleaningExpenseAccount = await storage.createAccount({
      accountNumber: "5020",
      accountName: "Cleaning & Janitorial",
      accountType: "expense",
      category: "Maintenance",
      description: "Cleaning services and janitorial supplies",
      normalBalance: "debit",
      isSystemAccount: false,
    });

    const wasteManagementAccount = await storage.createAccount({
      accountNumber: "5030",
      accountName: "Waste Management",
      accountType: "expense",
      category: "Utilities",
      description: "Waste collection and disposal services",
      normalBalance: "debit",
      isSystemAccount: false,
    });

    const dieselGeneratorAccount = await storage.createAccount({
      accountNumber: "5040",
      accountName: "Diesel / Generator",
      accountType: "expense",
      category: "Utilities",
      description: "Generator fuel and maintenance costs",
      normalBalance: "debit",
      isSystemAccount: false,
    });

    const electricalRepairsAccount = await storage.createAccount({
      accountNumber: "5050",
      accountName: "Electrical Repairs",
      accountType: "expense",
      category: "Repairs",
      description: "Electrical system repairs and maintenance",
      normalBalance: "debit",
      isSystemAccount: false,
    });

    const plumbingRepairsAccount = await storage.createAccount({
      accountNumber: "5060",
      accountName: "Plumbing Repairs",
      accountType: "expense",
      category: "Repairs",
      description: "Plumbing system repairs and maintenance",
      normalBalance: "debit",
      isSystemAccount: false,
    });

    const landscapingAccount = await storage.createAccount({
      accountNumber: "5070",
      accountName: "Landscaping",
      accountType: "expense",
      category: "Maintenance",
      description: "Lawn care, gardening, and landscaping services",
      normalBalance: "debit",
      isSystemAccount: false,
    });

    const generalMaintenanceAccount = await storage.createAccount({
      accountNumber: "5080",
      accountName: "General Maintenance",
      accountType: "expense",
      category: "Maintenance",
      description: "General repairs and maintenance not covered elsewhere",
      normalBalance: "debit",
      isSystemAccount: false,
    });

    const officeAdminExpenseAccount = await storage.createAccount({
      accountNumber: "5090",
      accountName: "Office/Admin Expenses",
      accountType: "expense",
      category: "Administrative",
      description: "Office supplies, stationery, and admin costs",
      normalBalance: "debit",
      isSystemAccount: false,
    });

    console.log("Chart of Accounts created successfully!");

    // ==================== TRANSACTION TEMPLATES ====================
    
    console.log("Creating Transaction Templates...");

    await storage.createTransactionTemplate({
      name: "Collect Service Charge",
      description: "Record service charge payment received from resident",
      transactionType: "service_charge_collection",
      debitAccountId: bankAccount.id,
      creditAccountId: maintenanceFundAccount.id,
      isSystemTemplate: true,
    });

    await storage.createTransactionTemplate({
      name: "Record Receivable",
      description: "Bill resident for service charge (create receivable)",
      transactionType: "service_charge_billing",
      debitAccountId: accountsReceivableAccount.id,
      creditAccountId: maintenanceFundAccount.id,
      isSystemTemplate: true,
    });

    await storage.createTransactionTemplate({
      name: "Receive Payment on Account",
      description: "Resident pays outstanding receivable",
      transactionType: "payment_received",
      debitAccountId: bankAccount.id,
      creditAccountId: accountsReceivableAccount.id,
      isSystemTemplate: false,
    });

    await storage.createTransactionTemplate({
      name: "Pay Security Services",
      description: "Pay security guards and security expenses",
      transactionType: "pay_security",
      debitAccountId: securityExpenseAccount.id,
      creditAccountId: bankAccount.id,
      isSystemTemplate: false,
    });

    await storage.createTransactionTemplate({
      name: "Pay Cleaning Services",
      description: "Pay for cleaning and janitorial services",
      transactionType: "pay_cleaning",
      debitAccountId: cleaningExpenseAccount.id,
      creditAccountId: bankAccount.id,
      isSystemTemplate: false,
    });

    await storage.createTransactionTemplate({
      name: "Pay Waste Management",
      description: "Pay for waste collection and disposal",
      transactionType: "pay_waste",
      debitAccountId: wasteManagementAccount.id,
      creditAccountId: bankAccount.id,
      isSystemTemplate: false,
    });

    await storage.createTransactionTemplate({
      name: "Pay Diesel/Generator",
      description: "Pay for diesel fuel and generator maintenance",
      transactionType: "pay_diesel",
      debitAccountId: dieselGeneratorAccount.id,
      creditAccountId: bankAccount.id,
      isSystemTemplate: false,
    });

    await storage.createTransactionTemplate({
      name: "Pay General Maintenance",
      description: "Pay for general estate maintenance and repairs",
      transactionType: "pay_maintenance",
      debitAccountId: generalMaintenanceAccount.id,
      creditAccountId: bankAccount.id,
      isSystemTemplate: false,
    });

    await storage.createTransactionTemplate({
      name: "Record Late Payment Fee",
      description: "Charge late payment penalty to resident",
      transactionType: "late_fee",
      debitAccountId: accountsReceivableAccount.id,
      creditAccountId: penaltiesAccount.id,
      isSystemTemplate: false,
    });

    console.log("Transaction Templates created successfully!");

    console.log("\n=== ESTATE ASSOCIATION ACCOUNTING SYSTEM SEED COMPLETE ===");
    console.log("\nChart of Accounts Summary:");
    console.log("  Assets:      3 accounts");
    console.log("  Liabilities: 4 accounts");
    console.log("  Equity:      1 account");
    console.log("  Revenue:     2 accounts");
    console.log("  Expenses:    9 accounts");
    console.log("  TOTAL:       19 accounts");
    console.log("\nTransaction Templates: 9 templates");
    console.log("\nThe accountant can now manage the estate's financial records.");

  } catch (error) {
    console.error("Error seeding accounting system:", error);
    throw error;
  }
}

export { seedAccounting };
