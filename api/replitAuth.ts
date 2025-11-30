import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler, Request, Response, NextFunction } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Extend session to include intendedRole and inviteToken
declare module "express-session" {
  interface SessionData {
    intendedRole?: string;
    inviteToken?: string;
  }
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
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
    secret: process.env.SESSION_SECRET!,
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

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  await storage.upsertUser({
    id: claims["sub"],
    email: claims["email"],
    firstName: claims["first_name"],
    lastName: claims["last_name"],
    profileImageUrl: claims["profile_image_url"],
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    // Note: User creation is handled in the callback to ensure correct role assignment
    // from invites. We only update session here.
    verified(null, user);
  };

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

  // Helper function to ensure strategy exists for a domain
  const ensureStrategy = (domain: string) => {
    const strategyName = `replitauth:${domain}`;
    if (!registeredStrategies.has(strategyName)) {
      const strategy = new Strategy(
        {
          name: strategyName,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
      registeredStrategies.add(strategyName);
    }
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req: Request, res: Response, next: NextFunction) => {
    ensureStrategy(req.hostname);
    
    // Store intended role preference in session
    const intendedRole = req.query.role as string;
    if (intendedRole === 'admin' || intendedRole === 'resident') {
      req.session.intendedRole = intendedRole;
    }
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", async (req: Request, res: Response, next: NextFunction) => {
    ensureStrategy(req.hostname);
    
    passport.authenticate(`replitauth:${req.hostname}`, {
      failureRedirect: "/api/login",
    })(req, res, async (err: any) => {
      if (err) {
        return next(err);
      }
      
      const user = req.user as any;
      const userId = user?.claims?.sub;
      
      if (!userId) {
        return next(new Error("User ID not found"));
      }
      
      // Check if there's an invite token in session
      const inviteToken = req.session.inviteToken;
      
      if (inviteToken) {
        try {
          // Validate and process the invite
          const invite = await storage.getUserInvite(inviteToken);
          
          if (!invite) {
            console.error("Invite not found:", inviteToken);
            delete req.session.inviteToken;
            return res.redirect("/?error=invite_not_found");
          }
          
          if (invite.status !== 'pending') {
            console.error("Invite already used or expired:", inviteToken);
            delete req.session.inviteToken;
            return res.redirect("/?error=invite_used");
          }
          
          if (new Date() > new Date(invite.expiresAt)) {
            console.error("Invite expired:", inviteToken);
            await storage.expireUserInvite(invite.id);
            delete req.session.inviteToken;
            return res.redirect("/?error=invite_expired");
          }
          
          // CRITICAL SECURITY CHECK: Verify authenticated email matches invite email
          const authenticatedEmail = user.claims?.email?.toLowerCase();
          const inviteEmail = invite.email.toLowerCase();
          
          if (!authenticatedEmail || authenticatedEmail !== inviteEmail) {
            console.error("Email mismatch - Authenticated:", authenticatedEmail, "Invite:", inviteEmail);
            // Expire the invite to prevent reuse
            await storage.expireUserInvite(invite.id);
            delete req.session.inviteToken;
            return res.redirect("/?error=invite_email_mismatch");
          }
          
          // Create/update user with correct role from invite
          const dbUser = await storage.upsertUser({
            id: userId,
            email: user.claims.email,
            firstName: invite.firstName || user.claims.first_name,
            lastName: invite.lastName || user.claims.last_name,
            profileImageUrl: user.claims.profile_image_url,
            role: invite.role, // Set role from invite
          });
          
          // If invite is for resident, create resident record
          if (invite.role === 'resident' && invite.unitNumber) {
            try {
              await storage.createResident({
                userId: userId,
                unitNumber: invite.unitNumber,
                streetName: null,
                phoneNumber: null,
                accountStatus: "active",
                totalBalance: "0",
              });
            } catch (error: any) {
              // Ignore duplicate errors - resident may already exist
              if (!error.message?.includes('duplicate') && !error.message?.includes('unique')) {
                console.error("Error creating resident:", error);
              }
            }
          }
          
          // Accept the invite
          await storage.acceptUserInvite(inviteToken, userId);
          
          // Clean up session
          delete req.session.inviteToken;
          
          // Redirect based on role
          let redirectPath = "/";
          if (invite.role === 'admin' || invite.role === 'accountant') {
            redirectPath = "/admin";
          } else if (invite.role === 'security') {
            redirectPath = "/security";
          }
          
          return res.redirect(redirectPath);
        } catch (error) {
          console.error("Error processing invite:", error);
          delete req.session.inviteToken;
          return res.redirect("/?error=invite_processing_failed");
        }
      }
      
      // No invite token - create/update user with default resident role
      // This handles normal login without invites
      await storage.upsertUser({
        id: userId,
        email: user.claims.email,
        firstName: user.claims.first_name,
        lastName: user.claims.last_name,
        profileImageUrl: user.claims.profile_image_url,
        // Note: role will default to "resident" if not explicitly set
      });
      
      // Get the intended role from session
      const intendedRole = req.session.intendedRole;
      delete req.session.intendedRole; // Clean up after use
      
      // Determine redirect path based on intended role
      let redirectPath = "/";
      
      if (intendedRole === 'admin') {
        redirectPath = "/admin";
      } else if (intendedRole === 'resident') {
        redirectPath = "/";
      }
      
      res.redirect(redirectPath);
    });
  });

  app.get("/api/logout", (req: Request, res: Response) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

/**
 * Ensures user exists in database by creating/updating from OIDC claims.
 * Recovers role from accepted invites or resident profiles for orphaned sessions.
 */
async function ensureUserRecord(userId: string, claims: any): Promise<void> {
  try {
    // Check if user already exists
    const existingUser = await storage.getUser(userId);
    if (existingUser) {
      return; // User record exists, nothing to do
    }

    // User missing from database - attempt role recovery
    console.log(`[ensureUserRecord] User ${userId} missing from database, attempting recovery...`);

    let recoveredRole: 'resident' | 'admin' | 'security' | 'accountant' | undefined;

    // Strategy 1: Check if they have an accepted invite
    const acceptedInvite = await storage.getAcceptedInviteByUserId(userId);
    if (acceptedInvite) {
      recoveredRole = acceptedInvite.role as 'resident' | 'admin' | 'security' | 'accountant';
      console.log(`[ensureUserRecord] Recovered role "${recoveredRole}" from accepted invite`);
    }

    // Strategy 2: Check if they have a resident profile
    if (!recoveredRole) {
      const resident = await storage.getResidentByUserId(userId);
      if (resident) {
        recoveredRole = 'resident';
        console.log(`[ensureUserRecord] Recovered role "resident" from resident profile`);
      }
    }

    // Create user with recovered or default role
    await storage.upsertUser({
      id: userId,
      email: claims.email,
      firstName: claims.first_name,
      lastName: claims.last_name,
      profileImageUrl: claims.profile_image_url,
      role: recoveredRole, // Will default to "resident" if undefined
    });

    console.log(`[ensureUserRecord] Created user ${userId} with role "${recoveredRole || 'resident'}"`);
  } catch (error) {
    console.error('[ensureUserRecord] Error ensuring user record:', error);
    throw error;
  }
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    // Ensure user record exists in database before continuing
    try {
      const userId = user.claims?.sub;
      if (userId) {
        await ensureUserRecord(userId, user.claims);
      }
    } catch (error) {
      console.error("Error ensuring user record:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    
    // Ensure user record exists after token refresh
    const userId = user.claims?.sub;
    if (userId) {
      await ensureUserRecord(userId, user.claims);
    }
    
    return next();
  } catch (error) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
};

// Role-based authorization middleware
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

      // Ensure user record exists in database (auto-recovers orphaned sessions)
      await ensureUserRecord(userId, req.user.claims);

      // Get user from database to check role
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "Unauthorized - User not found" });
      }

      // Check if user's role is in the allowed roles list
      if (!user.role || !allowedRoles.includes(user.role)) {
        return res.status(403).json({ 
          message: `Access denied - This feature requires ${allowedRoles.join(' or ')} role` 
        });
      }

      // Attach user to request for convenience
      req.dbUser = user;
      next();
    } catch (error) {
      console.error("Error in requireRole middleware:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};

// Convenience middleware for common role combinations
export const requireAdmin = requireRole(['admin']);
export const requireAdminOrAccountant = requireRole(['admin', 'accountant']);
export const requireSecurity = requireRole(['security']);
export const requireResident = requireRole(['resident']);
