# MyAngan - Rollback Verification & Recovery Runbook

This document details the emergency rollback procedure in the event of a production deployment defect or service disruption.

---

## 1. Quick Rollback Execution Steps

### A. Vercel Instant Rollback
1. Open Vercel Dashboard $\rightarrow$ **Deployments**.
2. Select the previous stable deployment (`v1.0.0-foundation-checkpoint` or prior successful build).
3. Click **Instant Rollback** to redirect production traffic immediately.

### B. Git Tag Rollback
To restore the repository state to the pre-release foundation checkpoint:
```bash
git checkout v1.0.0-foundation-checkpoint
```

---

## 2. Database Backup & Recovery
* **Database Backup:** Before applying remote schema changes, download a database backup using `npx supabase db dump -f backup.sql`.
* **Rollback Data Preservation:** Remote database migrations are forward-only and non-destructive. User profile data is preserved.
