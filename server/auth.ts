// Basic placeholder auth until you implement full API-key or session-based login

export function getSession(req) {
  return req.session?.user || null;
}

export function isAuthenticated(req, res, next) {
  if (!req.session?.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

export function requireAdmin(req, res, next) {
  if (!req.session?.user || req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

export async function loginUser(req, res) {
  const { email, password } = req.body;
  // TODO: Replace with DB lookup
  if (email === "admin@example.com" && password === "password") {
    req.session.user = { email, role: "admin" };
    return res.json({ success: true });
  }
  return res.status(400).json({ error: "Invalid credentials" });
}

export async function registerUser(req, res) {
  // TODO: implement
  return res.json({ success: true });
}
