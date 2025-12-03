import { db } from "./db";
import { users, residents, bills } from "@shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Starting database seed...");

  // Check if seed users already exist
  const existingAdmin = await db.select().from(users).where(eq(users.email, "admin@estatetest.com"));
  const existingResident = await db.select().from(users).where(eq(users.email, "resident@estatetest.com"));
  const existingSecurity = await db.select().from(users).where(eq(users.email, "security@estatetest.com"));

  // Create Admin User
  let adminUser;
  if (existingAdmin.length === 0) {
    const [admin] = await db.insert(users).values({
      email: "admin@estatetest.com",
      firstName: "Test",
      lastName: "Admin",
      role: "admin",
    }).returning();
    adminUser = admin;
    console.log("✅ Admin user created: admin@estatetest.com");
  } else {
    adminUser = existingAdmin[0];
    console.log("ℹ️  Admin user already exists: admin@estatetest.com");
  }

  // Create Resident User
  let residentUser;
  if (existingResident.length === 0) {
    const [resident] = await db.insert(users).values({
      email: "resident@estatetest.com",
      firstName: "Test",
      lastName: "Resident",
      role: "resident",
    }).returning();
    residentUser = resident;
    console.log("✅ Resident user created: resident@estatetest.com");

    // Create resident profile
    const [residentProfile] = await db.insert(residents).values({
      userId: resident.id,
      unitNumber: "A-101",
      phoneNumber: "+234-800-000-0001",
      accountStatus: "active",
      totalBalance: "0",
    }).returning();
    console.log("✅ Resident profile created for unit A-101");

    // Create a sample bill for the resident
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30 days from now
    
    const periodStart = new Date();
    const periodEnd = new Date();
    periodEnd.setMonth(periodEnd.getMonth() + 1); // 1 month period

    await db.insert(bills).values({
      residentId: residentProfile.id,
      amount: "5000.00",
      dueDate: dueDate,
      status: "pending",
      description: "Monthly Levy - December 2024",
      periodStart: periodStart,
      periodEnd: periodEnd,
    });
    console.log("✅ Sample bill created for resident");
  } else {
    residentUser = existingResident[0];
    console.log("ℹ️  Resident user already exists: resident@estatetest.com");
  }

  // Create Security User
  let securityUser;
  if (existingSecurity.length === 0) {
    const [security] = await db.insert(users).values({
      email: "security@estatetest.com",
      firstName: "Test",
      lastName: "Security",
      role: "security",
    }).returning();
    securityUser = security;
    console.log("✅ Security user created: security@estatetest.com");
  } else {
    securityUser = existingSecurity[0];
    console.log("ℹ️  Security user already exists: security@estatetest.com");
  }

  console.log("\n📋 Test Credentials Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Admin Account:");
  console.log("  Email: admin@estatetest.com");
  console.log("  Role: Estate Administrator");
  console.log("");
  console.log("Resident Account:");
  console.log("  Email: resident@estatetest.com");
  console.log("  Role: Resident");
  console.log("  Unit: A-101");
  console.log("");
  console.log("Security Account:");
  console.log("  Email: security@estatetest.com");
  console.log("  Role: Security Personnel");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n⚠️  IMPORTANT: To use these test accounts:");
  console.log("   1. Go to your Estate Management System");
  console.log("   2. Click 'Sign In'");  
  console.log("   3. Sign in with Replit Auth using the emails above");
  console.log("   4. Your account will be automatically matched to these test users");
  console.log("\n✅ Seed completed successfully!");
}

seed()
  .catch((error) => {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
