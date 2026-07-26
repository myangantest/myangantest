# MyAngan - Vercel Project Settings & Build Configuration

This document specifies the exact Vercel dashboard settings required for deploying MyAngan.

---

## 1. Project Build Settings

| Setting Name | Recommended Configuration Value |
|---|---|
| **Framework Preset** | `Vite` |
| **Node.js Version** | `22.x` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |
| **Install Command** | `npm ci` |

---

## 2. Mandatory Environment Variables Checklist
Ensure all required environment variables documented in [docs/VERCEL_ENVIRONMENT_VARIABLES.md](file:///c:/Users/Ankit/OneDrive/Desktop/MyAngan/docs/VERCEL_ENVIRONMENT_VARIABLES.md) are added under **Project Settings $\rightarrow$ Environment Variables**.

---

## 3. Post-Deployment Smoke Verification Checklist
* [ ] GET `https://<your-app>.vercel.app/api/health` returns `{"status":"ok"}`
* [ ] Direct URL load of deep SPA route `https://<your-app>.vercel.app/properties` returns status 200 without 404 error
* [ ] POST `https://<your-app>.vercel.app/api/ai/search-assistant` with sample prompt returns normalized filters
* [ ] POST `https://<your-app>.vercel.app/api/payments/webhook` with invalid signature returns HTTP 400
