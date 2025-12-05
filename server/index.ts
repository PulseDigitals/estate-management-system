import cors from "cors";
import express from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import connectPg from "connect-pg-simple";
import path from "path";
import { fileURLToPath } from "url";

// Import auth functions
import { loginUser, getSession } from "./auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

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
  try {
    const store = new PgSession({
      conString: databaseUrl,
      tableName: "sessions",
      createTableIfMissing: true,
      ttl: sessionTtlMs / 1000,
    });

    store.on("error", (err: any) => {
      console.warn("[Session] Postgres store error — fallback to memory:", err?.message);
      sessionOptions.store = undefined;
    });

    sessionOptions.store = store;
  } catch (err: any) {
    console.warn("[Session] Failed to init PG Store — fallback:", err?.message);
  }
} else {
  console.warn("[Session] DATABASE_URL missing — memory session active (dev only)");
}

app.use(session(sessionOptions));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------- CORS FIX — MUST COME BEFORE ROUTES ---------------------- //

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

// Login endpoint
app.post("/api/auth/login", loginUser);

// Return current logged in user
app.get("/api/auth/user", (req, res) => {
  const user = getSession(req);

  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  res.json(user);
});

// Logout endpoint
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// ---------------------- STATIC SPA HANDLER ---------------------- //

const clientDist = path.join(__dirname, "../client/dist");
app.use(express.static(clientDist));

app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
