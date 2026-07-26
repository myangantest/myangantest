# MyAngan - Complete Database Schema Reference (Phase 1)

This document provides the authoritative documentation for the 16 core PostgreSQL tables, data types, constraints, foreign keys, and indexes configured in **MyAngan** (`supabase/migrations/20260726120000_phase1_backend_foundation.sql`).

---

## 1. Entity-Relationship Diagram & Schema Architecture

```
                    ┌─────────────────────────┐
                    │      auth.users         │
                    └────────────┬────────────┘
                                 │ 1:1
                                 ▼
                    ┌─────────────────────────┐
                    │     public.profiles     │
                    └────────────┬────────────┘
                                 │ 1:N
             ┌───────────────────┼───────────────────┐
             │                   │                   │
             ▼                   ▼                   ▼
  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │public.user_roles │  │public.properties │  │ public.favorites │
  └──────────────────┘  └────────┬─────────┘  └──────────────────┘
                                 │ 1:N
             ┌───────────────────┼───────────────────┐
             │                   │                   │
             ▼                   ▼                   ▼
  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │ property_images  │  │    inquiries     │  │maint_tickets     │
  └──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 2. Exhaustive Table Specifications

### 2.1 Table: `public.profiles`
* **Purpose:** User profile data linked 1:1 to `auth.users`.
* **Columns:**
  - `id` (UUID, Primary Key, REFERENCES `auth.users(id)` ON DELETE CASCADE)
  - `email` (TEXT, NOT NULL, UNIQUE)
  - `phone` (TEXT)
  - `full_name` (TEXT, NOT NULL)
  - `avatar_url` (TEXT)
  - `is_verified` (BOOLEAN, NOT NULL DEFAULT false)
  - `is_subscribed` (BOOLEAN, NOT NULL DEFAULT false)
  - `subscribed_at` (TIMESTAMPTZ)
  - `subscription_expires_at` (TIMESTAMPTZ)
  - `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
  - `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())

---

### 2.2 Table: `public.user_roles`
* **Purpose:** Role assignments per user (`renter`, `landlord`, `broker`, `admin`).
* **Columns:**
  - `id` (UUID, Primary Key DEFAULT `gen_random_uuid()`)
  - `user_id` (UUID, NOT NULL, REFERENCES `auth.users(id)` ON DELETE CASCADE)
  - `role` (app_role ENUM, NOT NULL DEFAULT 'renter')
  - `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
* **Constraints:** `UNIQUE(user_id, role)`

---

### 2.3 Table: `public.properties`
* **Purpose:** Rental listings.
* **Columns:**
  - `id` (UUID, Primary Key DEFAULT `gen_random_uuid()`)
  - `owner_id` (UUID, NOT NULL, REFERENCES `public.profiles(id)` ON DELETE CASCADE)
  - `title` (TEXT, NOT NULL CHECK `char_length(title) >= 5`)
  - `description` (TEXT, NOT NULL)
  - `city` (TEXT, NOT NULL)
  - `locality` (TEXT, NOT NULL)
  - `bedrooms` (INTEGER, NOT NULL CHECK `bedrooms >= 0`)
  - `bathrooms` (INTEGER, NOT NULL CHECK `bathrooms >= 0`)
  - `furnishing_status` (TEXT, NOT NULL DEFAULT 'semi_furnished')
  - `rent_amount` (INTEGER, NOT NULL CHECK `rent_amount > 0`)
  - `deposit_amount` (INTEGER, NOT NULL CHECK `deposit_amount >= 0`)
  - `address` (TEXT, NOT NULL)
  - `latitude` (DOUBLE PRECISION)
  - `longitude` (DOUBLE PRECISION)
  - `amenities` (TEXT[], NOT NULL DEFAULT '{}')
  - `is_verified` (BOOLEAN, NOT NULL DEFAULT false)
  - `status` (prop_status ENUM, NOT NULL DEFAULT 'pending')
  - `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
  - `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
* **Indexes:** `idx_properties_owner` (`owner_id`), `idx_properties_city_locality` (`city`, `locality`), `idx_properties_status` (`status`)

---

