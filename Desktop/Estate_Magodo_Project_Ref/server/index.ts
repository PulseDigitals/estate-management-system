import express from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Session store with graceful fallback to MemoryStore if DATABASE_URL missing/unreachable (for local dev)
const PgSession = connectPg(session);
const sessionTtlMs = 7 * 24 * 60 * 60 * 1000; // 7 days
const isProduction = process.env.NODE_ENV === "production";
const databaseUrl = process.env.DATABASE_URL;

app.set("trust proxy", 1); // allow secure cookies behind proxy/HTTPS

const usePgStore = Boolean(databaseUrl);
const sessionOptions: session.SessionOptions = {
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction, // requires HTTPS in prod
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
      ttl: sessionTtlMs / 1000, // seconds
    });
    store.on("error", (err: any) => {
      console.warn("[session] Postgres store error, falling back to MemoryStore for this process:", err?.message);
      sessionOptions.store = undefined;
    });
    sessionOptions.store = store;
  } catch (err: any) {
    console.warn("[session] Failed to init Postgres session store, falling back to MemoryStore:", err?.message);
  }
} else {
  console.warn("[session] DATABASE_URL not set; falling back to MemoryStore (dev only)");
}

app.use(session(sessionOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---- Minimal auth endpoints ----
app.get("/api/login", (req, res) => {
  const role = (req.query.role as string) || "resident";
  req.session.user = {
    id: "demo-user",
    email: `${role}@demo.local`,
    role,
  };
  // After "login", send them to the SPA
  res.redirect("/");
});

app.get("/api/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

app.get("/api/auth/user", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ message: "Not authenticated" });
  }
  res.json(req.session.user);
});

// Frontend build location
const clientDist = path.join(__dirname, "../client/dist");

// Serve static files
app.use(express.static(clientDist));

// SPA fallback
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
