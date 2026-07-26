# MyAngan - Maintenance OS & Ticketing Workflow Architecture

This document specifies the database-backed maintenance ticketing architecture, categories, valid state transitions, SLA targets, and property relationship access control rules for **MyAngan** (`server/operations.ts`).

---

## 1. Ticketing State Machine & Valid Transitions

```
 [open] ──► [acknowledged] ──► [in_progress] ──► [resolved] ──► [closed]
    │             │                  │
    └─────────────┴──────────────────┴─────────► [cancelled]
```

### Valid Transition Matrix
- `open` $\rightarrow$ `acknowledged`, `in_progress`, `cancelled`
- `acknowledged` $\rightarrow$ `in_progress`, `resolved`, `cancelled`
- `in_progress` $\rightarrow$ `resolved`, `cancelled`
- `resolved` $\rightarrow$ `closed`, `in_progress` (re-open)
- `closed` $\rightarrow$ No further transitions allowed
- `cancelled` $\rightarrow$ No further transitions allowed

---

## 2. Categories & SLA Target Timelines

| Category | Description | Priority Options | SLA Target Timeline |
|---|---|---|---|
| `plumbing` | Water leakage, pipe bursts, drainage issues | `urgent`, `high`, `normal` | Urgent: 24h / High: 48h / Normal: 72h |
| `electrical` | Short circuits, power loss, wiring faults | `urgent`, `high`, `normal` | Urgent: 24h / High: 48h / Normal: 72h |
| `appliance` | Air conditioner, geyser, refrigerator repairs | `high`, `normal` | High: 48h / Normal: 72h |
| `painting` | Wall seepage, plaster touch-up, paint peeling | `normal` | Normal: 72h |
| `other` | General carpentry, lock replacement, pest control | `normal` | Normal: 72h |

---

## 3. Database Schema & RLS Access Control Rules

* **Tables:** `public.maintenance_tickets`, `public.maintenance_ticket_comments`, `public.maintenance_ticket_history`.
* **Access Control Guard:** Users **cannot** create or view tickets for unrelated properties. RLS policies enforce `auth.uid() = user_id OR auth.uid() = property.owner_id OR admin_role_check`.
