import express, { type Request, Response, NextFunction } from "express";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  limit: '10mb', // Increased limit to support large receipt image uploads
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// CORS for frontend (Vercel) with credentials support
const allowedOrigin =
  process.env.CORS_ORIGIN ||
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` ||
  undefined;

if (allowedOrigin) {
  app.use(cors({
    origin: allowedOrigin,
    credentials: true,
  }));
  // Preflight support
  app.options("*", cors({
    origin: allowedOrigin,
    credentials: true,
  }));
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    
    // Start automated billing scheduler
    startAutomatedBillingScheduler();
  });
})();

// Automated billing scheduler - runs daily
async function startAutomatedBillingScheduler() {
  const SYSTEM_USER_ID = 'system-automated-billing';
  const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  // Ensure system user exists for automated billing
  try {
    await storage.upsertUser({
      id: SYSTEM_USER_ID,
      email: 'system@automated-billing.internal',
      firstName: 'System',
      lastName: 'Automated Billing',
      role: 'admin',
    });
  } catch (error: any) {
    console.error('[Automated Billing] Failed to create system user:', error.message);
  }
  
  // Function to run automated billing
  async function runAutomatedBilling() {
    try {
      log('[Automated Billing] Running daily billing check...');
      const result = await storage.generateAutomatedServiceChargeBills(SYSTEM_USER_ID);
      log(`[Automated Billing] Completed: ${result.success} bills generated, ${result.failed} failed`);
      
      if (result.errors.length > 0) {
        log(`[Automated Billing] Errors: ${JSON.stringify(result.errors)}`);
      }
      
      // Send invoice emails for newly generated bills
      if (result.success > 0 && result.generatedBills && result.generatedBills.length > 0) {
        await storage.sendInvoiceEmailsForBills(result.generatedBills);
      }
    } catch (error: any) {
      console.error('[Automated Billing] Error during daily billing check:', error.message);
    }
  }
  
  // Run immediately on server start (after 30 second delay to allow DB connections)
  setTimeout(() => {
    log('[Automated Billing] Running initial billing check on server start...');
    runAutomatedBilling();
  }, 30000);
  
  // Schedule to run daily
  setInterval(() => {
    runAutomatedBilling();
  }, ONE_DAY_MS);
  
  log('[Automated Billing] Scheduler initialized - will run daily');
}
