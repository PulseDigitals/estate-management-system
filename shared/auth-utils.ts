import jwt from "jsonwebtoken";

export type Role = "admin" | "resident" | "security" | "accountant";

export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET must be set");
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

// Can be used in any handler (Vercel, Express-style, etc.)
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
