# MyAngan - Vercel Deployment Architecture Specification

This document details the production architecture for deploying MyAngan to Vercel using serverless Express API endpoints and a Vite SPA frontend.

---

## 1. Architectural Overview

```
                        +----------------------------+
                        |     Vercel Edge Network    |
                        +--------------+-------------+
                                       |
                +----------------------+----------------------+
                |                                             |
   +------------v------------+                   +------------v------------+
   |   Static Assets / SPA   |                   |  Serverless Express API |
   |     (`/dist/index.html`) |                   |     (`/api/index.ts`)   |
   +------------+------------+                   +------------+------------+
                |                                             |
                |                                             |
                v                                             v
        Browser Client                              Supabase / Razorpay / AI
```

---

## 2. Serverless Express Export & Routing Rules
1. **API Router Entry (`api/index.ts`):** Exports the Express application instance configured for `@vercel/node`.
2. **Raw Body Preservation:** `express.json({ verify: ... })` stores raw request bytes on `req.rawBody` for Razorpay HMAC signature checks before any body mutation occurs.
3. **SPA Catch-All Route:** Non-API requests (`/(.*)`) serve compiled static assets from `/dist`, falling back to `/dist/index.html` to support deep client-side routes (`/properties`, `/dashboard`, `/alternatives/nobroker`).
4. **Node 22 Engine Support:** Configured via `package.json` engines (`"node": "22.x"`) and `.nvmrc`.
