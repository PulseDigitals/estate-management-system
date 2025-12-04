import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import { IncomingMessage, ServerResponse } from "http";
import { getUserByEmailAndRole } from "./storage"; // implement below

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

interface LoginBody {
  email: string;
  password: string;
  role: "admin" | "resident" | "security" | "accountant";
}

function parseJson(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data ? JSON.parse(data) : {}));
  });
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const url = req.url || "";

  // LOGIN HANDLER
  if (req.method === "POST" && url.includes("/login")) {
    const body = (await parseJson(req)) as LoginBody;
    const { email, password, role } = body;

    if (!email || !password || !role) {
      res.statusCode = 400;
      res.end(JSON.stringify({ message: "Email, password & role required" }));
      return;
    }

    const user = await getUserByEmailAndRole(email, role);

    if (!user || !user.passwordHash) {
      res.statusCode = 401;
      res.end(JSON.stringify({ message: "Invalid credentials" }));
      return;
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      res.statusCode = 401;
      res.end(JSON.stringify({ message: "Invalid credentials" }));
      return;
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.setHeader(
      "Set-Cookie",
      cookie.serialize("session", token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 7 * 24 * 60 * 60,
      })
    );

    res.statusCode = 200;
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // LOGOUT HANDLER
  if (req.method === "POST" && url.includes("/logout")) {
    res.setHeader(
      "Set-Cookie",
      cookie.serialize("session", "", {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 0,
      })
    );

    res.statusCode = 200;
    res.end(JSON.stringify({ success: true }));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ message: "Not found" }));
}
