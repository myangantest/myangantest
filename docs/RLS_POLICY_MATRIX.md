# MyAngan - Row Level Security (RLS) Policy Matrix

This document maps the exact Postgres Row Level Security (RLS) policies configured on every table in **MyAngan** (`20260726120000_phase1_backend_foundation.sql`).

---

## 1. RLS Policy Reference Table

| Table Name | Policy Name | Command | Target Role | Policy Expression / Check Rule | Security Evaluation |
|---|---|---|---|---|---|
| `public.profiles` | Public read of profiles | `SELECT` | `public` | `true` | Allows viewing owner/broker names on listings. |
| `public.profiles` | Users can update own profile | `UPDATE` | `authenticated` | `auth.uid() = id` | Prevents editing other users' profile records. |
| `public.user_roles` | Users view own roles | `SELECT` | `authenticated` | `auth.uid() = user_id OR EXISTS(SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin')` | Renters & landlords read own roles; admins read all. |
| `public.properties` | Public view active properties | `SELECT` | `public` | `status IN ('active', 'approved') OR auth.uid() = owner_id OR admin_role_check` | Hides `pending` / `inactive` listings from public. |
| `public.properties` | Owners and Brokers create properties | `INSERT` | `authenticated` | `auth.uid() = owner_id AND user_has_role('landlord', 'broker', 'admin')` | **Blocks renters** from creating listings. |
| `public.properties` | Owners update own properties | `UPDATE` | `authenticated` | `auth.uid() = owner_id OR admin_role_check` | Prevents editing properties owned by others. |
| `public.properties` | Owners delete own properties | `DELETE` | `authenticated` | `auth.uid() = owner_id OR admin_role_check` | Prevents deleting properties owned by others. |
| `public.property_images` | View images of viewable properties | `SELECT` | `public` | `EXISTS(SELECT 1 FROM properties WHERE id = property_id AND (status IN ('active', 'approved') OR owner_id = auth.uid()))` | Restricts image metadata visibility to authorized property viewers. |
| `public.property_images` | Owners manage images for own properties | `ALL` | `authenticated` | `EXISTS(SELECT 1 FROM properties WHERE id = property_id AND owner_id = auth.uid())` | Only property owner can add/delete property image metadata. |
| `public.favorites` | Users manage own favorites | `ALL` | `authenticated` | `auth.uid() = user_id` | Restricts favorite reads/inserts/deletes to owner user. |
| `public.comparison_items` | Users manage own comparison items | `ALL` | `authenticated` | `auth.uid() = user_id` | Restricts comparison reads/inserts/deletes to owner user. |
| `public.inquiries` | Public create inquiries | `INSERT` | `public` | `true` | Allows renters & visitors to submit property leads. |
| `public.inquiries` | Owners and admins view inquiries | `SELECT` | `authenticated` | `EXISTS(SELECT 1 FROM properties WHERE id = property_id AND owner_id = auth.uid()) OR auth.uid() = renter_id OR admin_check` | Restricts lead viewing strictly to property owner or lead submitter. |
| `public.maintenance_tickets` | Users view own tickets | `SELECT` | `authenticated` | `auth.uid() = user_id OR EXISTS(SELECT 1 FROM properties WHERE id = property_id AND owner_id = auth.uid()) OR admin_check` | Renters view submitted tickets; owners view property tickets. |
| `public.maintenance_tickets` | Users create tickets | `INSERT` | `authenticated` | `auth.uid() = user_id` | Enforces ticket creation owner identity. |
| `public.payment_orders` | Users view own payment orders | `SELECT` | `authenticated` | `auth.uid() = user_id OR admin_check` | Prevents viewing payment orders of other users. |
| `public.payment_transactions` | Users view own payment transactions | `SELECT` | `authenticated` | `auth.uid() = user_id OR admin_check` | Prevents viewing payment receipts of other users. |
| `public.agreement_records` | Parties view own agreements | `SELECT` | `authenticated` | `auth.uid() = landlord_id OR auth.uid() = tenant_id OR admin_check` | Restricts tenancy agreement viewing to agreement parties. |
| `public.payment_webhook_events` | Admin access | `ALL` | `authenticated` | `admin_check` | Blocks non-admin users from reading webhook events. |
| `public.email_delivery_logs` | Admin access | `ALL` | `authenticated` | `admin_check` | Blocks non-admin users from reading system email logs. |
| `public.audit_logs` | Admin access | `ALL` | `authenticated` | `admin_check` | Blocks non-admin users from reading system audit logs. |

---

## 2. Authorization Verification Rule Audit

1. **Renter Property Insertion Block:** Checked via `INSERT WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('landlord', 'broker', 'admin')))` policy on `public.properties`.
2. **Owner Property Mutation Guard:** Checked via `UPDATE / DELETE USING (auth.uid() = owner_id)` policy on `public.properties`.
3. **Private Image Access Control:** Storage objects policy `auth.uid()::text = (storage.foldername(name))[1]` restricts object uploads and deletions strictly to property owners.
