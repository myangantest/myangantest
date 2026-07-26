# MyAngan - Legacy Data Migration & Import Protocol

This document defines the safe, idempotent legacy data import pipeline for **MyAngan** (`server/migration.ts`).

---

## 1. Migration Protocol & Non-Fabrication Rules

1. **Zero ID Fabrication:** The migration process **NEVER** silently generates or fabricates synthetic user IDs (`UUID`) for legacy records that lack valid Supabase `auth.users` mappings. Records without a valid user account are marked `skipped` with error code `MISSING_USER_MAPPING`.
2. **Idempotent Batch Processing:** Every batch run checks the source record fingerprint against `public.legacy_migration_logs`. Previously imported records are skipped automatically with status `duplicate`.
3. **Data Preservation:** Local legacy data (e.g. `localStorage`, CSV files) is **NEVER** erased until database import is verified and acknowledged by the administrator.

---

## 2. Legacy Migration Database Table Structure

```sql
CREATE TABLE IF NOT EXISTS public.legacy_migration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    migration_batch_id TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'property', 'user', 'broker'
    legacy_id TEXT NOT NULL,
    supabase_id UUID,
    status TEXT NOT NULL CHECK (status IN ('pending', 'migrated', 'skipped', 'duplicate', 'failed')),
    action TEXT NOT NULL,
    error_code TEXT,
    safe_error_message TEXT,
    source_fingerprint TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. Migration Batch Execution & Reporting Pipeline

When `POST /api/admin/migrate-legacy` is called with an authorized admin session token:

```
                          ┌───────────────────────────┐
                          │   Legacy Import Request   │
                          └─────────────┬─────────────┘
                                        │
                                        ▼
                        ┌──────────────────────────────┐
                        │ Fingerprint & Duplicate Check│
                        └───────────────┬──────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 │                                             │
      Valid User Match                                  Missing User ID
                 │                                             │
                 ▼                                             ▼
  ┌─────────────────────────────┐               ┌─────────────────────────────┐
  │ Insert into Postgres DB     │               │ Log `skipped` in Audit      │
  │ Status: `migrated`          │               │ Code: `MISSING_USER_MAPPING`│
  └─────────────────────────────┘               └─────────────────────────────┘
```

---

## 4. Migration Audit Summary Format

The migration endpoint produces a structured execution summary report:

```json
{
  "batchId": "batch-20260726-1200",
  "startedAt": "2026-07-26T12:00:00.000Z",
  "completedAt": "2026-07-26T12:00:04.120Z",
  "summary": {
    "totalRecords": 45,
    "migrated": 40,
    "skipped": 3,
    "duplicate": 2,
    "failed": 0
  },
  "records": [
    { "legacyId": "prop-101", "status": "migrated", "supabaseId": "d0bf67a0-2f16-4bb6-b6fe-2cf643f87091" },
    { "legacyId": "prop-102", "status": "skipped", "reason": "MISSING_USER_MAPPING" }
  ]
}
```