### 2.4 Table: `public.property_images`
* **Purpose:** Metadata for private image storage objects (`property-images` bucket).
* **Columns:**
  - `id` (UUID, Primary Key DEFAULT `gen_random_uuid()`)
  - `property_id` (UUID, NOT NULL, REFERENCES `public.properties(id)` ON DELETE CASCADE)
  - `storage_path` (TEXT, NOT NULL, UNIQUE)
  - `file_name` (TEXT, NOT NULL)
  - `file_size_bytes` (INTEGER, NOT NULL CHECK `file_size_bytes <= 5242880`) -- Max 5MB
  - `mime_type` (TEXT, NOT NULL CHECK `mime_type IN ('image/jpeg', 'image/png', 'image/webp')`)
  - `display_order` (INTEGER, NOT NULL DEFAULT 0)
  - `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
* **Indexes:** `idx_property_images_prop` (`property_id`)

---

### 2.5 Table: `public.favorites`
* **Purpose:** Renter saved property bookmarks.
* **Columns:**
  - `id` (UUID, Primary Key DEFAULT `gen_random_uuid()`)
  - `user_id` (UUID, NOT NULL, REFERENCES `public.profiles(id)` ON DELETE CASCADE)
  - `property_id` (UUID, NOT NULL, REFERENCES `public.properties(id)` ON DELETE CASCADE)
  - `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
* **Constraints:** `UNIQUE(user_id, property_id)`

---

### 2.6 Table: `public.comparison_items`
* **Purpose:** Renter property comparison selections.
* **Columns:**
  - `id` (UUID, Primary Key DEFAULT `gen_random_uuid()`)
  - `user_id` (UUID, NOT NULL, REFERENCES `public.profiles(id)` ON DELETE CASCADE)
  - `property_id` (UUID, NOT NULL, REFERENCES `public.properties(id)` ON DELETE CASCADE)
  - `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
* **Constraints:** `UNIQUE(user_id, property_id)`

---

### 2.7 Table: `public.inquiries`
* **Purpose:** Property leads and renter inquiry logs.
* **Columns:**
  - `id` (UUID, Primary Key DEFAULT `gen_random_uuid()`)
  - `property_id` (UUID, NOT NULL, REFERENCES `public.properties(id)` ON DELETE CASCADE)
  - `renter_id` (UUID, REFERENCES `public.profiles(id)` ON DELETE SET NULL)
  - `renter_name` (TEXT, NOT NULL)
  - `renter_phone` (TEXT, NOT NULL)
  - `message` (TEXT, NOT NULL)
  - `status` (TEXT, NOT NULL DEFAULT 'new')
  - `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())

---

### 2.8 Table: `public.maintenance_tickets`
* **Purpose:** Repair and maintenance requests.
* **Columns:**
  - `id` (UUID, Primary Key DEFAULT `gen_random_uuid()`)
  - `property_id` (UUID, NOT NULL, REFERENCES `public.properties(id)` ON DELETE CASCADE)
  - `user_id` (UUID, NOT NULL, REFERENCES `public.profiles(id)` ON DELETE CASCADE)
  - `category` (TEXT, NOT NULL)
  - `priority` (TEXT, NOT NULL DEFAULT 'normal')
  - `description` (TEXT, NOT NULL)
  - `status` (ticket_status ENUM, NOT NULL DEFAULT 'open')
  - `resolution_notes` (TEXT)
  - `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
  - `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())

---

### 2.9 Table: `public.payment_orders`
* **Purpose:** Razorpay order records.
* **Columns:**
  - `id` (UUID, Primary Key DEFAULT `gen_random_uuid()`)
  - `user_id` (UUID, NOT NULL, REFERENCES `public.profiles(id)` ON DELETE CASCADE)
  - `plan_type` (TEXT, NOT NULL)
  - `amount_paisa` (INTEGER, NOT NULL CHECK `amount_paisa > 0`)
  - `currency` (TEXT, NOT NULL DEFAULT 'INR')
  - `razorpay_order_id` (TEXT, UNIQUE)
  - `status` (TEXT, NOT NULL DEFAULT 'created')
  - `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
  - `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())

---

