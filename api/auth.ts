import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { IncomingMessage, ServerResponse } from "http";
import { getUserByEmailAndRole } from "./storage";
import { getUserFromCookie } from "../shared/auth-utils";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

type Role = "admin" | "resident" | "security" | "accountant";

interface LoginBody {
  email: string;
  password: string;
  role: Role;
}

function parseJson(req: IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = req.url || "";

  // 🔹 GET /api/auth/me  → who is logged in?
  if (req.method === "GET" && url.includes("/me")) {
    const user = getUserFromCookie(req.headers.cookie || null);
    res.statusCode = 200;
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ user }));
  }

  // 🔹 POST /api/auth/login
  if (req.method === "POST" && url.includes("/login")) {
    try {
      const body = (await parseJson(req)) as LoginBody;
      const { email, password, role } = body;

      if (!email || !password || !role) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ message: "Email, password & role required" }));
      }

      const user = await getUserByEmailAndRole(email, role);

      if (!user || !user.passwordHash) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ message: "Invalid credentials" }));
      }

      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        res.statusCode = 401;
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify({ message: "Invalid credentials" }));
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role as Role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const setCookie = cookie.serialize("session", token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      });

      res.statusCode = 200;
      res.setHeader("Set-Cookie", setCookie);
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ success: true }));
    } catch (e) {
      console.error("Login error", e);
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify({ message: "Internal server error" }));
    }
  }

  // 🔹 POST /api/auth/logout
  if (req.method === "POST" && url.includes("/logout")) {
    const clearCookie = cookie.serialize("session", "", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });

    res.statusCode = 200;
    res.setHeader("Set-Cookie", clearCookie);
    res.setHeader("Content-Type", "application/json");
    return res.end(JSON.stringify({ success: true }));
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "application/json");
  return res.end(JSON.stringify({ message: "Not found" }));
}
