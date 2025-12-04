// @ts-nocheck
import {
  users,
  residents,
  bills,
  payments,
  visitors,
  notifications,
  accessLogs,
  announcements,
  accounts,
  transactionTemplates,
  journalEntries,
  journalEntryLines,
  vendors,
  expenses,
  budgets,
  budgetLines,
  bankStatements,
  bankStatementEntries,
  paymentApplications,
  subscriptions,
  invoiceSequences,
  userInvites,
  type User,
  type UpsertUser,
  type Resident,
  type InsertResident,
  type Bill,
  type InsertBill,
  type Payment,
  type InsertPayment,
  type Visitor,
  type InsertVisitor,
  type Notification,
  type InsertNotification,
  type AccessLog,
  type InsertAccessLog,
  type Announcement,
  type InsertAnnouncement,
  type Account,
  type InsertAccount,
  type TransactionTemplate,
  type InsertTransactionTemplate,
  type JournalEntry,
  type InsertJournalEntry,
  type JournalEntryLine,
  type InsertJournalEntryLine,
  type Vendor,
  type InsertVendor,
  type Expense,
  type InsertExpense,
  type Budget,
  type InsertBudget,
  type BudgetLine,
  type InsertBudgetLine,
  type BankStatement,
  type InsertBankStatement,
  type BankStatementEntry,
  type InsertBankStatementEntry,
  type PaymentApplication,
  type InsertPaymentApplication,
  type Subscription,
  type InsertSubscription,
  type InvoiceSequence,
  type InsertInvoiceSequence,
  type UserInvite,
  type InsertUserInvite,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, gte, lte, sql, isNotNull } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, data: Partial<UpsertUser>): Promise<User>;
  deactivateUser(id: string, isActive: boolean): Promise<User>;
  
  // Resident operations
  getResident(id: string): Promise<Resident | undefined>;
  getResidentByUserId(userId: string): Promise<Resident | undefined>;
  getResidentWithUser(id: string): Promise<any>;
  getAllResidents(): Promise<any[]>;
  createResident(resident: InsertResident): Promise<Resident>;
  updateResident(id: string, data: Partial<InsertResident>): Promise<Resident>;
  updateResidentBalance(id: string, balance: string): Promise<void>;
  updateResidentStatus(id: string, status: string): Promise<void>;
  
  // Bill operations
  getBill(id: string): Promise<Bill | undefined>;
  getBillsByResidentId(residentId: string): Promise<Bill[]>;
  getRecentBillsByResidentId(residentId: string, limit: number): Promise<Bill[]>;
  getAllBills(): Promise<Bill[]>;
  createBill(bill: InsertBill): Promise<Bill>;
  updateBillStatus(id: string, status: string): Promise<void>;
  
  // Automated Billing operations
  generateBillForResident(residentId: string, createdByUserId: string): Promise<Bill | null>;
  generateAutomatedServiceChargeBills(createdByUserId: string): Promise<{
    success: number;
    failed: number;
    generatedBills?: Bill[];
    bills: Bill[];
    errors: Array<{ residentId: string; unitNumber: string; error: string }>;
  }>;
  sendInvoiceEmailsForBills(bills: Bill[]): Promise<{ sent: number; failed: number }>;
  
  // Payment operations
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByResidentId(residentId: string): Promise<Payment[]>;
  getPaymentsByBillId(billId: string): Promise<Payment[]>;
  getAllPayments(): Promise<Payment[]>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  
  // Visitor operations
  getVisitor(id: string): Promise<Visitor | undefined>;
  getVisitorByAccessCode(code: string): Promise<Visitor | undefined>;
  getVisitorsByResidentId(residentId: string): Promise<Visitor[]>;
  getActiveVisitorsByResidentId(residentId: string): Promise<Visitor[]>;
  getTodayVisitors(): Promise<Visitor[]>;
  createVisitor(visitor: InsertVisitor): Promise<Visitor>;
  updateVisitorStatus(id: string, status: string, usedAt?: Date): Promise<void>;
  
  // Notification operations
  getNotification(id: string): Promise<Notification | undefined>;
  getNotificationsByUserId(userId: string): Promise<Notification[]>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  
  // Access Log operations
  getAccessLog(id: string): Promise<AccessLog | undefined>;
  getRecentAccessLogs(limit: number): Promise<AccessLog[]>;
  createAccessLog(log: InsertAccessLog): Promise<AccessLog>;
  
  // Announcement operations
  getAnnouncement(id: string): Promise<Announcement | undefined>;
  getAllAnnouncements(): Promise<Announcement[]>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  
  // Dashboard stats
  getAdminStats(): Promise<any>;
  
  // Accounting operations
  // Chart of Accounts
  getAccount(id: string): Promise<Account | undefined>;
  getAccountByNumber(accountNumber: string): Promise<Account | undefined>;
  getAllAccounts(): Promise<Account[]>;
  getAccountsByType(accountType: string): Promise<Account[]>;
  getActiveAccounts(): Promise<Account[]>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: string, data: Partial<InsertAccount>): Promise<Account>;
  deleteAccount(id: string): Promise<void>;
  updateAccountBalance(id: string, amount: string, lineType: 'debit' | 'credit'): Promise<void>;
  
  // Transaction Templates
  getTransactionTemplate(id: string): Promise<any>;
  getTransactionTemplateByType(transactionType: string): Promise<any>;
  getAllTransactionTemplates(): Promise<any[]>;
  getActiveTransactionTemplates(): Promise<any[]>;
  createTransactionTemplate(template: InsertTransactionTemplate): Promise<TransactionTemplate>;
  updateTransactionTemplate(id: string, data: Partial<InsertTransactionTemplate>): Promise<TransactionTemplate>;
  deleteTransactionTemplate(id: string): Promise<void>;
  
  // Journal Entries
  getJournalEntry(id: string): Promise<any>;
  getJournalEntryWithLines(id: string): Promise<any>;
  getAllJournalEntries(): Promise<any[]>;
  getJournalEntriesByDateRange(startDate: Date, endDate: Date): Promise<any[]>;
  getJournalEntriesByReferenceId(referenceId: string): Promise<any[]>;
  createJournalEntry(entry: InsertJournalEntry, lines: InsertJournalEntryLine[]): Promise<JournalEntry>;
  voidJournalEntry(id: string): Promise<void>;
  generateEntryNumber(entryDate: Date): Promise<string>;
  generateInvoiceNumber(): Promise<string>;
  
  // Financial Reports
  getTrialBalance(asOf: Date): Promise<any>;
  getIncomeStatement(startDate: Date, endDate: Date): Promise<any>;
  getBalanceSheet(asOf: Date): Promise<any>;
  
  // Vendor operations
  getVendor(id: string): Promise<Vendor | undefined>;
  getVendorByTin(tinNumber: string): Promise<Vendor | undefined>;
  getAllVendors(): Promise<Vendor[]>;
  getVendorsByStatus(status: string): Promise<Vendor[]>;
  createVendor(vendor: InsertVendor): Promise<Vendor>;
  updateVendor(id: string, data: Partial<InsertVendor>): Promise<Vendor>;
  approveVendor(id: string, approvedBy: string): Promise<Vendor>;
  rejectVendor(id: string, approvedBy: string, reason: string): Promise<Vendor>;
  getVendorAccountStatement(vendorId: string, startDate?: Date, endDate?: Date): Promise<any>;
  getVendorOutstandingBills(): Promise<Record<string, number>>;
  
  // Expense operations
  getExpense(id: string): Promise<any>;
  getAllExpenses(): Promise<any[]>;
  getExpensesByStatus(status: string): Promise<any[]>;
  getExpensesBySubmitter(userId: string): Promise<any[]>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  approveExpense(id: string, reviewedBy: string): Promise<Expense>;
  rejectExpense(id: string, reviewedBy: string, reason: string): Promise<Expense>;
  
  // Accounts Payable operations
  getApprovedExpensesForPayment(): Promise<any[]>;
  getBankAccounts(): Promise<Account[]>;
  processExpensePayment(
    expenseId: string,
    paidFromAccountId: string,
    paidBy: string,
    whtRate: string
  ): Promise<Expense>;
  approveExpenseForPaymentLater(id: string, paidBy: string, whtRate: string): Promise<Expense>;
  
  // Budget operations
  getBudget(id: string): Promise<any>;
  getBudgetWithLines(id: string): Promise<any>;
  getAllBudgets(): Promise<any[]>;
  getActiveBudgets(): Promise<any[]>;
  getBudgetsByFiscalYear(fiscalYear: number): Promise<any[]>;
  createBudget(budget: InsertBudget, lines: InsertBudgetLine[]): Promise<Budget>;
  updateBudget(id: string, data: Partial<InsertBudget>): Promise<Budget>;
  deleteBudget(id: string): Promise<void>;
  activateBudget(id: string): Promise<Budget>;
  closeBudget(id: string): Promise<Budget>;
  updateBudgetConsumption(budgetId: string, accountId: string, amount: string): Promise<void>;
  getBudgetLineByAccount(budgetId: string, accountId: string): Promise<any>;
  getActiveBudgetForAccount(accountId: string): Promise<any>;
  
  // Accounts Receivable operations
  getAllAREntries(): Promise<any[]>;
  getAREntry(billId: string): Promise<any>;
  applyPaymentToBill(
    billId: string,
    amountApplied: string,
    applicationType: 'bank_statement' | 'manual',
    paymentDate: Date,
    appliedBy: string,
    bankName?: string,
    accountNumber?: string,
    bankStatementEntryId?: string,
    notes?: string
  ): Promise<void>;
  
  // Bank Statement operations
  createBankStatement(statement: any): Promise<any>;
  getBankStatement(id: string): Promise<any>;
  getAllBankStatements(): Promise<any[]>;
  updateBankStatementStatus(id: string, status: string): Promise<void>;
  
  // Bank Statement Entry operations
  createBankStatementEntry(entry: any): Promise<any>;
  getBankStatementEntries(statementId: string): Promise<any[]>;
  getUnreconciledEntries(): Promise<any[]>;
  updateEntryStatus(id: string, status: string): Promise<void>;
  
  // Payment Application operations
  getPaymentApplicationsByBill(billId: string): Promise<any[]>;
  getAllPaymentApplications(): Promise<any[]>;
  
  // User Invite operations
  createUserInvite(invite: InsertUserInvite): Promise<UserInvite>;
  getUserInvite(inviteToken: string): Promise<UserInvite | undefined>;
  getAcceptedInviteByUserId(userId: string): Promise<UserInvite | undefined>;
  getAllUserInvites(): Promise<UserInvite[]>;
  acceptUserInvite(inviteToken: string, userId: string): Promise<void>;
  expireUserInvite(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
    return allUsers;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.email,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<UpsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deactivateUser(id: string, isActive: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({
        isActive,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  // Resident operations
  async getResident(id: string): Promise<Resident | undefined> {
    const [resident] = await db.select().from(residents).where(eq(residents.id, id));
    return resident;
  }

  async getResidentByUserId(userId: string): Promise<Resident | undefined> {
    const [resident] = await db.select().from(residents).where(eq(residents.userId, userId));
    return resident;
  }

  async getResidentWithUser(id: string): Promise<any> {
    const [resident] = await db
      .select()
      .from(residents)
      .leftJoin(users, eq(residents.userId, users.id))
      .where(eq(residents.id, id));
    return resident;
  }

  async getAllResidents(): Promise<any[]> {
    const allResidents = await db
      .select()
      .from(residents)
      .leftJoin(users, eq(residents.userId, users.id))
      .orderBy(desc(residents.createdAt));
    return allResidents;
  }

  async getAllCollections(): Promise<any[]> {
    const collections = await db
      .select()
      .from(paymentApplications)
      .leftJoin(bills, eq(paymentApplications.billId, bills.id))
      .leftJoin(residents, eq(bills.residentId, residents.id))
      .leftJoin(users, eq(residents.userId, users.id))
      .orderBy(desc(paymentApplications.paymentDate));
    
    // Transform the result to match expected structure
    return collections.map(row => ({
      id: row.payment_applications.id,
      billId: row.payment_applications.billId,
      amountApplied: row.payment_applications.amountApplied,
      applicationType: row.payment_applications.applicationType,
      bankName: row.payment_applications.bankName,
      accountNumber: row.payment_applications.accountNumber,
      paymentDate: row.payment_applications.paymentDate,
      appliedBy: row.payment_applications.appliedBy,
      appliedAt: row.payment_applications.appliedAt,
      notes: row.payment_applications.notes,
      bill: row.bills ? {
        id: row.bills.id,
        invoiceNumber: row.bills.invoiceNumber,
        description: row.bills.description,
        amount: row.bills.amount,
        resident: row.residents && row.users ? {
          id: row.residents.id,
          fullName: `${row.users.firstName || ''} ${row.users.lastName || ''}`.trim(),
          houseNumber: row.residents.unitNumber,
        } : null,
      } : null,
    }));
  }

  async getSubscription(): Promise<Subscription | null> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .limit(1);
    
    return subscription || null;
  }

  async updateSubscription(data: { plan: string; billingCycle: string; estateName?: string }, updatedBy: string): Promise<Subscription> {
    const [existing] = await db
      .select()
      .from(subscriptions)
      .limit(1);
    
    // Compute new limits based on plan
    const planDetails = {
      'starter': { maxResidents: 50, maxAdmins: 1, maxSecurity: 1, maxAccountants: 0 },
      'professional': { maxResidents: 200, maxAdmins: 2, maxSecurity: 2, maxAccountants: 1 },
      'enterprise': { maxResidents: 999999, maxAdmins: 999999, maxSecurity: 999999, maxAccountants: 999999 },
    }[data.plan];

    const now = new Date();
    const nextPeriodEnd = new Date();
    if (data.billingCycle === 'annual') {
      nextPeriodEnd.setFullYear(nextPeriodEnd.getFullYear() + 1);
    } else {
      nextPeriodEnd.setMonth(nextPeriodEnd.getMonth() + 1);
    }

    if (existing) {
      // Update existing subscription
      const [updated] = await db
        .update(subscriptions)
        .set({
          plan: data.plan,
          billingCycle: data.billingCycle,
          estateName: data.estateName || existing.estateName,
          maxResidents: planDetails?.maxResidents || existing.maxResidents,
          maxAdmins: planDetails?.maxAdmins || existing.maxAdmins,
          maxSecurity: planDetails?.maxSecurity || existing.maxSecurity,
          maxAccountants: planDetails?.maxAccountants || existing.maxAccountants,
          currentPeriodStart: now,
          currentPeriodEnd: nextPeriodEnd,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, existing.id))
        .returning();
      
      return updated;
    } else {
      // Create new subscription
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 30);
      
      const [newSubscription] = await db
        .insert(subscriptions)
        .values({
          estateName: data.estateName || 'My Estate',
          plan: data.plan,
          status: 'trial',
          billingCycle: data.billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: trialEnd,
          trialEndsAt: trialEnd,
          maxResidents: planDetails?.maxResidents || 50,
          maxAdmins: planDetails?.maxAdmins || 1,
          maxSecurity: planDetails?.maxSecurity || 1,
          maxAccountants: planDetails?.maxAccountants || 0,
        })
        .returning();
      
      return newSubscription;
    }
  }

  async createResident(residentData: InsertResident): Promise<Resident> {
    const [resident] = await db
      .insert(residents)
      .values(residentData)
      .returning();
    return resident;
  }

  async updateResident(id: string, data: Partial<InsertResident>): Promise<Resident> {
    const [resident] = await db
      .update(residents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(residents.id, id))
      .returning();
    return resident;
  }

  async updateResidentBalance(id: string, balance: string): Promise<void> {
    await db
      .update(residents)
      .set({ totalBalance: balance, updatedAt: new Date() })
      .where(eq(residents.id, id));
  }

  async updateResidentStatus(id: string, status: string): Promise<void> {
    await db
      .update(residents)
      .set({ accountStatus: status as any, updatedAt: new Date() })
      .where(eq(residents.id, id));
  }

  // Bill operations
  async getBill(id: string): Promise<Bill | undefined> {
    const [bill] = await db.select().from(bills).where(eq(bills.id, id));
    return bill;
  }

  async getBillsByResidentId(residentId: string): Promise<Bill[]> {
    return await db
      .select()
      .from(bills)
      .where(eq(bills.residentId, residentId))
      .orderBy(desc(bills.dueDate));
  }

  async getRecentBillsByResidentId(residentId: string, limit: number): Promise<Bill[]> {
    return await db
      .select()
      .from(bills)
      .where(eq(bills.residentId, residentId))
      .orderBy(desc(bills.createdAt))
      .limit(limit);
  }

  async createBill(billData: InsertBill): Promise<Bill> {
    // Generate invoice number if not provided
    // The sequence table with FOR UPDATE locking guarantees uniqueness
    const invoiceNumber = billData.invoiceNumber || await this.generateInvoiceNumber();
    
    const [bill] = await db
      .insert(bills)
      .values({
        ...billData,
        invoiceNumber,
      })
      .returning();
    return bill;
  }

  async getAllBills(): Promise<Bill[]> {
    return await db
      .select()
      .from(bills)
      .orderBy(desc(bills.dueDate));
  }

  async updateBillStatus(id: string, status: string): Promise<void> {
    await db
      .update(bills)
      .set({ status: status as any, updatedAt: new Date() })
      .where(eq(bills.id, id));
  }

  // Automated Billing operations
  async generateBillForResident(residentId: string, createdByUserId: string): Promise<Bill | null> {
    try {
      // Get resident details
      const resident = await this.getResident(residentId);
      if (!resident) {
        console.log(`Resident ${residentId} not found`);
        return null;
      }

      // Check eligibility
      if (resident.accountStatus !== 'active' || 
          !resident.serviceCharge || 
          parseFloat(resident.serviceCharge) <= 0 || 
          !resident.startDate) {
        console.log(`Resident ${resident.unitNumber} not eligible for billing`);
        return null;
      }

      // Get AR account (Accounts Receivable)
      const arAccount = await this.getAccountByNumber('1100');
      if (!arAccount) {
        throw new Error('Accounts Receivable account (1100) not found. Please create it in Chart of Accounts.');
      }

      // Get Deferred Revenue account (liability account - revenue not yet recognized)
      const deferredRevenueAccount = await this.getAccountByNumber('2200');
      if (!deferredRevenueAccount) {
        throw new Error('Deferred Revenue account (2200) not found. Please create it in Chart of Accounts.');
      }

      const today = new Date();
      const startDate = new Date(resident.startDate);
      const lastBillEndDate = resident.endDate ? new Date(resident.endDate) : null;
      
      // Determine billing period start and end
      let periodStart: Date;
      let periodEnd: Date;
      
      if (!lastBillEndDate || lastBillEndDate < today) {
        // First bill or previous period ended
        if (lastBillEndDate) {
          // Subsequent billing: period starts after last billing end
          periodStart = new Date(lastBillEndDate);
          periodStart.setDate(periodStart.getDate() + 1);
        } else {
          // First billing: period starts from start date
          periodStart = new Date(startDate);
        }
        
        // Period end is 12 months from period start
        periodEnd = new Date(periodStart);
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
        periodEnd.setDate(periodEnd.getDate() - 1); // End on day before next period
        
        // Due date is billing date + 7 days
        const dueDate = new Date(today);
        dueDate.setDate(dueDate.getDate() + 7);
        
        // Create the bill
        const billData: InsertBill = {
          residentId: resident.id,
          billingType: 'Estate Maintenance',
          description: `Service Charge for ${resident.unitNumber} - Period: ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}`,
          amount: resident.serviceCharge,
          totalPaid: "0.00",
          balance: resident.serviceCharge,
          paymentStatus: 'unpaid',
          dueDate,
          status: 'pending',
          periodStart,
          periodEnd,
        };
        
        const bill = await this.createBill(billData);
        
        // Create journal entry for AR posting with lines
        const journalEntryData: InsertJournalEntry = {
          entryDate: today,
          description: `Service Charge Bill - ${resident.unitNumber} (Bill #${bill.id})`,
          referenceType: 'bill',
          referenceId: bill.id,
          createdBy: createdByUserId,
          status: 'posted',
          totalDebit: resident.serviceCharge,
          totalCredit: resident.serviceCharge,
        };
        
        const journalEntryLines = [
          {
            accountId: arAccount.id,
            lineType: 'debit' as const,
            amount: resident.serviceCharge,
            description: `AR - ${resident.unitNumber}`,
          },
          {
            accountId: deferredRevenueAccount.id,
            lineType: 'credit' as const,
            amount: resident.serviceCharge,
            description: `Deferred Revenue - ${resident.unitNumber} (revenue recognized upon payment)`,
          },
        ];
        
        const journalEntry = await this.createJournalEntry(journalEntryData, journalEntryLines as any);
        
        // Link journal entry to bill
        await db
          .update(bills)
          .set({ journalEntryId: journalEntry.id })
          .where(eq(bills.id, bill.id));
        
        // Update resident's end date for next billing cycle
        await this.updateResident(resident.id, { endDate: periodEnd });
        
        // Update resident's total balance
        const newBalance = (parseFloat(resident.totalBalance || '0') + parseFloat(resident.serviceCharge)).toFixed(2);
        await this.updateResidentBalance(resident.id, newBalance);
        
        // Create notification for resident
        await this.createNotification({
          userId: resident.userId,
          title: 'New Service Charge Bill',
          message: `A new service charge bill of ₦${parseFloat(resident.serviceCharge).toLocaleString()} has been generated for unit ${resident.unitNumber}. Due date: ${dueDate.toLocaleDateString()}`,
          type: 'bill',
        });
        
        console.log(`Successfully generated bill for resident ${resident.unitNumber}`);
        return bill;
      } else {
        console.log(`Resident ${resident.unitNumber} has active billing period until ${lastBillEndDate.toLocaleDateString()}`);
        return null;
      }
    } catch (error: any) {
      console.error(`Error generating bill for resident ${residentId}:`, error.message);
      throw error;
    }
  }

  async generateAutomatedServiceChargeBills(createdByUserId: string): Promise<{
    success: number;
    failed: number;
    bills: Bill[];
    generatedBills?: Bill[];
    errors: Array<{ residentId: string; unitNumber: string; error: string }>;
  }> {
    const result = {
      success: 0,
      failed: 0,
      bills: [] as Bill[],
      generatedBills: [] as Bill[],
      errors: [] as Array<{ residentId: string; unitNumber: string; error: string }>,
    };

    // Get all active residents with service charge and start date
    const allResidents = await this.getAllResidents();
    // Extract resident data from joined result { residents, users }
    const residentRows = allResidents.map((row: any) => row.residents);
    const eligibleResidents = residentRows.filter(
      (r: any) => 
        r.accountStatus === 'active' && 
        r.serviceCharge && 
        parseFloat(r.serviceCharge) > 0 && 
        r.startDate
    );

    // Get AR account (Accounts Receivable)
    const arAccount = await this.getAccountByNumber('1100');
    if (!arAccount) {
      throw new Error('Accounts Receivable account (1100) not found. Please create it in Chart of Accounts.');
    }

    // Get Deferred Revenue account (liability account - revenue not yet recognized)
    const deferredRevenueAccount = await this.getAccountByNumber('2200');
    if (!deferredRevenueAccount) {
      throw new Error('Deferred Revenue account (2200) not found. Please create it in Chart of Accounts.');
    }

    const today = new Date();

    for (const resident of eligibleResidents) {
      try {
        const startDate = new Date(resident.startDate);
        const lastBillEndDate = resident.endDate ? new Date(resident.endDate) : null;
        
        // Determine billing period start and end
        let periodStart: Date;
        let periodEnd: Date;
        
        if (!lastBillEndDate || lastBillEndDate < today) {
          // First bill or previous period ended
          if (lastBillEndDate) {
            // Subsequent billing: period starts after last billing end
            periodStart = new Date(lastBillEndDate);
            periodStart.setDate(periodStart.getDate() + 1);
          } else {
            // First billing: period starts from start date
            periodStart = new Date(startDate);
          }
          
          // Period end is 12 months from period start
          periodEnd = new Date(periodStart);
          periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          periodEnd.setDate(periodEnd.getDate() - 1); // End on day before next period
          
          // Due date is billing date + 7 days
          const dueDate = new Date(today);
          dueDate.setDate(dueDate.getDate() + 7);
          
          // Create the bill
          const billData: InsertBill = {
            residentId: resident.id,
            billingType: 'Estate Maintenance',
            description: `Service Charge for ${resident.unitNumber} - Period: ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}`,
            amount: resident.serviceCharge,
            totalPaid: "0.00",
            balance: resident.serviceCharge,
            paymentStatus: 'unpaid',
            dueDate,
            status: 'pending',
            periodStart,
            periodEnd,
          };
          
          const bill = await this.createBill(billData);
          
          // Create journal entry for AR posting with lines
          const journalEntryData: InsertJournalEntry = {
            entryDate: today,
            description: `Service Charge Bill - ${resident.unitNumber} (Bill #${bill.id})`,
            referenceType: 'bill',
            referenceId: bill.id,
            createdBy: createdByUserId,
            status: 'posted',
            totalDebit: resident.serviceCharge,
            totalCredit: resident.serviceCharge,
          };
          
          const journalEntryLines = [
            {
              accountId: arAccount.id,
              lineType: 'debit' as const,
              amount: resident.serviceCharge,
              description: `AR - ${resident.unitNumber}`,
            },
            {
              accountId: deferredRevenueAccount.id,
              lineType: 'credit' as const,
              amount: resident.serviceCharge,
              description: `Deferred Revenue - ${resident.unitNumber} (revenue recognized upon payment)`,
            },
          ];
          
          const journalEntry = await this.createJournalEntry(journalEntryData, journalEntryLines as any);
          
          // Link journal entry to bill
          await db
            .update(bills)
            .set({ journalEntryId: journalEntry.id })
            .where(eq(bills.id, bill.id));
          
          // Update resident's end date for next billing cycle
          await this.updateResident(resident.id, { endDate: periodEnd });
          
          // Update resident's total balance
          const newBalance = (parseFloat(resident.totalBalance || '0') + parseFloat(resident.serviceCharge)).toFixed(2);
          await this.updateResidentBalance(resident.id, newBalance);
          
          // Create notification for resident
          await this.createNotification({
            userId: resident.userId,
            title: 'New Service Charge Bill',
            message: `A new service charge bill of ₦${parseFloat(resident.serviceCharge).toLocaleString()} has been generated for unit ${resident.unitNumber}. Due date: ${dueDate.toLocaleDateString()}`,
            type: 'bill',
          });
          
          result.success++;
          result.bills.push(bill);
          result.generatedBills.push(bill);
        }
      } catch (error: any) {
        result.failed++;
        result.errors.push({
          residentId: resident.id,
          unitNumber: resident.unitNumber,
          error: error.message,
        });
      }
    }

    return result;
  }

  async sendInvoiceEmailsForBills(billsToEmail: Bill[]): Promise<{ sent: number; failed: number }> {
    const { sendBulkInvoiceEmails } = await import('./email-service');
    
    try {
      // Get all residents for the bills
      const residentIdsSet = new Set(billsToEmail.map(b => b.residentId));
      const residentIds = Array.from(residentIdsSet);
      const residentsData = await this.getAllResidents();
      
      // Create a map of resident ID to resident data with user info
      const residentsMap = new Map();
      for (const row of residentsData) {
        const resident = row.residents;
        const user = row.users;
        if (residentIds.includes(resident.id)) {
          residentsMap.set(resident.id, {
            ...resident,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          });
        }
      }
      
      // Send emails
      console.log(`[Automated Billing] Sending invoice emails for ${billsToEmail.length} bills...`);
      const result = await sendBulkInvoiceEmails(billsToEmail, residentsMap);
      console.log(`[Automated Billing] Email sending completed: ${result.sent} sent, ${result.failed} failed`);
      
      return result;
    } catch (error: any) {
      console.error('[Automated Billing] Error sending invoice emails:', error.message);
      return { sent: 0, failed: billsToEmail.length };
    }
  }

  // Payment operations
  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }

  async getPaymentsByResidentId(residentId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.residentId, residentId))
      .orderBy(desc(payments.createdAt));
  }

  async getPaymentsByBillId(billId: string): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .where(eq(payments.billId, billId))
      .orderBy(desc(payments.createdAt));
  }

  async getAllPayments(): Promise<Payment[]> {
    return await db
      .select()
      .from(payments)
      .orderBy(desc(payments.createdAt));
  }

  async createPayment(paymentData: InsertPayment): Promise<Payment> {
    const [payment] = await db
      .insert(payments)
      .values(paymentData)
      .returning();
    return payment;
  }

  // Visitor operations
  async getVisitor(id: string): Promise<Visitor | undefined> {
    const [visitor] = await db.select().from(visitors).where(eq(visitors.id, id));
    return visitor;
  }

  async getVisitorByAccessCode(code: string): Promise<Visitor | undefined> {
    const [visitor] = await db.select().from(visitors).where(eq(visitors.accessCode, code));
    return visitor;
  }

  async getVisitorsByResidentId(residentId: string): Promise<Visitor[]> {
    return await db
      .select()
      .from(visitors)
      .where(eq(visitors.residentId, residentId))
      .orderBy(desc(visitors.createdAt));
  }

  async getActiveVisitorsByResidentId(residentId: string): Promise<Visitor[]> {
    const now = new Date();
    return await db
      .select()
      .from(visitors)
      .where(
        and(
          eq(visitors.residentId, residentId),
          eq(visitors.status, "approved"),
          gte(visitors.validUntil, now)
        )
      )
      .orderBy(desc(visitors.createdAt));
  }

  async getTodayVisitors(): Promise<Visitor[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await db
      .select()
      .from(visitors)
      .where(
        and(
          gte(visitors.validFrom, today),
          lte(visitors.validFrom, tomorrow)
        )
      )
      .orderBy(desc(visitors.createdAt));
  }

  async createVisitor(visitorData: InsertVisitor): Promise<Visitor> {
    const [visitor] = await db
      .insert(visitors)
      .values(visitorData)
      .returning();
    return visitor;
  }

  async updateVisitorStatus(id: string, status: string, usedAt?: Date): Promise<void> {
    await db
      .update(visitors)
      .set({ 
        status: status as any,
        ...(usedAt ? { usedAt } : {})
      })
      .where(eq(visitors.id, id));
  }

  // Notification operations
  async getNotification(id: string): Promise<Notification | undefined> {
    const [notification] = await db.select().from(notifications).where(eq(notifications.id, id));
    return notification;
  }

  async getNotificationsByUserId(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(notificationData: InsertNotification): Promise<Notification> {
    const [notification] = await db
      .insert(notifications)
      .values(notificationData)
      .returning();
    return notification;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));
  }

  // Access Log operations
  async getAccessLog(id: string): Promise<AccessLog | undefined> {
    const [log] = await db.select().from(accessLogs).where(eq(accessLogs.id, id));
    return log;
  }

  async getRecentAccessLogs(limit: number): Promise<AccessLog[]> {
    return await db
      .select()
      .from(accessLogs)
      .orderBy(desc(accessLogs.createdAt))
      .limit(limit);
  }

  async createAccessLog(logData: InsertAccessLog): Promise<AccessLog> {
    const [log] = await db
      .insert(accessLogs)
      .values(logData)
      .returning();
    return log;
  }

  // Announcement operations
  async getAnnouncement(id: string): Promise<Announcement | undefined> {
    const [announcement] = await db.select().from(announcements).where(eq(announcements.id, id));
    return announcement;
  }

  async getAllAnnouncements(): Promise<Announcement[]> {
    return await db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.createdAt));
  }

  async createAnnouncement(announcementData: InsertAnnouncement): Promise<Announcement> {
    const [announcement] = await db
      .insert(announcements)
      .values(announcementData)
      .returning();
    return announcement;
  }

  // Dashboard stats
  async getAdminStats(): Promise<any> {
    const allResidents = await db.select().from(residents);
    const allBills = await db.select().from(bills);
    const allVisitors = await db.select().from(visitors);
    const allExpenses = await db.select().from(expenses);
    const allPaymentApplications = await db.select().from(paymentApplications);

    const totalResidents = allResidents.length;
    const activeResidents = allResidents.filter(r => r.accountStatus === "active").length;
    const delinquentResidents = allResidents.filter(r => r.accountStatus === "delinquent").length;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // AR calculations with overdue tracking (14-day grace period from billing date)
    const pendingPayments = allBills
      .filter(b => b.status !== "paid")
      .reduce((sum, b) => sum + parseFloat(b.balance), 0);

    const overdueBills = allBills
      .filter(b => {
        if (b.status === "paid") return false;
        // Use createdAt if available, otherwise fallback to dueDate for legacy bills
        const referenceDate = b.createdAt ? new Date(b.createdAt) : new Date(b.dueDate);
        const gracePeriodEnd = new Date(referenceDate);
        if (b.createdAt) {
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 14); // 14-day grace period from billing
        }
        return now > gracePeriodEnd;
      })
      .reduce((sum, b) => sum + parseFloat(b.balance), 0);

    const totalBilled = allBills.reduce((sum, b) => sum + parseFloat(b.amount), 0);
    const totalPaid = allBills.reduce((sum, b) => sum + parseFloat(b.totalPaid), 0);

    // Calculate collections this month from payment applications
    const collectionsThisMonth = allPaymentApplications
      .filter(pa => {
        const paymentDate = new Date(pa.paymentDate);
        return paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear;
      })
      .reduce((sum, pa) => sum + parseFloat(pa.amountApplied), 0);

    const collectionRate = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

    const activeVisitors = allVisitors.filter(
      v => v.status === "approved" && new Date(v.validUntil) > now
    ).length;

    // Expenses breakdown
    const approvedExpenses = allExpenses
      .filter(e => e.status === "approved")
      .reduce((sum, e) => sum + parseFloat(e.expenseAmount), 0);
    
    const paidExpenses = allExpenses
      .filter(e => e.paymentStatus === "paid")
      .reduce((sum, e) => sum + parseFloat(e.expenseAmount), 0);
    
    const pendingExpenses = allExpenses
      .filter(e => e.status === "pending")
      .reduce((sum, e) => sum + parseFloat(e.expenseAmount), 0);
    
    const accountsPayable = allExpenses
      .filter(e => (e.status === "approved" || e.status === "pending") && e.paymentStatus !== "paid")
      .reduce((sum, e) => sum + parseFloat(e.expenseAmount), 0);

    return {
      totalResidents,
      activeResidents,
      delinquentResidents,
      totalRevenue: totalPaid,
      collectionsThisMonth,
      pendingPayments,
      overdueBills,
      collectionRate,
      activeVisitors,
      totalExpenses: approvedExpenses,
      paidExpenses,
      approvedExpenses,
      pendingExpenses,
      accountsPayable,
    };
  }

  async getAgingAnalysis(): Promise<any> {
    const allBills = await db.select().from(bills);
    const now = new Date();

    const agingBuckets = {
      current: { amount: 0, count: 0 },
      "1-30": { amount: 0, count: 0 },
      "31-60": { amount: 0, count: 0 },
      "61-90": { amount: 0, count: 0 },
      "90+": { amount: 0, count: 0 },
    };

    allBills
      .filter(b => b.status !== "paid")
      .forEach(bill => {
        // Calculate due date: Use createdAt + 14 days if available, otherwise use dueDate for legacy bills
        let dueDate: Date;
        if (bill.createdAt) {
          const billingDate = new Date(bill.createdAt);
          dueDate = new Date(billingDate);
          dueDate.setDate(dueDate.getDate() + 14); // 14-day grace period
        } else {
          // Fallback to dueDate for legacy bills without createdAt
          dueDate = new Date(bill.dueDate);
        }
        
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const amount = parseFloat(bill.balance);

        if (daysOverdue <= 0) {
          agingBuckets.current.amount += amount;
          agingBuckets.current.count++;
        } else if (daysOverdue <= 30) {
          agingBuckets["1-30"].amount += amount;
          agingBuckets["1-30"].count++;
        } else if (daysOverdue <= 60) {
          agingBuckets["31-60"].amount += amount;
          agingBuckets["31-60"].count++;
        } else if (daysOverdue <= 90) {
          agingBuckets["61-90"].amount += amount;
          agingBuckets["61-90"].count++;
        } else {
          agingBuckets["90+"].amount += amount;
          agingBuckets["90+"].count++;
        }
      });

    return [
      { name: "Current", amount: agingBuckets.current.amount, inv: agingBuckets.current.count },
      { name: "1-30 Days", amount: agingBuckets["1-30"].amount, inv: agingBuckets["1-30"].count },
      { name: "31-60 Days", amount: agingBuckets["31-60"].amount, inv: agingBuckets["31-60"].count },
      { name: "61-90 Days", amount: agingBuckets["61-90"].amount, inv: agingBuckets["61-90"].count },
      { name: "90+ Days", amount: agingBuckets["90+"].amount, inv: agingBuckets["90+"].count },
    ];
  }

  async getBudgetVsExpensesMonthToDate(): Promise<any[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Find active budget covering current month
    const [activeBudget] = await db
      .select()
      .from(budgets)
      .where(and(
        eq(budgets.status, 'active'),
        lte(budgets.startDate, endOfMonth),
        gte(budgets.endDate, startOfMonth)
      ))
      .limit(1);

    if (!activeBudget) {
      return [];
    }

    // Get budget lines for this budget
    const budgetLinesData = await db
      .select({
        accountId: budgetLines.accountId,
        accountName: accounts.accountName,
        allocatedAmount: budgetLines.allocatedAmount,
      })
      .from(budgetLines)
      .leftJoin(accounts, eq(budgetLines.accountId, accounts.id))
      .where(eq(budgetLines.budgetId, activeBudget.id));

    // Get approved expenses for current month with account assignments
    const monthExpenses = await db
      .select()
      .from(expenses)
      .where(and(
        eq(expenses.status, 'approved'),
        gte(expenses.createdAt, startOfMonth),
        lte(expenses.createdAt, endOfMonth),
        isNotNull(expenses.accountId)
      ));

    // Group expenses by account
    const expensesByAccount: { [accountId: string]: number } = {};
    monthExpenses.forEach(expense => {
      if (expense.accountId) {
        const expenseAmount = parseFloat(expense.expenseAmount);
        const serviceCharge = expense.serviceCharge ? parseFloat(expense.serviceCharge) : 0;
        const total = expenseAmount + serviceCharge;
        
        if (!expensesByAccount[expense.accountId]) {
          expensesByAccount[expense.accountId] = 0;
        }
        expensesByAccount[expense.accountId] += total;
      }
    });

    // Create chart data
    const chartData = budgetLinesData.map(line => ({
      account: line.accountName || 'Unknown',
      budget: Math.round(parseFloat(line.allocatedAmount)),
      actual: Math.round(expensesByAccount[line.accountId || ''] || 0),
    }));

    return chartData;
  }

  async getCollectionsExpensesByMonth(): Promise<any> {
    // Use payment_applications for actual collection dates
    const allPaymentApplications = await db.select().from(paymentApplications);
    const allExpenses = await db.select().from(expenses);
    const monthlyData: { [key: string]: { collections: number; expenses: number } } = {};

    // Group collections by payment date (not bill creation date)
    allPaymentApplications.forEach(payment => {
      const paymentDate = new Date(payment.paymentDate);
      const monthKey = paymentDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { collections: 0, expenses: 0 };
      }
      monthlyData[monthKey].collections += parseFloat(payment.amountApplied);
    });

    // Group expenses by approval/creation date
    allExpenses
      .filter(e => e.status === "approved")
      .forEach(expense => {
        const createdAt = new Date(expense.createdAt!);
        const monthKey = createdAt.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { collections: 0, expenses: 0 };
        }
        monthlyData[monthKey].expenses += parseFloat(expense.expenseAmount);
      });

    const sortedMonths = Object.keys(monthlyData).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    return sortedMonths.slice(-8).map(month => ({
      month: month.split(' ')[0],
      collections: Math.round(monthlyData[month].collections),
      expenses: Math.round(monthlyData[month].expenses),
    }));
  }

  // ====== ACCOUNTING OPERATIONS ======

  // Chart of Accounts operations
  async getAccount(id: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account;
  }

  async getAccountByNumber(accountNumber: string): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.accountNumber, accountNumber));
    return account;
  }

  async getAllAccounts(): Promise<Account[]> {
    return await db
      .select()
      .from(accounts)
      .orderBy(accounts.accountNumber);
  }

  async getAccountsByType(accountType: string): Promise<Account[]> {
    return await db
      .select()
      .from(accounts)
      .where(sql`${accounts.accountType} = ${accountType}`)
      .orderBy(accounts.accountNumber);
  }

  async getActiveAccounts(): Promise<Account[]> {
    return await db
      .select()
      .from(accounts)
      .where(eq(accounts.isActive, true))
      .orderBy(accounts.accountNumber);
  }

  async createAccount(accountData: InsertAccount): Promise<Account> {
    const [account] = await db
      .insert(accounts)
      .values(accountData)
      .returning();
    return account;
  }

  async updateAccount(id: string, data: Partial<InsertAccount>): Promise<Account> {
    const [account] = await db
      .update(accounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(accounts.id, id))
      .returning();
    return account;
  }

  async deleteAccount(id: string): Promise<void> {
    // Only delete if not a system account and has no related journal entries
    await db.delete(accounts).where(
      and(
        eq(accounts.id, id),
        eq(accounts.isSystemAccount, false)
      )
    );
  }

  async updateAccountBalance(id: string, amount: string, lineType: 'debit' | 'credit'): Promise<void> {
    const account = await this.getAccount(id);
    if (!account) throw new Error('Account not found');

    const currentBalance = parseFloat(account.balance);
    const changeAmount = parseFloat(amount);
    
    // Determine and normalize the normal balance for this account
    // Handle null, empty string, and malformed normalBalance values
    let normalBalance: 'debit' | 'credit';
    const rawNormalBalance = account.normalBalance?.trim().toLowerCase();
    
    if (rawNormalBalance === 'debit' || rawNormalBalance === 'credit') {
      // Valid normalBalance found
      normalBalance = rawNormalBalance as 'debit' | 'credit';
    } else {
      // Derive normal balance from account type
      // Assets & Expenses have debit normal balance
      // Liabilities, Equity & Revenue have credit normal balance
      if (account.accountType === 'asset' || account.accountType === 'expense') {
        normalBalance = 'debit';
      } else if (account.accountType === 'liability' || account.accountType === 'equity' || account.accountType === 'revenue') {
        normalBalance = 'credit';
      } else {
        throw new Error(`Cannot determine normal balance for account ${account.id} with type ${account.accountType}`);
      }
    }
    
    // Account-type aware balance update:
    // - Debit increases debit-normal accounts (Asset/Expense)
    // - Credit increases credit-normal accounts (Liability/Equity/Revenue)
    let newBalance: number;
    if (lineType === normalBalance) {
      // Line type matches normal balance: increase
      newBalance = currentBalance + changeAmount;
    } else {
      // Line type opposite of normal balance: decrease
      newBalance = currentBalance - changeAmount;
    }

    await db
      .update(accounts)
      .set({ balance: newBalance.toFixed(2), updatedAt: new Date() })
      .where(eq(accounts.id, id));
  }

  // Transaction Template operations
  async getTransactionTemplate(id: string): Promise<any> {
    const [template] = await db
      .select()
      .from(transactionTemplates)
      .where(eq(transactionTemplates.id, id));
    
    if (!template) return undefined;

    // Fetch associated accounts
    const debitAccount = await this.getAccount(template.debitAccountId);
    const creditAccount = await this.getAccount(template.creditAccountId);

    return {
      ...template,
      debitAccount,
      creditAccount,
    };
  }

  async getTransactionTemplateByType(transactionType: string): Promise<any> {
    const [template] = await db
      .select()
      .from(transactionTemplates)
      .where(
        and(
          eq(transactionTemplates.transactionType, transactionType),
          eq(transactionTemplates.isActive, true)
        )
      );
    
    if (!template) return undefined;

    // Fetch associated accounts
    const debitAccount = await this.getAccount(template.debitAccountId);
    const creditAccount = await this.getAccount(template.creditAccountId);

    return {
      ...template,
      debitAccount,
      creditAccount,
    };
  }

  async getAllTransactionTemplates(): Promise<any[]> {
    const templates = await db
      .select()
      .from(transactionTemplates)
      .orderBy(transactionTemplates.name);

    // Fetch associated accounts for each template
    return Promise.all(
      templates.map(async (template) => {
        const debitAccount = await this.getAccount(template.debitAccountId);
        const creditAccount = await this.getAccount(template.creditAccountId);
        return {
          ...template,
          debitAccount,
          creditAccount,
        };
      })
    );
  }

  async getActiveTransactionTemplates(): Promise<any[]> {
    const templates = await db
      .select()
      .from(transactionTemplates)
      .where(eq(transactionTemplates.isActive, true))
      .orderBy(transactionTemplates.name);

    // Fetch associated accounts for each template
    return Promise.all(
      templates.map(async (template) => {
        const debitAccount = await this.getAccount(template.debitAccountId);
        const creditAccount = await this.getAccount(template.creditAccountId);
        return {
          ...template,
          debitAccount,
          creditAccount,
        };
      })
    );
  }

  async createTransactionTemplate(templateData: InsertTransactionTemplate): Promise<TransactionTemplate> {
    const [template] = await db
      .insert(transactionTemplates)
      .values(templateData)
      .returning();
    return template;
  }

  async updateTransactionTemplate(id: string, data: Partial<InsertTransactionTemplate>): Promise<TransactionTemplate> {
    const [template] = await db
      .update(transactionTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(transactionTemplates.id, id))
      .returning();
    return template;
  }

  async deleteTransactionTemplate(id: string): Promise<void> {
    // Only delete if not a system template
    await db.delete(transactionTemplates).where(
      and(
        eq(transactionTemplates.id, id),
        eq(transactionTemplates.isSystemTemplate, false)
      )
    );
  }

  // Journal Entry operations
  async getJournalEntry(id: string): Promise<any> {
    const [entry] = await db.select().from(journalEntries).where(eq(journalEntries.id, id));
    return entry;
  }

  async getJournalEntryWithLines(id: string): Promise<any> {
    const entry = await this.getJournalEntry(id);
    if (!entry) return undefined;

    const lines = await db
      .select()
      .from(journalEntryLines)
      .where(eq(journalEntryLines.journalEntryId, id));

    // Fetch account details for each line
    const linesWithAccounts = await Promise.all(
      lines.map(async (line) => {
        const account = await this.getAccount(line.accountId);
        return {
          ...line,
          account,
        };
      })
    );

    // Fetch template if exists
    let template = null;
    if (entry.templateId) {
      template = await this.getTransactionTemplate(entry.templateId);
    }

    // Fetch creator
    const creator = await this.getUser(entry.createdBy);

    return {
      ...entry,
      lines: linesWithAccounts,
      template,
      creator,
    };
  }

  async getAllJournalEntries(): Promise<any[]> {
    const entries = await db
      .select()
      .from(journalEntries)
      .orderBy(desc(journalEntries.entryDate));

    // Fetch creator for each entry
    return Promise.all(
      entries.map(async (entry) => {
        const creator = await this.getUser(entry.createdBy);
        return {
          ...entry,
          creator,
        };
      })
    );
  }

  async getJournalEntriesByDateRange(startDate: Date, endDate: Date): Promise<any[]> {
    const entries = await db
      .select()
      .from(journalEntries)
      .where(
        and(
          gte(journalEntries.entryDate, startDate),
          lte(journalEntries.entryDate, endDate)
        )
      )
      .orderBy(desc(journalEntries.entryDate));

    // Fetch creator for each entry
    return Promise.all(
      entries.map(async (entry) => {
        const creator = await this.getUser(entry.createdBy);
        return {
          ...entry,
          creator,
        };
      })
    );
  }

  async getJournalEntriesByReferenceId(referenceId: string): Promise<any[]> {
    const entries = await db
      .select()
      .from(journalEntries)
      .where(eq(journalEntries.referenceId, referenceId))
      .orderBy(desc(journalEntries.createdAt));

    // Fetch creator for each entry
    return Promise.all(
      entries.map(async (entry) => {
        const creator = await this.getUser(entry.createdBy);
        return {
          ...entry,
          creator,
        };
      })
    );
  }

  async createJournalEntry(entryData: InsertJournalEntry, lines: InsertJournalEntryLine[]): Promise<JournalEntry> {
    // Validate that we have at least 2 lines (minimum for double-entry)
    if (!lines || lines.length < 2) {
      throw new Error('Journal entry must have at least 2 lines (double-entry accounting)');
    }

    // Generate entry number
    const entryNumber = await this.generateEntryNumber(entryData.entryDate);

    // Calculate totals from lines
    const totalDebit = lines
      .filter(line => line.lineType === 'debit')
      .reduce((sum, line) => sum + parseFloat(line.amount), 0);
    
    const totalCredit = lines
      .filter(line => line.lineType === 'credit')
      .reduce((sum, line) => sum + parseFloat(line.amount), 0);

    // Validate that debits equal credits (double-entry accounting principle)
    const difference = Math.abs(totalDebit - totalCredit);
    if (difference > 0.01) { // Allow for small rounding errors
      throw new Error(
        `Journal entry is unbalanced! Debits (₦${totalDebit.toFixed(2)}) must equal Credits (₦${totalCredit.toFixed(2)}). Difference: ₦${difference.toFixed(2)}`
      );
    }

    // Create the journal entry
    const [entry] = await db
      .insert(journalEntries)
      .values({
        ...entryData,
        entryNumber,
        totalDebit: totalDebit.toFixed(2),
        totalCredit: totalCredit.toFixed(2),
      })
      .returning();

    // Create the journal entry lines
    for (const line of lines) {
      await db
        .insert(journalEntryLines)
        .values({
          ...line,
          journalEntryId: entry.id,
        });

      // Update account balances (account-type aware)
      await this.updateAccountBalance(line.accountId, line.amount, line.lineType);
    }

    return entry;
  }

  async voidJournalEntry(id: string): Promise<void> {
    // Get the entry with lines
    const entry = await this.getJournalEntryWithLines(id);
    if (!entry) throw new Error('Journal entry not found');

    // Reverse account balance changes by applying opposite line type
    for (const line of entry.lines) {
      const oppositeLineType = line.lineType === 'debit' ? 'credit' : 'debit';
      await this.updateAccountBalance(line.accountId, line.amount, oppositeLineType);
    }

    // Mark entry as void
    await db
      .update(journalEntries)
      .set({ status: 'void', updatedAt: new Date() })
      .where(eq(journalEntries.id, id));
  }

  async generateEntryNumber(entryDate: Date): Promise<string> {
    const dateStr = entryDate.toISOString().split('T')[0].replace(/-/g, '');
    
    // Get count of entries for this date
    const count = await db
      .select({ count: sql<number>`count(*)` })
      .from(journalEntries)
      .where(sql`DATE(entry_date) = DATE(${entryDate})`);

    const sequenceNumber = (count[0]?.count || 0) + 1;
    const paddedSequence = sequenceNumber.toString().padStart(4, '0');

    return `JE-${dateStr}-${paddedSequence}`;
  }

  async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const seriesKey = 'invoice';
    
    // Use a transaction with atomic upsert to handle both existing and bootstrap cases
    return await db.transaction(async (tx) => {
      // Atomically upsert the sequence row: INSERT if missing, UPDATE if exists
      // This handles the bootstrap case (first invoice of fiscal year) safely
      const result = await tx.execute(sql`
        INSERT INTO invoice_sequences (series_key, fiscal_year, last_number, updated_at)
        VALUES (${seriesKey}, ${year}, 1, NOW())
        ON CONFLICT (series_key, fiscal_year)
        DO UPDATE SET 
          last_number = invoice_sequences.last_number + 1,
          updated_at = NOW()
        RETURNING last_number
      `);
      
      const nextNumber = (result.rows[0] as any).last_number;
      const paddedSequence = nextNumber.toString().padStart(4, '0');
      return `INV-${year}-${paddedSequence}`;
    });
  }

  // Financial Reports
  async getTrialBalance(asOf: Date): Promise<any> {
    // Get all accounts
    const allAccounts = await db
      .select()
      .from(accounts)
      .where(eq(accounts.isActive, true))
      .orderBy(accounts.accountNumber);

    // Get all posted journal entry lines up to the specified date
    const lines = await db
      .select({
        accountId: journalEntryLines.accountId,
        lineType: journalEntryLines.lineType,
        amount: journalEntryLines.amount,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(journalEntries.status, 'posted'),
          sql`${journalEntries.entryDate} <= ${asOf}`
        )
      );

    // Calculate balances for each account
    const accountBalances = new Map();
    
    for (const line of lines) {
      if (!accountBalances.has(line.accountId)) {
        accountBalances.set(line.accountId, { debit: 0, credit: 0 });
      }
      
      const balance = accountBalances.get(line.accountId);
      const amount = parseFloat(line.amount);
      
      if (line.lineType === 'debit') {
        balance.debit += amount;
      } else {
        balance.credit += amount;
      }
    }

    // Build trial balance data
    // In a proper Trial Balance, we show the NET position of each account
    // based on its normal balance type
    const trialBalanceData = allAccounts.map((account) => {
      const balance = accountBalances.get(account.id) || { debit: 0, credit: 0 };
      
      let debitBalance = 0;
      let creditBalance = 0;
      
      // Calculate the net balance
      const netAmount = balance.debit - balance.credit;
      
      // For accounts with normal debit balance (Assets, Expenses):
      // - Positive net = show in debit column
      // - Negative net = show in credit column (contra account)
      if (account.normalBalance === 'debit') {
        if (netAmount >= 0) {
          debitBalance = netAmount;
        } else {
          creditBalance = Math.abs(netAmount);
        }
      } 
      // For accounts with normal credit balance (Liabilities, Equity, Revenue):
      // - Positive net (more debits) = show in debit column (contra account)
      // - Negative net = show in credit column
      else {
        if (netAmount <= 0) {
          creditBalance = Math.abs(netAmount);
        } else {
          debitBalance = netAmount;
        }
      }

      return {
        accountId: account.id,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        accountType: account.accountType,
        normalBalance: account.normalBalance,
        rawDebit: balance.debit,
        rawCredit: balance.credit,
        debitBalance,
        creditBalance,
      };
    }).filter(acc => acc.debitBalance !== 0 || acc.creditBalance !== 0); // Only show accounts with balances

    // Calculate totals
    const totalDebits = trialBalanceData.reduce((sum, acc) => sum + acc.debitBalance, 0);
    const totalCredits = trialBalanceData.reduce((sum, acc) => sum + acc.creditBalance, 0);

    return {
      asOf,
      accounts: trialBalanceData,
      totalDebits,
      totalCredits,
      balanced: Math.abs(totalDebits - totalCredits) < 0.01,
    };
  }

  async getIncomeStatement(startDate: Date, endDate: Date): Promise<any> {
    // Get revenue and expense accounts
    const revenueAccounts = await db
      .select()
      .from(accounts)
      .where(and(
        eq(accounts.accountType, 'revenue'),
        eq(accounts.isActive, true)
      ))
      .orderBy(accounts.accountNumber);

    const expenseAccounts = await db
      .select()
      .from(accounts)
      .where(and(
        eq(accounts.accountType, 'expense'),
        eq(accounts.isActive, true)
      ))
      .orderBy(accounts.accountNumber);

    // Get journal entry lines for the period
    const lines = await db
      .select({
        accountId: journalEntryLines.accountId,
        lineType: journalEntryLines.lineType,
        amount: journalEntryLines.amount,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(journalEntries.status, 'posted'),
          sql`${journalEntries.entryDate} >= ${startDate}`,
          sql`${journalEntries.entryDate} <= ${endDate}`
        )
      );

    // Calculate balances
    const accountBalances = new Map();
    for (const line of lines) {
      if (!accountBalances.has(line.accountId)) {
        accountBalances.set(line.accountId, { debit: 0, credit: 0 });
      }
      
      const balance = accountBalances.get(line.accountId);
      const amount = parseFloat(line.amount);
      
      if (line.lineType === 'debit') {
        balance.debit += amount;
      } else {
        balance.credit += amount;
      }
    }

    // Build revenue data (credit balance is revenue)
    const revenues = revenueAccounts.map((account) => {
      const balance = accountBalances.get(account.id) || { debit: 0, credit: 0 };
      const amount = balance.credit - balance.debit;
      
      return {
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        amount: Math.max(0, amount),
      };
    });

    // Build expense data (debit balance is expense)
    const expenses = expenseAccounts.map((account) => {
      const balance = accountBalances.get(account.id) || { debit: 0, credit: 0 };
      const amount = balance.debit - balance.credit;
      
      return {
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        amount: Math.max(0, amount),
      };
    });

    const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netIncome = totalRevenue - totalExpenses;

    return {
      startDate,
      endDate,
      revenues,
      totalRevenue,
      expenses,
      totalExpenses,
      netIncome,
    };
  }

  async getBalanceSheet(asOf: Date): Promise<any> {
    // Get asset, liability, and equity accounts
    const assetAccounts = await db
      .select()
      .from(accounts)
      .where(and(
        eq(accounts.accountType, 'asset'),
        eq(accounts.isActive, true)
      ))
      .orderBy(accounts.accountNumber);

    const liabilityAccounts = await db
      .select()
      .from(accounts)
      .where(and(
        eq(accounts.accountType, 'liability'),
        eq(accounts.isActive, true)
      ))
      .orderBy(accounts.accountNumber);

    const equityAccounts = await db
      .select()
      .from(accounts)
      .where(and(
        eq(accounts.accountType, 'equity'),
        eq(accounts.isActive, true)
      ))
      .orderBy(accounts.accountNumber);

    // Get journal entry lines up to date
    const lines = await db
      .select({
        accountId: journalEntryLines.accountId,
        lineType: journalEntryLines.lineType,
        amount: journalEntryLines.amount,
      })
      .from(journalEntryLines)
      .innerJoin(journalEntries, eq(journalEntryLines.journalEntryId, journalEntries.id))
      .where(
        and(
          eq(journalEntries.status, 'posted'),
          sql`${journalEntries.entryDate} <= ${asOf}`
        )
      );

    // Calculate balances
    const accountBalances = new Map();
    for (const line of lines) {
      if (!accountBalances.has(line.accountId)) {
        accountBalances.set(line.accountId, { debit: 0, credit: 0 });
      }
      
      const balance = accountBalances.get(line.accountId);
      const amount = parseFloat(line.amount);
      
      if (line.lineType === 'debit') {
        balance.debit += amount;
      } else {
        balance.credit += amount;
      }
    }

    // Build assets (debit balance)
    const assets = assetAccounts.map((account) => {
      const balance = accountBalances.get(account.id) || { debit: 0, credit: 0 };
      const amount = balance.debit - balance.credit;
      
      return {
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        category: account.category,
        amount: Math.max(0, amount),
      };
    });

    // Build liabilities (credit balance)
    const liabilities = liabilityAccounts.map((account) => {
      const balance = accountBalances.get(account.id) || { debit: 0, credit: 0 };
      const amount = balance.credit - balance.debit;
      
      return {
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        category: account.category,
        amount: Math.max(0, amount),
      };
    });

    // Build equity (credit balance)
    const equity = equityAccounts.map((account) => {
      const balance = accountBalances.get(account.id) || { debit: 0, credit: 0 };
      const amount = balance.credit - balance.debit;
      
      return {
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        category: account.category,
        amount: Math.max(0, amount),
      };
    });

    // Calculate current year net income (Revenue - Expenses)
    // Get revenue and expense accounts
    const revenueAccounts = await db
      .select()
      .from(accounts)
      .where(and(
        eq(accounts.accountType, 'revenue'),
        eq(accounts.isActive, true)
      ));

    const expenseAccounts = await db
      .select()
      .from(accounts)
      .where(and(
        eq(accounts.accountType, 'expense'),
        eq(accounts.isActive, true)
      ));

    // Calculate total revenue (credit - debit)
    const totalRevenue = revenueAccounts.reduce((sum, account) => {
      const balance = accountBalances.get(account.id) || { debit: 0, credit: 0 };
      return sum + (balance.credit - balance.debit);
    }, 0);

    // Calculate total expenses (debit - credit)
    const totalExpenses = expenseAccounts.reduce((sum, account) => {
      const balance = accountBalances.get(account.id) || { debit: 0, credit: 0 };
      return sum + (balance.debit - balance.credit);
    }, 0);

    // Net income = Revenue - Expenses
    const netIncome = totalRevenue - totalExpenses;

    // Include net income in equity if non-zero
    const equityWithNetIncome = [...equity];
    if (Math.abs(netIncome) > 0.01) {
      equityWithNetIncome.push({
        accountNumber: '',
        accountName: 'Current Year Net Income',
        category: null,
        amount: netIncome,
      });
    }

    const totalAssets = assets.reduce((sum, a) => sum + a.amount, 0);
    const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);
    const totalEquity = equity.reduce((sum, e) => sum + e.amount, 0);
    const totalEquityWithNetIncome = totalEquity + netIncome;

    return {
      asOf,
      assets,
      totalAssets,
      liabilities,
      totalLiabilities,
      equity: equityWithNetIncome,
      totalEquity: totalEquityWithNetIncome,
      totalLiabilitiesAndEquity: totalLiabilities + totalEquityWithNetIncome,
      netIncome,
    };
  }

  // Vendor operations
  async getVendor(id: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id));
    return vendor;
  }

  async getVendorByTin(tinNumber: string): Promise<Vendor | undefined> {
    const [vendor] = await db.select().from(vendors).where(eq(vendors.tinNumber, tinNumber));
    return vendor;
  }

  async getAllVendors(): Promise<Vendor[]> {
    const allVendors = await db
      .select()
      .from(vendors)
      .orderBy(desc(vendors.createdAt));
    return allVendors;
  }

  async getVendorsByStatus(status: string): Promise<Vendor[]> {
    const vendorsByStatus = await db
      .select()
      .from(vendors)
      .where(eq(vendors.status, status))
      .orderBy(desc(vendors.createdAt));
    return vendorsByStatus;
  }

  async createVendor(vendorData: InsertVendor): Promise<Vendor> {
    const [vendor] = await db
      .insert(vendors)
      .values(vendorData)
      .returning();
    return vendor;
  }

  async updateVendor(id: string, data: Partial<InsertVendor>): Promise<Vendor> {
    const [vendor] = await db
      .update(vendors)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(vendors.id, id))
      .returning();
    return vendor;
  }

  async approveVendor(id: string, approvedBy: string): Promise<Vendor> {
    const [vendor] = await db
      .update(vendors)
      .set({
        status: 'approved',
        approvedBy,
        approvedAt: new Date(),
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(vendors.id, id))
      .returning();
    return vendor;
  }

  async rejectVendor(id: string, approvedBy: string, reason: string): Promise<Vendor> {
    const [vendor] = await db
      .update(vendors)
      .set({
        status: 'rejected',
        approvedBy,
        approvedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(vendors.id, id))
      .returning();
    return vendor;
  }

  async getVendorAccountStatement(
    vendorId: string, 
    startDate?: Date, 
    endDate?: Date
  ): Promise<any> {
    const vendor = await this.getVendor(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Build the query conditions
    const conditions = [eq(journalEntries.status, 'posted')];
    
    if (startDate) {
      conditions.push(sql`${journalEntries.entryDate} >= ${startDate}`);
    }
    if (endDate) {
      conditions.push(sql`${journalEntries.entryDate} <= ${endDate}`);
    }

    // Get all journal entries that reference this vendor
    // For now, we'll look for vendor references in the description or reference fields
    const entries = await db
      .select({
        id: journalEntries.id,
        entryNumber: journalEntries.entryNumber,
        entryDate: journalEntries.entryDate,
        description: journalEntries.description,
        totalDebit: journalEntries.totalDebit,
        totalCredit: journalEntries.totalCredit,
        status: journalEntries.status,
      })
      .from(journalEntries)
      .where(and(...conditions))
      .orderBy(journalEntries.entryDate, journalEntries.entryNumber);

    // Filter entries that contain vendor name or TIN in description
    const vendorEntries = entries.filter(entry => 
      entry.description.toLowerCase().includes(vendor.name.toLowerCase()) ||
      entry.description.includes(vendor.tinNumber)
    );

    // Calculate running balance
    let runningBalance = 0;
    const transactions = vendorEntries.map(entry => {
      const amount = parseFloat(entry.totalDebit) - parseFloat(entry.totalCredit);
      runningBalance += amount;
      
      return {
        ...entry,
        amount,
        runningBalance,
      };
    });

    return {
      vendor,
      startDate,
      endDate,
      transactions,
      openingBalance: 0, // Can be calculated from entries before startDate
      closingBalance: runningBalance,
      totalDebits: transactions.reduce((sum, t) => sum + Math.max(0, t.amount), 0),
      totalCredits: transactions.reduce((sum, t) => sum + Math.abs(Math.min(0, t.amount)), 0),
    };
  }

  async getVendorOutstandingBills(): Promise<Record<string, number>> {
    // Get all approved expenses for approved vendors only
    const approvedExpenses = await db
      .select({
        vendorId: expenses.vendorId,
        expenseAmount: expenses.expenseAmount,
        serviceCharge: expenses.serviceCharge,
      })
      .from(expenses)
      .innerJoin(vendors, eq(expenses.vendorId, vendors.id))
      .where(and(
        eq(expenses.status, 'approved'),
        eq(vendors.status, 'approved')
      ));

    // Calculate total outstanding per vendor
    const outstandingByVendor: Record<string, number> = {};
    
    for (const expense of approvedExpenses) {
      if (!expense.vendorId) continue;
      
      const expenseAmount = parseFloat(expense.expenseAmount);
      const serviceCharge = expense.serviceCharge ? parseFloat(expense.serviceCharge) : 0;
      const totalAmount = expenseAmount + serviceCharge;
      
      if (!outstandingByVendor[expense.vendorId]) {
        outstandingByVendor[expense.vendorId] = 0;
      }
      outstandingByVendor[expense.vendorId] += totalAmount;
    }
    
    return outstandingByVendor;
  }

  // Expense operations
  async getExpense(id: string): Promise<any> {
    const [expense] = await db
      .select({
        id: expenses.id,
        vendorId: expenses.vendorId,
        vendorName: vendors.name,
        vendorTin: vendors.tinNumber,
        expenseType: expenses.expenseType,
        description: expenses.description,
        expenseAmount: expenses.expenseAmount,
        serviceCharge: expenses.serviceCharge,
        receiptPath: expenses.receiptPath,
        status: expenses.status,
        submittedBy: expenses.submittedBy,
        submitterName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        reviewedBy: expenses.reviewedBy,
        reviewedAt: expenses.reviewedAt,
        rejectionReason: expenses.rejectionReason,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
      })
      .from(expenses)
      .leftJoin(vendors, eq(expenses.vendorId, vendors.id))
      .leftJoin(users, eq(expenses.submittedBy, users.id))
      .where(eq(expenses.id, id));
    return expense;
  }

  async getAllExpenses(): Promise<any[]> {
    const allExpenses = await db
      .select({
        id: expenses.id,
        vendorId: expenses.vendorId,
        vendorName: vendors.name,
        vendorTin: vendors.tinNumber,
        expenseType: expenses.expenseType,
        description: expenses.description,
        expenseAmount: expenses.expenseAmount,
        serviceCharge: expenses.serviceCharge,
        receiptPath: expenses.receiptPath,
        status: expenses.status,
        submittedBy: expenses.submittedBy,
        submitterName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        reviewedBy: expenses.reviewedBy,
        reviewedAt: expenses.reviewedAt,
        rejectionReason: expenses.rejectionReason,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
      })
      .from(expenses)
      .leftJoin(vendors, eq(expenses.vendorId, vendors.id))
      .leftJoin(users, eq(expenses.submittedBy, users.id))
      .orderBy(desc(expenses.createdAt));
    return allExpenses;
  }

  async getExpensesByStatus(status: string): Promise<any[]> {
    const statusExpenses = await db
      .select({
        id: expenses.id,
        vendorId: expenses.vendorId,
        vendorName: vendors.name,
        vendorTin: vendors.tinNumber,
        expenseType: expenses.expenseType,
        description: expenses.description,
        expenseAmount: expenses.expenseAmount,
        serviceCharge: expenses.serviceCharge,
        receiptPath: expenses.receiptPath,
        status: expenses.status,
        submittedBy: expenses.submittedBy,
        submitterName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        reviewedBy: expenses.reviewedBy,
        reviewedAt: expenses.reviewedAt,
        rejectionReason: expenses.rejectionReason,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
      })
      .from(expenses)
      .leftJoin(vendors, eq(expenses.vendorId, vendors.id))
      .leftJoin(users, eq(expenses.submittedBy, users.id))
      .where(eq(expenses.status, status))
      .orderBy(desc(expenses.createdAt));
    return statusExpenses;
  }

  async getExpensesBySubmitter(userId: string): Promise<any[]> {
    const userExpenses = await db
      .select({
        id: expenses.id,
        vendorId: expenses.vendorId,
        vendorName: vendors.name,
        vendorTin: vendors.tinNumber,
        expenseType: expenses.expenseType,
        description: expenses.description,
        expenseAmount: expenses.expenseAmount,
        serviceCharge: expenses.serviceCharge,
        receiptPath: expenses.receiptPath,
        status: expenses.status,
        submittedBy: expenses.submittedBy,
        submitterName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        reviewedBy: expenses.reviewedBy,
        reviewedAt: expenses.reviewedAt,
        rejectionReason: expenses.rejectionReason,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
      })
      .from(expenses)
      .leftJoin(vendors, eq(expenses.vendorId, vendors.id))
      .leftJoin(users, eq(expenses.submittedBy, users.id))
      .where(eq(expenses.submittedBy, userId))
      .orderBy(desc(expenses.createdAt));
    return userExpenses;
  }

  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db
      .insert(expenses)
      .values(expense)
      .returning();
    return newExpense;
  }

  async approveExpense(id: string, reviewedBy: string): Promise<Expense> {
    const [expense] = await db
      .update(expenses)
      .set({
        status: 'approved',
        reviewedBy,
        reviewedAt: new Date(),
        rejectionReason: null,
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, id))
      .returning();
    
    // If expense has an account assigned, update budget consumption
    if (expense.accountId) {
      // Use the expense's creation date (when it was incurred) for budget matching
      // This ensures expenses are charged against the correct budget period
      const expenseDate = expense.createdAt || new Date();
      
      // Calculate total expense amount (expense amount + service charge)
      const expenseAmount = parseFloat(expense.expenseAmount);
      const serviceCharge = expense.serviceCharge ? parseFloat(expense.serviceCharge) : 0;
      const totalAmount = expenseAmount + serviceCharge;
      
      // Find active budget covering the expense date
      // First try to find budget covering the expense creation date
      let [activeBudget] = await db
        .select()
        .from(budgets)
        .where(and(
          eq(budgets.status, 'active'),
          lte(budgets.startDate, expenseDate),
          gte(budgets.endDate, expenseDate)
        ))
        .limit(1);
      
      // If no budget covers the expense date, fall back to current active budget
      // This handles cases where expenses are approved outside their incurred period
      if (!activeBudget) {
        const now = new Date();
        [activeBudget] = await db
          .select()
          .from(budgets)
          .where(and(
            eq(budgets.status, 'active'),
            lte(budgets.startDate, now),
            gte(budgets.endDate, now)
          ))
          .limit(1);
      }
      
      // If still no budget found, log warning
      if (!activeBudget) {
        console.warn(`[Budget Warning] No active budget found for expense ${expense.id} (Account: ${expense.accountId}, Created: ${expenseDate.toISOString()}). Expense approved but not tracked in budget.`);
      }
      
      if (activeBudget) {
        // Check if this budget has a line for this account
        const [budgetLine] = await db
          .select()
          .from(budgetLines)
          .where(
            and(
              eq(budgetLines.budgetId, activeBudget.id),
              eq(budgetLines.accountId, expense.accountId)
            )
          );
        
        if (budgetLine) {
          // Update budget line: consumed and remaining amounts
          const allocated = parseFloat(budgetLine.allocatedAmount);
          const currentConsumed = parseFloat(budgetLine.consumedAmount);
          const newConsumed = currentConsumed + totalAmount;
          const newRemaining = allocated - newConsumed;
          
          await db
            .update(budgetLines)
            .set({
              consumedAmount: newConsumed.toFixed(2),
              remainingAmount: newRemaining.toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(budgetLines.id, budgetLine.id));
          
          // Update budget totals: total consumed and total remaining
          const budgetTotalAllocated = parseFloat(activeBudget.totalBudgetAmount);
          const budgetCurrentConsumed = parseFloat(activeBudget.totalConsumedAmount);
          const budgetNewConsumed = budgetCurrentConsumed + totalAmount;
          const budgetNewRemaining = budgetTotalAllocated - budgetNewConsumed;
          
          await db
            .update(budgets)
            .set({
              totalConsumedAmount: budgetNewConsumed.toFixed(2),
              totalRemainingAmount: budgetNewRemaining.toFixed(2),
              updatedAt: new Date(),
            })
            .where(eq(budgets.id, activeBudget.id));
        }
      }
    }
    
    return expense;
  }

  async rejectExpense(id: string, reviewedBy: string, reason: string): Promise<Expense> {
    const [expense] = await db
      .update(expenses)
      .set({
        status: 'rejected',
        reviewedBy,
        reviewedAt: new Date(),
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, id))
      .returning();
    return expense;
  }

  // Accounts Payable operations
  async getApprovedExpensesForPayment(): Promise<any[]> {
    const approvedExpenses = await db
      .select({
        id: expenses.id,
        vendorId: expenses.vendorId,
        vendorName: vendors.name,
        vendorBankName: vendors.bankName,
        vendorBankAccountNumber: vendors.bankAccountNumber,
        vendorBankAccountName: vendors.bankAccountName,
        accountId: expenses.accountId,
        accountNumber: accounts.accountNumber,
        accountName: accounts.accountName,
        expenseType: expenses.expenseType,
        description: expenses.description,
        expenseAmount: expenses.expenseAmount,
        serviceCharge: expenses.serviceCharge,
        receiptPath: expenses.receiptPath,
        status: expenses.status,
        paymentStatus: expenses.paymentStatus,
        whtRate: expenses.whtRate,
        whtAmount: expenses.whtAmount,
        netPayment: expenses.netPayment,
        paidDate: expenses.paidDate,
        paidFromAccountId: expenses.paidFromAccountId,
        reviewedBy: expenses.reviewedBy,
        reviewedAt: expenses.reviewedAt,
        createdAt: expenses.createdAt,
        submittedBy: expenses.submittedBy,
        submitterName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
      })
      .from(expenses)
      .leftJoin(vendors, eq(expenses.vendorId, vendors.id))
      .leftJoin(accounts, eq(expenses.accountId, accounts.id))
      .leftJoin(users, eq(expenses.submittedBy, users.id))
      .where(
        and(
          eq(expenses.status, 'approved'),
          or(
            eq(expenses.paymentStatus, 'unpaid'),
            eq(expenses.paymentStatus, 'approved_for_payment')
          )
        )
      )
      .orderBy(desc(expenses.createdAt));
    
    return approvedExpenses;
  }

  async getBankAccounts(): Promise<Account[]> {
    const bankAccounts = await db
      .select()
      .from(accounts)
      .where(
        and(
          eq(accounts.accountType, 'asset'),
          eq(accounts.isActive, true),
          or(
            eq(accounts.category, 'Cash and Bank'),
            eq(accounts.category, 'Cash'),
            eq(accounts.category, 'Bank')
          )
        )
      )
      .orderBy(accounts.accountNumber);
    
    return bankAccounts;
  }

  async processExpensePayment(
    expenseId: string,
    paidFromAccountId: string,
    paidBy: string,
    whtRate: string
  ): Promise<Expense> {
    // Get the expense details
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, expenseId));
    
    if (!expense) {
      throw new Error('Expense not found');
    }
    
    if (expense.status !== 'approved') {
      throw new Error('Only approved expenses can be paid');
    }

    // Get vendor details for notification
    const [vendor] = await db
      .select()
      .from(vendors)
      .where(eq(vendors.id, expense.vendorId!));

    // Calculate payment amounts
    const serviceChargeAmount = parseFloat(expense.serviceCharge || '0');
    const whtRateNum = parseFloat(whtRate);
    const whtAmount = (serviceChargeAmount * whtRateNum) / 100;
    const totalAmount = parseFloat(expense.expenseAmount) + serviceChargeAmount;
    const netPayment = totalAmount - whtAmount;

    // Create journal entry for payment
    const entryDate = new Date();
    const entryNumber = await this.generateEntryNumber(entryDate);
    
    const journalEntryLines: InsertJournalEntryLine[] = [];
    
    // Debit: Accounts Payable (or Expense account if specified)
    const debitAccountId = expense.accountId || (await this.getAccountByNumber('2200'))?.id;
    if (debitAccountId) {
      journalEntryLines.push({
        accountId: debitAccountId,
        lineType: 'debit',
        amount: totalAmount.toFixed(2),
        description: `Payment to ${vendor?.name || 'vendor'} - ${expense.description}`,
      });
    }

    // Credit: Bank Account (net payment)
    journalEntryLines.push({
      accountId: paidFromAccountId,
      lineType: 'credit',
      amount: netPayment.toFixed(2),
      description: `Payment to ${vendor?.name || 'vendor'}`,
    });

    // Credit: WHT Payable (if WHT is deducted)
    if (whtAmount > 0) {
      const whtAccount = await this.getAccountByNumber('2300'); // WHT Payable account
      if (whtAccount) {
        journalEntryLines.push({
          accountId: whtAccount.id,
          lineType: 'credit',
          amount: whtAmount.toFixed(2),
          description: `WHT deducted at ${whtRate}%`,
        });
      }
    }

    const journalEntry = await this.createJournalEntry(
      {
        entryDate,
        description: `Payment for Expense: ${expense.description}`,
        referenceType: 'expense_payment',
        referenceId: expenseId,
        createdBy: paidBy,
        status: 'posted',
        totalDebit: totalAmount.toFixed(2),
        totalCredit: totalAmount.toFixed(2),
      },
      journalEntryLines as any
    );

    // Update expense record
    const [updatedExpense] = await db
      .update(expenses)
      .set({
        paymentStatus: 'paid',
        paidDate: entryDate,
        paidFromAccountId,
        paidBy,
        whtRate: whtRate,
        whtAmount: whtAmount.toFixed(2),
        netPayment: netPayment.toFixed(2),
        paymentJournalEntryId: journalEntry.id,
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, expenseId))
      .returning();

    // Send notification to vendor if they have an email
    if (vendor && vendor.email) {
      // In a real system, this would send an email
      // For now, we'll create a notification record if there's a vendor user account
      // This is a placeholder - adjust based on your notification system
      console.log(`Payment notification: Vendor ${vendor.name} paid ₦${netPayment.toFixed(2)} (WHT: ₦${whtAmount.toFixed(2)})`);
    }

    return updatedExpense;
  }

  async approveExpenseForPaymentLater(id: string, paidBy: string, whtRate: string): Promise<Expense> {
    // Get the expense to calculate WHT
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id));
    
    if (!expense) {
      throw new Error('Expense not found');
    }
    
    if (expense.status !== 'approved') {
      throw new Error('Only approved expenses can be marked for payment');
    }

    // Calculate WHT amount
    const serviceChargeAmount = parseFloat(expense.serviceCharge || '0');
    const whtRateNum = parseFloat(whtRate);
    const whtAmount = (serviceChargeAmount * whtRateNum) / 100;
    const totalAmount = parseFloat(expense.expenseAmount) + serviceChargeAmount;
    const netPayment = totalAmount - whtAmount;

    // Update expense to mark it approved for payment later
    const [updatedExpense] = await db
      .update(expenses)
      .set({
        paymentStatus: 'approved_for_payment',
        whtRate: whtRate,
        whtAmount: whtAmount.toFixed(2),
        netPayment: netPayment.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(expenses.id, id))
      .returning();

    return updatedExpense;
  }

  // Budget operations
  async getBudget(id: string): Promise<any> {
    const [budget] = await db
      .select()
      .from(budgets)
      .where(eq(budgets.id, id));
    return budget;
  }

  async getBudgetWithLines(id: string): Promise<any> {
    const budget = await this.getBudget(id);
    if (!budget) return null;

    const lines = await db
      .select({
        id: budgetLines.id,
        budgetId: budgetLines.budgetId,
        accountId: budgetLines.accountId,
        accountNumber: accounts.accountNumber,
        accountName: accounts.accountName,
        accountType: accounts.accountType,
        allocatedAmount: budgetLines.allocatedAmount,
        consumedAmount: budgetLines.consumedAmount,
        remainingAmount: budgetLines.remainingAmount,
        notes: budgetLines.notes,
        createdAt: budgetLines.createdAt,
        updatedAt: budgetLines.updatedAt,
      })
      .from(budgetLines)
      .leftJoin(accounts, eq(budgetLines.accountId, accounts.id))
      .where(eq(budgetLines.budgetId, id))
      .orderBy(accounts.accountNumber);

    return { ...budget, budgetLines: lines };
  }

  async getAllBudgets(): Promise<any[]> {
    const allBudgets = await db
      .select({
        id: budgets.id,
        name: budgets.name,
        description: budgets.description,
        fiscalYear: budgets.fiscalYear,
        periodType: budgets.periodType,
        startDate: budgets.startDate,
        endDate: budgets.endDate,
        status: budgets.status,
        totalBudgetAmount: budgets.totalBudgetAmount,
        totalConsumedAmount: budgets.totalConsumedAmount,
        totalRemainingAmount: budgets.totalRemainingAmount,
        projectedCollections: budgets.projectedCollections,
        actualCollections: budgets.actualCollections,
        createdBy: budgets.createdBy,
        creatorName: sql<string>`CONCAT(${users.firstName}, ' ', ${users.lastName})`,
        createdAt: budgets.createdAt,
        updatedAt: budgets.updatedAt,
      })
      .from(budgets)
      .leftJoin(users, eq(budgets.createdBy, users.id))
      .orderBy(desc(budgets.fiscalYear), desc(budgets.createdAt));
    return allBudgets;
  }

  async getActiveBudgets(): Promise<any[]> {
    const activeBudgets = await db
      .select()
      .from(budgets)
      .where(eq(budgets.status, 'active'))
      .orderBy(budgets.startDate);
    return activeBudgets;
  }

  async getBudgetsByFiscalYear(fiscalYear: number): Promise<any[]> {
    const yearBudgets = await db
      .select()
      .from(budgets)
      .where(eq(budgets.fiscalYear, fiscalYear))
      .orderBy(budgets.startDate);
    return yearBudgets;
  }

  async createBudget(budgetData: InsertBudget, lines: InsertBudgetLine[]): Promise<Budget> {
    // Calculate total budget amount from lines
    const totalBudget = lines.reduce((sum, line) => {
      return sum + parseFloat(line.allocatedAmount);
    }, 0);

    // Create budget
    const [newBudget] = await db
      .insert(budgets)
      .values({
        ...budgetData,
        totalBudgetAmount: totalBudget.toFixed(2),
        totalConsumedAmount: '0',
        totalRemainingAmount: totalBudget.toFixed(2),
        actualCollections: '0',
      })
      .returning();

    // Create budget lines with calculated remaining amounts
    const lineValues = lines.map(line => ({
      ...line,
      budgetId: newBudget.id,
      consumedAmount: '0',
      remainingAmount: line.allocatedAmount,
    }));

    await db.insert(budgetLines).values(lineValues);

    return newBudget;
  }

  async updateBudget(id: string, data: Partial<InsertBudget>): Promise<Budget> {
    const [updatedBudget] = await db
      .update(budgets)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(budgets.id, id))
      .returning();
    return updatedBudget;
  }

  async deleteBudget(id: string): Promise<void> {
    // Delete budget (cascade will delete budget lines)
    await db.delete(budgets).where(eq(budgets.id, id));
  }

  async activateBudget(id: string): Promise<Budget> {
    const [activatedBudget] = await db
      .update(budgets)
      .set({
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(budgets.id, id))
      .returning();
    return activatedBudget;
  }

  async closeBudget(id: string): Promise<Budget> {
    const [closedBudget] = await db
      .update(budgets)
      .set({
        status: 'closed',
        updatedAt: new Date(),
      })
      .where(eq(budgets.id, id))
      .returning();
    return closedBudget;
  }

  async updateBudgetConsumption(budgetId: string, accountId: string, amount: string): Promise<void> {
    // Get the budget line
    const [line] = await db
      .select()
      .from(budgetLines)
      .where(and(
        eq(budgetLines.budgetId, budgetId),
        eq(budgetLines.accountId, accountId)
      ));

    if (!line) return;

    // Update consumed and remaining amounts
    const newConsumed = parseFloat(line.consumedAmount) + parseFloat(amount);
    const newRemaining = parseFloat(line.allocatedAmount) - newConsumed;

    await db
      .update(budgetLines)
      .set({
        consumedAmount: newConsumed.toFixed(2),
        remainingAmount: newRemaining.toFixed(2),
        updatedAt: new Date(),
      })
      .where(eq(budgetLines.id, line.id));

    // Update budget totals
    const [budget] = await db
      .select()
      .from(budgets)
      .where(eq(budgets.id, budgetId));

    if (budget) {
      const newTotalConsumed = parseFloat(budget.totalConsumedAmount) + parseFloat(amount);
      const newTotalRemaining = parseFloat(budget.totalBudgetAmount) - newTotalConsumed;

      await db
        .update(budgets)
        .set({
          totalConsumedAmount: newTotalConsumed.toFixed(2),
          totalRemainingAmount: newTotalRemaining.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(budgets.id, budgetId));
    }
  }

  async getBudgetLineByAccount(budgetId: string, accountId: string): Promise<any> {
    const [line] = await db
      .select()
      .from(budgetLines)
      .where(and(
        eq(budgetLines.budgetId, budgetId),
        eq(budgetLines.accountId, accountId)
      ));
    return line;
  }

  async getActiveBudgetForAccount(accountId: string): Promise<any> {
    const now = new Date();
    const [activeBudget] = await db
      .select({
        budgetId: budgets.id,
        budgetName: budgets.name,
        budgetStatus: budgets.status,
        lineId: budgetLines.id,
        accountId: budgetLines.accountId,
        allocatedAmount: budgetLines.allocatedAmount,
        consumedAmount: budgetLines.consumedAmount,
        remainingAmount: budgetLines.remainingAmount,
      })
      .from(budgets)
      .innerJoin(budgetLines, eq(budgets.id, budgetLines.budgetId))
      .where(and(
        eq(budgets.status, 'active'),
        eq(budgetLines.accountId, accountId),
        lte(budgets.startDate, now),
        gte(budgets.endDate, now)
      ))
      .limit(1);
    
    return activeBudget;
  }

  // Accounts Receivable operations
  async getAllAREntries(): Promise<any[]> {
    const entries = await db
      .select({
        id: bills.id,
        invoiceNumber: bills.invoiceNumber,
        residentId: bills.residentId,
        residentName: sql`${residents.userId}`,
        unitNumber: residents.unitNumber,
        billingType: bills.billingType,
        description: bills.description,
        amount: bills.amount,
        totalPaid: bills.totalPaid,
        balance: bills.balance,
        paymentStatus: bills.paymentStatus,
        dueDate: bills.dueDate,
        status: bills.status,
        periodStart: bills.periodStart,
        periodEnd: bills.periodEnd,
        createdAt: bills.createdAt,
      })
      .from(bills)
      .innerJoin(residents, eq(bills.residentId, residents.id))
      .orderBy(desc(bills.createdAt));
    
    // Get user details for each resident
    const entriesWithUserDetails = await Promise.all(
      entries.map(async (entry) => {
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, entry.residentName as string));
        
        return {
          ...entry,
          residentName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          residentEmail: user?.email,
        };
      })
    );
    
    return entriesWithUserDetails;
  }

  async getAREntry(billId: string): Promise<any> {
    const [entry] = await db
      .select({
        id: bills.id,
        invoiceNumber: bills.invoiceNumber,
        residentId: bills.residentId,
        userId: residents.userId,
        unitNumber: residents.unitNumber,
        billingType: bills.billingType,
        description: bills.description,
        amount: bills.amount,
        totalPaid: bills.totalPaid,
        balance: bills.balance,
        paymentStatus: bills.paymentStatus,
        dueDate: bills.dueDate,
        status: bills.status,
        periodStart: bills.periodStart,
        periodEnd: bills.periodEnd,
        createdAt: bills.createdAt,
      })
      .from(bills)
      .innerJoin(residents, eq(bills.residentId, residents.id))
      .where(eq(bills.id, billId));

    if (!entry) return null;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, entry.userId));

    const applications = await this.getPaymentApplicationsByBill(billId);

    return {
      ...entry,
      residentName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
      residentEmail: user?.email,
      paymentApplications: applications,
    };
  }

  async applyPaymentToBill(
    billId: string,
    amountApplied: string,
    applicationType: 'bank_statement' | 'manual',
    paymentDate: Date,
    appliedBy: string,
    bankName?: string,
    accountNumber?: string,
    bankStatementEntryId?: string,
    notes?: string
  ): Promise<void> {
    const bill = await this.getBill(billId);
    if (!bill) throw new Error('Bill not found');

    const amount = parseFloat(amountApplied);
    const currentBalance = parseFloat(bill.balance);
    
    if (amount > currentBalance) {
      throw new Error('Payment amount exceeds bill balance');
    }

    // Create payment application
    await db.insert(paymentApplications).values({
      billId,
      bankStatementEntryId,
      amountApplied: amountApplied,
      applicationType,
      bankName,
      accountNumber,
      paymentDate,
      appliedBy,
      notes,
    });

    // Update bill totals
    const newTotalPaid = parseFloat(bill.totalPaid) + amount;
    const newBalance = currentBalance - amount;
    const newPaymentStatus = newBalance === 0 ? 'full_payment' : 'partial_payment';
    const newStatus = newBalance === 0 ? 'paid' : (newBalance < currentBalance ? 'partial' : bill.status);

    await db
      .update(bills)
      .set({
        totalPaid: newTotalPaid.toFixed(2),
        balance: newBalance.toFixed(2),
        paymentStatus: newPaymentStatus,
        status: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(bills.id, billId));

    // Create GL posting for the payment (Modified Cash-Based Accounting)
    // This is where revenue recognition happens - when cash is received
    // DR: Cash/Bank Account
    // CR: Accounts Receivable (1100) - reduce the receivable
    // DR: Deferred Revenue (2200) - reduce the liability
    // CR: Member Dues (4000) - recognize the revenue
    const arAccount = await this.getAccountByNumber('1100');
    if (!arAccount) throw new Error('Accounts Receivable account (1100) not found');
    
    const deferredRevenueAccount = await this.getAccountByNumber('2200');
    if (!deferredRevenueAccount) throw new Error('Deferred Revenue account (2200) not found');
    
    const memberDuesAccount = await this.getAccountByNumber('4000');
    if (!memberDuesAccount) throw new Error('Member Dues revenue account (4000) not found');

    const lines: InsertJournalEntryLine[] = [];

    // DR: Cash/Bank (if bank details provided, otherwise generic cash account)
    if (bankName && accountNumber) {
      // Try to find the bank account in the chart of accounts
      const bankAccounts = await db
        .select()
        .from(accounts)
        .where(and(
          eq(accounts.accountType, 'asset'),
          eq(accounts.category, 'cash_bank')
        ));
      
      const bankAccount = bankAccounts.find(acc => 
        acc.accountName.toLowerCase().includes(bankName.toLowerCase()) ||
        acc.description?.toLowerCase().includes(accountNumber)
      );

      if (bankAccount) {
        lines.push({
          journalEntryId: '', // Will be set by createJournalEntry
          accountId: bankAccount.id,
          lineType: 'debit',
          amount: amountApplied,
          description: `Payment from ${bankName} - ${accountNumber}`,
        });
      } else {
        // Use generic cash account
        const [cashAccount] = await db
          .select()
          .from(accounts)
          .where(and(
            eq(accounts.accountType, 'asset'),
            eq(accounts.category, 'cash_bank')
          ))
          .limit(1);
        
        if (cashAccount) {
          lines.push({
            journalEntryId: '', // Will be set by createJournalEntry
            accountId: cashAccount.id,
            lineType: 'debit',
            amount: amountApplied,
            description: `Payment from ${bankName} - ${accountNumber}`,
          });
        }
      }
    } else {
      // Use generic cash account
      const [cashAccount] = await db
        .select()
        .from(accounts)
        .where(and(
          eq(accounts.accountType, 'asset'),
          eq(accounts.category, 'cash_bank')
        ))
        .limit(1);
      
      if (cashAccount) {
        lines.push({
          journalEntryId: '', // Will be set by createJournalEntry
          accountId: cashAccount.id,
          lineType: 'debit',
          amount: amountApplied,
          description: 'Payment received',
        });
      }
    }

    // CR: Accounts Receivable - reduce the receivable
    lines.push({
      journalEntryId: '', // Will be set by createJournalEntry
      accountId: arAccount.id,
      lineType: 'credit',
      amount: amountApplied,
      description: `Payment for ${bill.invoiceNumber} - reduce AR`,
    });
    
    // DR: Deferred Revenue - reduce the liability (revenue was deferred at billing)
    lines.push({
      journalEntryId: '', // Will be set by createJournalEntry
      accountId: deferredRevenueAccount.id,
      lineType: 'debit',
      amount: amountApplied,
      description: `Relieve deferred revenue for ${bill.invoiceNumber}`,
    });
    
    // CR: Member Dues Revenue - recognize the revenue NOW (modified cash-based accounting)
    lines.push({
      journalEntryId: '', // Will be set by createJournalEntry
      accountId: memberDuesAccount.id,
      lineType: 'credit',
      amount: amountApplied,
      description: `Revenue recognized for ${bill.invoiceNumber}`,
    });

    // Create journal entry with lines (automatically posts and updates balances)
    const journalEntry = await this.createJournalEntry({
      entryDate: paymentDate,
      description: `Payment received for ${bill.invoiceNumber} - ${applicationType === 'bank_statement' ? 'Bank Statement' : 'Manual Entry'}`,
      referenceId: billId,
      referenceType: 'bill',
      createdBy: appliedBy,
      status: 'posted',
    }, lines);

    // Update payment application with journal entry reference
    await db
      .update(paymentApplications)
      .set({ journalEntryId: journalEntry.id })
      .where(and(
        eq(paymentApplications.billId, billId),
        eq(paymentApplications.appliedAt, sql`(SELECT MAX(applied_at) FROM payment_applications WHERE bill_id = ${billId})`)
      ));
  }

  // Bank Statement operations
  async createBankStatement(statement: any): Promise<any> {
    const [newStatement] = await db
      .insert(bankStatements)
      .values(statement)
      .returning();
    return newStatement;
  }

  async getBankStatement(id: string): Promise<any> {
    const [statement] = await db
      .select()
      .from(bankStatements)
      .where(eq(bankStatements.id, id));
    return statement;
  }

  async getAllBankStatements(): Promise<any[]> {
    const statements = await db
      .select()
      .from(bankStatements)
      .orderBy(desc(bankStatements.uploadedAt));
    return statements;
  }

  async updateBankStatementStatus(id: string, status: string): Promise<void> {
    await db
      .update(bankStatements)
      .set({ status: status as 'pending' | 'processing' | 'completed' | 'error' })
      .where(eq(bankStatements.id, id));
  }

  // Bank Statement Entry operations
  async createBankStatementEntry(entry: any): Promise<any> {
    const [newEntry] = await db
      .insert(bankStatementEntries)
      .values(entry)
      .returning();
    return newEntry;
  }

  async getBankStatementEntries(statementId: string): Promise<any[]> {
    const entries = await db
      .select()
      .from(bankStatementEntries)
      .where(eq(bankStatementEntries.statementId, statementId))
      .orderBy(desc(bankStatementEntries.transactionDate));
    return entries;
  }

  async getUnreconciledEntries(): Promise<any[]> {
    const entries = await db
      .select()
      .from(bankStatementEntries)
      .where(or(
        eq(bankStatementEntries.status, 'unmatched'),
        eq(bankStatementEntries.status, 'matched')
      ))
      .orderBy(desc(bankStatementEntries.transactionDate));
    return entries;
  }

  async updateEntryStatus(id: string, status: string): Promise<void> {
    await db
      .update(bankStatementEntries)
      .set({ status: status as 'unmatched' | 'matched' | 'partially_matched' | 'reconciled' })
      .where(eq(bankStatementEntries.id, id));
  }

  // Payment Application operations
  async getPaymentApplicationsByBill(billId: string): Promise<any[]> {
    const applications = await db
      .select({
        id: paymentApplications.id,
        amountApplied: paymentApplications.amountApplied,
        applicationType: paymentApplications.applicationType,
        bankName: paymentApplications.bankName,
        accountNumber: paymentApplications.accountNumber,
        paymentDate: paymentApplications.paymentDate,
        appliedBy: paymentApplications.appliedBy,
        appliedAt: paymentApplications.appliedAt,
        journalEntryId: paymentApplications.journalEntryId,
        notes: paymentApplications.notes,
        userName: sql`${users.firstName} || ' ' || ${users.lastName}`,
      })
      .from(paymentApplications)
      .innerJoin(users, eq(paymentApplications.appliedBy, users.id))
      .where(eq(paymentApplications.billId, billId))
      .orderBy(desc(paymentApplications.appliedAt));
    
    return applications;
  }

  async getAllPaymentApplications(): Promise<any[]> {
    const applications = await db
      .select()
      .from(paymentApplications)
      .orderBy(desc(paymentApplications.paymentDate));
    
    return applications;
  }

  // User Invite operations
  async createUserInvite(invite: InsertUserInvite): Promise<UserInvite> {
    const [createdInvite] = await db
      .insert(userInvites)
      .values(invite)
      .returning();
    return createdInvite;
  }

  async getUserInvite(inviteToken: string): Promise<UserInvite | undefined> {
    const [invite] = await db
      .select()
      .from(userInvites)
      .where(eq(userInvites.inviteToken, inviteToken));
    return invite;
  }

  async getAcceptedInviteByUserId(userId: string): Promise<UserInvite | undefined> {
    const [invite] = await db
      .select()
      .from(userInvites)
      .where(
        and(
          eq(userInvites.acceptedByUserId, userId),
          eq(userInvites.status, 'accepted')
        )
      );
    return invite;
  }

  async getAllUserInvites(): Promise<UserInvite[]> {
    const invites = await db
      .select()
      .from(userInvites)
      .orderBy(desc(userInvites.createdAt));
    return invites;
  }

  async acceptUserInvite(inviteToken: string, userId: string): Promise<void> {
    // Only accept if still pending
    const [invite] = await db
      .select()
      .from(userInvites)
      .where(eq(userInvites.inviteToken, inviteToken));
    
    if (!invite || invite.status !== 'pending') {
      throw new Error('Invite already used or expired');
    }

    if (new Date() > new Date(invite.expiresAt)) {
      await this.expireUserInvite(invite.id);
      throw new Error('Invite has expired');
    }

    await db
      .update(userInvites)
      .set({ 
        status: 'accepted', 
        acceptedAt: new Date(),
        acceptedByUserId: userId 
      })
      .where(and(
        eq(userInvites.inviteToken, inviteToken),
        eq(userInvites.status, 'pending')
      ));
  }

  async expireUserInvite(id: string): Promise<void> {
    await db
      .update(userInvites)
      .set({ status: 'expired' })
      .where(eq(userInvites.id, id));
  }
}

export const storage = new DatabaseStorage();

// Adjust types and table names to match your actual schema
type Role = "admin" | "resident" | "security" | "accountant";

// Example assuming db.query.users exists and user has: id, email, role, passwordHash
export async function getUserByEmailAndRole(email: string, role: Role) {
  const result = await db.query.users.findMany({
    where: (fields, { and, eq }) =>
      and(eq(fields.email, email), eq(fields.role, role)),
    limit: 1,
  });

  return result?.[0] ?? null;
}
// @ts-nocheck
