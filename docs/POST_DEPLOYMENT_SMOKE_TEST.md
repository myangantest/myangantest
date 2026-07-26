# MyAngan - Post-Deployment Smoke Test Protocol

This document outlines the mandatory post-deployment verification checklist to execute immediately following production release.

---

## 1. Post-Deployment Verification Matrix

| Step # | Target Check | Execution Method | Expected Result | Pass/Fail |
|---|---|---|---|---|
| 1 | **Server Health Endpoint** | `curl -i https://<live-domain>/api/health` | HTTP 200 OK `{"status":"ok"}` | [ ] |
| 2 | **Sitemap XML Delivery** | `curl -i https://<live-domain>/sitemap.xml` | Valid XML header with HTTP 200 | [ ] |
| 3 | **Robots.txt Delivery** | `curl -i https://<live-domain>/robots.txt` | Returns crawl directives with HTTP 200 | [ ] |
| 4 | **Admin Endpoint Authorization** | `curl -i -X POST https://<live-domain>/api/admin/migrate-legacy` | HTTP 401 Unauthorized | [ ] |
| 5 | **Property Search Load** | Open `https://<live-domain>/properties` in browser | Listings grid renders cleanly without JS errors | [ ] |
| 6 | **OTP Request Flow** | Trigger register POST to `/api/auth/register` | OTP email dispatched; record logged to `otp_verifications` | [ ] |
| 7 | **Agreement Draft PDF Export** | Open `https://<live-domain>/api/operations/agreements/agr-sample/pdf` | Renders HTML with "Draft Rental Agreement" header and disclaimer | [ ] |
| 8 | **Property Verification Status** | Open `https://<live-domain>/api/operations/verifications/prop-sample` | Returns sanitized status label (No sensitive document paths) | [ ] |
| 9 | **Razorpay Webhook Verification** | Trigger test ping from Razorpay Dashboard | Returns HTTP 200 `{"status":"processed"}` | [ ] |
| 10 | **AI Search Assistant** | Open AI Modal in browser, type search prompt | Returns parsed filter chips and user notice text | [ ] |
