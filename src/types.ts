/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'renter' | 'landlord_broker' | 'admin';
export type FurnishingStatus = 'unfurnished' | 'semi_furnished' | 'furnished';
export type PropertyStatus = 'active' | 'rented' | 'inactive';
export type WaitlistRole = 'landlord' | 'broker' | 'corporate_hr';

export interface UserProfile {
  id: string; // references auth.users
  email: string;
  phone?: string;
  role: UserRole;
  name: string;
  created_at: string;
  is_subscribed?: boolean;
  subscribed_at?: string;
  subscription_expires_at?: string;
}

export interface Property {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  city: 'Gurugram' | 'South Delhi' | string;
  locality: string;
  bedrooms: number;
  bathrooms: number;
  furnishing_status: FurnishingStatus;
  rent_amount: number;
  deposit_amount: number;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  image_urls: string[];
  is_verified: boolean;
  status: PropertyStatus;
  created_at: string;
  is_featured?: boolean;
}

export interface Lead {
  id: string;
  property_id: string;
  renter_id?: string | null;
  name: string;
  phone: string;
  message: string;
  created_at: string;
  // Join properties
  property_title?: string;
  property_locality?: string;
}

export interface Favorite {
  id: string;
  user_id: string;
  property_id: string;
  created_at: string;
}

export interface Broker {
  id: string;
  user_id: string;
  name: string; // joined or stored
  email?: string;
  agency_name: string;
  phone: string;
  whatsapp: string;
  active_listings_count: number;
  is_verified: boolean;
  created_at: string;
}

export interface WaitlistEntry {
  id: string;
  name: string;
  contact: string; // phone or email
  role: WaitlistRole;
  created_at: string;
}
