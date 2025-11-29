# Testing Guide - Estate Management System

## Test Credentials Created

Three test user accounts have been created in your database:

### 1. Admin Account
- **Email:** admin@estatetest.com
- **Role:** Estate Administrator
- **Access:** Full system access, resident management, billing, reports

### 2. Resident Account  
- **Email:** resident@estatetest.com
- **Role:** Resident
- **Unit:** A-101
- **Access:** Personal bills, visitor management, notifications
- **Test Data:** Has 1 pending bill for ₦5,000.00 due in 30 days

### 3. Security Account
- **Email:** security@estatetest.com
- **Role:** Security Personnel
- **Access:** QR scanner, visitor verification, access logs

---

## How to Test (Important!)

Since this application uses **Replit Auth (OIDC)**, you cannot simply "login" with username/password. Here's how to test:

### Option 1: Quick Testing with Your Account

1. **Sign in** with your Replit account (Click "Sign In" on landing page)
2. Your account will be created automatically with the **"resident" role**
3. **Manually update your role** in the database to test other roles:

   ```bash
   # Open the database console in Replit
   # Run this SQL to make yourself an admin:
   UPDATE users SET role = 'admin' WHERE email = 'your-replit-email@example.com';
   
   # Or make yourself security:
   UPDATE users SET role = 'security' WHERE email = 'your-replit-email@example.com';
   
   # To go back to resident:
   UPDATE users SET role = 'resident' WHERE email = 'your-replit-email@example.com';
   ```

4. **Refresh the page** after changing your role

### Option 2: Testing with Replit Accounts Matching Test Emails

If you have Replit accounts with emails matching the test accounts:
- admin@estatetest.com
- resident@estatetest.com  
- security@estatetest.com

You can sign in with Replit Auth and your account will automatically match these test users.

---

## Testing Different Roles

### Testing as Admin
1. Update your role to `admin` (see above)
2. Refresh the page
3. You'll see:
   - Admin Dashboard with estate statistics
   - Resident Management (add, edit residents)
   - Billing Operations (create bills, track payments)
   - Reports & Analytics
   - Announcements

### Testing as Resident
1. Update your role to `resident` (see above)
2. Create a resident profile if needed:
   ```sql
   INSERT INTO residents (user_id, unit_number, phone_number, account_status, total_balance)
   VALUES ('your-user-id', 'B-202', '+234-800-000-0002', 'active', '0');
   ```
3. Refresh the page
4. You'll see:
   - Resident Dashboard with your bills and balance
   - Bills page (view and pay bills)
   - Visitors page (pre-approve visitors with QR codes)
   - Notifications

### Testing as Security
1. Update your role to `security` (see above)
2. Refresh the page  
3. You'll see:
   - Security Dashboard with recent activities
   - QR Scanner (scan visitor QR codes)
   - Access Logs
   - Manual entry logging

---

## Quick Database Commands

### Check your current user info:
```sql
SELECT * FROM users WHERE email = 'your-email@example.com';
```

### View all test users:
```sql
SELECT id, email, first_name, last_name, role FROM users;
```

### View resident profiles:
```sql
SELECT r.*, u.email, u.first_name, u.last_name 
FROM residents r 
JOIN users u ON r.user_id = u.id;
```

### View all bills:
```sql
SELECT b.*, r.unit_number 
FROM bills b 
JOIN residents r ON b.resident_id = r.id;
```

---

## Re-seeding Test Data

If you need to recreate the test accounts, run:

```bash
tsx server/seed.ts
```

This will create the test users if they don't already exist, or skip if they do.

---

## Testing Scenarios

### Test Delinquency Flow
1. Sign in as admin
2. Create a bill for a resident with a past due date
3. The resident's status will automatically change to "delinquent"
4. Sign in as that resident  
5. Try to pre-approve a visitor - it should be blocked
6. Sign in as admin and mark the bill as paid
7. The resident's status returns to "active"
8. They can now pre-approve visitors again

### Test Visitor QR Flow
1. Sign in as resident
2. Pre-approve a visitor (get QR code)
3. Sign in as security
4. Go to QR Scanner
5. Scan/verify the QR code
6. Log the visitor entry

### Test Payment Processing
1. Sign in as resident
2. View pending bills
3. Click "Pay Now" (requires Stripe integration - coming soon)
4. Complete payment
5. Bill status updates to "paid"

---

## Need Help?

If you encounter issues:
1. Check browser console for errors
2. Check server logs in the Replit console
3. Verify your role is set correctly in the database
4. Make sure you've refreshed the page after role changes