### 2.10 Table: `public.payment_transactions`
* **Purpose:** Razorpay payment capture records.
* **Columns:**
  - `id` (UUID, Primary Key DEFAULT `gen_random_uuid()`)
  - `order_id` (UUID, NOT NULL, REFERENCES `public.payment_orders(id)` ON DELETE CASCADE)
  - `user_id` (UUID, NOT NULL, REFERENCES `public.profiles(id)` ON DELETE CASCADE)
  - `razorpay_payment_id` (TEXT, UNIQUE, NOT NULL)
  - `razorpay_signature` (TEXT, NOT NULL)
  - `status` (TEXT, NOT NULL DEFAULT 'captured')
  - `raw_response` (JSONB)
  - `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())

---

### 2.11 Table: `public.payment_webhook_events`
* **Purpose:** Idempotency log for Razorpay webhook notifications.
* **Columns:**
  - `id` (UUID, Primary Key DEFAULT `gen_random_uuid()`)
  - `event_id` (TEXT, UNIQUE, NOT NULL)
  - `event_type` (TEXT, NOT NULL)
  - `payload` (JSONB, NOT NULL)
  - `processed_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())

---

### 2.12 Table: `public.email_delivery_logs`
* **Purpose:** Audit log of transactional emails dispatched via SMTP.
* **Columns:**
  - `id` (UUID, Primary Key DEFAULT `gen_random_uuid()`)
  - `recipient_email` (TEXT, NOT NULL)
  - `template_type` (TEXT, NOT NULL)
  - `message_id` (TEXT)
  - `status` (TEXT, NOT NULL DEFAULT 'sent')
  - `error_details` (TEXT)
  - `metadata` (JSONB)
  - `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())

---

### 2.13 Table: `public.property_verification_requests`
* **Purpose:** Property listing audit & verification request records.
* **Columns:**
  - `id` (UUID, Primary Key DEFAULT `gen_random_uuid()`)
  - `property_id` (UUID, NOT NULL, REFERENCES `public.properties(id)` ON DELETE CASCADE)
  - `requester_id` (UUID, NOT NULL, REFERENCES `public.profiles(id)` ON DELETE CASCADE)
  - `status` (TEXT, NOT NULL DEFAULT 'pending')
  - `reviewer_notes` (TEXT)
  - `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
  - `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())

---

### 2.14 Table: `public.agreement_records`
* **Purpose:** Lease agreement records.
* **Columns:**
  - `id` (UUID, Primary Key DEFAULT `gen_random_uuid()`)
  - `property_id` (UUID, NOT NULL, REFERENCES `public.properties(id)` ON DELETE CASCADE)
  - `landlord_id` (UUID, NOT NULL, REFERENCES `public.profiles(id)` ON DELETE CASCADE)
  - `tenant_id` (UUID, REFERENCES `public.profiles(id)` ON DELETE SET NULL)
  - `rent_amount` (INTEGER, NOT NULL)
  - `deposit_amount` (INTEGER, NOT NULL)
  - `start_date` (DATE, NOT NULL)
  - `tenure_months` (INTEGER, NOT NULL)
  - `terms_json` (JSONB, NOT NULL DEFAULT '{}')
  - `status` (agreement_status ENUM, NOT NULL DEFAULT 'draft')
  - `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
  - `updated_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())

---

### 2.15 Table: `public.audit_logs`
* **Purpose:** Security and administrative audit trail.
* **Columns:**
  - `id` (UUID, Primary Key DEFAULT `gen_random_uuid()`)
  - `actor_id` (UUID, REFERENCES `public.profiles(id)` ON DELETE SET NULL)
  - `action` (TEXT, NOT NULL)
  - `entity_type` (TEXT, NOT NULL)
  - `entity_id` (TEXT, NOT NULL)
  - `payload` (JSONB)
  - `ip_address` (TEXT)
  - `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())

---

### 2.16 Table: `public.otp_verifications`
* **Purpose:** Server-side HMAC hashed OTP verifications.
* **Columns:**
  - `id` (UUID, Primary Key DEFAULT `gen_random_uuid()`)
  - `user_id` (UUID, REFERENCES `public.profiles(id)` ON DELETE CASCADE)
  - `email` (TEXT, NOT NULL)
  - `code_hash` (TEXT, NOT NULL)
  - `purpose` (TEXT, NOT NULL)
  - `expires_at` (TIMESTAMPTZ, NOT NULL)
  - `consumed_at` (TIMESTAMPTZ)
  - `attempt_count` (INTEGER, NOT NULL DEFAULT 0)
  - `max_attempts` (INTEGER, NOT NULL DEFAULT 5)
  - `created_at` (TIMESTAMPTZ, NOT NULL DEFAULT NOW())
