# MyAngan Property Submission & Storage Repair Documentation

## Overview

This document describes the architectural repairs made to the property submission pipeline, private image storage engine, role-based access control, and admin review queue in MyAngan.

---

## Key Problems Resolved

1. **Temporary Blob URL Persistence**: Replaced frontend `URL.createObjectURL` persistence with real file uploads to the private Supabase Storage `property-images` bucket. All temporary blob preview URLs are revoked on the client (`URL.revokeObjectURL`) and never saved to database.
2. **Untrusted Frontend Direct Insertions**: Created a trusted server-side endpoint `POST /api/properties` that validates bearer access tokens, resolves authenticated user UUIDs, enforces role permissions, and overrides client-supplied metadata (`status`, `approval_status`, `is_verified`, `owner_id`).
3. **Role Alignment**: Unified role validation to permit verified `owner`, `broker`, and `admin` users while strictly blocking `renter` accounts, pending onboarding accounts, or suspended providers.
4. **Listing Quantity Limits Removed**: Removed the 3-listing cap for non-subscribed providers. Owners and brokers can submit unlimited property listings without requiring a subscription.
5. **Private Storage & Security**: Created and configured the private `property-images` storage bucket (`public = false`, 5 MB max size, allowed MIME types: `image/jpeg`, `image/png`, `image/webp`) with collision-safe object paths (`{user_id}/{property_id}/{unique_filename}`).
6. **Atomic Cleanup & Rollback**: Built atomic storage object deletion (`POST /api/properties/delete-images` and server cleanup logic) to purge orphan objects if database insertion fails.
7. **Audit & Review Workflow**: Every submission generates an initial `listing_reviews` record (`new_status = 'pending_review'`, `decision = 'submitted'`) and an `audit_logs` record (`action = 'listing_submitted'`).
8. **Public Visibility Enforcement**: Confirmed public property searches only return listings where `status = 'active'` AND `approval_status IN ('approved', 'published')`. Providers and admins can view listings across all statuses (`pending_review`, `changes_requested`, `rejected`, `suspended`, etc.) in their dashboard.

---

## API Specification: `POST /api/properties`

### Headers
```http
Authorization: Bearer <supabase_access_token>
Content-Type: application/json
```

### Request Payload
```json
{
  "title": "Luxury 3 BHK Builder Floor near Golf Course Road",
  "description": "High-end semi-furnished floor with modern modular kitchen and parking.",
  "city": "Gurugram",
  "locality": "Sector 54",
  "address": "DLF Park Place, Sector 54, Gurugram, Haryana 122011",
  "bedrooms": 3,
  "bathrooms": 3,
  "furnishing_status": "semi_furnished",
  "rent_amount": 75000,
  "deposit_amount": 150000,
  "latitude": 28.4354,
  "longitude": 77.1042,
  "image_urls": ["property-images/user_uuid/prop_123/img1.webp"]
}
```

### Server-Enforced Overrides
- `owner_id`: Authenticated user UUID
- `status`: `'pending'`
- `approval_status`: `'pending_review'`
- `is_verified`: `false`
- `review_notes`: `null`

---

## Database Migrations Applied

- `supabase/migrations/20260730000000_property_submission_storage.sql`
  - Created private `property-images` bucket with 5MB limit and JPEG/PNG/WebP constraints.
  - Implemented storage RLS policies for owner uploads, reads, and deletes.
  - Confirmed strict public property search visibility policy.

---

## Verification & Automated Test Coverage

The test suite in `tests/property_submission.test.ts` verifies:
1. Owner submission success
2. Broker submission success
3. Unlimited listings (no 3-listing cap)
4. Renter 403 Forbidden
5. Pending provider 403 Forbidden
6. Overriding browser-supplied `approval_status`
7. Overriding browser-supplied `owner_id`
8. Rejection of invalid MIME types
9. Rejection of files > 5 MB
10. Rejection of blob URLs
11. Assignment of `pending_review` status
12. Hiding pending listings from public search
13. Owner visibility in provider dashboard
14. Admin visibility in review queue
15. Storage cleanup on database insertion failure
16. Strict production error handling (no fallback to fake mock data)
