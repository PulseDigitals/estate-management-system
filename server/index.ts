import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import connectPg from "connect-pg-simple";
import path from "path";
import { fileURLToPath } from "url";
import { loginUser, getSession } from "./auth.js";
import { storage } from "../api/storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

// ---------------------- SESSION SETUP ---------------------- //
const PgSession = connectPg(session);
const sessionTtlMs = 7 * 24 * 60 * 60 * 1000; // 7 days
const isProduction = process.env.NODE_ENV === "production";
const databaseUrl = process.env.DATABASE_URL;

app.set("trust proxy", 1);

const usePgStore = Boolean(databaseUrl);

const sessionOptions: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: sessionTtlMs,
  },
};

if (usePgStore) {
  const store = new PgSession({
    conString: databaseUrl,
    tableName: "sessions",
    createTableIfMissing: true,
    ttl: sessionTtlMs / 1000,
  });

  store.on("error", (err: any) => {
    console.warn("[Session] Postgres store error, fallback to memory:", err?.message);
    sessionOptions.store = undefined;
  });

  sessionOptions.store = store;
} else {
  console.warn("[Session] DATABASE_URL missing, memory session active (dev only)");
}

app.use(session(sessionOptions));
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ---------------------- CORS ---------------------- //
app.use(
  cors({
    origin: [
      "https://estate-management-system-jz6r5k7sx.vercel.app",
      "https://estate-management-system-hymc5sfin.vercel.app",
      "https://estate-management-system-ivheahrp0.vercel.app",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);

// ---------------------- BACKEND AUTH API ---------------------- //
app.post("/api/auth/login", loginUser);

app.get("/api/auth/user", (req, res) => {
  const user = getSession(req);

  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  res.json(user);
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// ---------------------- ADMIN ROUTES ---------------------- //
app.get("/api/admin/residents", async (_req, res) => {
  try {
    const residents = await storage.getAllResidents();
    res.json(residents);
  } catch (err: any) {
    console.error("Failed to fetch residents:", err?.message || err);
    res.status(500).json({ message: "Failed to fetch residents" });
  }
});

// Create resident (minimal pass-through to storage)
app.post("/api/admin/residents", async (req, res) => {
  try {
    const {
      email,
      firstName,
      lastName,
      unitNumber,
      phoneNumber,
      streetName,
      propertyType,
      emergencyContactName,
      emergencyContactPhone,
      notes,
    } = req.body || {};

    const resident = await storage.createResident({
      email,
      firstName,
      lastName,
      unitNumber,
      phoneNumber,
      streetName,
      propertyType: propertyType || "apartment",
      emergencyContactName: emergencyContactName || null,
      emergencyContactPhone: emergencyContactPhone || null,
      notes: notes || null,
      status: "active",
    });

    res.status(201).json(resident);
  } catch (err: any) {
    console.error("Failed to create resident:", err?.message || err);
    res.status(500).json({ message: "Failed to create resident" });
  }
});

// ---------------------- STATIC SPA HANDLER ---------------------- //
const clientDist = path.join(__dirname, "../client/dist");
app.use(express.static(clientDist));

app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
