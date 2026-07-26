import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

import { authRouter } from "./server/auth";
import { migrationRouter } from "./server/migration";
import { paymentRouter } from "./server/payments";
import { operationsRouter } from "./server/operations";
import { aiRouter } from "./server/ai";
import { validateEnv } from "./server/env";

export const app = express();
const PORT = process.env.PORT || 3000;

// Validate environment variables
try {
  validateEnv();
} catch (err) {
  console.warn("⚠️ Environment validation notice:", err);
}

// Raw body middleware for Razorpay Webhook signature verification
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString('utf-8');
  }
}));

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/admin", authRouter);
app.use("/api/admin", migrationRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/operations", operationsRouter);
app.use("/api/ai", aiRouter);

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mode: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
});

async function startServer() {
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

  app.listen(PORT, () => {
    console.log(`[Express Server] MyAngan Engine running on port ${PORT}`);
  });
}

// Run server only if executed directly
if (process.env.VERCEL !== "1") {
  startServer().catch(err => {
    console.error("[Express Server] Critical failure starting full-stack applet:", err);
    process.exit(1);
  });
}
