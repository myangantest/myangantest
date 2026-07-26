# MyAngan - Vercel Routing Fix Documentation

**Fix Date:** July 2026  
**Target Release Branch:** `release/production-readiness`  
**Commit:** `1cdfb23`  

---

## 1. Problem Diagnosis
Previously, `vercel.json` included destinations containing `/dist/` (e.g., `/dist/$1` and `/dist/index.html`). Because Vercel automatically serves the contents of the configured build output directory (`dist`) as the deployment root, referencing `/dist/` caused Vercel to look for a non-existent `/dist/dist/` subfolder, resulting in HTTP 404 NOT_FOUND errors on SPA routes.

---

## 2. Implemented Fix
Updated `vercel.json` to use clean Vercel v3 rewrite rules without `/dist` prefixes and without combining legacy `builds` properties:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index"
    },
    {
      "source": "/((?!api/).*)",
      "destination": "/index.html"
    }
  ]
}
```

---

## 3. Local Verification Results
* **`api/index.ts` Export:** Verified `export default app;` (Express instance without `app.listen()`).
* **Build Outputs:** `dist/index.html` and `dist/assets/` compiled cleanly.
* **Git Action:** Committed `vercel.json` (`1cdfb23`) and pushed to `origin release/production-readiness`.

---

VERCEL ROUTING FIX: PUSHED
