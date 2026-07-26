# MyAngan - Vercel API Module Resolution Fix Report

**Fix Date:** July 2026  
**Target Release Branch:** `release/production-readiness`  

---

## 1. Root Cause Analysis
At runtime on Vercel Node 22 ESM (`"type": "module"` in `package.json`), Vercel executed `/var/task/api/index.js` which contained extensionless relative imports (such as `import "../server/auth"`). Native Node.js ESM does not resolve extensionless relative imports, resulting in `Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/var/task/server/auth' imported from /var/task/api/index.js`.

---

## 2. Chosen Solution (Option A — Bundled Single-Artifact API Entrypoint)
* **API Entrypoint Bundling:** Updated `package.json` build script to bundle `api/index.ts` and all local dependency modules (`server/auth.ts`, `server/db.ts`, `server/env.ts`, `server/payments.ts`, `server/operations.ts`, `server/ai.ts`, `server/migration.ts`, `server/email.ts`) into a standalone JavaScript ESM bundle at `api/index.js` using `esbuild` (`--bundle --platform=node --format=esm --packages=external`).
* **Source Import Extension Hardening:** Updated all relative imports in `api/index.ts` and `server/*.ts` to include explicit `.js` extensions (e.g. `import { authRouter } from "../server/auth.js";`), guaranteeing resolution compatibility under Node 22 ESM.
* **External Package Preservation:** `express`, `@supabase/supabase-js`, `zod`, `nodemailer`, `dotenv`, and Node built-in modules remain external imports.
* **Preserved Handlers:** Express app export (`export default app;`), raw-body webhook signature verification, Supabase auth, rate limiting, and CORS preserved intact.

---

## 3. Verification Results
* `npm run typecheck`: **PASSED** (0 Errors)
* `npm run test:unit`: **PASSED** (50 / 50 Passed)
* `npm run build`: **PASSED** (`api/index.js` 109.3kB ESM bundle generated)

---

VERCEL API MODULE STATUS: FIXED AND PUSHED
