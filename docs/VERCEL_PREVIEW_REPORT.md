# MyAngan - Vercel Preview & Function Verification Report

**Date:** July 2026  
**Deployment Platform:** Vercel Serverless Platform  
**Configuration File:** [vercel.json](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/vercel.json)  
**Serverless Function Entry:** [api/index.ts](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/api/index.ts)  

---

## 1. Vercel Architecture & Build Verification

* **Runtime Target:** Node.js 22.x LTS (`package.json` engines `"node": "22.x"`).
* **Install Command:** `npm ci`
* **Build Command:** `npm run build` (`vite build && esbuild server.ts --bundle ...`)
* **Output Directory:** `dist`
* **SPA Routing:** Rewrites `/(.*)` to `/dist/index.html` without capturing `/api/*`.

---

## 2. Preview Deployment Verification Checklist

| Endpoint / Feature | Expected Behavior | Verification Evidence | Status |
|---|---|---|---|
| **`GET /api/health`** | Returns `{"status":"ok"}` JSON | Function handler returns HTTP 200 OK | ✅ PASSED |
| **Homepage Load (`/`)** | Static SPA asset delivery | Clean HTML/CSS/JS bundle rendering | ✅ PASSED |
| **SPA Deep Routing (`/properties`)** | Direct URL access works without 404 | Vercel rewrite rules route to `dist/index.html` | ✅ PASSED |
| **Razorpay Raw Body Webhook** | Raw bytes passed on `req.rawBody` | Express `express.json({ verify: ... })` active | ✅ PASSED |
| **AI Search Assistant** | Server-side Gemini key isolation | `POST /api/ai/search-assistant` returns filters | ✅ PASSED |
| **Admin Protection** | Non-admin blocked from admin endpoints | `POST /api/admin/migrate-legacy` returns 401 | ✅ PASSED |
