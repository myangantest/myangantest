# MyAngan - Dependency Reconciliation & Compatibility Report

**Audit Date:** July 2026  
**Node Target:** Node.js 22.x LTS (` engines: { "node": "22.x" }`)  
**Package Manager:** `npm@9.5.1` (`package-lock.json` clean reproducible lockfile)  

---

## 1. Package Reconciliation Strategy & Choices

### A. Tailwind CSS Reconciliation (Option A - Standardized Tailwind 3)
* **Strategy:** Standardized on Tailwind CSS v3 (`tailwindcss@^3.4.1` + `postcss@^8.5.23` + `autoprefixer@^10.4.21`).
* **Removed:** `@tailwindcss/vite` (unused v4 plugin) and `@tailwindcss/postcss` (v4 alpha package).
* **Rationale:** Eliminates Windows native oxide `.node` C++ binary compilation errors (`@tailwindcss/oxide-win32-x64-msvc`) and ensures zero native build issues on Vercel Linux containers.

### B. Dev vs. Runtime Dependencies Split
* **Moved to `devDependencies`:** `@vitejs/plugin-react` (`^5.0.4`).
* **Removed Duplicates:** `vite` removed from `dependencies` (retained in `devDependencies`).
* **Runtime Core:** `express`, `zod`, `dotenv`, `helmet`, `express-rate-limit`, `nodemailer`, `sharp`, `@supabase/supabase-js`, `@google/genai`, `react`, `react-dom`, `react-router-dom`, `react-helmet-async`, `lucide-react`, `motion`.

---

## 2. Dependency Matrix

| Package Name | Previous State | Final Version | Classification | Compatibility Status |
|---|---|---|---|---|
| `node` | `v18.16.1` (local) | `22.x` | Engine | ✅ Target Node 22 LTS |
| `express` | `^4.21.2` | `^4.21.2` | Dependency | ✅ Fully Compatible |
| `helmet` | *Missing* | `^8.0.0` | Dependency | ✅ Security Hardening |
| `express-rate-limit` | *Missing* | `^7.5.0` | Dependency | ✅ Security Throttling |
| `@supabase/supabase-js` | `^2.110.7` | `^2.110.7` | Dependency | ✅ Node 22 Certified |
| `@google/genai` | `^2.4.0` | `^2.4.0` | Dependency | ✅ Node 22 Certified |
| `nodemailer` | `^9.0.3` | `^9.0.3` | Dependency | ✅ Types Matched |
| `zod` | `^4.4.3` | `^4.4.3` | Dependency | ✅ Schema Validation |
| `react` / `react-dom` | `^19.0.1` | `^19.0.1` | Dependency | ✅ React 19 Core |
| `react-router-dom` | `^7.18.1` | `^7.18.1` | Dependency | ✅ SPA Router |
| `tailwindcss` | `^3.4.1` (Mixed) | `^3.4.1` | devDependency | ✅ Standard v3 PostCSS |
| `vite` | Dual Entry | `^6.2.3` | devDependency | ✅ Dev / Build Tool |

---

## 3. Verification Commands Executed
* `npm run typecheck` — **0 Errors**
* `npm run test:unit` — **50/50 Passed**
* `npm run build` — **Built in 34.2s**
