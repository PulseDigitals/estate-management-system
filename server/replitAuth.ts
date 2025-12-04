// @ts-nocheck
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { storage } from "./storage";

// Extend session types
declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

// ---- 1. SESSION SETUP ----
export function getSession() {
  const pgStore = connectPg(session);
  return session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: new pgStore({
      conString: process.env.DATABASE_URL,
      tableName: "sessions",
      createTableIfMissing: true,
    }),
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: false, // set true only on HTTPS
      httpOnly: true
    },
  });
}

// ---- 2. LOCAL AUTH (email + password) ----
export async function loginUser(email: string, password: string) {
  const user = await storage.getUserByEmail(email);
  if (!user) return null;

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return null;

  return user;
}

export async function registerUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}) {
  const passwordHash = await bcrypt.hash(data.password, 10);

  return storage.createUser({
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    role: data.role || "resident",
    passwordHash,
  });
}

// ---- 3. EXPRESS MIDDLEWARE FOR PROTECTED ROUTES ----

// User must be logged in
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

// Role-based protection
export const requireRole = (allowedRoles: string[]): RequestHandler => {
  return async (req, res, next) => {
    if (!req.session.userId)
      return res.status(401).json({ message: "Unauthorized" });

    const user = await storage.getUser(req.session.userId);
    if (!user)
      return res.status(401).json({ message: "Unauthorized" });

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // attach
    req.user = user;
    next();
  };
};

export const requireAdmin = requireRole(["admin"]);
export const requireResident = requireRole(["resident"]);
export const requireSecurity = requireRole(["security"]);
export const requireAdminOrAccountant = requireRole([
  "admin",
  "accountant",
]);

// ---- 4. OPTIONAL: API KEY AUTH ----
export const requireApiKey: RequestHandler = (req, res, next) => {
  const key = req.headers["x-api-key"];
  if (key !== process.env.API_KEY) {
    return res.status(403).json({ message: "Invalid API key" });
  }
  next();
};
// @ts-nocheck
