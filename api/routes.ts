// @ts-nocheck
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requireAdmin, requireAdminOrAccountant, requireSecurity, requireResident } from "./replitAuth";
import { randomBytes } from "crypto";
import { z } from "zod";
import { format } from "date-fns";
import {
  insertAccountSchema,
  insertTransactionTemplateSchema,
  insertJournalEntrySchema,
  insertJournalEntryLineSchema,
  insertVendorSchema,
  insertExpenseSchema,
  bankStatementEntries,
  bills,
  bankStatements,
  paymentApplications,
  accounts,
  journalEntries,
  journalEntryLines,
  type InsertJournalEntryLine

} from "@shared/schema";
import { fromZodError } from "zod-validation-error";
import { db } from "./db";
import { eq, and, sql } from "drizzle-orm";

import type { Role, AuthUser } from "../shared/auth-utils";

// Express-style middleware
export function requireAuth(allowedRoles?: Role[]) {
  return (req: any, res: any, next: any) => {
    const sessionUser: AuthUser | null =
      req.isAuthenticated?.() && req.user?.claims
        ? {
            id: req.user.claims.sub,
            email: req.user.claims.email,
            role: (req.user.claims.role as Role) || "resident",
          }
        : null;

    if (!sessionUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    if (allowedRoles && !allowedRoles.includes(sessionUser.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Attach user to request for later handlers
    (req as any).authUser = sessionUser;
    next();
  };
}


// Payment validation schemas
const payNowSchema = z.object({
  paidFromAccountId: z.string().min(1, "Bank account is required"),
  whtRate: z.string().refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100,
    "WHT rate must be a number between 0 and 100"
  )
});

const payLaterSchema = z.object({
  whtRate: z.string().refine(
    (val) => !isNaN(parseFloat(val)) && parseFloat(val) >= 0 && parseFloat(val) <= 100,
    "WHT rate must be a number between 0 and 100"
  )
});

// Helper to generate unique access codes
function generateAccessCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}

// Helper to check delinquency and update status
async function checkAndUpdateDelinquency(residentId: string) {
  const bills = await storage.getBillsByResidentId(residentId);
  const now = new Date();

  // Check for overdue bills (unpaid bills past due date)
  const overdueBills = bills.filter(
    b => b.status !== "paid" && new Date(b.dueDate) < now
  );

  // Calculate total balance (all unpaid bills)
  const totalBalance = bills
    .filter(b => b.status !== "paid")
    .reduce((sum, b) => sum + parseFloat(b.amount), 0);

  // Update status based on overdue bills only
  // Residents are delinquent if they have ANY overdue bills
  // Residents are active if they have NO overdue bills (future pending bills are OK)
  if (overdueBills.length > 0) {
    await storage.updateResidentStatus(residentId, "delinquent");
  } else {
    await storage.updateResidentStatus(residentId, "active");
  }

  await storage.updateResidentBalance(residentId, totalBalance.toString());
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // ========== AUTH ROUTES ==========
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Complete signup - Creates resident profile for new users
  app.post('/api/signup/complete', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // SECURITY: Prevent role downgrade for admin/security users
      if (user.role && user.role !== "resident") {
        return res.status(403).json({
          message: "Admin and Security accounts cannot use self-signup"
        });
      }

      // Check if user already has a resident profile
      const existingResident = await storage.getResidentByUserId(userId);
      if (existingResident) {
        return res.status(400).json({
          message: "You have already completed signup"
        });
      }

      // Security: Only allow resident role during self-signup
      // Admin and Security accounts must be created by an admin
      const { unitNumber, phoneNumber, serviceCharge } = req.body;

        if (!unitNumber || !unitNumber.trim()) {
          return res.status(400).json({
            message: "Unit number is required"
          });
        }

        // Update user role to resident (security measure - lock the role)
        await storage.upsertUser({
          id: userId,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
          role: "resident", // Force resident role for self-signup
        });

        // Process service charge - convert to decimal string or null
        const validatedServiceCharge = serviceCharge && parseFloat(serviceCharge) > 0
          ? parseFloat(serviceCharge).toFixed(2)
          : null;

        // Automatically set start date to today for self-signup residents
        // Convert to Date object for storage (Drizzle handles timestamp conversion)
        const startDate = new Date();

        // Create resident profile with billing fields
        const resident = await storage.createResident({
          userId,
          unitNumber: unitNumber.trim(),
          phoneNumber: phoneNumber?.trim() || null,
          accountStatus: "active",
          totalBalance: "0",
          serviceCharge: validatedServiceCharge,
          startDate: startDate,
        });

        // Create welcome notification
        await storage.createNotification({
          userId,
          title: "Welcome to Estate Management",
          message: `Your resident account has been created successfully for Unit ${unitNumber}`,
          type: "system",
          isRead: false,
        });

        // Automatically generate first service charge bill if resident is eligible
        try {
          const bill = await storage.generateBillForResident(resident.id, userId);
          if (bill) {
            console.log(`Auto-generated first service charge bill for resident ${resident.unitNumber}`);

            // Send invoice email
            try {
              await storage.sendInvoiceEmailsForBills([bill]);
            } catch (emailError: any) {
              console.error(`Failed to send invoice email for resident ${resident.unitNumber}:`, emailError.message);
              // Don't fail the signup process if email sending fails
            }
          }
        } catch (error) {
          console.error(`Failed to auto-generate bill for resident ${resident.unitNumber}:`, error);
          // Don't fail the signup process if billing fails
        }

        res.json({ success: true, resident });
      } catch (error: any) {
        console.error("Error completing signup:", error);

        // Handle specific database constraint errors
        if (error.code === '23505') {
          if (error.constraint === 'residents_unit_number_unique') {
            return res.status(400).json({
              message: `Unit number "${req.body.unitNumber}" is already assigned to another resident. Please use a different unit number.`
            });
          }
          if (error.constraint === 'residents_user_id_unique') {
            return res.status(400).json({
              message: "You have already completed signup"
            });
          }
        }

        res.status(500).json({ message: "Failed to complete signup" });
      }
    });

    // ========== RESIDENT ROUTES ==========

    // Get resident profile
    app.get("/api/resident/profile", requireAuth(["resident"]), async (req, res) => {
      const user = (req as any).authUser;


          if (!resident) {
            return res.status(404).json({ message: "Resident profile not found" });
          }

          // Update delinquency status
          await checkAndUpdateDelinquency(resident.id);

          // Fetch updated resident
          const updatedResident = await storage.getResident(resident.id);
          res.json(updatedResident);
        } catch (error) {
          console.error("Error fetching resident profile:", error);
          res.status(500).json({ message: "Failed to fetch profile" });
        }
      });

      // Get resident bills
app.get("/api/resident/bills/recent", requireAuth(["resident"]), async (req, res) => {
  const user = (req as any).authUser;

          const resident = await storage.getResidentByUserId(userId);

          if (!resident) {
            return res.status(404).json({ message: "Resident not found" });
          }

          const bills = await storage.getBillsByResidentId(resident.id);
          res.json(bills);
        } catch (error) {
          console.error("Error fetching bills:", error);
          res.status(500).json({ message: "Failed to fetch bills" });
        }
      });

      // Get recent bills
