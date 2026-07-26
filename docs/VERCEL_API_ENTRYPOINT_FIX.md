# MyAngan - Vercel API Entrypoint Conflict Fix Report

**Fix Date:** July 2026  
**Target Release Branch:** `release/production-readiness`  

---

## 1. Problem Diagnosis
Vercel deployment failed with `Two or more files have conflicting paths or names. The path "api/index.js" has conflicts with "api/index.ts"`. This conflict occurred because `api/index.js` was committed alongside `api/index.ts` in the source `api/` directory, causing Vercel's builder to attempt mapping both files to the same `/api/index` serverless function route.

---

## 2. Implemented Resolution
* **Entrypoint Consolidation:** `api/index.ts` is preserved as the single canonical Vercel API entrypoint.
* **Deleted Duplicate JS Artifact:** `api/index.js` has been removed from the repository (`git rm api/index.js`).
* **Build Script Cleanup:** Updated `package.json` build script (`vite build && esbuild server.ts ...`) to build `dist/server.cjs` only and stop outputting compiled JavaScript files into the source `api/` directory.
* **Hardened TypeScript Imports:** Retained explicit `.js` extension imports in `api/index.ts` and `server/*.ts` (e.g. `import { authRouter } from "../server/auth.js";`), ensuring Node 22 ESM resolves all relative module paths cleanly when `@vercel/node` compiles `api/index.ts`.

---

## 3. Verification Scorecard
* **Single API Entrypoint:** Only `api/index.ts` exists in `/api`.
* **TypeScript Typecheck:** `npm run typecheck` $\rightarrow$ **PASSED** (0 Errors)
* **Automated QA Suite:** `npm run test:unit` $\rightarrow$ **50 / 50 PASSED** (0 Failed)
* **Production Build:** `npm run build` $\rightarrow$ **PASSED** (`dist/` compiled cleanly without modifying `api/`)

---

VERCEL API ENTRYPOINT STATUS: FIXED AND PUSHED
