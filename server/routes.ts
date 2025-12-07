import { loginUser, registerUser, isAuthenticated, requireAdmin } from "./auth.js";

export default function registerRoutes(app) {

  // ---- REGISTER ----
  app.post("/api/register", async (req, res) => {
    const { email, password, firstName, lastName } = req.body;

    const exists = await storage.getUserByEmail(email);
    if (exists) return res.status(400).json({ message: "Email exists" });

    const user = await registerUser({ email, password, firstName, lastName });

    res.json({ message: "Account created", user });
  });

  // ---- LOGIN ----
  app.post("/api/login", async (req, res) => {
    const { email, password } = req.body;

    const user = await loginUser(email, password);
    if (!user)
      return res.status(401).json({ message: "Invalid credentials" });

    req.session.userId = user.id;
    res.json({ message: "Logged in", user });
  });

  // ---- LOGOUT ----
  app.get("/api/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ message: "Logged out" });
    });
  });

  // ---- CURRENT USER ----
  app.get("/api/me", isAuthenticated, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    res.json(user);
  });

  // ---- ADMIN DASHBOARD TEST ----
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    res.json({ stats: "Super secret admin stats!" });
  });

  // ---- LIST RESIDENTS ----
  app.get("/api/admin/residents", isAuthenticated, requireAdmin, async (req, res) => {
    const fakeResidents = [
      { id: 1, name: "John Doe", email: "john@estate.com", unit: "A12" },
      { id: 2, name: "Jane Smith", email: "jane@estate.com", unit: "B04" },
    ];
    res.json(fakeResidents);
  });

  // ---- ADD RESIDENT ----
  app.post("/api/admin/residents", isAuthenticated, requireAdmin, async (req, res) => {
    try {
      const payload = req.body;
      console.log("Received new resident:", payload);

      res.status(201).json({ success: true, saved: payload });
    } catch (err) {
      console.error("Error saving resident:", err);
      res.status(500).json({ error: "Failed to save resident" });
    }
  });
}
