# MyAngan - Supabase Remote Setup & Migration Guide

This document outlines the step-by-step procedure for applying migrations and configuring Supabase for production.

---

## 1. Prerequisites
* A Supabase project created at `https://database.new` or `https://app.supabase.com`.
* Supabase CLI installed locally or accessed via npx (`npx supabase`).

---

## 2. Remote Migration Application (Scenario A: Fresh Project)
Run the following commands from the repository root:

```bash
# 1. Link local repository to remote Supabase project ID
npx supabase link --project-ref <your-supabase-project-id>

# 2. Push all 5 versioned SQL migrations to the remote database
npx supabase db push

# 3. Generate TypeScript types directly into src/types/supabase.ts
npm run supabase:types
```

---

## 3. Storage Bucket & Policy Verification
1. Navigate to **Supabase Dashboard $\rightarrow$ Storage**.
2. Confirm the private bucket `property-images` exists.
3. Verify bucket properties:
   - **Public Access:** Disabled (Private bucket)
   - **File Size Limit:** 5MB (5,242,880 bytes)
   - **Allowed MIME Types:** `image/jpeg`, `image/png`, `image/webp`
