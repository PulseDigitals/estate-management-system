import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  unique,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role", { enum: ["resident", "admin", "security", "accountant"] }).notNull().default("resident"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Residents table - extended profile information for residents
export const residents = pgTable("residents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  unitNumber: varchar("unit_number").notNull().unique(),
  streetName: varchar("street_name"),
  phoneNumber: varchar("phone_number"),
  accountStatus: varchar("account_status", { enum: ["active", "inactive", "delinquent"] }).notNull().default("active"),
  totalBalance: decimal("total_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  
  // Comprehensive resident information
  moveInDate: timestamp("move_in_date"),
  occupancyType: varchar("occupancy_type", { enum: ["owner", "tenant"] }).default("owner"),
  numberOfOccupants: integer("number_of_occupants"),
  propertySize: varchar("property_size"),
  bedrooms: integer("bedrooms"),
  parkingSpaces: integer("parking_spaces").default(0),
  
  // Emergency contact information
  emergencyContactName: varchar("emergency_contact_name"),
  emergencyContactPhone: varchar("emergency_contact_phone"),
  emergencyContactRelationship: varchar("emergency_contact_relationship"),
  
  // Vehicle information (stored as JSONB array)
  vehicles: text("vehicles").array(),
  
  // Additional information
  specialNotes: text("special_notes"),
  
  // Service charge and subscription period
  serviceCharge: decimal("service_charge", { precision: 10, scale: 2 }),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const residentsRelations = relations(residents, ({ one, many }) => ({
  user: one(users, {
    fields: [residents.userId],
    references: [users.id],
  }),
  bills: many(bills),
  visitors: many(visitors),
}));

export const insertResidentSchema = createInsertSchema(residents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertResident = z.infer<typeof insertResidentSchema>;
export type Resident = typeof residents.$inferSelect;

// Bills table - levy bills issued to residents (Accounts Receivable entries)
export const bills = pgTable("bills", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  residentId: varchar("resident_id").notNull().references(() => residents.id, { onDelete: "cascade" }),
  billingType: varchar("billing_type").notNull().default("Estate Maintenance"),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  status: varchar("status", { enum: ["pending", "paid", "overdue", "partial"] }).notNull().default("pending"),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  journalEntryId: varchar("journal_entry_id"),
  
  // AR tracking fields
  invoiceNumber: varchar("invoice_number").unique(),
  totalPaid: decimal("total_paid", { precision: 10, scale: 2 }).notNull().default("0"),
  balance: decimal("balance", { precision: 10, scale: 2 }).notNull().default("0"),
  paymentStatus: varchar("payment_status", { enum: ["unpaid", "partial_payment", "full_payment"] }).notNull().default("unpaid"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const billsRelations = relations(bills, ({ one, many }) => ({
  resident: one(residents, {
    fields: [bills.residentId],
    references: [residents.id],
  }),
  payments: many(payments),
  paymentApplications: many(paymentApplications),
}));

export const insertBillSchema = createInsertSchema(bills).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof bills.$inferSelect;

// Payments table - payment records for bills
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  billId: varchar("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  residentId: varchar("resident_id").notNull().references(() => residents.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: varchar("payment_method").notNull().default("cash"),
  transactionId: varchar("transaction_id"),
  status: varchar("status", { enum: ["pending", "completed", "failed"] }).notNull().default("completed"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  bill: one(bills, {
    fields: [payments.billId],
    references: [bills.id],
  }),
  resident: one(residents, {
    fields: [payments.residentId],
    references: [residents.id],
  }),
}));

export const insertPaymentSchema = createInsertSchema(payments).omit({
  id: true,
  createdAt: true,
});

export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof payments.$inferSelect;

// Visitors table - pre-approved visitors with QR codes
export const visitors = pgTable("visitors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  residentId: varchar("resident_id").notNull().references(() => residents.id, { onDelete: "cascade" }),
  visitorName: varchar("visitor_name").notNull(),
  visitorPhone: varchar("visitor_phone"),
  purpose: text("purpose"),
  accessCode: varchar("access_code").notNull().unique(),
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  status: varchar("status", { enum: ["pending", "approved", "used", "expired", "denied"] }).notNull().default("approved"),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const visitorsRelations = relations(visitors, ({ one }) => ({
  resident: one(residents, {
    fields: [visitors.residentId],
    references: [residents.id],
  }),
}));

export const insertVisitorSchema = createInsertSchema(visitors).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});

export type InsertVisitor = z.infer<typeof insertVisitorSchema>;
export type Visitor = typeof visitors.$inferSelect;

// Notifications table - system notifications for users
export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  type: varchar("type", { enum: ["bill", "payment", "announcement", "visitor", "system"] }).notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;

// Access Logs table - security access logs for gate entries
export const accessLogs = pgTable("access_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  visitorId: varchar("visitor_id").references(() => visitors.id, { onDelete: "set null" }),
  residentId: varchar("resident_id").references(() => residents.id, { onDelete: "set null" }),
  securityPersonnelId: varchar("security_personnel_id").references(() => users.id, { onDelete: "set null" }),
  accessType: varchar("access_type", { enum: ["visitor", "resident", "manual"] }).notNull(),
  name: varchar("name").notNull(),
  action: varchar("action", { enum: ["entry", "exit", "denied"] }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const accessLogsRelations = relations(accessLogs, ({ one }) => ({
  visitor: one(visitors, {
    fields: [accessLogs.visitorId],
    references: [visitors.id],
  }),
  resident: one(residents, {
    fields: [accessLogs.residentId],
    references: [residents.id],
  }),
  securityPersonnel: one(users, {
    fields: [accessLogs.securityPersonnelId],
    references: [users.id],
  }),
}));

export const insertAccessLogSchema = createInsertSchema(accessLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAccessLog = z.infer<typeof insertAccessLogSchema>;
export type AccessLog = typeof accessLogs.$inferSelect;

// Announcements table - estate-wide announcements from admin
export const announcements = pgTable("announcements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  adminId: varchar("admin_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title").notNull(),
  content: text("content").notNull(),
  priority: varchar("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const announcementsRelations = relations(announcements, ({ one }) => ({
  admin: one(users, {
    fields: [announcements.adminId],
    references: [users.id],
  }),
}));

export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
});

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type Announcement = typeof announcements.$inferSelect;

// ====== ACCOUNTING SYSTEM TABLES ======

// Chart of Accounts - defines all accounts in the accounting system
export const accounts = pgTable("accounts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  accountNumber: varchar("account_number").notNull().unique(),
  accountName: varchar("account_name").notNull(),
  accountType: varchar("account_type", { 
    enum: ["asset", "liability", "equity", "revenue", "expense"] 
  }).notNull(),
  category: varchar("category"), // e.g., "Cash and Bank", "Receivables", "Utilities", etc.
  description: text("description"),
  normalBalance: varchar("normal_balance", { enum: ["debit", "credit"] }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  isSystemAccount: boolean("is_system_account").notNull().default(false), // Cannot be deleted
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  balance: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

// Transaction Templates - define standard debit-credit pairs for common transactions
export const transactionTemplates = pgTable("transaction_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull().unique(),
  description: text("description"),
  transactionType: varchar("transaction_type").notNull(), // e.g., "service_charge", "payment_received", "expense", etc.
  debitAccountId: varchar("debit_account_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  creditAccountId: varchar("credit_account_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  isActive: boolean("is_active").notNull().default(true),
  isSystemTemplate: boolean("is_system_template").notNull().default(false), // Cannot be deleted
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const transactionTemplatesRelations = relations(transactionTemplates, ({ one }) => ({
  debitAccount: one(accounts, {
    fields: [transactionTemplates.debitAccountId],
    references: [accounts.id],
    relationName: "debitAccount",
  }),
  creditAccount: one(accounts, {
    fields: [transactionTemplates.creditAccountId],
    references: [accounts.id],
    relationName: "creditAccount",
  }),
}));

export const insertTransactionTemplateSchema = createInsertSchema(transactionTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTransactionTemplate = z.infer<typeof insertTransactionTemplateSchema>;
export type TransactionTemplate = typeof transactionTemplates.$inferSelect;

// Journal Entries - main accounting transactions
export const journalEntries = pgTable("journal_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entryNumber: varchar("entry_number").notNull().unique(), // Auto-generated: JE-YYYYMMDD-XXXX
  entryDate: timestamp("entry_date").notNull(),
  description: text("description").notNull(),
  referenceType: varchar("reference_type"), // e.g., "bill", "payment", "manual"
  referenceId: varchar("reference_id"), // ID of the bill, payment, etc.
  templateId: varchar("template_id").references(() => transactionTemplates.id, { onDelete: "set null" }),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  status: varchar("status", { enum: ["draft", "posted", "void"] }).notNull().default("posted"),
  totalDebit: decimal("total_debit", { precision: 15, scale: 2 }).notNull(),
  totalCredit: decimal("total_credit", { precision: 15, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const journalEntriesRelations = relations(journalEntries, ({ one, many }) => ({
  template: one(transactionTemplates, {
    fields: [journalEntries.templateId],
    references: [transactionTemplates.id],
  }),
  creator: one(users, {
    fields: [journalEntries.createdBy],
    references: [users.id],
  }),
  lines: many(journalEntryLines),
}));

export const insertJournalEntrySchema = createInsertSchema(journalEntries).omit({
  id: true,
  entryNumber: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertJournalEntry = z.infer<typeof insertJournalEntrySchema>;
export type JournalEntry = typeof journalEntries.$inferSelect;

// Journal Entry Lines - individual debit/credit lines for each journal entry
export const journalEntryLines = pgTable("journal_entry_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  journalEntryId: varchar("journal_entry_id").notNull().references(() => journalEntries.id, { onDelete: "cascade" }),
  accountId: varchar("account_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  lineType: varchar("line_type", { enum: ["debit", "credit"] }).notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const journalEntryLinesRelations = relations(journalEntryLines, ({ one }) => ({
  journalEntry: one(journalEntries, {
    fields: [journalEntryLines.journalEntryId],
    references: [journalEntries.id],
  }),
  account: one(accounts, {
    fields: [journalEntryLines.accountId],
    references: [accounts.id],
  }),
}));

export const insertJournalEntryLineSchema = createInsertSchema(journalEntryLines).omit({
  id: true,
  createdAt: true,
});

export type InsertJournalEntryLine = z.infer<typeof insertJournalEntryLineSchema>;
export type JournalEntryLine = typeof journalEntryLines.$inferSelect;

// Vendors table - for vendor management and tracking
export const vendors = pgTable("vendors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  tinNumber: varchar("tin_number").notNull().unique(), // Tax Identification Number
  email: varchar("email"),
  phoneNumber: varchar("phone_number"),
  address: text("address"),
  contactPerson: varchar("contact_person"),
  bankName: varchar("bank_name"),
  bankAccountNumber: varchar("bank_account_number"),
  bankAccountName: varchar("bank_account_name"),
  status: varchar("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const vendorsRelations = relations(vendors, ({ one }) => ({
  approver: one(users, {
    fields: [vendors.approvedBy],
    references: [users.id],
  }),
}));

export const insertVendorSchema = createInsertSchema(vendors).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  tinNumber: z.string().min(1, "TIN number is required"),
  name: z.string().min(1, "Vendor name is required"),
});

export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendors.$inferSelect;

// Expenses table
export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorId: varchar("vendor_id").references(() => vendors.id),
  accountId: varchar("account_id").references(() => accounts.id),
  expenseType: varchar("expense_type", { enum: ["Retail Expense", "Service Payment"] }).notNull(),
  expenseClassification: varchar("expense_classification", { 
    enum: [
      "Security & Guards",
      "Cleaning & Janitorial",
      "Waste Management",
      "Diesel / Generator",
      "Electrical Repairs",
      "Plumbing Repairs",
      "Landscaping",
      "General Maintenance",
      "Office/Admin Expenses"
    ] 
  }),
  description: text("description").notNull(),
  expenseAmount: decimal("expense_amount", { precision: 10, scale: 2 }).notNull(),
  serviceCharge: decimal("service_charge", { precision: 10, scale: 2 }),
  receiptPath: text("receipt_path"),
  status: varchar("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  submittedBy: varchar("submitted_by").notNull().references(() => users.id),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  rejectionReason: text("rejection_reason"),
  
  // Payment tracking fields
  paymentStatus: varchar("payment_status", { enum: ["unpaid", "approved_for_payment", "paid"] }).notNull().default("unpaid"),
  paidDate: timestamp("paid_date"),
  paidFromAccountId: varchar("paid_from_account_id").references(() => accounts.id),
  paidBy: varchar("paid_by").references(() => users.id),
  whtRate: decimal("wht_rate", { precision: 5, scale: 2 }).default("5.00"), // Default 5%
  whtAmount: decimal("wht_amount", { precision: 10, scale: 2 }).default("0"),
  netPayment: decimal("net_payment", { precision: 10, scale: 2 }),
  paymentJournalEntryId: varchar("payment_journal_entry_id"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const expensesRelations = relations(expenses, ({ one }) => ({
  vendor: one(vendors, {
    fields: [expenses.vendorId],
    references: [vendors.id],
  }),
  account: one(accounts, {
    fields: [expenses.accountId],
    references: [accounts.id],
  }),
  submitter: one(users, {
    fields: [expenses.submittedBy],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [expenses.reviewedBy],
    references: [users.id],
  }),
  paidFromAccount: one(accounts, {
    fields: [expenses.paidFromAccountId],
    references: [accounts.id],
    relationName: "paymentAccount",
  }),
  payer: one(users, {
    fields: [expenses.paidBy],
    references: [users.id],
    relationName: "payer",
  }),
}));

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  reviewedAt: true,
  reviewedBy: true,
  rejectionReason: true,
}).extend({
  expenseType: z.enum(["Retail Expense", "Service Payment"]),
  description: z.string().min(1, "Description is required"),
  expenseAmount: z.string().min(1, "Expense amount is required"),
  serviceCharge: z.string().optional(),
});

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

// WHT Transactions table - tracks Withholding Tax deductions and remittances
export const whtTransactions = pgTable("wht_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  expenseId: varchar("expense_id").notNull().references(() => expenses.id, { onDelete: "restrict" }),
  vendorId: varchar("vendor_id").notNull().references(() => vendors.id, { onDelete: "restrict" }),
  whtAmount: decimal("wht_amount", { precision: 10, scale: 2 }).notNull(),
  whtRate: decimal("wht_rate", { precision: 5, scale: 2 }).notNull(),
  taxableAmount: decimal("taxable_amount", { precision: 10, scale: 2 }).notNull(), // Usually service charge amount
  
  // Deduction tracking
  deductionDate: timestamp("deduction_date").notNull(),
  deductionJournalEntryId: varchar("deduction_journal_entry_id").references(() => journalEntries.id),
  deductedBy: varchar("deducted_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  
  // Remittance tracking
  remittanceStatus: varchar("remittance_status", { 
    enum: ["pending", "remitted", "void"] 
  }).notNull().default("pending"),
  remittanceDate: timestamp("remittance_date"),
  remittanceJournalEntryId: varchar("remittance_journal_entry_id").references(() => journalEntries.id),
  remittedBy: varchar("remitted_by").references(() => users.id, { onDelete: "restrict" }),
  remittanceReferenceNumber: varchar("remittance_reference_number"), // Tax authority reference
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const whtTransactionsRelations = relations(whtTransactions, ({ one }) => ({
  expense: one(expenses, {
    fields: [whtTransactions.expenseId],
    references: [expenses.id],
  }),
  vendor: one(vendors, {
    fields: [whtTransactions.vendorId],
    references: [vendors.id],
  }),
  deductionJournalEntry: one(journalEntries, {
    fields: [whtTransactions.deductionJournalEntryId],
    references: [journalEntries.id],
    relationName: "deductionJournal",
  }),
  remittanceJournalEntry: one(journalEntries, {
    fields: [whtTransactions.remittanceJournalEntryId],
    references: [journalEntries.id],
    relationName: "remittanceJournal",
  }),
  deductor: one(users, {
    fields: [whtTransactions.deductedBy],
    references: [users.id],
    relationName: "deductor",
  }),
  remitter: one(users, {
    fields: [whtTransactions.remittedBy],
    references: [users.id],
    relationName: "remitter",
  }),
}));

export const insertWhtTransactionSchema = createInsertSchema(whtTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWhtTransaction = z.infer<typeof insertWhtTransactionSchema>;
export type WhtTransaction = typeof whtTransactions.$inferSelect;

// Invoice Sequences table - for generating sequential invoice numbers safely
export const invoiceSequences = pgTable("invoice_sequences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  seriesKey: varchar("series_key").notNull(), // e.g., "invoice"
  fiscalYear: integer("fiscal_year").notNull(),
  lastNumber: integer("last_number").notNull().default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  uniqSeriesYear: unique().on(table.seriesKey, table.fiscalYear),
}));

export const insertInvoiceSequenceSchema = createInsertSchema(invoiceSequences).omit({
  id: true,
  updatedAt: true,
});

export type InsertInvoiceSequence = z.infer<typeof insertInvoiceSequenceSchema>;
export type InvoiceSequence = typeof invoiceSequences.$inferSelect;

// Budgets table - for budget planning and tracking
export const budgets = pgTable("budgets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  description: text("description"),
  fiscalYear: integer("fiscal_year").notNull(), // e.g., 2025
  periodType: varchar("period_type", { enum: ["annual", "quarterly", "monthly"] }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: varchar("status", { enum: ["draft", "active", "closed"] }).notNull().default("draft"),
  totalBudgetAmount: decimal("total_budget_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalConsumedAmount: decimal("total_consumed_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  totalRemainingAmount: decimal("total_remaining_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  projectedCollections: decimal("projected_collections", { precision: 15, scale: 2 }), // Collections projection
  actualCollections: decimal("actual_collections", { precision: 15, scale: 2 }).default("0"),
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const budgetsRelations = relations(budgets, ({ one, many }) => ({
  creator: one(users, {
    fields: [budgets.createdBy],
    references: [users.id],
  }),
  budgetLines: many(budgetLines),
}));

export const insertBudgetSchema = createInsertSchema(budgets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalConsumedAmount: true,
  totalRemainingAmount: true,
  actualCollections: true,
});

export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgets.$inferSelect;

// Budget Lines table - individual account allocations within a budget
export const budgetLines = pgTable("budget_lines", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  budgetId: varchar("budget_id").notNull().references(() => budgets.id, { onDelete: "cascade" }),
  accountId: varchar("account_id").notNull().references(() => accounts.id, { onDelete: "restrict" }),
  allocatedAmount: decimal("allocated_amount", { precision: 15, scale: 2 }).notNull(),
  consumedAmount: decimal("consumed_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  remainingAmount: decimal("remaining_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const budgetLinesRelations = relations(budgetLines, ({ one }) => ({
  budget: one(budgets, {
    fields: [budgetLines.budgetId],
    references: [budgets.id],
  }),
  account: one(accounts, {
    fields: [budgetLines.accountId],
    references: [accounts.id],
  }),
}));

export const insertBudgetLineSchema = createInsertSchema(budgetLines).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  consumedAmount: true,
  remainingAmount: true,
});

export type InsertBudgetLine = z.infer<typeof insertBudgetLineSchema>;
export type BudgetLine = typeof budgetLines.$inferSelect;

// Bank Statements table - uploaded bank statements for AR reconciliation
export const bankStatements = pgTable("bank_statements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fileName: varchar("file_name").notNull(),
  fileData: text("file_data").notNull(), // Base64 encoded file
  bankName: varchar("bank_name").notNull(),
  accountNumber: varchar("account_number").notNull(),
  statementDate: timestamp("statement_date").notNull(),
  uploadedBy: varchar("uploaded_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  totalEntries: integer("total_entries").notNull().default(0),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  reconciledEntries: integer("reconciled_entries").notNull().default(0),
  reconciledAmount: decimal("reconciled_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  status: varchar("status", { enum: ["pending", "processing", "completed", "error"] }).notNull().default("pending"),
});

export const bankStatementsRelations = relations(bankStatements, ({ one, many }) => ({
  uploader: one(users, {
    fields: [bankStatements.uploadedBy],
    references: [users.id],
  }),
  entries: many(bankStatementEntries),
}));

export const insertBankStatementSchema = createInsertSchema(bankStatements).omit({
  id: true,
  uploadedAt: true,
  totalEntries: true,
  totalAmount: true,
  reconciledEntries: true,
  reconciledAmount: true,
});

export type InsertBankStatement = z.infer<typeof insertBankStatementSchema>;
export type BankStatement = typeof bankStatements.$inferSelect;

// Bank Statement Entries table - individual transactions from bank statements
export const bankStatementEntries = pgTable("bank_statement_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  statementId: varchar("statement_id").notNull().references(() => bankStatements.id, { onDelete: "cascade" }),
  transactionDate: timestamp("transaction_date").notNull(),
  description: text("description").notNull(),
  referenceNumber: varchar("reference_number"), // Invoice number or other reference
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  appliedAmount: decimal("applied_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  remainingAmount: decimal("remaining_amount", { precision: 15, scale: 2 }).notNull().default("0"),
  status: varchar("status", { enum: ["unmatched", "matched", "partially_matched", "reconciled"] }).notNull().default("unmatched"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const bankStatementEntriesRelations = relations(bankStatementEntries, ({ one, many }) => ({
  statement: one(bankStatements, {
    fields: [bankStatementEntries.statementId],
    references: [bankStatements.id],
  }),
  applications: many(paymentApplications),
}));

export const insertBankStatementEntrySchema = createInsertSchema(bankStatementEntries).omit({
  id: true,
  createdAt: true,
  appliedAmount: true,
  remainingAmount: true,
});

export type InsertBankStatementEntry = z.infer<typeof insertBankStatementEntrySchema>;
export type BankStatementEntry = typeof bankStatementEntries.$inferSelect;

// Payment Applications table - tracks how bank statement entries are applied to bills
export const paymentApplications = pgTable("payment_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  billId: varchar("bill_id").notNull().references(() => bills.id, { onDelete: "cascade" }),
  bankStatementEntryId: varchar("bank_statement_entry_id").references(() => bankStatementEntries.id, { onDelete: "set null" }),
  amountApplied: decimal("amount_applied", { precision: 15, scale: 2 }).notNull(),
  applicationType: varchar("application_type", { enum: ["bank_statement", "manual"] }).notNull(),
  bankName: varchar("bank_name"),
  accountNumber: varchar("account_number"),
  paymentDate: timestamp("payment_date").notNull(),
  appliedBy: varchar("applied_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  appliedAt: timestamp("applied_at").defaultNow(),
  journalEntryId: varchar("journal_entry_id"),
  notes: text("notes"),
});

export const paymentApplicationsRelations = relations(paymentApplications, ({ one }) => ({
  bill: one(bills, {
    fields: [paymentApplications.billId],
    references: [bills.id],
  }),
  bankStatementEntry: one(bankStatementEntries, {
    fields: [paymentApplications.bankStatementEntryId],
    references: [bankStatementEntries.id],
  }),
  applier: one(users, {
    fields: [paymentApplications.appliedBy],
    references: [users.id],
  }),
}));

export const insertPaymentApplicationSchema = createInsertSchema(paymentApplications).omit({
  id: true,
  appliedAt: true,
});

export type InsertPaymentApplication = z.infer<typeof insertPaymentApplicationSchema>;
export type PaymentApplication = typeof paymentApplications.$inferSelect;

// Subscriptions table - tracks estate subscription plan and status
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  estateName: varchar("estate_name").notNull(),
  plan: varchar("plan", { enum: ["starter", "professional", "enterprise"] }).notNull().default("starter"),
  status: varchar("status", { enum: ["active", "inactive", "trial", "cancelled"] }).notNull().default("trial"),
  billingCycle: varchar("billing_cycle", { enum: ["monthly", "annual"] }).notNull().default("monthly"),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  trialEndsAt: timestamp("trial_ends_at"),
  cancelledAt: timestamp("cancelled_at"),
  maxResidents: integer("max_residents").notNull().default(50),
  maxAdmins: integer("max_admins").notNull().default(1),
  maxSecurity: integer("max_security").notNull().default(1),
  maxAccountants: integer("max_accountants").notNull().default(0),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;

// User Invites table - tracks invite links for user onboarding
export const userInvites = pgTable("user_invites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  inviteToken: varchar("invite_token").notNull().unique(),
  email: varchar("email").notNull(),
  role: varchar("role", { enum: ["resident", "admin", "security", "accountant"] }).notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  unitNumber: varchar("unit_number"), // For residents only
  createdBy: varchar("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  status: varchar("status", { enum: ["pending", "accepted", "expired"] }).notNull().default("pending"),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  acceptedByUserId: varchar("accepted_by_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniquePendingInvite: unique().on(table.email, table.status),
}));

export const userInvitesRelations = relations(userInvites, ({ one }) => ({
  creator: one(users, {
    fields: [userInvites.createdBy],
    references: [users.id],
  }),
}));

export const insertUserInviteSchema = createInsertSchema(userInvites).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
});

export type InsertUserInvite = z.infer<typeof insertUserInviteSchema>;
export type UserInvite = typeof userInvites.$inferSelect;
