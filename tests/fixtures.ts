/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Property, UserProfile, Broker, Lead } from '../src/types';

export const TEST_FIXTURE_USERS: UserProfile[] = [
  {
    id: 'test-user-landlord-1',
    email: 'landlord.test@myangan.in',
    phone: '+919811022334',
    role: 'landlord_broker',
    name: 'Rajesh Sharma (Test)',
    created_at: new Date('2026-01-10').toISOString(),
    is_subscribed: true,
  },
  {
    id: 'test-user-renter-1',
    email: 'renter.test@myangan.in',
    phone: '+919876543210',
    role: 'renter',
    name: 'Ankit Sharma (Test)',
    created_at: new Date('2026-02-15').toISOString(),
  },
  {
    id: 'test-user-admin-1',
    email: 'admin.test@myangan.in',
    phone: '+919999999999',
    role: 'admin',
    name: 'System Admin (Test)',
    created_at: new Date('2026-01-01').toISOString(),
  },
];

export const TEST_FIXTURE_PROPERTIES: Property[] = [
  {
    id: 'test-prop-1',
    owner_id: 'test-user-landlord-1',
    title: 'Luxury 3BHK Apartment in DLF Phase 5',
    description: 'Spacious 3BHK flat near Golf Course Road with modern amenities and 24/7 security.',
    city: 'Gurugram',
    locality: 'DLF Phase 5',
    bedrooms: 3,
    bathrooms: 3,
    furnishing_status: 'furnished',
    rent_amount: 45000,
    deposit_amount: 90000,
    address: 'DLF Phase 5, Golf Course Road',
    latitude: 28.4595,
    longitude: 77.0266,
    image_urls: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267'],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-02-01').toISOString(),
  },
  {
    id: 'test-prop-2',
    owner_id: 'test-user-landlord-1',
    title: 'Modern 2BHK Flat near HCL Sector 62',
    description: 'Charming 2BHK flat near Sector 62 IT hub, Noida. Excellent connectivity and power backup.',
    city: 'Noida',
    locality: 'Sector 62',
    bedrooms: 2,
    bathrooms: 2,
    furnishing_status: 'semi_furnished',
    rent_amount: 22000,
    deposit_amount: 44000,
    address: 'Sector 62, Noida',
    latitude: 28.628,
    longitude: 77.3649,
    image_urls: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688'],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-02-10').toISOString(),
  },
];

export const TEST_FIXTURE_BROKERS: Broker[] = [
  {
    id: 'test-broker-1',
    user_id: 'test-user-landlord-1',
    name: 'NCR Prime Properties',
    agency_name: 'NCR Prime Properties',
    phone: '+919811022334',
    whatsapp: '+919811022334',
    active_listings_count: 12,
    is_verified: true,
    created_at: new Date('2026-01-10').toISOString(),
  },
];
