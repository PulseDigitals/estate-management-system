import { loginUser, registerUser, isAuthenticated, requireAdmin } from "./auth.js";

// Fake in-memory store – replace with DB later
const residentStore: any[] = [];

export default function registerRoutes(app) {

  // ---- REGISTER ----
  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      // TODO: real DB lookup
      // const exists = await storage.getUserByEmail(email);
      // if (exists) return res.status(400).json({ message: "Email exists" });

      const user = await registerUser({ email, password, firstName, lastName });

      res.json({ message: "Account created", user });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // ---- LOGIN ----
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;
