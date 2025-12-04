import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

export type Role = "admin" | "resident" | "security" | "accountant";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

export function parseCookies(cookieHeader?: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;

  cookieHeader.split(";").forEach((pair) => {
    const [key, ...rest] = pair.trim().split("=");
    out[key] = rest.join("=");
  });

  return out;
}

// 👉 Can be used in any handler (Vercel, Express-style, etc.)
export function getUserFromCookie(cookieHeader?: string | null): AuthUser | null {
  const cookies = parseCookies(cookieHeader);
  const token = cookies["session"];
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch {
    return null;
  }
}
