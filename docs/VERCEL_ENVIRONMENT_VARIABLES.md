# MyAngan - Vercel Environment Variables & Deployment Setup Guide

This document lists all environment variables that must be configured in the **Vercel Project Settings** (`Project Settings -> Environment Variables`) prior to triggering a production deployment.

---

## 1. Environment Variable Configuration Table

| Variable Name | Exposure | Required? | Example / Value Description |
|---|---|---|---|
| `NODE_ENV` | Server-only | **YES** | Set to `production` |
| `VITE_SUPABASE_URL` | Frontend & Server | **YES** | `https://<your-project-id>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Frontend & Server | **YES** | Public Supabase anon key |
| `SUPABASE_URL` | Server-only | **YES** | `https://<your-project-id>.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only | **YES** | Private Supabase service_role key |
| `OTP_HASH_SECRET` | Server-only | **YES** | 32+ character random secret string |
| `VITE_PAYMENTS_ENABLED` | Frontend | **YES** | Set to `false` until Razorpay live credentials are ready |
| `VITE_RAZORPAY_KEY_ID` | Frontend | Optional | Razorpay public Key ID (`rzp_live_...`) |
| `RAZORPAY_KEY_ID` | Server-only | Optional | Razorpay public Key ID |
| `RAZORPAY_KEY_SECRET` | Server-only | Optional | Razorpay private Key Secret |
| `RAZORPAY_WEBHOOK_SECRET` | Server-only | Optional | Secret configured in Razorpay Webhooks dashboard |
| `GEMINI_API_KEY` | Server-only | Optional | Google Gemini API key for AI search assistant |
| `SMTP_HOST` | Server-only | Optional | `smtp.gmail.com` |
| `SMTP_PORT` | Server-only | Optional | `465` or `587` |
| `SMTP_SECURE` | Server-only | Optional | `true` |
| `SMTP_USER` | Server-only | Optional | Gmail address or SMTP username |
| `SMTP_PASSWORD` | Server-only | Optional | Gmail App Password (16 characters, spaces removed) |
| `EMAIL_FROM` | Server-only | Optional | `MyAngan <service@myangan.in>` |
| `EMAIL_REPLY_TO` | Server-only | Optional | `support@myangan.in` |

---

## 2. Vercel Configuration Steps
1. Navigate to your project dashboard on Vercel: `https://vercel.com/dashboard`.
2. Select **Settings** $\rightarrow$ **Environment Variables**.
3. Copy-paste the required variables from `.env.example`.
4. Trigger a new deployment via Git push to `main` branch or running `vercel --prod`.
