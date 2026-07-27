import express from "express";
import dotenv from "dotenv";

dotenv.config();

import { authRouter } from "../server/auth.js";
import { migrationRouter } from "../server/migration.js";
import { paymentRouter } from "../server/payments.js";
import { operationsRouter } from "../server/operations.js";
import { aiRouter } from "../server/ai.js";
import { validateEnv } from "../server/env.js";

// Perform environment validation at startup
try {
  validateEnv();
} catch (err) {
  console.warn("⚠️ Environment validation notice:", err);
}

const app = express();

// Raw body middleware for Razorpay Webhook signature verification
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString('utf-8');
  }
}));

// API Router Mounts
app.use("/api/auth", authRouter);
app.use("/api", authRouter);
app.use("/api/admin", migrationRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/operations", operationsRouter);
app.use("/api/ai", aiRouter);

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mode: process.env.NODE_ENV || "production",
    timestamp: new Date().toISOString()
  });
});

export default app;
