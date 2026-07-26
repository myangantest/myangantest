# MyAngan - Repository File Cleanup Audit & Deletion Candidate Report

**Audit Date:** July 2026  
**Auditor:** AI Systems Architect & DevOps Safety Lead  
**Scope:** Complete repository inspection of source files, assets, configurations, lockfiles, database migrations, and build outputs.  

---

## 1. Audit & Inspection Overview

Every file and directory in the repository was inspected and cross-referenced against source imports (`import` / `require`), dynamic imports, routes (`App.tsx`), build scripts (`vite.config.ts`, `package.json`), HTML/CSS assets (`index.html`, `index.css`), test files (`tests/*.ts`, `scripts/test-suite.ts`), and database migrations (`supabase/migrations/*.sql`).

### Summary Statistics:
* **Total Items Inspected:** 125 files and 11 directories
* **Duplicate Files Found:** 0
* **Unreferenced / Superseded Files Found:** 6 files + 1 empty directory
* **Generated / Lockfile Candidates Found:** 1 (`bun.lock`)
* **Old Version Folders Found:** 1 (`assets/`)
* **Recommended Action:**
  * **SAFE_TO_DELETE:** `assets/` (Empty `.aistudio` editor artifact folder).
  * **LIKELY_SAFE_TO_DELETE (Quarantined):** `bun.lock`, `DEFECT_REPORT.md`, `PRODUCTION_READINESS.md`, `TEST_PLAN.md`, `TEST_TRACEABILITY_MATRIX.md`, `UAT_RESULTS.md`.
  * **MUST_KEEP / PROTECTED:** All 40 files in `docs/`, 16 components in `src/components/views/`, 10 components in `src/components/`, 7 backend modules in `server/`, 5 SQL migrations in `supabase/migrations/`, 8 test files in `tests/`, 14 public static assets in `public/`, and configuration files (`vite.config.ts`, `tailwind.config.js`, `package.json`, `package-lock.json`, `tsconfig.json`).

---

## 2. Categorized Candidate Register

| Path | File Type | Approx Size | Reference Search Evidence | Classification | Recommended Action |
|---|---|---|---|---|---|
| `assets/` | Directory | ~2 bytes | Not imported anywhere. Contains only empty `.aistudio/.gitignore`. | `SAFE_TO_DELETE` | Permanent deletion |
| `bun.lock` | Lockfile | 110.7 KB | Unused lockfile; `npm` (`package-lock.json`) is the project standard. | `LIKELY_SAFE_TO_DELETE` | Move to `.cleanup-quarantine/` |
| `DEFECT_REPORT.md` | Markdown | 3.4 KB | Root legacy report superseded by `docs/DEFECT_REGISTER.md`. | `LIKELY_SAFE_TO_DELETE` | Move to `.cleanup-quarantine/` |
| `PRODUCTION_READINESS.md` | Markdown | 4.8 KB | Root legacy report superseded by `docs/GO_LIVE_READINESS_REPORT.md`. | `LIKELY_SAFE_TO_DELETE` | Move to `.cleanup-quarantine/` |
| `TEST_PLAN.md` | Markdown | 4.1 KB | Root legacy report superseded by `docs/MASTER_TEST_PLAN.md`. | `LIKELY_SAFE_TO_DELETE` | Move to `.cleanup-quarantine/` |
| `TEST_TRACEABILITY_MATRIX.md` | Markdown | 3.0 KB | Root legacy report superseded by `docs/RELEASE_TEST_EVIDENCE.md`. | `LIKELY_SAFE_TO_DELETE` | Move to `.cleanup-quarantine/` |
| `UAT_RESULTS.md` | Markdown | 8.1 KB | Root legacy report superseded by `docs/UAT_CHECKLIST.md`. | `LIKELY_SAFE_TO_DELETE` | Move to `.cleanup-quarantine/` |
| `metadata.json` | JSON | 228 bytes | Project description metadata. | `NEEDS_MANUAL_REVIEW` | Retain in repository |

---

## 3. Storage Recovery Estimation

* **Direct Deletion Recovery (`SAFE_TO_DELETE`):** ~2 bytes
* **Quarantine Recovery (`LIKELY_SAFE_TO_DELETE`):** ~134.1 KB
* **Total Storage Recovered:** **~134.1 KB**