app.get("/api/resident/bills/recent", requireAuth(["resident"]), async (req, res) => {
  const user = (req as any).authUser;
          const resident = await storage.getResidentByUserId(userId);

          if (!resident) {
            return res.status(404).json({ message: "Resident not found" });
          }

          const bills = await storage.getRecentBillsByResidentId(resident.id, 5);
          res.json(bills);
        } catch (error) {
          console.error("Error fetching recent bills:", error);
          res.status(500).json({ message: "Failed to fetch bills" });
        }
      });

      // Generate and download invoice PDF
    app.get("/api/resident/bills/recent", requireAuth(["resident"]), async (req, res) => {
        try {
          const { billId } = req.params;
          const userId = req.user.claims.sub;

          // Get resident profile
          const resident = await storage.getResidentByUserId(userId);
          if (!resident) {
            return res.status(404).json({ message: "Resident not found" });
          }

          // Get bill and verify ownership
          const bill = await storage.getBill(billId);
          if (!bill) {
            return res.status(404).json({ message: "Bill not found" });
          }

          if (bill.residentId !== resident.id) {
            return res.status(403).json({ message: "Access denied" });
          }

          // Get user information for the invoice
          const user = await storage.getUser(userId);
          if (!user) {
            return res.status(404).json({ message: "User not found" });
          }

          // Calculate totals
          const payments = await storage.getPaymentsByBillId(billId);
          const totalPaid = payments
            .filter(p => p.status === "completed")
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);
          const balance = parseFloat(bill.amount) - totalPaid;

          // Import the PDF generator
          const { generateInvoicePDF } = await import('./pdf-invoice');

          // Generate PDF
          const pdfBuffer = await generateInvoicePDF({
            invoiceNumber: bill.invoiceNumber || `INV-${bill.id.slice(0, 8)}`,
            invoiceDate: bill.createdAt || new Date(),
            dueDate: bill.dueDate,
            residentName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Resident',
            unitNumber: resident.unitNumber,
            userId: user.id.slice(0, 8),
            billingPeriod: `${new Date(bill.periodStart).toLocaleDateString()} - ${new Date(bill.periodEnd).toLocaleDateString()}`,
            description: bill.description,
            amount: bill.amount,
            balance: balance.toFixed(2),
            totalPaid: totalPaid.toFixed(2)
          });

          // Set response headers
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="Invoice-${bill.invoiceNumber || bill.id}.pdf"`);
          res.setHeader('Content-Length', pdfBuffer.length);

          // Send PDF
          res.send(pdfBuffer);
        } catch (error: any) {
          console.error("Error generating invoice PDF:", error);
          res.status(500).json({ message: "Failed to generate invoice PDF" });
        }
      });

      // Get resident payments
      app.get('/api/resident/payments', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const resident = await storage.getResidentByUserId(userId);

          if (!resident) {
            return res.status(404).json({ message: "Resident not found" });
          }

          const payments = await storage.getPaymentsByResidentId(resident.id);
          res.json(payments);
        } catch (error) {
          console.error("Error fetching payments:", error);
          res.status(500).json({ message: "Failed to fetch payments" });
        }
      });

      // Get resident visitors
      app.get('/api/resident/visitors', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const resident = await storage.getResidentByUserId(userId);

          if (!resident) {
            return res.status(404).json({ message: "Resident not found" });
          }

          const visitors = await storage.getVisitorsByResidentId(resident.id);
          res.json(visitors);
        } catch (error) {
          console.error("Error fetching visitors:", error);
          res.status(500).json({ message: "Failed to fetch visitors" });
        }
      });

      // Get active visitors
app.get("/api/resident/visitors/active", requireAuth(["resident"]), async (req, res) => {
  const user = (req as any).authUser;
sidentByUserId(userId);

          if (!resident) {
            return res.status(404).json({ message: "Resident not found" });
          }

          const visitors = await storage.getActiveVisitorsByResidentId(resident.id);
          res.json(visitors);
        } catch (error) {
          console.error("Error fetching active visitors:", error);
          res.status(500).json({ message: "Failed to fetch visitors" });
        }
      });

      // Create visitor
      app.post('/api/resident/visitors', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const resident = await storage.getResidentByUserId(userId);

          if (!resident) {
            return res.status(404).json({ message: "Resident not found" });
          }

          // Check if account is delinquent
          if (resident.accountStatus === "delinquent") {
            return res.status(403).json({
              message: "Cannot pre-approve visitors. Please settle your outstanding balance first."
            });
          }

          const { visitorName, visitorPhone, purpose, validFrom, validUntil } = req.body;

          const visitor = await storage.createVisitor({
            residentId: resident.id,
            visitorName,
            visitorPhone,
            purpose,
            accessCode: generateAccessCode(),
            validFrom: new Date(validFrom),
            validUntil: new Date(validUntil),
            status: "approved",
          });

          // Create notification for resident
          await storage.createNotification({
            userId,
            title: "Visitor Access Created",
            message: `QR code generated for ${visitorName}`,
            type: "visitor",
            isRead: false,
          });

          res.json(visitor);
        } catch (error) {
          console.error("Error creating visitor:", error);
          res.status(500).json({ message: "Failed to create visitor access" });
        }
      });

      // ========== ADMIN ROUTES ==========

      // User Invite Management
      app.post('/api/admin/user-invites', requireAdmin, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const { email, role, firstName, lastName, unitNumber } = req.body;

          // Expire any existing pending invites for this email
          const existingInvites = await storage.getAllUserInvites();
          for (const existing of existingInvites) {
            if (existing.email === email && existing.status === 'pending') {
              await storage.expireUserInvite(existing.id);
            }
          }

          // Generate unique invite token
          const inviteToken = randomBytes(32).toString('hex');

          // Set expiration to 7 days from now
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          const invite = await storage.createUserInvite({
            inviteToken,
            email,
            role,
            firstName,
            lastName,
            unitNumber,
            createdBy: userId,
            status: 'pending',
            expiresAt,
            acceptedByUserId: null,
          });

          // Generate invite link
          const inviteLink = `${req.protocol}://${req.get('host')}/invite/${inviteToken}`;

          res.json({
            success: true,
            invite,
            inviteLink,
          });
        } catch (error) {
          console.error("Error creating user invite:", error);
          res.status(500).json({ message: "Failed to create user invite" });
        }
      });

      app.get('/api/admin/user-invites', requireAdmin, async (req: any, res) => {
        try {
          const invites = await storage.getAllUserInvites();
          res.json(invites);
        } catch (error) {
          console.error("Error fetching user invites:", error);
          res.status(500).json({ message: "Failed to fetch user invites" });
        }
      });

      app.delete('/api/admin/user-invites/:id', requireAdmin, async (req: any, res) => {
        try {
          await storage.expireUserInvite(req.params.id);
          res.json({ success: true });
        } catch (error) {
          console.error("Error expiring user invite:", error);
          res.status(500).json({ message: "Failed to expire user invite" });
        }
      });

      // Public endpoint to validate invite token
      app.get('/api/invite/:token', async (req, res) => {
        try {
          const invite = await storage.getUserInvite(req.params.token);

          if (!invite) {
            return res.status(404).json({ message: "Invite not found" });
          }

          if (invite.status !== 'pending') {
            return res.status(400).json({ message: "Invite has already been used or expired" });
          }

          if (new Date() > new Date(invite.expiresAt)) {
            await storage.expireUserInvite(invite.id);
            return res.status(400).json({ message: "Invite has expired" });
          }

          res.json({
            email: invite.email,
            role: invite.role,
            firstName: invite.firstName,
            lastName: invite.lastName,
            unitNumber: invite.unitNumber,
          });
        } catch (error) {
          console.error("Error validating invite:", error);
          res.status(500).json({ message: "Failed to validate invite" });
        }
      });

      // User Management Routes
      app.get('/api/admin/users', requireAdmin, async (req: any, res) => {
        try {
          const users = await storage.getAllUsers();
          res.json(users);
        } catch (error) {
          console.error("Error fetching users:", error);
          res.status(500).json({ message: "Failed to fetch users" });
        }
      });

      app.patch('/api/admin/users/:id', requireAdmin, async (req: any, res) => {
        try {
          const { id } = req.params;
          const updateSchema = z.object({
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            role: z.enum(['resident', 'admin', 'security', 'accountant']).optional(),
          });

          const validatedData = updateSchema.parse(req.body);
          const user = await storage.updateUser(id, validatedData);

          res.json(user);
        } catch (error: any) {
          console.error("Error updating user:", error);
          if (error?.name === 'ZodError') {
            return res.status(400).json({ message: "Invalid user data", errors: error.errors });
          }
          res.status(500).json({ message: "Failed to update user" });
        }
      });

      app.patch('/api/admin/users/:id/deactivate', requireAdmin, async (req: any, res) => {
        try {
          const { id } = req.params;
          const { isActive } = req.body;

          if (typeof isActive !== 'boolean') {
            return res.status(400).json({ message: "isActive must be a boolean" });
          }

          const user = await storage.deactivateUser(id, isActive);
          res.json(user);
        } catch (error) {
          console.error("Error deactivating user:", error);
          res.status(500).json({ message: "Failed to deactivate user" });
        }
      });

      // Store invite token in session before auth redirect
      app.post('/api/store-invite-token', async (req: any, res) => {
        try {
          const { inviteToken } = req.body;

          if (!inviteToken) {
            return res.status(400).json({ message: "Invite token is required" });
          }

          // Store token in session
          req.session.inviteToken = inviteToken;

          res.json({ success: true });
        } catch (error) {
          console.error("Error storing invite token:", error);
          res.status(500).json({ message: "Failed to store invite token" });
        }
      });

      // Get admin stats
      app.get('/api/admin/stats', requireAdmin, async (req: any, res) => {
        try {
          const stats = await storage.getAdminStats();
          res.json(stats);
        } catch (error) {
          console.error("Error fetching admin stats:", error);
          res.status(500).json({ message: "Failed to fetch stats" });
        }
      });

      app.get('/api/admin/dashboard/aging-analysis', requireAdmin, async (req: any, res) => {
        try {
          const data = await storage.getAgingAnalysis();
          res.json(data);
        } catch (error) {
          console.error("Error fetching aging analysis:", error);
          res.status(500).json({ message: "Failed to fetch aging analysis" });
        }
      });

      app.get('/api/admin/dashboard/budget-vs-expenses', requireAdmin, async (req: any, res) => {
        try {
          const data = await storage.getBudgetVsExpensesMonthToDate();
          res.json(data);
        } catch (error) {
          console.error("Error fetching budget vs expenses:", error);
          res.status(500).json({ message: "Failed to fetch budget vs expenses" });
        }
      });

      app.get('/api/admin/dashboard/collections-expenses', requireAdmin, async (req: any, res) => {
        try {
          const data = await storage.getCollectionsExpensesByMonth();
          res.json(data);
        } catch (error) {
          console.error("Error fetching collections vs expenses:", error);
          res.status(500).json({ message: "Failed to fetch collections vs expenses" });
        }
      });

      // Get all residents
      // Get all collections (payment applications) - admin only
      app.get('/api/admin/collections', requireAdmin, async (req: any, res) => {
        try {
          const collections = await storage.getAllCollections();
          res.json(collections);
        } catch (error) {
          console.error("Error fetching collections:", error);
          res.status(500).json({ message: "Failed to fetch collections" });
        }
      });

      // Get current subscription - admin only
      app.get('/api/admin/subscription', requireAdmin, async (req: any, res) => {
        try {
          const subscription = await storage.getSubscription();
          res.json(subscription);
        } catch (error) {
          console.error("Error fetching subscription:", error);
          res.status(500).json({ message: "Failed to fetch subscription" });
        }
      });

      // Update subscription - admin only
      app.post('/api/admin/subscription', requireAdmin, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;

          // Validate request body
          const updateSchema = z.object({
            plan: z.enum(['starter', 'professional', 'enterprise']),
            billingCycle: z.enum(['monthly', 'annual']),
            estateName: z.string().optional(),
          });

          const validatedData = updateSchema.parse(req.body);

          const subscription = await storage.updateSubscription(validatedData, userId);
          res.json(subscription);
        } catch (error: any) {
          console.error("Error updating subscription:", error);
          if (error?.name === 'ZodError') {
            return res.status(400).json({ message: "Invalid subscription data", errors: error.errors });
          }
          res.status(500).json({ message: "Failed to update subscription" });
        }
      });

      app.get('/api/admin/residents', requireAdmin, async (req: any, res) => {
        try {
          const residents = await storage.getAllResidents();
          res.json(residents);
        } catch (error) {
          console.error("Error fetching residents:", error);
          res.status(500).json({ message: "Failed to fetch residents" });
        }
      });

      // Get bills for a specific resident (admin only)
      app.get('/api/admin/residents/:residentId/bills', requireAdmin, async (req: any, res) => {
        try {

          const { residentId } = req.params;
          const bills = await storage.getBillsByResidentId(residentId);
          res.json(bills);
        } catch (error) {
          console.error("Error fetching resident bills:", error);
          res.status(500).json({ message: "Failed to fetch bills" });
        }
      });

      // Generate and download invoice PDF for a specific resident's bill (admin only)
      app.get('/api/admin/residents/:residentId/bills/:billId/pdf', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          const { residentId, billId } = req.params;

          // Get bill and verify it belongs to the specified resident
          const bill = await storage.getBill(billId);
          if (!bill) {
            return res.status(404).json({ message: "Bill not found" });
          }

          if (bill.residentId !== residentId) {
            return res.status(403).json({ message: "Bill does not belong to this resident" });
          }

          // Get resident information
          const resident = await storage.getResident(residentId);
          if (!resident) {
            return res.status(404).json({ message: "Resident not found" });
          }

          // Get user information
          const residentUser = await storage.getUser(resident.userId);
          if (!residentUser) {
            return res.status(404).json({ message: "Resident user not found" });
          }

          // Calculate totals
          const payments = await storage.getPaymentsByBillId(billId);
          const totalPaid = payments
            .filter(p => p.status === "completed")
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);
          const balance = parseFloat(bill.amount) - totalPaid;

          // Import the PDF generator
          const { generateInvoicePDF } = await import('./pdf-invoice');

          // Generate PDF
          const pdfBuffer = await generateInvoicePDF({
            invoiceNumber: bill.invoiceNumber || `INV-${bill.id.slice(0, 8)}`,
            invoiceDate: bill.createdAt || new Date(),
            dueDate: bill.dueDate,
            residentName: `${residentUser.firstName || ''} ${residentUser.lastName || ''}`.trim() || 'Resident',
            unitNumber: resident.unitNumber,
            userId: residentUser.id.slice(0, 8),
            billingPeriod: `${new Date(bill.periodStart).toLocaleDateString()} - ${new Date(bill.periodEnd).toLocaleDateString()}`,
            description: bill.description,
            amount: bill.amount,
            balance: balance.toFixed(2),
            totalPaid: totalPaid.toFixed(2)
          });

          // Set response headers
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="Invoice-${bill.invoiceNumber || bill.id}.pdf"`);
          res.setHeader('Content-Length', pdfBuffer.length);

          // Send PDF
          res.send(pdfBuffer);
        } catch (error: any) {
          console.error("Error generating invoice PDF for admin:", error);
          res.status(500).json({ message: "Failed to generate invoice PDF" });
        }
      });

      // Send invoice email for a specific bill (admin only)
      app.post('/api/admin/bills/:billId/send-email', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          const { billId } = req.params;
          const bill = await storage.getBill(billId);

          if (!bill) {
            return res.status(404).json({ message: "Bill not found" });
          }

          const result = await storage.sendInvoiceEmailsForBills([bill]);

          if (result.sent > 0) {
            res.json({
              message: "Invoice email sent successfully",
              sent: result.sent,
              failed: result.failed
            });
          } else {
            res.status(500).json({
              message: "Failed to send invoice email",
              sent: result.sent,
              failed: result.failed
            });
          }
        } catch (error) {
          console.error("Error sending invoice email:", error);
          res.status(500).json({ message: "Failed to send invoice email" });
        }
      });

      // Send invoice emails for multiple bills (admin only)
      app.post('/api/admin/bills/send-emails', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          const { billIds } = req.body;

          if (!Array.isArray(billIds) || billIds.length === 0) {
            return res.status(400).json({ message: "Please provide an array of bill IDs" });
          }

          // Fetch all bills
          const bills = await Promise.all(
            billIds.map(id => storage.getBill(id))
          );

          const validBills = bills.filter(bill => bill !== undefined);

          if (validBills.length === 0) {
            return res.status(404).json({ message: "No valid bills found" });
          }

          const result = await storage.sendInvoiceEmailsForBills(validBills);

          res.json({
            message: `Sent ${result.sent} invoice emails successfully`,
            sent: result.sent,
            failed: result.failed,
            total: validBills.length
          });
        } catch (error) {
          console.error("Error sending invoice emails:", error);
          res.status(500).json({ message: "Failed to send invoice emails" });
        }
      });

      // Get payments for a specific resident (admin only)
      app.get('/api/admin/residents/:residentId/payments', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          const { residentId } = req.params;
          const payments = await storage.getPaymentsByResidentId(residentId);
          res.json(payments);
        } catch (error) {
          console.error("Error fetching resident payments:", error);
          res.status(500).json({ message: "Failed to fetch payments" });
        }
      });

      // Create resident
      app.post('/api/admin/residents', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          const {
            email,
            firstName,
            lastName,
            unitNumber,
            streetName,
            phoneNumber,
            moveInDate,
            occupancyType,
            numberOfOccupants,
            propertySize,
            bedrooms,
            parkingSpaces,
            emergencyContactName,
            emergencyContactPhone,
            emergencyContactRelationship,
            vehicles,
            specialNotes,
            serviceCharge,
            startDate,
          } = req.body;

          // Validate and normalize serviceCharge
          let validatedServiceCharge: string | null = null;
          if (serviceCharge !== undefined && serviceCharge !== null && serviceCharge !== "") {
            const numericValue = Number(serviceCharge);
            if (isNaN(numericValue)) {
              return res.status(400).json({
                message: "Service charge must be a valid number"
              });
            }
            validatedServiceCharge = numericValue.toFixed(2);
          }

          // Parse and validate start date
          // Note: endDate is system-managed and set automatically when bills are generated
          let validatedStartDate: Date | null = null;
          if (startDate !== undefined) {
            if (startDate && startDate !== "") {
              const parsedStart = new Date(startDate);
              if (isNaN(parsedStart.getTime())) {
                return res.status(400).json({
                  message: "Start date is invalid"
                });
              }
              validatedStartDate = parsedStart;
            } else {
              validatedStartDate = null;
            }
          }

          // Create user account
          const newUser = await storage.upsertUser({
            email,
            firstName,
            lastName,
            role: "resident",
          });

          // Process vehicles - convert from textarea string to array
          const vehicleArray = vehicles
            ? vehicles.split('\n').filter((v: string) => v.trim()).map((v: string) => v.trim())
            : null;

          // Create resident profile with comprehensive data
          const resident = await storage.createResident({
            userId: newUser.id,
            unitNumber,
            streetName,
            phoneNumber,
            accountStatus: "active",
            totalBalance: "0",
            // Comprehensive fields
            moveInDate: moveInDate ? new Date(moveInDate) : null,
            occupancyType,
            numberOfOccupants: numberOfOccupants ? parseInt(numberOfOccupants) : null,
            propertySize,
            bedrooms: bedrooms ? parseInt(bedrooms) : null,
            parkingSpaces: parkingSpaces ? parseInt(parkingSpaces) : 0,
            emergencyContactName,
            emergencyContactPhone,
            emergencyContactRelationship,
            vehicles: vehicleArray,
            specialNotes,
            serviceCharge: validatedServiceCharge,
            startDate: validatedStartDate,
            // Note: endDate is NOT set here - it's system-managed by automated billing
          });

          // Create welcome notification
          await storage.createNotification({
            userId: newUser.id,
            title: "Welcome to Estate Management",
            message: "Your resident account has been created successfully",
            type: "system",
            isRead: false,
          });

          // Automatically generate first service charge bill if resident is eligible
          try {
            const bill = await storage.generateBillForResident(resident.id, userId);
            if (bill) {
              console.log(`Auto-generated first service charge bill for resident ${resident.unitNumber}`);

              // Send invoice email
              try {
                const emailResult = await storage.sendInvoiceEmailsForBills([bill]);
                if (emailResult.failed > 0) {
                  console.error(`⚠️  Invoice email failed for resident ${resident.unitNumber} (Unit ${resident.unitNumber})`);
                  console.error(`    Check the logs above for Resend domain verification requirements.`);
                }
              } catch (emailError: any) {
                console.error(`❌ Failed to send invoice email for resident ${resident.unitNumber}:`, emailError.message);
                // Don't fail the resident creation process if email sending fails
              }
            }
          } catch (error) {
            console.error(`Failed to auto-generate bill for resident ${resident.unitNumber}:`, error);
            // Don't fail the resident creation process if billing fails
          }

          res.json(resident);
        } catch (error: any) {
          console.error("Error creating resident:", error);

          // Handle specific database constraint errors
          if (error.code === '23505') {
            if (error.constraint === 'residents_unit_number_unique') {
              return res.status(400).json({
                message: `Unit number "${req.body.unitNumber}" is already assigned to another resident. Please use a different unit number.`
              });
            }
            if (error.constraint === 'users_email_unique') {
              return res.status(400).json({
                message: `Email address "${req.body.email}" is already in use. Please use a different email.`
              });
            }
          }

          res.status(500).json({ message: "Failed to create resident" });
        }
      });

      // Update resident
      app.patch('/api/admin/residents/:id', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          const { id } = req.params;
          const {
            unitNumber,
            streetName,
            phoneNumber,
            moveInDate,
            occupancyType,
            numberOfOccupants,
            propertySize,
            bedrooms,
            parkingSpaces,
            emergencyContactName,
            emergencyContactPhone,
            emergencyContactRelationship,
            vehicles,
            specialNotes,
            serviceCharge,
            startDate,
          } = req.body;

          // Note: endDate is system-managed and cannot be updated manually
          // It is automatically set when bills are generated

          // Validate and normalize all fields
          let validatedServiceCharge: string | null | undefined = undefined;
          if (serviceCharge !== undefined && serviceCharge !== null && serviceCharge !== "") {
            const numericValue = Number(serviceCharge);
            if (isNaN(numericValue)) {
              return res.status(400).json({
                message: "Service charge must be a valid number"
              });
            }
            validatedServiceCharge = numericValue.toFixed(2);
          } else if (serviceCharge === null || serviceCharge === "") {
            validatedServiceCharge = null;
          }

          // Parse and validate start date
          let validatedStartDate: Date | null | undefined = undefined;
          if (startDate !== undefined) {
            if (startDate) {
              const parsedStart = new Date(startDate);
              if (isNaN(parsedStart.getTime())) {
                return res.status(400).json({
                  message: "Start date is invalid"
                });
              }
              validatedStartDate = parsedStart;
            } else {
              validatedStartDate = null;
            }
          }

          // Normalize numeric fields (explicit checks to handle 0 correctly)
          let validatedOccupants: number | null | undefined = undefined;
          if (numberOfOccupants !== undefined) {
            if (numberOfOccupants !== null && numberOfOccupants !== "") {
              const num = Number(numberOfOccupants);
              validatedOccupants = isNaN(num) ? null : num;
            } else {
              validatedOccupants = null;
            }
          }

          let validatedBedrooms: number | null | undefined = undefined;
          if (bedrooms !== undefined) {
            if (bedrooms !== null && bedrooms !== "") {
              const num = Number(bedrooms);
              validatedBedrooms = isNaN(num) ? null : num;
            } else {
              validatedBedrooms = null;
            }
          }

          let validatedParkingSpaces: number | undefined = undefined;
          if (parkingSpaces !== undefined) {
            if (parkingSpaces !== null && parkingSpaces !== "") {
              const num = Number(parkingSpaces);
              validatedParkingSpaces = isNaN(num) ? 0 : num;
            } else {
              validatedParkingSpaces = 0;
            }
          }

          let validatedMoveInDate: Date | null | undefined = undefined;
          if (moveInDate !== undefined) {
            if (moveInDate !== null && moveInDate !== "") {
              validatedMoveInDate = new Date(moveInDate);
            } else {
              validatedMoveInDate = null;
            }
          }

          // Process vehicles - convert from textarea string to array
          const vehicleArray = vehicles !== undefined
            ? (typeof vehicles === 'string'
              ? vehicles.split('\n').filter((v: string) => v.trim()).map((v: string) => v.trim())
              : vehicles)
            : undefined;

          // Build update data object using validated values
          const updateData: any = {};
          if (unitNumber !== undefined) updateData.unitNumber = unitNumber;
          if (streetName !== undefined) updateData.streetName = streetName;
          if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
          if (validatedMoveInDate !== undefined) updateData.moveInDate = validatedMoveInDate;
          if (occupancyType !== undefined) updateData.occupancyType = occupancyType;
          if (validatedOccupants !== undefined) updateData.numberOfOccupants = validatedOccupants;
          if (propertySize !== undefined) updateData.propertySize = propertySize;
          if (validatedBedrooms !== undefined) updateData.bedrooms = validatedBedrooms;
          if (validatedParkingSpaces !== undefined) updateData.parkingSpaces = validatedParkingSpaces;
          if (emergencyContactName !== undefined) updateData.emergencyContactName = emergencyContactName;
          if (emergencyContactPhone !== undefined) updateData.emergencyContactPhone = emergencyContactPhone;
          if (emergencyContactRelationship !== undefined) updateData.emergencyContactRelationship = emergencyContactRelationship;
          if (vehicleArray !== undefined) updateData.vehicles = vehicleArray;
          if (specialNotes !== undefined) updateData.specialNotes = specialNotes;
          if (validatedServiceCharge !== undefined) updateData.serviceCharge = validatedServiceCharge;
          if (validatedStartDate !== undefined) updateData.startDate = validatedStartDate;
          // Note: endDate is NOT included - it's system-managed by automated billing

          const resident = await storage.updateResident(id, updateData);
          res.json(resident);
        } catch (error: any) {
          console.error("Error updating resident:", error);

          if (error.code === '23505' && error.constraint === 'residents_unit_number_unique') {
            return res.status(400).json({
              message: `Unit number "${req.body.unitNumber}" is already assigned to another resident.`
            });
          }

          res.status(500).json({ message: "Failed to update resident" });
        }
      });

      // Toggle resident status
      app.patch('/api/admin/residents/:id/status', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          const { id } = req.params;
          const { status } = req.body;

          if (!status || !['active', 'inactive', 'deactivated'].includes(status)) {
            return res.status(400).json({ message: "Invalid status value" });
          }

          await storage.updateResidentStatus(id, status);
          const resident = await storage.getResident(id);
          res.json(resident);
        } catch (error) {
          console.error("Error updating resident status:", error);
          res.status(500).json({ message: "Failed to update resident status" });
        }
      });

      // Get account status with filters
      app.get('/api/admin/account-status', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          const { startDate, endDate, residentId } = req.query;

          // Get all residents, bills, and payments
          const [residentsData, allBills, allPayments] = await Promise.all([
            storage.getAllResidents(),
            storage.getAllBills(),
            storage.getAllPayments()
          ]);

          // Apply filters consistently to bills and payments first
          let filteredBills = allBills;
          let filteredPayments = allPayments;

          // Filter by resident ID (if specified)
          if (residentId && typeof residentId === 'string' && residentId.trim() !== '') {
            // Filter bills and payments to only the selected resident
            filteredBills = filteredBills.filter(b => b.residentId === residentId);
            filteredPayments = filteredPayments.filter(p => p.residentId === residentId);
          }

          // Filter by date range (if specified)
          if (startDate || endDate) {
            const start = startDate ? new Date(startDate as string) : null;
            const end = endDate ? new Date(endDate as string) : null;

            filteredBills = filteredBills.filter(bill => {
              const billDate = new Date(bill.createdAt);
              if (start && end) {
                return billDate >= start && billDate <= end;
              } else if (start) {
                return billDate >= start;
              } else if (end) {
                return billDate <= end;
              }
              return true;
            });

            filteredPayments = filteredPayments.filter(payment => {
              const paymentDate = new Date(payment.createdAt);
              if (start && end) {
                return paymentDate >= start && paymentDate <= end;
              } else if (start) {
                return paymentDate >= start;
              } else if (end) {
                return paymentDate <= end;
              }
              return true;
            });
          }

          // Count unique residents from filtered bills and payments
          const billResidentIds = new Set(filteredBills.map(b => b.residentId));
          const paymentResidentIds = new Set(filteredPayments.map(p => p.residentId));
          const activeResidentIds = new Set([...billResidentIds, ...paymentResidentIds]);
          const totalResidents = activeResidentIds.size;
          const totalBilled = filteredBills.reduce((sum, bill) => sum + parseFloat(bill.amount), 0);
          const totalCollected = filteredPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
          const totalOutstanding = totalBilled - totalCollected;

          // Calculate aging analysis (only for overdue bills)
          const now = new Date();
          const agingBuckets = {
            current: 0,           // Not yet due
            '1-30': 0,           // 1-30 days overdue
            '31-60': 0,          // 31-60 days overdue
            '61-90': 0,          // 61-90 days overdue
            '90+': 0,            // 90+ days overdue
          };

          filteredBills.forEach(bill => {
            if (bill.status !== 'paid') {
              const dueDate = new Date(bill.dueDate);
              const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
              const amount = parseFloat(bill.amount);

              if (daysOverdue < 0) {
                agingBuckets.current += amount;
              } else if (daysOverdue <= 30) {
                agingBuckets['1-30'] += amount;
              } else if (daysOverdue <= 60) {
                agingBuckets['31-60'] += amount;
              } else if (daysOverdue <= 90) {
                agingBuckets['61-90'] += amount;
              } else {
                agingBuckets['90+'] += amount;
              }
            }
          });

          res.json({
            summary: {
              totalResidents,
              totalBilled,
              totalCollected,
              totalOutstanding,
            },
            aging: agingBuckets,
          });
        } catch (error) {
          console.error("Error fetching account status:", error);
          res.status(500).json({ message: "Failed to fetch account status" });
        }
      });

      // ========== REPORTS CENTER ENDPOINTS ==========

      // Visitor Activity Report
      app.get('/api/admin/reports/visitor-activity', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          const visitors = await storage.getAllVisitors();
          const residentsData = await storage.getAllResidents();

          // Count by status
          const statusCounts = visitors.reduce((acc, v) => {
            acc[v.status] = (acc[v.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          // Prepare visitor data with resident names
          const visitorsWithDetails = await Promise.all(
            visitors.slice(0, 100).map(async (visitor) => {
              const resident = residentsData.find(r => r.residents.id === visitor.residentId);
              const residentUser = resident ? await storage.getUser(resident.residents.userId) : null;

              return {
                visitorName: visitor.name,
                residentName: residentUser ? `${residentUser.firstName} ${residentUser.lastName}` : 'Unknown',
                visitDate: visitor.visitDate,
                status: visitor.status,
                accessCode: visitor.accessCode
              };
            })
          );

          res.json({
            summary: {
              totalVisitors: visitors.length,
              approved: statusCounts['approved'] || 0,
              pending: statusCounts['pending'] || 0,
              rejected: statusCounts['rejected'] || 0,
            },
            visitors: visitorsWithDetails
          });
        } catch (error) {
          console.error("Error generating visitor activity report:", error);
          res.status(500).json({ message: "Failed to generate report" });
        }
      });

      // Account Status Report
      app.get('/api/admin/reports/account-status', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          const residentsData = await storage.getAllResidents();
          const allBills = await storage.getAllBills();
          const allPayments = await storage.getAllPayments();

          const residentsWithStatus = await Promise.all(
            residentsData.map(async (item) => {
              const residentBills = allBills.filter(b => b.residentId === item.residents.id);
              const residentPayments = allPayments.filter(p => p.residentId === item.residents.id);

              const totalBilled = residentBills.reduce((sum, b) => sum + parseFloat(b.amount), 0);
              const totalPaid = residentPayments
                .filter(p => p.status === "completed")
                .reduce((sum, p) => sum + parseFloat(p.amount), 0);
              const balance = totalBilled - totalPaid;

              // Count overdue bills (14 days grace period)
              const now = new Date();
              const overdueBills = residentBills.filter(bill => {
                const createdDate = new Date(bill.createdAt);
                const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
                return bill.status !== 'paid' && daysSinceCreated > 14;
              }).length;

              return {
                name: `${item.users.firstName} ${item.users.lastName}`,
                unitNumber: item.residents.unitNumber,
                accountStatus: item.residents.accountStatus,
                balance: balance.toFixed(2),
                overdueBills
              };
            })
          );

          const activeCount = residentsWithStatus.filter(r => r.accountStatus === 'active').length;
          const delinquentCount = residentsWithStatus.filter(r => parseFloat(r.balance) > 0 && r.overdueBills > 0).length;

          res.json({
            summary: {
              totalResidents: residentsData.length,
              active: activeCount,
              delinquent: delinquentCount
            },
            residents: residentsWithStatus
          });
        } catch (error) {
          console.error("Error generating account status report:", error);
          res.status(500).json({ message: "Failed to generate report" });
        }
      });

      // Overdue Bills Report
      app.get('/api/admin/reports/overdue-bills', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          const allBills = await storage.getAllBills();
          const residentsData = await storage.getAllResidents();
          const now = new Date();

          // Filter overdue bills (14 days grace period from creation date)
          const overdueBills = allBills.filter(bill => {
            if (bill.status === 'paid') return false;
            const createdDate = new Date(bill.createdAt);
            const daysSinceCreated = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
            return daysSinceCreated > 14;
          });

          // Calculate aging buckets
          let aging_0_30 = 0;
          let aging_31_60 = 0;
          let aging_60_plus = 0;
          let totalOverdue = 0;

          const billsWithDetails = await Promise.all(
            overdueBills.map(async (bill) => {
              const resident = residentsData.find(r => r.residents.id === bill.residentId);
              const createdDate = new Date(bill.createdAt);
              const daysOverdue = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) - 14;
              const amount = parseFloat(bill.amount);

              totalOverdue += amount;
              if (daysOverdue <= 30) {
                aging_0_30 += amount;
              } else if (daysOverdue <= 60) {
                aging_31_60 += amount;
              } else {
                aging_60_plus += amount;
              }

              return {
                residentName: resident ? `${resident.users.firstName} ${resident.users.lastName}` : 'Unknown',
                unitNumber: resident?.residents.unitNumber || 'N/A',
                description: bill.description,
                amount: bill.amount,
                dueDate: bill.dueDate,
                daysOverdue
              };
            })
          );

          res.json({
            summary: {
              totalOverdue: totalOverdue.toFixed(2),
              aging_0_30: aging_0_30.toFixed(2),
              aging_31_60: aging_31_60.toFixed(2),
              aging_60_plus: aging_60_plus.toFixed(2)
            },
            bills: billsWithDetails
          });
        } catch (error) {
          console.error("Error generating overdue bills report:", error);
          res.status(500).json({ message: "Failed to generate report" });
        }
      });

      // Collections Summary Report
      app.get('/api/admin/reports/collections-summary', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          const allPayments = await storage.getAllPayments();
          const completedPayments = allPayments.filter(p => p.status === 'completed');

          const totalCollections = completedPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
          const paymentCount = completedPayments.length;
          const averagePayment = paymentCount > 0 ? totalCollections / paymentCount : 0;

          // Group by payment method
          const byMethod = Object.entries(
            completedPayments.reduce((acc, p) => {
              const method = p.paymentMethod || 'unknown';
              if (!acc[method]) {
                acc[method] = { total: 0, count: 0 };
              }
              acc[method].total += parseFloat(p.amount);
              acc[method].count += 1;
              return acc;
            }, {} as Record<string, { total: number; count: number }>)
          ).map(([method, data]) => ({
            paymentMethod: method,
            total: data.total.toFixed(2),
            count: data.count,
            percentage: ((data.total / totalCollections) * 100).toFixed(1)
          }));

          res.json({
            summary: {
              totalCollections: totalCollections.toFixed(2),
              paymentCount,
              averagePayment: averagePayment.toFixed(2)
            },
            byMethod
          });
        } catch (error) {
          console.error("Error generating collections summary report:", error);
          res.status(500).json({ message: "Failed to generate report" });
        }
      });

      // Revenue Analysis Report
      app.get('/api/admin/reports/revenue-analysis', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          const allBills = await storage.getAllBills();
          const allPayments = await storage.getAllPayments();

          const totalBilled = allBills.reduce((sum, b) => sum + parseFloat(b.amount), 0);
          const totalCollected = allPayments
            .filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);
          const outstanding = totalBilled - totalCollected;
          const collectionRate = totalBilled > 0 ? ((totalCollected / totalBilled) * 100).toFixed(1) : '0';

          // Group by month for trend analysis
          const monthlyData = allBills.reduce((acc, bill) => {
            const month = new Date(bill.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            if (!acc[month]) {
              acc[month] = { billed: 0, collected: 0 };
            }
            acc[month].billed += parseFloat(bill.amount);
            return acc;
          }, {} as Record<string, { billed: number; collected: number }>);

          // Add payment data to monthly
          allPayments.filter(p => p.status === 'completed').forEach(payment => {
            const month = new Date(payment.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
            if (monthlyData[month]) {
              monthlyData[month].collected += parseFloat(payment.amount);
            }
          });

          const monthly = Object.entries(monthlyData).map(([month, data]) => ({
            month,
            billed: data.billed.toFixed(2),
            collected: data.collected.toFixed(2),
            collectionRate: data.billed > 0 ? ((data.collected / data.billed) * 100).toFixed(1) : '0'
          })).slice(-6); // Last 6 months

          res.json({
            summary: {
              totalBilled: totalBilled.toFixed(2),
              totalCollected: totalCollected.toFixed(2),
              collectionRate,
              outstanding: outstanding.toFixed(2)
            },
            monthly
          });
        } catch (error) {
          console.error("Error generating revenue analysis report:", error);
          res.status(500).json({ message: "Failed to generate report" });
        }
      });

      // Accounts Receivable Aging Report
      app.get('/api/admin/reports/ar-aging', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          const allBills = await storage.getAllBills();
          const allPayments = await storage.getAllPayments();
          const residentsData = await storage.getAllResidents();
          const now = new Date();

          // Calculate AR by resident with aging
          const arByResident = await Promise.all(
            residentsData.map(async (item) => {
              const residentBills = allBills.filter(b => b.residentId === item.residents.id && b.status !== 'paid');
              const residentPayments = allPayments.filter(p => p.residentId === item.residents.id && p.status === 'completed');

              const totalBilled = residentBills.reduce((sum, b) => sum + parseFloat(b.amount), 0);
              const totalPaid = residentPayments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

              let current = 0, days_1_30 = 0, days_31_60 = 0, days_60_plus = 0;

              residentBills.forEach(bill => {
                const dueDate = new Date(bill.dueDate);
                const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
                const amount = parseFloat(bill.amount);

                if (daysOverdue <= 0) {
                  current += amount;
                } else if (daysOverdue <= 30) {
                  days_1_30 += amount;
                } else if (daysOverdue <= 60) {
                  days_31_60 += amount;
                } else {
                  days_60_plus += amount;
                }
              });

              return {
                residentName: `${item.users.firstName} ${item.users.lastName}`,
                unitNumber: item.residents.unitNumber,
                current: current.toFixed(2),
                days_1_30: days_1_30.toFixed(2),
                days_31_60: days_31_60.toFixed(2),
                days_60_plus: days_60_plus.toFixed(2),
                total: (current + days_1_30 + days_31_60 + days_60_plus).toFixed(2)
              };
            })
          );

          // Calculate totals
          const summary = arByResident.reduce((acc, r) => {
            acc.totalAR += parseFloat(r.total);
            acc.current += parseFloat(r.current);
            acc.days_1_30 += parseFloat(r.days_1_30);
            acc.days_31_60 += parseFloat(r.days_31_60);
            acc.days_60_plus += parseFloat(r.days_60_plus);
            return acc;
          }, { totalAR: 0, current: 0, days_1_30: 0, days_31_60: 0, days_60_plus: 0 });

          res.json({
            summary: {
              totalAR: summary.totalAR.toFixed(2),
              current: summary.current.toFixed(2),
              days_1_30: summary.days_1_30.toFixed(2),
              days_31_60: summary.days_31_60.toFixed(2),
              days_60_plus: summary.days_60_plus.toFixed(2)
            },
            details: arByResident.filter(r => parseFloat(r.total) > 0)
          });
        } catch (error) {
          console.error("Error generating AR aging report:", error);
          res.status(500).json({ message: "Failed to generate report" });
        }
      });

      // Budget Performance Report
      app.get('/api/admin/reports/budget-performance', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          const budgets = await storage.getAllBudgets();
          const expenses = await storage.getAllExpenses();

          // Get active budget
          const activeBudget = budgets.find(b => b.status === 'active');

          if (!activeBudget) {
            return res.json({
              summary: {
                totalBudget: '0.00',
                actualSpent: '0.00',
                variance: '0.00',
                utilization: '0'
              },
              categories: []
            });
          }

          // Get budget items
          const budgetItems = await storage.getBudgetItems(activeBudget.id);

          // Calculate actual spending by category
          const approvedExpenses = expenses.filter(e => e.status === 'approved' || e.status === 'paid');

          const categories = budgetItems.map(item => {
            const categoryExpenses = approvedExpenses.filter(e => e.accountId === item.accountId);
            const actualSpent = categoryExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
            const budgetAmount = parseFloat(item.amount);
            const variance = budgetAmount - actualSpent;
            const percentUsed = budgetAmount > 0 ? ((actualSpent / budgetAmount) * 100).toFixed(1) : '0';

            return {
              name: item.description || `Account ${item.accountId}`,
              budget: budgetAmount.toFixed(2),
              actual: actualSpent.toFixed(2),
              variance: variance.toFixed(2),
              percentUsed
            };
          });

          const totalBudget = budgetItems.reduce((sum, item) => sum + parseFloat(item.amount), 0);
          const actualSpent = approvedExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
          const variance = totalBudget - actualSpent;
          const utilization = totalBudget > 0 ? ((actualSpent / totalBudget) * 100).toFixed(1) : '0';

          res.json({
            summary: {
              totalBudget: totalBudget.toFixed(2),
              actualSpent: actualSpent.toFixed(2),
              variance: variance.toFixed(2),
              utilization
            },
            categories
          });
        } catch (error) {
          console.error("Error generating budget performance report:", error);
          res.status(500).json({ message: "Failed to generate report" });
        }
      });

      // Resident Service Charge Summary Report
      app.get('/api/admin/reports/resident-service-charge-summary', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          const residents = await storage.getAllResidents();
          const allBills = await storage.getAllBills();
          const allPayments = await storage.getAllPayments();

          const reportData = await Promise.all(residents.map(async (resident: any) => {
            // Filter for service charge bills only (billingType: "Estate Maintenance") and exclude void/cancelled bills
            const residentBills = allBills.filter(b =>
              b.residentId === resident.id &&
              (b.billingType === "Estate Maintenance" || b.billingType === "Service Charge") &&
              b.status !== 'void' &&
              b.status !== 'cancelled'
            );
            const totalServiceCharge = residentBills.reduce((sum, bill) => sum + parseFloat(bill.amount), 0);

            // Calculate payments for these specific service charge bills
            const billIds = residentBills.map(b => b.id);
            const residentPayments = allPayments.filter(p =>
              billIds.includes(p.billId) &&
              p.status === 'completed'
            );
            const amountPaid = residentPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

            const outstandingBalance = totalServiceCharge - amountPaid;

            return {
              resident: resident.user ? `${resident.user.firstName || ''} ${resident.user.lastName || ''}`.trim() : 'N/A',
              houseNo: resident.unitNumber,
              phone: resident.phoneNumber || 'N/A',
              totalServiceCharge: totalServiceCharge.toFixed(2),
              amountPaid: amountPaid.toFixed(2),
              outstandingBalance: outstandingBalance.toFixed(2)
            };
          }));

          const summary = {
            totalResidents: residents.length,
            totalServiceCharge: reportData.reduce((sum, r) => sum + parseFloat(r.totalServiceCharge), 0).toFixed(2),
            totalAmountPaid: reportData.reduce((sum, r) => sum + parseFloat(r.amountPaid), 0).toFixed(2),
            totalOutstanding: reportData.reduce((sum, r) => sum + parseFloat(r.outstandingBalance), 0).toFixed(2)
          };

          res.json({
            summary,
            residents: reportData
          });
        } catch (error) {
          console.error("Error generating resident service charge summary:", error);
          res.status(500).json({ message: "Failed to generate report" });
        }
      });

      // Expense Report
      app.get('/api/admin/reports/expense-report', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          const { startDate, endDate, vendorId, approvalStatus, paymentStatus } = req.query;

          let expenses = await storage.getAllExpenses();
          const vendors = await storage.getAllVendors();
          const accounts = await storage.getAllAccounts();

          if (startDate) {
            expenses = expenses.filter(e => new Date(e.createdAt) >= new Date(startDate as string));
          }

          if (endDate) {
            expenses = expenses.filter(e => new Date(e.createdAt) <= new Date(endDate as string));
          }

          if (vendorId) {
            expenses = expenses.filter(e => e.vendorId === vendorId);
          }

          if (approvalStatus) {
            expenses = expenses.filter(e => e.status === approvalStatus);
          }

          if (paymentStatus) {
            expenses = expenses.filter(e => e.paymentStatus === paymentStatus);
          }

          const reportData = expenses.map(expense => {
            const vendor = vendors.find(v => v.id === expense.vendorId);
            const account = accounts.find(a => a.id === expense.accountId);

            return {
              id: expense.id,
              date: format(new Date(expense.createdAt), 'dd-MMM-yyyy'),
              vendor: vendor?.name || 'N/A',
              description: expense.description,
              category: account?.name || 'Uncategorized',
              amount: parseFloat(expense.amount).toFixed(2),
              approved: expense.status === 'approved' || expense.status === 'paid' ? 'Yes' : expense.status === 'rejected' ? 'No' : 'Pending',
              paymentStatus: expense.paymentStatus || 'unpaid'
            };
          });

          const summary = {
            totalExpenses: expenses.length,
            totalAmount: reportData.reduce((sum, r) => sum + parseFloat(r.amount), 0).toFixed(2),
            approvedCount: reportData.filter(r => r.approved === 'Yes').length,
            pendingCount: reportData.filter(r => r.approved === 'Pending').length,
            rejectedCount: reportData.filter(r => r.approved === 'No').length,
            paidAmount: reportData.filter(r => r.paymentStatus === 'paid').reduce((sum, r) => sum + parseFloat(r.amount), 0).toFixed(2),
            unpaidAmount: reportData.filter(r => r.paymentStatus !== 'paid').reduce((sum, r) => sum + parseFloat(r.amount), 0).toFixed(2)
          };

          res.json({
            summary,
            expenses: reportData
          });
        } catch (error) {
          console.error("Error generating expense report:", error);
          res.status(500).json({ message: "Failed to generate report" });
        }
      });

      // CSV Export for Resident Service Charge Summary
      app.get('/api/admin/reports/resident-service-charge-summary/export', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          const residents = await storage.getAllResidents();
          const allBills = await storage.getAllBills();
          const allPayments = await storage.getAllPayments();

          const csvRows = [
            'Resident,House No,Phone,Total Service Charge,Amount Paid,Outstanding Balance'
          ];

          for (const resident of residents) {
            // Filter for service charge bills only and exclude void/cancelled bills
            const residentBills = allBills.filter(b =>
              b.residentId === resident.id &&
              (b.billingType === "Estate Maintenance" || b.billingType === "Service Charge") &&
              b.status !== 'void' &&
              b.status !== 'cancelled'
            );
            const totalServiceCharge = residentBills.reduce((sum, bill) => sum + parseFloat(bill.amount), 0);

            // Calculate payments for these specific service charge bills
            const billIds = residentBills.map(b => b.id);
            const residentPayments = allPayments.filter(p =>
              billIds.includes(p.billId) &&
              p.status === 'completed'
            );
            const amountPaid = residentPayments.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);

            const outstandingBalance = totalServiceCharge - amountPaid;

            const residentName = resident.user ? `${resident.user.firstName || ''} ${resident.user.lastName || ''}`.trim() : 'N/A';

            csvRows.push(`"${residentName}","${resident.unitNumber}","${resident.phoneNumber || 'N/A'}",${totalServiceCharge.toFixed(2)},${amountPaid.toFixed(2)},${outstandingBalance.toFixed(2)}`);
          }

          const csv = csvRows.join('\n');

          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename=resident-service-charge-summary-${format(new Date(), 'yyyy-MM-dd')}.csv`);
          res.send(csv);
        } catch (error) {
          console.error("Error exporting resident service charge summary:", error);
          res.status(500).json({ message: "Failed to export report" });
        }
      });

      // CSV Export for Expense Report
      app.get('/api/admin/reports/expense-report/export', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          const { startDate, endDate, vendorId, approvalStatus, paymentStatus } = req.query;

          let expenses = await storage.getAllExpenses();
          const vendors = await storage.getAllVendors();
          const accounts = await storage.getAllAccounts();

          if (startDate) {
            expenses = expenses.filter(e => new Date(e.createdAt) >= new Date(startDate as string));
          }

          if (endDate) {
            expenses = expenses.filter(e => new Date(e.createdAt) <= new Date(endDate as string));
          }

          if (vendorId) {
            expenses = expenses.filter(e => e.vendorId === vendorId);
          }

          if (approvalStatus) {
            expenses = expenses.filter(e => e.status === approvalStatus);
          }

          if (paymentStatus) {
            expenses = expenses.filter(e => e.paymentStatus === paymentStatus);
          }

          const csvRows = [
            'Date,Vendor,Description,Category,Amount,Approved,Payment Status'
          ];

          for (const expense of expenses) {
            const vendor = vendors.find(v => v.id === expense.vendorId);
            const account = accounts.find(a => a.id === expense.accountId);

            const dateFormatted = format(new Date(expense.createdAt), 'dd-MMM-yyyy');
            const approved = expense.status === 'approved' || expense.status === 'paid' ? 'Yes' : expense.status === 'rejected' ? 'No' : 'Pending';

            csvRows.push(`"${dateFormatted}","${vendor?.name || 'N/A'}","${expense.description}","${account?.name || 'Uncategorized'}",${parseFloat(expense.amount).toFixed(2)},"${approved}","${expense.paymentStatus || 'unpaid'}"`);
          }

          const csv = csvRows.join('\n');

          res.setHeader('Content-Type', 'text/csv');
          res.setHeader('Content-Disposition', `attachment; filename=expense-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
          res.send(csv);
        } catch (error) {
          console.error("Error exporting expense report:", error);
          res.status(500).json({ message: "Failed to export report" });
        }
      });

      // Cash Flow Projection & Report
      app.get('/api/admin/reports/cash-flow', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          // Get cash accounts (typically account number 1000 - Cash – Operating Account)
          const accounts = await storage.getAllAccounts();
          const cashAccounts = accounts.filter(a =>
            a.accountType?.toLowerCase() === 'asset' &&
            (a.category?.toLowerCase().includes('cash') || a.category?.toLowerCase().includes('bank'))
          );
          const openingBalance = cashAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance || '0'), 0);

          // Get all payment applications (cash inflows)
          const paymentApplications = await storage.getAllPaymentApplications();
          const totalInflows = paymentApplications.reduce((sum, pa) => sum + parseFloat(pa.amountApplied), 0);

          // Get paid expenses (cash outflows)
          const allExpenses = await storage.getAllExpenses();
          const paidExpenses = allExpenses.filter(e => e.paymentStatus === 'paid');
          const totalOutflows = paidExpenses.reduce((sum, exp) => sum + parseFloat(exp.netPayment || exp.expenseAmount), 0);

          // Calculate net cash flow and closing balance
          const netCashFlow = totalInflows - totalOutflows;
          const closingBalance = openingBalance + netCashFlow;

          // Group by month for trend analysis
          const monthlyData: Record<string, { inflows: number; outflows: number }> = {};

          paymentApplications.forEach(pa => {
            const month = format(new Date(pa.paymentDate), 'MMM yyyy');
            if (!monthlyData[month]) {
              monthlyData[month] = { inflows: 0, outflows: 0 };
            }
            monthlyData[month].inflows += parseFloat(pa.amountApplied);
          });

          paidExpenses.forEach(exp => {
            if (exp.paidDate) {
              const month = format(new Date(exp.paidDate), 'MMM yyyy');
              if (!monthlyData[month]) {
                monthlyData[month] = { inflows: 0, outflows: 0 };
              }
              monthlyData[month].outflows += parseFloat(exp.netPayment || exp.expenseAmount);
            }
          });

          const monthly = Object.entries(monthlyData)
            .map(([month, data]) => ({
              month,
              inflows: data.inflows,
              outflows: data.outflows,
              netCashFlow: data.inflows - data.outflows
            }))
            .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

          // Get detailed inflows
          const bills = await storage.getAllBills();
          const residents = await storage.getAllResidents();
          const detailedInflows = paymentApplications.map(pa => {
            const bill = bills.find(b => b.id === pa.billId);
            const resident = residents.find(r => r.id === bill?.residentId);
            return {
              date: pa.paymentDate,
              description: bill?.description || 'Payment Application',
              residentName: resident?.user ? `${resident.user.firstName} ${resident.user.lastName}` : 'N/A',
              unitNumber: resident?.unitNumber || 'N/A',
              amount: parseFloat(pa.amountApplied),
              paymentMethod: pa.bankName ? `Bank Transfer (${pa.bankName})` : 'Manual Payment'
            };
          });

          // Get detailed outflows
          const vendors = await storage.getAllVendors();
          const detailedOutflows = paidExpenses.map(exp => {
            const vendor = vendors.find(v => v.id === exp.vendorId);
            const account = accounts.find(a => a.id === exp.accountId);
            return {
              date: exp.paidDate,
              description: exp.description,
              vendor: vendor?.name || 'N/A',
              category: account?.accountName || exp.expenseClassification || 'Uncategorized',
              amount: parseFloat(exp.netPayment || exp.expenseAmount),
              whtAmount: parseFloat(exp.whtAmount || '0')
            };
          });

          res.json({
            summary: {
              openingBalance: openingBalance.toFixed(2),
              totalInflows: totalInflows.toFixed(2),
              totalOutflows: totalOutflows.toFixed(2),
              netCashFlow: netCashFlow.toFixed(2),
              closingBalance: closingBalance.toFixed(2),
              inflowCount: paymentApplications.length,
              outflowCount: paidExpenses.length
            },
            monthly,
            detailedInflows: detailedInflows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
            detailedOutflows: detailedOutflows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          });
        } catch (error) {
          console.error("Error generating cash flow report:", error);
          res.status(500).json({ message: "Failed to generate cash flow report" });
        }
      });

      // Generate automated service charge bills for all eligible residents
      app.post('/api/admin/billing/generate-service-charges', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "admin") {
            return res.status(403).json({ message: "Admin access required" });
          }

          const result = await storage.generateAutomatedServiceChargeBills(userId);

          res.json({
            success: true,
            message: `Generated ${result.success} bill(s) successfully. ${result.failed} failed.`,
            ...result,
          });
        } catch (error: any) {
          console.error("Error generating automated bills:", error);
          res.status(500).json({
            success: false,
            message: error.message || "Failed to generate automated bills"
          });
        }
      });

      // ========== SECURITY ROUTES ==========

      // Get today's visitors
      app.get('/api/security/visitors/today', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "security") {
            return res.status(403).json({ message: "Security access required" });
          }

          const visitors = await storage.getTodayVisitors();
          res.json(visitors);
        } catch (error) {
          console.error("Error fetching today's visitors:", error);
          res.status(500).json({ message: "Failed to fetch visitors" });
        }
      });

      // Get recent access logs
      app.get('/api/security/logs/recent', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "security") {
            return res.status(403).json({ message: "Security access required" });
          }

          const logs = await storage.getRecentAccessLogs(50);
          res.json(logs);
        } catch (error) {
          console.error("Error fetching access logs:", error);
          res.status(500).json({ message: "Failed to fetch logs" });
        }
      });

      // Verify visitor access code
      app.post('/api/security/verify', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "security") {
            return res.status(403).json({ message: "Security access required" });
          }

          const { accessCode } = req.body;
          const visitor = await storage.getVisitorByAccessCode(accessCode);

          if (!visitor) {
            // Log denied access
            await storage.createAccessLog({
              securityPersonnelId: userId,
              accessType: "visitor",
              name: "Unknown",
              action: "denied",
              notes: `Invalid access code: ${accessCode}`,
            });

            return res.json({ valid: false, reason: "Invalid access code" });
          }

          const now = new Date();

          // Check if expired
          if (new Date(visitor.validUntil) < now) {
            await storage.createAccessLog({
              visitorId: visitor.id,
              securityPersonnelId: userId,
              accessType: "visitor",
              name: visitor.visitorName,
              action: "denied",
              notes: "Expired access code",
            });

            return res.json({ valid: false, reason: "Access code expired" });
          }

          // Check if already used
          if (visitor.status === "used") {
            return res.json({ valid: false, reason: "Access code already used" });
          }

          // Check if not yet valid
          if (new Date(visitor.validFrom) > now) {
            return res.json({ valid: false, reason: "Access code not yet valid" });
          }

          // Get resident info
          const resident = await storage.getResident(visitor.residentId);

          // Mark visitor as used
          await storage.updateVisitorStatus(visitor.id, "used", now);

          // Log successful entry
          await storage.createAccessLog({
            visitorId: visitor.id,
            residentId: visitor.residentId,
            securityPersonnelId: userId,
            accessType: "visitor",
            name: visitor.visitorName,
            action: "entry",
            notes: `Visiting Unit ${resident?.unitNumber || "Unknown"}`,
          });

          // Notify resident
          if (resident) {
            const residentUser = await storage.getUser(resident.userId);
            if (residentUser) {
              await storage.createNotification({
                userId: residentUser.id,
                title: "Visitor Arrived",
                message: `${visitor.visitorName} has checked in at the gate`,
                type: "visitor",
                isRead: false,
              });
            }
          }

          res.json({
            valid: true,
            visitor,
            unitNumber: resident?.unitNumber
          });
        } catch (error) {
          console.error("Error verifying access code:", error);
          res.status(500).json({ message: "Failed to verify access" });
        }
      });

      // ========== ACCOUNTING ROUTES (ACCOUNTANT ROLE) ==========

      // Chart of Accounts endpoints

      // Get all accounts
      app.get('/api/accountant/accounts', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const accounts = await storage.getAllAccounts();
          res.json(accounts);
        } catch (error) {
          console.error("Error fetching accounts:", error);
          res.status(500).json({ message: "Failed to fetch accounts" });
        }
      });

      // Get account by ID
      app.get('/api/accountant/accounts/:id', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          const account = await storage.getAccount(id);

          if (!account) {
            return res.status(404).json({ message: "Account not found" });
          }

          res.json(account);
        } catch (error) {
          console.error("Error fetching account:", error);
          res.status(500).json({ message: "Failed to fetch account" });
        }
      });

      // Create account
      app.post('/api/accountant/accounts', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const validation = insertAccountSchema.safeParse(req.body);
          if (!validation.success) {
            const error = fromZodError(validation.error);
            return res.status(400).json({ message: error.message });
          }

          const account = await storage.createAccount(validation.data);
          res.json(account);
        } catch (error: any) {
          console.error("Error creating account:", error);
          if (error.code === '23505') {
            return res.status(400).json({ message: "Account number already exists" });
          }
          res.status(500).json({ message: "Failed to create account" });
        }
      });

      // Update account
      app.patch('/api/accountant/accounts/:id', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const validation = insertAccountSchema.partial().safeParse(req.body);
          if (!validation.success) {
            const error = fromZodError(validation.error);
            return res.status(400).json({ message: error.message });
          }

          const { id } = req.params;
          const account = await storage.updateAccount(id, validation.data);
          res.json(account);
        } catch (error: any) {
          console.error("Error updating account:", error);
          if (error.code === '23505') {
            return res.status(400).json({ message: "Account number already exists" });
          }
          res.status(500).json({ message: "Failed to update account" });
        }
      });

      // Delete account
      app.delete('/api/accountant/accounts/:id', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          await storage.deleteAccount(id);
          res.json({ success: true });
        } catch (error) {
          console.error("Error deleting account:", error);
          res.status(500).json({ message: "Failed to delete account" });
        }
      });

      // Transaction Template endpoints

      // Get all transaction templates
      app.get('/api/accountant/templates', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const templates = await storage.getAllTransactionTemplates();
          res.json(templates);
        } catch (error) {
          console.error("Error fetching templates:", error);
          res.status(500).json({ message: "Failed to fetch templates" });
        }
      });

      // Get template by ID
      app.get('/api/accountant/templates/:id', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          const template = await storage.getTransactionTemplate(id);

          if (!template) {
            return res.status(404).json({ message: "Template not found" });
          }

          res.json(template);
        } catch (error) {
          console.error("Error fetching template:", error);
          res.status(500).json({ message: "Failed to fetch template" });
        }
      });

      // Create transaction template
      app.post('/api/accountant/templates', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const validation = insertTransactionTemplateSchema.safeParse(req.body);
          if (!validation.success) {
            const error = fromZodError(validation.error);
            return res.status(400).json({ message: error.message });
          }

          const template = await storage.createTransactionTemplate(validation.data);
          res.json(template);
        } catch (error: any) {
          console.error("Error creating template:", error);
          if (error.code === '23505') {
            return res.status(400).json({ message: "Template name already exists" });
          }
          res.status(500).json({ message: "Failed to create template" });
        }
      });

      // Update transaction template
      app.patch('/api/accountant/templates/:id', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const validation = insertTransactionTemplateSchema.partial().safeParse(req.body);
          if (!validation.success) {
            const error = fromZodError(validation.error);
            return res.status(400).json({ message: error.message });
          }

          const { id } = req.params;
          const template = await storage.updateTransactionTemplate(id, validation.data);
          res.json(template);
        } catch (error: any) {
          console.error("Error updating template:", error);
          if (error.code === '23505') {
            return res.status(400).json({ message: "Template name already exists" });
          }
          res.status(500).json({ message: "Failed to update template" });
        }
      });

      // Delete transaction template
      app.delete('/api/accountant/templates/:id', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          await storage.deleteTransactionTemplate(id);
          res.json({ success: true });
        } catch (error) {
          console.error("Error deleting template:", error);
          res.status(500).json({ message: "Failed to delete template" });
        }
      });

      // Journal Entry endpoints

      // Get all journal entries
      app.get('/api/accountant/entries', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const entries = await storage.getAllJournalEntries();
          res.json(entries);
        } catch (error) {
          console.error("Error fetching journal entries:", error);
          res.status(500).json({ message: "Failed to fetch journal entries" });
        }
      });

      // Get journal entry by ID with lines
      app.get('/api/accountant/entries/:id', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          const entry = await storage.getJournalEntryWithLines(id);

          if (!entry) {
            return res.status(404).json({ message: "Journal entry not found" });
          }

          res.json(entry);
        } catch (error) {
          console.error("Error fetching journal entry:", error);
          res.status(500).json({ message: "Failed to fetch journal entry" });
        }
      });

      // Create journal entry
      app.post('/api/accountant/entries', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { entry, lines } = req.body;

          // Validate entry
          const entryValidation = insertJournalEntrySchema.safeParse(entry);
          if (!entryValidation.success) {
            const error = fromZodError(entryValidation.error);
            return res.status(400).json({ message: `Entry validation failed: ${error.message}` });
          }

          // Validate lines
          if (!Array.isArray(lines) || lines.length === 0) {
            return res.status(400).json({ message: "At least one journal entry line is required" });
          }

          const validatedLines = [];
          for (const line of lines) {
            const lineValidation = insertJournalEntryLineSchema.safeParse(line);
            if (!lineValidation.success) {
              const error = fromZodError(lineValidation.error);
              return res.status(400).json({ message: `Line validation failed: ${error.message}` });
            }
            validatedLines.push(lineValidation.data);
          }

          // Validate that debits equal credits
          const totalDebit = validatedLines
            .filter((l: any) => l.lineType === 'debit')
            .reduce((sum: number, l: any) => sum + parseFloat(l.amount), 0);

          const totalCredit = validatedLines
            .filter((l: any) => l.lineType === 'credit')
            .reduce((sum: number, l: any) => sum + parseFloat(l.amount), 0);

          if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return res.status(400).json({
              message: "Debits and credits must be equal",
              totalDebit,
              totalCredit
            });
          }

          // Set created by
          entryValidation.data.createdBy = user.id;
          entryValidation.data.totalDebit = totalDebit.toFixed(2);
          entryValidation.data.totalCredit = totalCredit.toFixed(2);

          const journalEntry = await storage.createJournalEntry(entryValidation.data, validatedLines);
          const fullEntry = await storage.getJournalEntryWithLines(journalEntry.id);
          res.json(fullEntry);
        } catch (error) {
          console.error("Error creating journal entry:", error);
          res.status(500).json({ message: "Failed to create journal entry" });
        }
      });

      // Void journal entry
      app.patch('/api/accountant/entries/:id/void', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          await storage.voidJournalEntry(id);
          const entry = await storage.getJournalEntryWithLines(id);
          res.json(entry);
        } catch (error) {
          console.error("Error voiding journal entry:", error);
          res.status(500).json({ message: "Failed to void journal entry" });
        }
      });

      // Reverse a journal entry
      app.post('/api/accountant/entries/:id/reverse', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;

          // Get the original entry with lines
          const originalEntry = await storage.getJournalEntryWithLines(id);
          if (!originalEntry) {
            return res.status(404).json({ message: "Journal entry not found" });
          }

          if (originalEntry.status !== "posted") {
            return res.status(400).json({ message: "Only posted entries can be reversed" });
          }

          // Check if this entry has already been reversed
          const existingReversals = await storage.getJournalEntriesByReferenceId(id);
          if (existingReversals && existingReversals.length > 0) {
            return res.status(400).json({
              message: "This journal entry has already been reversed",
              existingReversals
            });
          }

          // Create reversal entry with opposite debits/credits
          const reversalLines = originalEntry.lines.map((line: any) => ({
            accountId: line.accountId,
            lineType: line.lineType === "debit" ? "credit" : "debit",
            amount: parseFloat(line.amount),
            description: line.description,
          }));

          // Recompute totals from the reversal lines
          const totalDebit = reversalLines
            .filter((l: any) => l.lineType === "debit")
            .reduce((sum: number, l: any) => sum + l.amount, 0);

          const totalCredit = reversalLines
            .filter((l: any) => l.lineType === "credit")
            .reduce((sum: number, l: any) => sum + l.amount, 0);

          const reversalEntry = {
            entryDate: new Date(),
            description: `Reversal of ${originalEntry.entryNumber} - ${originalEntry.description}`,
            referenceType: 'reversal',
            referenceId: originalEntry.id,
            createdBy: userId,
            status: 'posted' as const,
            totalDebit: totalDebit.toFixed(2),
            totalCredit: totalCredit.toFixed(2),
          };

          const newEntry = await storage.createJournalEntry(reversalEntry, reversalLines);
          const fullEntry = await storage.getJournalEntryWithLines(newEntry.id);

          res.json(fullEntry);
        } catch (error: any) {
          console.error("Error reversing journal entry:", error);
          res.status(500).json({ message: error.message || "Failed to reverse journal entry" });
        }
      });

      // ========== FINANCIAL REPORTS ==========

      // Get Trial Balance
      app.get('/api/accountant/reports/trial-balance', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const asOf = req.query.asOf ? new Date(req.query.asOf as string) : new Date();
          const trialBalance = await storage.getTrialBalance(asOf);
          res.json(trialBalance);
        } catch (error) {
          console.error("Error generating trial balance:", error);
          res.status(500).json({ message: "Failed to generate trial balance" });
        }
      });

      // Get Income Statement
      app.get('/api/accountant/reports/income-statement', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().getFullYear(), 0, 1);
          const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

          const incomeStatement = await storage.getIncomeStatement(startDate, endDate);
          res.json(incomeStatement);
        } catch (error) {
          console.error("Error generating income statement:", error);
          res.status(500).json({ message: "Failed to generate income statement" });
        }
      });

      // Get Balance Sheet
      app.get('/api/accountant/reports/balance-sheet', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const asOf = req.query.asOf ? new Date(req.query.asOf as string) : new Date();
          const balanceSheet = await storage.getBalanceSheet(asOf);
          res.json(balanceSheet);
        } catch (error) {
          console.error("Error generating balance sheet:", error);
          res.status(500).json({ message: "Failed to generate balance sheet" });
        }
      });

      // ========== VENDOR ROUTES (ACCOUNTANT ROLE) ==========

      // Get all vendors
      app.get('/api/accountant/vendors', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const vendors = await storage.getAllVendors();
          res.json(vendors);
        } catch (error) {
          console.error("Error fetching vendors:", error);
          res.status(500).json({ message: "Failed to fetch vendors" });
        }
      });

      // Get vendors by status (pending, approved, rejected)
      app.get('/api/accountant/vendors/status/:status', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { status } = req.params;
          const vendors = await storage.getVendorsByStatus(status);
          res.json(vendors);
        } catch (error) {
          console.error("Error fetching vendors by status:", error);
          res.status(500).json({ message: "Failed to fetch vendors" });
        }
      });

      // Get single vendor
      app.get('/api/accountant/vendors/:id', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          const vendor = await storage.getVendor(id);

          if (!vendor) {
            return res.status(404).json({ message: "Vendor not found" });
          }

          res.json(vendor);
        } catch (error) {
          console.error("Error fetching vendor:", error);
          res.status(500).json({ message: "Failed to fetch vendor" });
        }
      });

      // Create new vendor
      app.post('/api/accountant/vendors', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const validation = insertVendorSchema.safeParse(req.body);
          if (!validation.success) {
            const error = fromZodError(validation.error);
            return res.status(400).json({ message: error.message });
          }

          const vendor = await storage.createVendor(validation.data);
          res.json(vendor);
        } catch (error: any) {
          console.error("Error creating vendor:", error);
          if (error.code === '23505') {
            return res.status(400).json({ message: "TIN number already exists" });
          }
          res.status(500).json({ message: "Failed to create vendor" });
        }
      });

      // Update vendor
      app.patch('/api/accountant/vendors/:id', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          const vendor = await storage.updateVendor(id, req.body);
          res.json(vendor);
        } catch (error) {
          console.error("Error updating vendor:", error);
          res.status(500).json({ message: "Failed to update vendor" });
        }
      });

      // Approve vendor
      app.post('/api/accountant/vendors/:id/approve', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          const vendor = await storage.approveVendor(id, userId);
          res.json(vendor);
        } catch (error) {
          console.error("Error approving vendor:", error);
          res.status(500).json({ message: "Failed to approve vendor" });
        }
      });

      // Reject vendor
      app.post('/api/accountant/vendors/:id/reject', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          const { reason } = req.body;

          if (!reason) {
            return res.status(400).json({ message: "Rejection reason is required" });
          }

          const vendor = await storage.rejectVendor(id, userId, reason);
          res.json(vendor);
        } catch (error) {
          console.error("Error rejecting vendor:", error);
          res.status(500).json({ message: "Failed to reject vendor" });
        }
      });

      // Get vendor account statement
      app.get('/api/accountant/vendors/:id/statement', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
          const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

          const statement = await storage.getVendorAccountStatement(id, startDate, endDate);
          res.json(statement);
        } catch (error: any) {
          console.error("Error generating vendor statement:", error);
          if (error.message === 'Vendor not found') {
            return res.status(404).json({ message: error.message });
          }
          res.status(500).json({ message: "Failed to generate vendor statement" });
        }
      });

      // Get outstanding bills for all vendors
      app.get('/api/accountant/vendors/outstanding-bills', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const outstandingBills = await storage.getVendorOutstandingBills();
          res.json(outstandingBills);
        } catch (error) {
          console.error("Error fetching vendor outstanding bills:", error);
          res.status(500).json({ message: "Failed to fetch outstanding bills" });
        }
      });

      // ========== EXPENSE ROUTES ==========

      // Get all expenses (accountant/admin only)
      app.get('/api/accountant/expenses', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const expenses = await storage.getAllExpenses();
          res.json(expenses);
        } catch (error) {
          console.error("Error fetching expenses:", error);
          res.status(500).json({ message: "Failed to fetch expenses" });
        }
      });

      // Get current user's expenses
      app.get('/api/expenses/my-expenses', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const expenses = await storage.getExpensesBySubmitter(userId);
          res.json(expenses);
        } catch (error) {
          console.error("Error fetching user expenses:", error);
          res.status(500).json({ message: "Failed to fetch your expenses" });
        }
      });

      // Create new expense
      app.post('/api/expenses', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;

          const validation = insertExpenseSchema.safeParse({
            ...req.body,
            submittedBy: userId,
          });

          if (!validation.success) {
            const error = fromZodError(validation.error);
            return res.status(400).json({ message: error.message });
          }

          const expense = await storage.createExpense(validation.data);

          // Create notification for accountants
          // TODO: Implement notification system for expense submissions

          res.json(expense);
        } catch (error: any) {
          console.error("Error creating expense:", error);
          res.status(500).json({ message: "Failed to create expense" });
        }
      });

      // Approve expense (accountant/admin only)
      app.post('/api/accountant/expenses/:id/approve', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          const expense = await storage.approveExpense(id, userId);
          res.json(expense);
        } catch (error) {
          console.error("Error approving expense:", error);
          res.status(500).json({ message: "Failed to approve expense" });
        }
      });

      // Reject expense (accountant/admin only)
      app.post('/api/accountant/expenses/:id/reject', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          const { reason } = req.body;

          if (!reason) {
            return res.status(400).json({ message: "Rejection reason is required" });
          }

          const expense = await storage.rejectExpense(id, userId, reason);
          res.json(expense);
        } catch (error) {
          console.error("Error rejecting expense:", error);
          res.status(500).json({ message: "Failed to reject expense" });
        }
      });

      // ========== ACCOUNTS PAYABLE ROUTES ==========

      // Get all approved expenses for payment (accountant/admin only)
      app.get('/api/accountant/accounts-payable', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const expenses = await storage.getApprovedExpensesForPayment();
          res.json(expenses);
        } catch (error) {
          console.error("Error fetching accounts payable:", error);
          res.status(500).json({ message: "Failed to fetch accounts payable" });
        }
      });

      // Get bank accounts for payment (accountant/admin only)
      app.get('/api/accountant/bank-accounts', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const bankAccounts = await storage.getBankAccounts();
          res.json(bankAccounts);
        } catch (error) {
          console.error("Error fetching bank accounts:", error);
          res.status(500).json({ message: "Failed to fetch bank accounts" });
        }
      });

      // Process expense payment (accountant/admin only)
      app.post('/api/accountant/accounts-payable/:id/pay-now', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;

          // Validate request body with Zod
          const validation = payNowSchema.safeParse(req.body);
          if (!validation.success) {
            return res.status(400).json({
              message: fromZodError(validation.error).message
            });
          }

          const { paidFromAccountId, whtRate } = validation.data;

          // Verify bank account exists and is valid
          const bankAccount = await storage.getAccount(paidFromAccountId);
          if (!bankAccount) {
            return res.status(400).json({ message: "Invalid bank account selected" });
          }

          if (bankAccount.accountType !== 'asset' ||
            !['Cash and Bank', 'Cash', 'Bank'].includes(bankAccount.category || '')) {
            return res.status(400).json({ message: "Selected account is not a valid bank account" });
          }

          const expense = await storage.processExpensePayment(id, paidFromAccountId, userId, whtRate);
          res.json(expense);
        } catch (error: any) {
          console.error("Error processing payment:", error);
          res.status(500).json({ message: error.message || "Failed to process payment" });
        }
      });

      // Approve expense for payment later (accountant/admin only)
      app.post('/api/accountant/accounts-payable/:id/pay-later', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;

          // Validate request body with Zod
          const validation = payLaterSchema.safeParse(req.body);
          if (!validation.success) {
            return res.status(400).json({
              message: fromZodError(validation.error).message
            });
          }

          const { whtRate } = validation.data;

          const expense = await storage.approveExpenseForPaymentLater(id, userId, whtRate);
          res.json(expense);
        } catch (error: any) {
          console.error("Error approving for payment later:", error);
          res.status(500).json({ message: error.message || "Failed to approve for payment later" });
        }
      });

      // ========== ACCOUNTS RECEIVABLE ROUTES ==========

      // Get all AR entries (accountant/admin only)
      app.get('/api/accountant/accounts-receivable', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const entries = await storage.getAllAREntries();
          res.json(entries);
        } catch (error) {
          console.error("Error fetching AR entries:", error);
          res.status(500).json({ message: "Failed to fetch AR entries" });
        }
      });

      // Get single AR entry with details (accountant/admin only)
      app.get('/api/accountant/accounts-receivable/:id', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          const entry = await storage.getAREntry(id);

          if (!entry) {
            return res.status(404).json({ message: "AR entry not found" });
          }

          res.json(entry);
        } catch (error) {
          console.error("Error fetching AR entry:", error);
          res.status(500).json({ message: "Failed to fetch AR entry" });
        }
      });

      // Mark AR entry as paid (manual payment application)
      app.post('/api/accountant/accounts-receivable/:id/mark-paid', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          const { amountApplied, bankName, accountNumber, paymentDate, notes } = req.body;

          // Validate required fields
          if (!amountApplied || !bankName || !accountNumber || !paymentDate) {
            return res.status(400).json({
              message: "Missing required fields: amountApplied, bankName, accountNumber, paymentDate"
            });
          }

          await storage.applyPaymentToBill(
            id,
            amountApplied,
            'manual',
            new Date(paymentDate),
            userId,
            bankName,
            accountNumber,
            undefined,
            notes
          );

          res.json({ message: "Payment applied successfully" });
        } catch (error: any) {
          console.error("Error applying payment:", error);
          res.status(500).json({ message: error.message || "Failed to apply payment" });
        }
      });

      // Upload bank statement
      app.post('/api/accountant/bank-statements/upload', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { fileName, fileData, bankName, accountNumber, statementDate, entries } = req.body;

          // Validate required fields
          if (!fileName || !fileData || !bankName || !accountNumber || !statementDate) {
            return res.status(400).json({
              message: "Missing required fields: fileName, fileData, bankName, accountNumber, statementDate"
            });
          }

          // Create bank statement
          const statement = await storage.createBankStatement({
            fileName,
            fileData,
            bankName,
            accountNumber,
            statementDate: new Date(statementDate),
            uploadedBy: userId,
            totalEntries: entries?.length || 0,
            totalAmount: entries?.reduce((sum: number, e: any) => sum + parseFloat(e.amount || '0'), 0).toFixed(2) || '0',
            status: 'processing',
          });

          // Create notification: reconciliation started
          await storage.createNotification({
            userId,
            title: 'Bank Statement Uploaded',
            message: `Statement uploaded: ${fileName}. Payment reconciliation started for ${entries?.length || 0} entries.`,
            type: 'system',
          });

          // Reconciliation summary
          const reconciliationSummary = {
            totalEntries: 0,
            matched: 0,
            partiallyMatched: 0,
            unmatched: 0,
            totalMatched: '0.00',
            residualAmounts: [] as any[],
            details: [] as any[],
          };

          // Create entries and attempt automatic reconciliation within a transaction
          if (entries && Array.isArray(entries)) {
            reconciliationSummary.totalEntries = entries.length;

            for (const entry of entries) {
              try {
                // Wrap each entry reconciliation in a transaction for atomicity
                await db.transaction(async (tx) => {
                  // Create bank statement entry
                  const [createdEntry] = await tx.insert(bankStatementEntries).values({
                    statementId: statement.id,
                    transactionDate: new Date(entry.transactionDate),
                    description: entry.description,
                    referenceNumber: entry.referenceNumber,
                    amount: entry.amount,
                    appliedAmount: '0',
                    remainingAmount: entry.amount,
                    status: 'unmatched',
                  }).returning();

                  // Attempt automatic matching by invoice number
                  if (entry.referenceNumber) {
                    console.log(`[Bank Recon] Processing entry with ref: ${entry.referenceNumber}, amount: ${entry.amount}`);

                    // Look for bill with matching invoice number (get FRESH data for accurate balance)
                    const matchingBills = await tx
                      .select()
                      .from(bills)
                      .where(eq(bills.invoiceNumber, entry.referenceNumber));

                    console.log(`[Bank Recon] Found ${matchingBills.length} matching bills for ${entry.referenceNumber}`);

                    if (matchingBills.length > 0) {
                      let bill = matchingBills[0];
                      const entryAmount = parseFloat(entry.amount);
                      let billBalance = parseFloat(bill.balance);

                      console.log(`[Bank Recon] Bill ${bill.invoiceNumber}: balance=${billBalance}, entry amount=${entryAmount}`);

                      // Determine amount to apply (minimum of entry amount and bill balance)
                      const amountToApply = Math.min(entryAmount, billBalance);

                      console.log(`[Bank Recon] Amount to apply: ${amountToApply}`);

                      if (amountToApply > 0) {
                        // INLINE payment application within transaction for atomicity
                        // Step 1: Create payment application record
                        await tx.insert(paymentApplications).values({
                          billId: bill.id,
                          bankStatementEntryId: createdEntry.id,
                          amountApplied: amountToApply.toFixed(2),
                          applicationType: 'bank_statement',
                          bankName,
                          accountNumber,
                          paymentDate: new Date(entry.transactionDate),
                          appliedBy: userId,
                          notes: `Auto-reconciled from bank statement: ${fileName}`,
                        });

                        // Step 2: Update bill totals and status
                        const newTotalPaid = parseFloat(bill.totalPaid) + amountToApply;
                        const newBalance = billBalance - amountToApply;
                        const newPaymentStatus = newBalance === 0 ? 'full_payment' : 'partial_payment';
                        const newBillStatus = newBalance === 0 ? 'paid' : (newBalance < billBalance ? 'partial' : bill.status);

                        await tx
                          .update(bills)
                          .set({
                            totalPaid: newTotalPaid.toFixed(2),
                            balance: newBalance.toFixed(2),
                            paymentStatus: newPaymentStatus,
                            status: newBillStatus,
                            updatedAt: new Date(),
                          })
                          .where(eq(bills.id, bill.id));

                        // Update local bill state for potential subsequent matches in same batch
                        bill = {
                          ...bill,
                          totalPaid: newTotalPaid.toFixed(2),
                          balance: newBalance.toFixed(2),
                          paymentStatus: newPaymentStatus,
                          status: newBillStatus,
                        };
                        billBalance = newBalance;

                        // Step 3: Create GL posting for Modified Cash-Based Accounting
                        // DR Cash/Bank, CR AR, DR Deferred Revenue, CR Member Dues
                        const arAccount = await tx
                          .select()
                          .from(accounts)
                          .where(eq(accounts.accountNumber, '1100'))
                          .limit(1);

                        if (!arAccount || arAccount.length === 0) {
                          throw new Error('Accounts Receivable account (1100) not found');
                        }

                        const deferredRevenueAccount = await tx
                          .select()
                          .from(accounts)
                          .where(eq(accounts.accountNumber, '2200'))
                          .limit(1);

                        if (!deferredRevenueAccount || deferredRevenueAccount.length === 0) {
                          throw new Error('Deferred Revenue account (2200) not found');
                        }

                        const memberDuesAccount = await tx
                          .select()
                          .from(accounts)
                          .where(eq(accounts.accountNumber, '4000'))
                          .limit(1);

                        if (!memberDuesAccount || memberDuesAccount.length === 0) {
                          throw new Error('Member Dues revenue account (4000) not found');
                        }

                        // Find or use default cash/bank account
                        const bankAccounts = await tx
                          .select()
                          .from(accounts)
                          .where(and(
                            eq(accounts.accountType, 'asset'),
                            eq(accounts.category, 'Cash and Bank')
                          ));

                        let cashAccountId = bankAccounts[0]?.id;
                        if (bankName) {
                          const matchedBank = bankAccounts.find(acc =>
                            acc.accountName.toLowerCase().includes(bankName.toLowerCase())
                          );
                          if (matchedBank) cashAccountId = matchedBank.id;
                        }

                        if (!cashAccountId) {
                          throw new Error('No cash/bank account found for payment posting');
                        }

                        // Generate entry number for the journal entry
                        const entryDate = new Date(entry.transactionDate);
                        const dateStr = entryDate.toISOString().split('T')[0].replace(/-/g, '');
                        const entryCount = await tx
                          .select({ count: sql<number>`count(*)` })
                          .from(journalEntries)
                          .where(sql`DATE(entry_date) = DATE(${entryDate})`);
                        const sequenceNumber = (entryCount[0]?.count || 0) + 1;
                        const entryNumber = `JE-${dateStr}-${sequenceNumber.toString().padStart(4, '0')}`;

                        // Create journal entry for the payment (4-line entry for modified cash accounting)
                        const totalAmount = (amountToApply * 2).toFixed(2); // DR Cash + DR Deferred = CR AR + CR Revenue
                        const [journalEntry] = await tx.insert(journalEntries).values({
                          entryNumber,
                          entryDate,
                          description: `Payment received: ${entry.description}`,
                          referenceNumber: entry.referenceNumber || undefined,
                          totalDebit: totalAmount,
                          totalCredit: totalAmount,
                          createdBy: userId,
                        }).returning();

                        // Insert journal entry lines (4-line entry to recognize revenue)
                        await tx.insert(journalEntryLines).values([
                          {
                            journalEntryId: journalEntry.id,
                            accountId: cashAccountId,
                            lineType: 'debit',
                            amount: amountToApply.toFixed(2),
                            description: `Payment from ${bankName || 'bank'} - ${accountNumber || 'statement'}`,
                          },
                          {
                            journalEntryId: journalEntry.id,
                            accountId: arAccount[0].id,
                            lineType: 'credit',
                            amount: amountToApply.toFixed(2),
                            description: `Payment for invoice ${bill.invoiceNumber} - reduce AR`,
                          },
                          {
                            journalEntryId: journalEntry.id,
                            accountId: deferredRevenueAccount[0].id,
                            lineType: 'debit',
                            amount: amountToApply.toFixed(2),
                            description: `Relieve deferred revenue for ${bill.invoiceNumber}`,
                          },
                          {
                            journalEntryId: journalEntry.id,
                            accountId: memberDuesAccount[0].id,
                            lineType: 'credit',
                            amount: amountToApply.toFixed(2),
                            description: `Revenue recognized for ${bill.invoiceNumber}`,
                          },
                        ]);

                        // Step 4: Update entry status and residuals
                        const newRemaining = entryAmount - amountToApply;
                        const newStatus = newRemaining === 0 ? 'reconciled' : 'partially_matched';

                        console.log(`[Bank Recon] Updating entry status to: ${newStatus}, applied: ${amountToApply}, remaining: ${newRemaining}`);

                        await tx
                          .update(bankStatementEntries)
                          .set({
                            appliedAmount: amountToApply.toFixed(2),
                            remainingAmount: newRemaining.toFixed(2),
                            status: newStatus,
                          })
                          .where(eq(bankStatementEntries.id, createdEntry.id));

                        console.log(`[Bank Recon] Entry status updated successfully to: ${newStatus}`);

                        // Step 5: Update summary (AFTER all GL posting succeeds)
                        if (newStatus === 'reconciled') {
                          reconciliationSummary.matched++;
                        } else {
                          reconciliationSummary.partiallyMatched++;
                          // Track residual amount for manual review with full context
                          reconciliationSummary.residualAmounts.push({
                            entryId: createdEntry.id,
                            entryRef: entry.referenceNumber,
                            billId: bill.id,
                            invoiceNumber: bill.invoiceNumber,
                            residentId: bill.residentId,
                            entryAmount: entryAmount,
                            appliedAmount: amountToApply,
                            residualAmount: newRemaining,
                            description: entry.description,
                          });
                        }
                        reconciliationSummary.totalMatched = (parseFloat(reconciliationSummary.totalMatched) + amountToApply).toFixed(2);

                        reconciliationSummary.details.push({
                          entryRef: entry.referenceNumber,
                          invoiceNumber: bill.invoiceNumber,
                          amount: amountToApply,
                          residual: newRemaining > 0 ? newRemaining : 0,
                          status: newStatus,
                        });
                      } else {
                        console.log(`[Bank Recon] Amount to apply is 0, marking as unmatched`);
                        reconciliationSummary.unmatched++;
                      }
                    } else {
                      console.log(`[Bank Recon] No matching bills found for ${entry.referenceNumber}`);
                      reconciliationSummary.unmatched++;
                    }
                  } else {
                    console.log(`[Bank Recon] No reference number provided, marking as unmatched`);
                    reconciliationSummary.unmatched++;
                  }
                });
              } catch (matchError) {
                console.error(`Error matching entry ${entry.referenceNumber}:`, matchError);
                reconciliationSummary.unmatched++;
                // Transaction will have rolled back, entry not created
              }
            }
          }

          // Update statement status
          await db
            .update(bankStatements)
            .set({ status: 'completed' })
            .where(eq(bankStatements.id, statement.id));

          // Create completion notification
          await storage.createNotification({
            userId,
            title: 'Payment Reconciliation Completed',
            message: `Bank statement reconciliation completed. Matched: ${reconciliationSummary.matched}, Partially Matched: ${reconciliationSummary.partiallyMatched}, Unmatched: ${reconciliationSummary.unmatched}. Total amount reconciled: ₦${parseFloat(reconciliationSummary.totalMatched).toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
            type: 'payment',
          });

          res.json({
            statement,
            reconciliation: reconciliationSummary,
          });
        } catch (error: any) {
          console.error("Error uploading bank statement:", error);
          res.status(500).json({ message: error.message || "Failed to upload bank statement" });
        }
      });

      // Get all bank statements
      app.get('/api/accountant/bank-statements', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const statements = await storage.getAllBankStatements();
          res.json(statements);
        } catch (error) {
          console.error("Error fetching bank statements:", error);
          res.status(500).json({ message: "Failed to fetch bank statements" });
        }
      });

      // Get bank statement entries
      app.get('/api/accountant/bank-statements/:id/entries', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          const entries = await storage.getBankStatementEntries(id);
          res.json(entries);
        } catch (error) {
          console.error("Error fetching bank statement entries:", error);
          res.status(500).json({ message: "Failed to fetch bank statement entries" });
        }
      });

      // Reconcile bank statement entry to bill
      app.post('/api/accountant/bank-statements/reconcile', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { entryId, billId, amountApplied } = req.body;

          // Validate required fields
          if (!entryId || !billId || !amountApplied) {
            return res.status(400).json({
              message: "Missing required fields: entryId, billId, amountApplied"
            });
          }

          // Get the entry to fetch bank details
          const entries = await storage.getBankStatementEntries('');
          const entry = entries.find((e: any) => e.id === entryId);

          if (!entry) {
            return res.status(404).json({ message: "Bank statement entry not found" });
          }

          // Apply payment to bill
          await storage.applyPaymentToBill(
            billId,
            amountApplied,
            'bank_statement',
            entry.transactionDate,
            userId,
            entry.bankName,
            entry.accountNumber,
            entryId,
            `Reconciled from bank statement entry: ${entry.description}`
          );

          // Update entry status and amounts
          const newApplied = parseFloat(entry.appliedAmount || '0') + parseFloat(amountApplied);
          const newRemaining = parseFloat(entry.amount) - newApplied;
          const newStatus = newRemaining === 0 ? 'reconciled' : 'partially_matched';

          await db
            .update(bankStatementEntries)
            .set({
              appliedAmount: newApplied.toFixed(2),
              remainingAmount: newRemaining.toFixed(2),
              status: newStatus,
            })
            .where(eq(bankStatementEntries.id, entryId));

          res.json({ message: "Payment reconciled successfully" });
        } catch (error: any) {
          console.error("Error reconciling payment:", error);
          res.status(500).json({ message: error.message || "Failed to reconcile payment" });
        }
      });

      // ========== BUDGET ROUTES ==========

      // Get all budgets (accountant/admin only)
      app.get('/api/accountant/budgets', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const budgets = await storage.getAllBudgets();
          res.json(budgets);
        } catch (error) {
          console.error("Error fetching budgets:", error);
          res.status(500).json({ message: "Failed to fetch budgets" });
        }
      });

      // Get active budgets (accountant/admin only)
      app.get('/api/accountant/budgets/active', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const budgets = await storage.getActiveBudgets();
          res.json(budgets);
        } catch (error) {
          console.error("Error fetching active budgets:", error);
          res.status(500).json({ message: "Failed to fetch active budgets" });
        }
      });

      // Get budget by ID with lines (accountant/admin only)
      app.get('/api/accountant/budgets/:id', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          const budget = await storage.getBudgetWithLines(id);

          if (!budget) {
            return res.status(404).json({ message: "Budget not found" });
          }

          res.json(budget);
        } catch (error) {
          console.error("Error fetching budget:", error);
          res.status(500).json({ message: "Failed to fetch budget" });
        }
      });

      // Create new budget (accountant/admin only)
      app.post('/api/accountant/budgets', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { budget, lines } = req.body;

          if (!budget || !lines || lines.length === 0) {
            return res.status(400).json({ message: "Budget data and at least one line item are required" });
          }

          // Convert date strings to Date objects and add createdBy
          const budgetData = {
            ...budget,
            startDate: new Date(budget.startDate),
            endDate: new Date(budget.endDate),
            createdBy: userId,
          };

          const newBudget = await storage.createBudget(budgetData, lines);
          res.json(newBudget);
        } catch (error) {
          console.error("Error creating budget:", error);
          res.status(500).json({ message: "Failed to create budget" });
        }
      });

      // Update budget (accountant/admin only)
      app.patch('/api/accountant/budgets/:id', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          const updatedBudget = await storage.updateBudget(id, req.body);
          res.json(updatedBudget);
        } catch (error) {
          console.error("Error updating budget:", error);
          res.status(500).json({ message: "Failed to update budget" });
        }
      });

      // Delete budget (accountant/admin only)
      app.delete('/api/accountant/budgets/:id', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          await storage.deleteBudget(id);
          res.json({ success: true });
        } catch (error) {
          console.error("Error deleting budget:", error);
          res.status(500).json({ message: "Failed to delete budget" });
        }
      });

      // Activate budget (accountant/admin only)
      app.post('/api/accountant/budgets/:id/activate', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          const budget = await storage.activateBudget(id);
          res.json(budget);
        } catch (error) {
          console.error("Error activating budget:", error);
          res.status(500).json({ message: "Failed to activate budget" });
        }
      });

      // Close budget (accountant/admin only)
      app.post('/api/accountant/budgets/:id/close', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { id } = req.params;
          const budget = await storage.closeBudget(id);
          res.json(budget);
        } catch (error) {
          console.error("Error closing budget:", error);
          res.status(500).json({ message: "Failed to close budget" });
        }
      });

      // Get active budget for an account (accountant/admin only)
      app.get('/api/accountant/budgets/account/:accountId', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          const user = await storage.getUser(userId);

          if (user?.role !== "accountant" && user?.role !== "admin") {
            return res.status(403).json({ message: "Accountant access required" });
          }

          const { accountId } = req.params;
          const budgetLine = await storage.getActiveBudgetForAccount(accountId);
          res.json(budgetLine);
        } catch (error) {
          console.error("Error fetching budget for account:", error);
          res.status(500).json({ message: "Failed to fetch budget for account" });
        }
      });

      // ========== NOTIFICATION ROUTES ==========

      // Get user notifications
       app.get("/api/notifications", requireAuth(), async (req, res) => {
         const user = (req as any).authUser;

          const notifications = await storage.getNotificationsByUserId(userId);
          res.json(notifications);
        } catch (error) {
          console.error("Error fetching notifications:", error);
          res.status(500).json({ message: "Failed to fetch notifications" });
        }
      });

      // Mark notification as read
      app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
        try {
          const { id } = req.params;
          await storage.markNotificationAsRead(id);
          res.json({ success: true });
        } catch (error) {
          console.error("Error marking notification as read:", error);
          res.status(500).json({ message: "Failed to update notification" });
        }
      });

      // Mark all notifications as read
      app.patch('/api/notifications/read-all', isAuthenticated, async (req: any, res) => {
        try {
          const userId = req.user.claims.sub;
          await storage.markAllNotificationsAsRead(userId);
          res.json({ success: true });
        } catch (error) {
          console.error("Error marking all as read:", error);
          res.status(500).json({ message: "Failed to update notifications" });
        }
      });

      const httpServer = createServer(app);
      return httpServer;
    }
// @ts-nocheck
