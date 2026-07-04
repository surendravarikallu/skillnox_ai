// Load environment variables FIRST - before any other imports
import "./load-env";

import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import compression from "compression";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { evaluationQueue } from "./evaluation-queue";
import { storage } from "./storage";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Enable gzip compression for all responses
app.use(compression());

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
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
        const jsonStr = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${jsonStr.length > 500 ? jsonStr.slice(0, 500) + '...' : jsonStr}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5060 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5060", 10);
  httpServer.listen(
    port,
    "localhost",
    () => {
      log(`serving on port ${port}`);
    },
  );

  let campaignWorkerInterval: NodeJS.Timeout;

  const startCampaignSchedulerWorker = () => {
    const CHECK_INTERVAL_MS = 30000;
    
    campaignWorkerInterval = setInterval(async () => {
      try {
        const now = new Date();
        const campaigns = await storage.getScheduledCampaigns();
        const pendingCampaigns = campaigns.filter(
          c => c.status === 'pending' && new Date(c.scheduledAt) <= now
        );

        for (const campaign of pendingCampaigns) {
          log(`[CampaignScheduler] Executing campaign: ${campaign.title} (${campaign.id})`);
          
          await storage.updateScheduledCampaign(campaign.id, { status: 'active' });

          try {
            const allUsers = await storage.getAllUsers();
            const targetUsers = allUsers.filter(u => {
              if (u.role !== 'student') return false;
              if (campaign.branch && u.department !== campaign.branch) return false;
              return true;
            });

            log(`[CampaignScheduler] Targeting ${targetUsers.length} students for branch: ${campaign.branch || 'All'}`);

            for (const student of targetUsers) {
              log(`[CampaignScheduler] Automatically enrolling student ${student.firstName} ${student.lastName} (${student.id})`);
              await storage.createInterview({
                userId: student.id,
                types: campaign.company ? ['company'] : ['technical'],
                difficulty: campaign.difficulty as any,
                type: campaign.company ? 'company' : 'technical',
                company: campaign.company,
                simulationMode: campaign.simulationMode,
                trendingEnabled: true,
                status: 'pending',
              });
            }

            await storage.updateScheduledCampaign(campaign.id, { status: 'completed' });
            log(`[CampaignScheduler] Completed campaign: ${campaign.title}`);
          } catch (err: any) {
            console.error(`[CampaignScheduler] Failed executing campaign ${campaign.id}:`, err);
            await storage.updateScheduledCampaign(campaign.id, { status: 'pending' });
          }
        }
      } catch (err) {
        console.error("[CampaignScheduler] Worker error:", err);
      }
    }, CHECK_INTERVAL_MS);
  };

  startCampaignSchedulerWorker();

  const gracefulShutdown = () => {
    log("Shutting down server gracefully...");
    evaluationQueue.shutdown();
    if (campaignWorkerInterval) {
      clearInterval(campaignWorkerInterval);
    }
    httpServer.close(() => {
      log("Http server closed.");
      process.exit(0);
    });
    
    setTimeout(() => {
      console.error("Force exit after timeout.");
      process.exit(1);
    }, 10000);
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
})();
