import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Load environment variables before doing anything else
dotenv.config();

import { authRouter } from "./server/auth";
import { migrationRouter } from "./server/migration";
import { paymentRouter } from "./server/payments";
import { operationsRouter } from "./server/operations";
import { aiRouter } from "./server/ai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Raw body middleware for Razorpay Webhook signature verification
  app.use(express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf.toString('utf-8');
    }
  }));

  // Log incoming server requests for debugging
  app.use((req, res, next) => {
    console.log(`[Express Server] ${req.method} ${req.url}`);
    next();
  });

  // API routes MUST be registered first
  app.use("/api/auth", authRouter);
  app.use("/api/admin", migrationRouter);
  app.use("/api/payments", paymentRouter);
  app.use("/api/operations", operationsRouter);
  app.use("/api/ai", aiRouter);
  app.use("/api", authRouter);

  // Simple health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
  });

  // Vite middleware for development vs static asset delivery for production
  if (process.env.NODE_ENV !== "production") {
    console.log("[Express Server] Initializing Vite in middlewareMode (Development)...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Express Server] Serving production static files from /dist...");
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Express Server] MyAngan Engine running on port ${PORT}`);
  });
}

startServer().catch(err => {
  console.error("[Express Server] Critical failure starting full-stack applet:", err);
  process.exit(1);
});
