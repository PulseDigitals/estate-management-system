import { Issuer } from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import memoize from "memoizee";
import { storage } from "./storage";

declare module "express-session" {
  interface SessionData {
    intendedRole?: string;
  }
}

// ---- Configuration helpers ----
const getOidcClient = memoize(
  async () => {
    const issuerUrl = process.env.OIDC_ISSUER_URL;
    const clientId = process.env.OIDC_CLIENT_ID;
    const clientSecret = process.env.OIDC_CLIENT_SECRET;
    const redirectUri = process.env.OIDC_REDIRECT_URI;

    console.log("OIDC env", {
      issuerUrl,
      clientId,
      hasSecret: Boolean(clientSecret),
      redirectUri,
    });

    if (!issuerUrl || !clientId || !clientSecret || !redirectUri) {
      throw new Error(
        "Missing OIDC config. Please set OIDC_ISSUER_URL, OIDC_CLIENT_ID, OIDC_CLIENT_SECRET, and OIDC_REDIRECT_URI."
      );
    }

    const issuer = await Issuer.discover(issuerUrl);
    return new issuer.Client({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uris: [redirectUri],
      response_types: ["code"],
    });
  },
  { promise: true, maxAge: 60 * 60 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || "change-me",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

async function ensureUserRecord(
  claims: any,
  intendedRole?: string
) {
  const userId = claims?.sub;
  if (!userId) return;

  const existing = await storage.getUser(userId);
  const role = existing?.role || intendedRole || "resident";

  await storage.upsertUser({
    id: userId,
    email: claims.email,
    firstName: claims.given_name || claims.first_name,
    lastName: claims.family_name || claims.last_name,
    profileImageUrl: claims.picture || claims.profile_image_url,
    role,
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const client = await getOidcClient();
  const scope = process.env.OIDC_SCOPES || "openid email profile offline_access";

  const verify: VerifyFunction = async (tokenSet: any, userinfo: any, done) => {
    try {
      const user = {
        claims: tokenSet.claims(),
        access_token: tokenSet.access_token,
        refresh_token: tokenSet.refresh_token,
        expires_at: tokenSet.expires_at,
        userinfo,
      };
      return done(null, user);
    } catch (err) {
      return done(err as Error);
    }
  };

  const strategy = new Strategy(
    {
      client,
      params: { scope },
      passReqToCallback: false,
      usePKCE: true,
    },
    verify
  );

  passport.use("oidc", strategy);

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // ---- Auth endpoints ----
  app.get("/api/login", (req, res, next) => {
    const role = req.query.role as string | undefined;
    if (role) {
      req.session.intendedRole = role;
    }
    passport.authenticate("oidc", { scope })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    passport.authenticate("oidc", { failureRedirect: "/api/login" })(
      req,
      res,
      async (err: any) => {
        if (err) return next(err);

        const user = req.user as any;
        try {
          await ensureUserRecord(user?.claims, req.session.intendedRole);
          delete req.session.intendedRole;
        } catch (error) {
          return next(error);
        }
        res.redirect("/");
      }
    );
  });

  app.post("/api/logout", (req, res) => {
    req.logout(() => {
      req.session.destroy(() => {
        res.json({ message: "logged out" });
      });
    });
  });
}

// ---- Guards ----
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresAt = user?.expires_at;

  if (expiresAt && now > expiresAt && user?.refresh_token) {
    try {
      const client = await getOidcClient();
      const refreshed = await client.refresh(user.refresh_token);
      user.claims = refreshed.claims();
      user.access_token = refreshed.access_token;
      user.refresh_token = refreshed.refresh_token || user.refresh_token;
      user.expires_at = refreshed.expires_at;
    } catch (err) {
      return res.status(401).json({ message: "Unauthorized" });
    }
  }

  try {
    await ensureUserRecord(user?.claims);
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }

  return next();
};

export const requireRole = (allowedRoles: string[]): RequestHandler => {
  return async (req: any, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Unauthorized - Please log in" });
      }

      const userId = req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized - Invalid user" });
      }

      // Ensure user record exists in database
      await ensureUserRecord(req.user.claims);

      const user = await storage.getUser(userId);
      if (!user || !allowedRoles.includes(user.role!)) {
        return res.status(403).json({
          message: `Access denied - This feature requires ${allowedRoles.join(" or ")} role`,
        });
      }

      req.dbUser = user;
      next();
    } catch (error) {
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};

export const requireAdmin = requireRole(["admin"]);
export const requireAdminOrAccountant = requireRole(["admin", "accountant"]);
export const requireSecurity = requireRole(["security"]);
export const requireResident = requireRole(["resident"]);
