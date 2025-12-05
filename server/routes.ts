import { loginUser, registerUser, isAuthenticated, requireAdmin } from "./auth";

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

  // ---- PROTECTED EXAMPLE ----
  app.get("/api/me", isAuthenticated, async (req, res) => {
    const user = await storage.getUser(req.session.userId!);
    res.json(user);
  });

  // ---- ADMIN EXAMPLE ----
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    res.json({ stats: "Super secret admin stats!" });
  });

}
// ---- ADD RESIDENT ----
app.post("/api/admin/residents", isAuthenticated, requireAdmin, async (req, res) => {
  try {
    const residentData = req.body;

    // 🛠 TODO: Replace this with actual database insert
    const newResident = {
      id: Math.floor(Math.random() * 100000),
      ...residentData,
      createdAt: new Date(),
    };

    console.log("New resident created:", newResident);

    // Return created data
    res.status(201).json({ message: "Resident created", resident: newResident });

  } catch (err) {
    console.error("Error adding resident:", err);
    res.status(500).json({ error: "Failed to add resident" });
  }
});
