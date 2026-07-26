# MyAngan - Listing Moderation & Fraud Reporting Architecture

This document specifies the user reporting workflow, moderation review queue, listing suspension protocol, and admin audit logging for **MyAngan** (`server/operations.ts`).

---

## 1. Reporting & Moderation Queue Architecture

```
[User Report Submitted] ──► [public.property_reports Queue] ──► [Admin Review]
                                                                      │
                                                   ┌──────────────────┴──────────────────┐
                                                   ▼                                     ▼
                                       [Action: Suspend Listing]              [Action: Dismiss Report]
                                       (properties.status = 'inactive')       (report.status = 'dismissed')
                                       (Audit Log Entry Created)              (Audit Log Entry Created)
```

---

## 2. Report Reason Categories

* `misleading_price`: Listed rent or deposit amount differs significantly from actual owner demand.
* `fake_photos`: Photos are stock images or belong to a different property.
* `unresponsive_owner`: Owner / broker does not respond to inquiries or demands advance payments.
* `duplicate_listing`: Property is listed multiple times.
* `other`: Other policy violations.

---

## 3. Moderation Endpoints & Audit Trails

1. **Submit Listing Report:** `POST /api/operations/reports` (Authenticated or anonymous user submits report).
2. **Admin Moderation Review:** `POST /api/operations/moderation/review` (Admin approves suspension or dismisses report).
3. **Audit Log Recording:** Every moderation action creates a record in `public.audit_logs` capturing `actor_id`, `action`, `entity_id`, and `admin_notes`.
