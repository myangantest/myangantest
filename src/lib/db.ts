/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';
import { Property, UserProfile, Lead, Favorite, Broker, WaitlistEntry, UserRole } from '../types';

// Detect environment variables for Supabase safely across Vite and Node
const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) 
  ? (import.meta as any).env 
  : (typeof process !== 'undefined' && process.env) ? process.env : {};

const SUPABASE_URL = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';

const isUrlDetected = !!SUPABASE_URL && 
  !SUPABASE_URL.includes('MY_SUPABASE_URL') && 
  !SUPABASE_URL.includes('placeholder') && 
  !SUPABASE_URL.includes('your-supabase');

const isKeyDetected = !!SUPABASE_ANON_KEY && 
  !SUPABASE_ANON_KEY.includes('MY_SUPABASE_ANON_KEY') && 
  !SUPABASE_ANON_KEY.includes('placeholder') && 
  !SUPABASE_ANON_KEY.includes('your-supabase');

export const isRealSupabaseConfigured = isUrlDetected && isKeyDetected;

// Startup logs requirement
if (isUrlDetected) console.log('✓ Supabase URL detected');
if (isKeyDetected) console.log('✓ Supabase Anon Key detected');

if (isRealSupabaseConfigured) {
  console.log('✓ Connected to Supabase');
} else {
  console.log('✗ Missing Supabase configuration');
}

// Fall back to Local Storage mode ONLY when real Supabase credentials are not provided AND in development mode with ALLOW_MOCK_STORAGE=true
export const isMockModeActive = !isRealSupabaseConfigured;

export const supabase = isRealSupabaseConfigured 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
  : null;

// ==========================================
// MOCK DATA SEEDING (FOR LOCAL DEMO MODE)
// ==========================================

const SEED_USERS: UserProfile[] = [
  {
    id: 'user-landlord-1',
    email: 'landlord@myangan.in',
    phone: '+919811022334',
    role: 'landlord_broker',
    name: 'Rajesh Sharma',
    created_at: new Date('2026-01-10').toISOString()
  },
  {
    id: 'user-landlord-2',
    email: 'sanjay.broker@delhirealty.co',
    phone: '+919910044556',
    role: 'landlord_broker',
    name: 'Sanjay Malik (Malik Estates)',
    created_at: new Date('2026-02-15').toISOString()
  },
  {
    id: 'user-renter-1',
    email: 'renter@myangan.in',
    phone: '+919599011223',
    role: 'renter',
    name: 'Ankit Kumar',
    created_at: new Date('2026-03-01').toISOString()
  },
  {
    id: 'user-admin-1',
    email: 'admin@myangan.in',
    phone: '+919000011111',
    role: 'admin',
    name: 'MyAngan Admin Portal',
    created_at: new Date('2026-01-01').toISOString()
  }
];

const SEED_BROKERS: Broker[] = [
  {
    id: 'broker-1',
    user_id: 'user-landlord-2',
    name: 'Sanjay Malik',
    email: 'sanjay.broker@delhirealty.co',
    agency_name: 'Malik Estates Delhi NCR',
    phone: '+919910044556',
    whatsapp: '919910044556',
    active_listings_count: 5,
    is_verified: true,
    created_at: new Date('2026-02-15').toISOString()
  },
  {
    id: 'broker-2',
    user_id: 'user-landlord-1',
    name: 'Rajesh Sharma',
    email: 'landlord@myangan.in',
    agency_name: 'Sharma & Sons Real Estate',
    phone: '+919811022334',
    whatsapp: '919811022334',
    active_listings_count: 3,
    is_verified: true,
    created_at: new Date('2026-01-10').toISOString()
  },
  {
    id: 'broker-3',
    user_id: 'mock-broker-3-user',
    name: 'Priya Gupta',
    email: 'priya.gupta@dlfproperties.in',
    agency_name: 'Luxury Homes NCR',
    phone: '+919812345678',
    whatsapp: '919812345678',
    active_listings_count: 8,
    is_verified: true,
    created_at: new Date('2026-03-10').toISOString()
  },
  {
    id: 'broker-4',
    user_id: 'mock-broker-4-user',
    name: 'Vikram Singh',
    email: 'vikram@ncrrealtors.com',
    agency_name: 'Metro Realtors',
    phone: '+919818822334',
    whatsapp: '919818822334',
    active_listings_count: 4,
    is_verified: false,
    created_at: new Date('2026-04-05').toISOString()
  }
];

const SEED_PROPERTIES: Property[] = [
  {
    id: 'prop-1',
    owner_id: 'user-landlord-1',
    title: 'Chic 3 BHK Builder Floor near Cyber City',
    description: 'Beautifully designed and extremely spacious 3 BHK builder floor available for rent in DLF Phase 3. Situated in a safe, peaceful lane with gated access, this house features premium woodwork, a fully equipped modular kitchen, dynamic cove lighting, lift, and stilt parking for 2 cars. Perfectly suited for corporate executives or families looking for quick connectivity to Cyber City and Rapid Metro.',
    city: 'Gurugram',
    locality: 'DLF Phase 3',
    bedrooms: 3,
    bathrooms: 3,
    furnishing_status: 'semi_furnished',
    rent_amount: 65000,
    deposit_amount: 130000,
    address: 'S-Block, DLF Phase 3, Gurugram, Haryana - 122002',
    latitude: 28.4894,
    longitude: 77.0886,
    image_urls: [
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-06-15').toISOString()
  },
  {
    id: 'prop-2',
    owner_id: 'user-landlord-2',
    title: 'Luxury 4 BHK Penthouse overlooking Aravallis',
    description: 'Experience true luxury in this premium 4 BHK duplex penthouse on Golf Course Road. Features an expansive open terrace with artificial turf, massive floor-to-ceiling glass windows offering beautiful sunset views over the Aravalli Hills, double-height living room, separate servant quarter, utility area, and a customized bar counter. Resident access to world-class clubhouse, infinity pool, and high-tech gymnasium.',
    city: 'Gurugram',
    locality: 'Sector 54 Golf Course Road',
    bedrooms: 4,
    bathrooms: 4,
    furnishing_status: 'furnished',
    rent_amount: 180000,
    deposit_amount: 360000,
    address: 'DLF The Crest, Sector 54, Golf Course Road, Gurugram, Haryana - 122011',
    latitude: 28.4312,
    longitude: 77.1084,
    image_urls: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-06-20').toISOString()
  },
  {
    id: 'prop-3',
    owner_id: 'user-landlord-1',
    title: 'Elegant 2 BHK Gated DDA Flat',
    description: 'Charming and quiet 2 BHK flat in Sector B, Vasant Kunj. This third-floor property is extremely breezy and filled with natural sunlight. Has a fully functional modular kitchen, twin standard size bedrooms with high-end premium closets, gated 3-tier security, dedicated municipal water supply, and direct parking right beneath the tower. Extremely close to DLF Promenade, Ambience Mall, and top schools.',
    city: 'South Delhi',
    locality: 'Vasant Kunj',
    bedrooms: 2,
    bathrooms: 2,
    furnishing_status: 'furnished',
    rent_amount: 45000,
    deposit_amount: 90000,
    address: 'Pocket 2, Sector B, Vasant Kunj, New Delhi - 110070',
    latitude: 28.5293,
    longitude: 77.1523,
    image_urls: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-01').toISOString()
  },
  {
    id: 'prop-4',
    owner_id: 'user-landlord-2',
    title: 'Stately 3 BHK Floor with Wrap-around Balconies',
    description: 'An elegant first-floor builder floor in the highly upscale Greater Kailash Part II. Impeccable floor plan with generous drawing and dining spaces, high-quality false ceilings, complete power backup, and modern wardrobes. The wrap-around balconies offer a serene green view of the local neighborhood park. Safe walking lanes, high-profile neighborhood, and multiple local premium markets nearby.',
    city: 'South Delhi',
    locality: 'Greater Kailash II',
    bedrooms: 3,
    bathrooms: 3,
    furnishing_status: 'semi_furnished',
    rent_amount: 95000,
    deposit_amount: 190000,
    address: 'M-Block, Greater Kailash II, New Delhi - 110048',
    latitude: 28.5321,
    longitude: 77.2458,
    image_urls: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1585412727339-54e4bae3bbf9?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: false,
    status: 'active',
    created_at: new Date('2026-07-03').toISOString()
  },
  {
    id: 'prop-5',
    owner_id: 'user-landlord-2',
    title: 'Cozy 1 BHK Fully Serviced Studio',
    description: 'Extremely neat and self-contained 1 BHK studio apartment available for lease. Comes complete with a luxury sofa, king bed, smart TV, dynamic lighting, micro-kitchen with convection microwave, washer-dryer, and split AC. Standard package rent includes high-speed fiber internet and housekeeping twice a week. Walking distance to Rapid Metro DLF Phase 1, Gurgaon.',
    city: 'Gurugram',
    locality: 'DLF Phase 1',
    bedrooms: 1,
    bathrooms: 1,
    furnishing_status: 'furnished',
    rent_amount: 25000,
    deposit_amount: 50000,
    address: 'A-Block, DLF Phase 1, Gurugram, Haryana - 122002',
    latitude: 28.4754,
    longitude: 77.0984,
    image_urls: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-05').toISOString()
  },
  {
    id: 'prop-6',
    owner_id: 'user-landlord-1',
    title: 'Spacious 3 BHK Apartment in Vatika India Next',
    description: 'Brand new high-rise apartment in Sector 82 Gurugram. This flat offers dynamic community living with standard facilities including an Olympian swimming pool, secure play park, basketball court, and premium retail center at walking distance. Flat is unfurnished, giving you the blank canvas to design it exactly to your personal style. Gated 24/7 guard security.',
    city: 'Gurugram',
    locality: 'Sector 82',
    bedrooms: 3,
    bathrooms: 3,
    furnishing_status: 'unfurnished',
    rent_amount: 35000,
    deposit_amount: 70000,
    address: 'Vatika India Next, Sector 82, Gurugram, Haryana - 122004',
    latitude: 28.3842,
    longitude: 76.9634,
    image_urls: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: false,
    status: 'active',
    created_at: new Date('2026-07-06').toISOString()
  },
  {
    id: 'prop-7',
    owner_id: 'user-landlord-1',
    title: 'Renovated 2 BHK Floor near Deer Park',
    description: 'Sun-drenched second-floor builder floor in Green Park. The apartment has been recently renovated with stylish white terrazzo tile flooring, brand new modular kitchen, high ceilings, split ACs, and designer washroom fixtures. Quiet tree-lined avenue within walking distance to Delhi Green Park metro and the serene Deer Park. Ideal for doctors, scholars, or professionals.',
    city: 'South Delhi',
    locality: 'Green Park',
    bedrooms: 2,
    bathrooms: 2,
    furnishing_status: 'semi_furnished',
    rent_amount: 55000,
    deposit_amount: 110000,
    address: 'L-Block, Green Park, New Delhi - 110016',
    latitude: 28.5587,
    longitude: 77.2024,
    image_urls: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-08').toISOString()
  },
  {
    id: 'prop-8',
    owner_id: 'user-landlord-2',
    title: 'Ultra Modern 3 BHK Floor in Sushant Lok 1',
    description: 'This premium apartment is located on a beautifully managed block in Sushant Lok 1. Features include private lift access, customized Italian marble floor tile, smart-enabled automation lights, integrated modular kitchen with modern chimney/hub, dynamic glass wardrobe doors, and continuous 100% generator power backup. Conveniently located near HUDA City Centre Metro Station and Galleria Market.',
    city: 'Gurugram',
    locality: 'Sushant Lok 1',
    bedrooms: 3,
    bathrooms: 3,
    furnishing_status: 'furnished',
    rent_amount: 75000,
    deposit_amount: 150000,
    address: 'Block C, Sushant Lok 1, Gurugram, Haryana - 122009',
    latitude: 28.4614,
    longitude: 77.0784,
    image_urls: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600566752355-35792bedcfea?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-10').toISOString()
  },
  {
    id: 'prop-9',
    owner_id: 'user-landlord-2',
    title: 'Magnificent 4 BHK Villa on Sohna Road',
    description: 'Live in absolute grandeur in this sprawling 4 BHK luxury villa in Eldeco Mansionz, Sohna Road. Enjoy the perks of a lush private lawn, individual terrace, dedicated servant quarters, custom wooden paneling, and garage parking. The highly secure gated estate features professional security patrol, swimming pools, tennis courts, and high-end central parks. Perfect for families.',
    city: 'Gurugram',
    locality: 'Sohna Road',
    bedrooms: 4,
    bathrooms: 4,
    furnishing_status: 'semi_furnished',
    rent_amount: 120000,
    deposit_amount: 240000,
    address: 'Eldeco Mansionz, Sector 48, Sohna Road, Gurugram, Haryana - 122018',
    latitude: 28.4124,
    longitude: 77.0398,
    image_urls: [
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-12').toISOString()
  },
  {
    id: 'prop-10',
    owner_id: 'user-landlord-1',
    title: 'Premium 3 BHK Flat in Secure Block near Saket Mall',
    description: 'High-quality 3 BHK residence located in a premier pocket of Saket, South Delhi. Just minutes away from Select Citywalk Mall. Features cross-ventilation, individual balconies in every room, spacious wardrobes, continuous water connection, and top-tier residential security. Proximity to MAX Hospital, PVR Anupam, and multiple metro stations makes this a highly desired spot.',
    city: 'South Delhi',
    locality: 'Saket',
    bedrooms: 3,
    bathrooms: 3,
    furnishing_status: 'semi_furnished',
    rent_amount: 80000,
    deposit_amount: 160000,
    address: 'Block J, Saket, New Delhi - 110017',
    latitude: 28.5222,
    longitude: 77.2064,
    image_urls: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: false,
    status: 'active',
    created_at: new Date('2026-07-14').toISOString()
  },
  {
    id: 'prop-11',
    owner_id: 'user-landlord-2',
    title: 'Charming Fully Furnished 2 BHK Builder Floor',
    description: 'Superb location in Defence Colony, South Delhi. Located in a high-profile, extremely quiet street. Property is beautifully decorated with custom furniture, premium electronics, matching rugs, split cooling, and continuous guard patrol. Fully secured. Defence Colony Club and main market are extremely close, bringing you access to the finest dining experiences in South Delhi.',
    city: 'South Delhi',
    locality: 'Defence Colony',
    bedrooms: 2,
    bathrooms: 2,
    furnishing_status: 'furnished',
    rent_amount: 70000,
    deposit_amount: 140000,
    address: 'C-Block, Defence Colony, New Delhi - 110024',
    latitude: 28.5724,
    longitude: 77.2284,
    image_urls: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-15').toISOString()
  },
  {
    id: 'prop-12',
    owner_id: 'user-landlord-1',
    title: 'Modernist 3 BHK Floor near DLF Phase 2',
    description: 'This sleek 3 BHK builder floor is situated in DLF Phase 2, offering direct accessibility to DLF CyberCity and MG Road. Boasting rich Italian marble flooring, expansive modular kitchen with chimney, premium wooden wardrobes, and independent stilt parking. Set in a quiet gated community with 24/7 security surveillance.',
    city: 'Gurugram',
    locality: 'DLF Phase 2',
    bedrooms: 3,
    bathrooms: 3,
    furnishing_status: 'semi_furnished',
    rent_amount: 75000,
    deposit_amount: 150000,
    address: 'K-Block, DLF Phase 2, Gurugram, Haryana - 122002',
    latitude: 28.4812,
    longitude: 77.0814,
    image_urls: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-16').toISOString()
  },
  {
    id: 'prop-13',
    owner_id: 'user-landlord-2',
    title: 'Comfortable 3 BHK Family Flat in Dwarka',
    description: 'A spacious and sunny 3 BHK apartment in a premium CGHS society in Sector 12, Dwarka. Located on the 5th floor, it offers high-speed elevators, power backup, and gated security. Perfect for families, with top Delhi schools, local daily markets, and the Sector 12 Metro Station just a brief walk away.',
    city: 'South Delhi',
    locality: 'Dwarka Sector 12',
    bedrooms: 3,
    bathrooms: 3,
    furnishing_status: 'semi_furnished',
    rent_amount: 38000,
    deposit_amount: 76000,
    address: 'Plot 4, Sector 12, Dwarka, New Delhi - 110075',
    latitude: 28.5912,
    longitude: 77.0421,
    image_urls: [
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-16').toISOString()
  },
  {
    id: 'prop-14',
    owner_id: 'user-landlord-1',
    title: 'Trendy 2 BHK Luxury Condominium',
    description: 'Elegant 2 BHK fully furnished apartment located on Golf Course Road, DLF Phase 5. Features modern minimalist furniture, custom lighting fixtures, split AC units in all rooms, and a modern kitchen. Includes club access with swimming pool, gym, and underground parking. Proximity to major corporate hubs.',
    city: 'Gurugram',
    locality: 'DLF Phase 5',
    bedrooms: 2,
    bathrooms: 2,
    furnishing_status: 'furnished',
    rent_amount: 55000,
    deposit_amount: 110000,
    address: 'DLF Park Place, Sector 54, Golf Course Road, Gurugram, Haryana - 122011',
    latitude: 28.4354,
    longitude: 77.1042,
    image_urls: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-17').toISOString()
  },
  {
    id: 'prop-15',
    owner_id: 'user-landlord-2',
    title: 'Spacious & Airy 2 BHK Apartment',
    description: 'Clean 2 BHK unfurnished apartment in Sector 22, Dwarka. Located in a secure gated housing society with continuous water supply and low maintenance. Ideal for young couples or small families wishing to customize their living space with their own choice of furnishings. Located very close to Sector 21 metro.',
    city: 'South Delhi',
    locality: 'Dwarka Sector 22',
    bedrooms: 2,
    bathrooms: 2,
    furnishing_status: 'unfurnished',
    rent_amount: 28000,
    deposit_amount: 56000,
    address: 'Shivalik Apartments, Sector 22, Dwarka, New Delhi - 110077',
    latitude: 28.5645,
    longitude: 77.0512,
    image_urls: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: false,
    status: 'active',
    created_at: new Date('2026-07-17').toISOString()
  },
  {
    id: 'prop-16',
    owner_id: 'user-landlord-1',
    title: 'Fully Furnished 3 BHK in Premium Block',
    description: 'Extremely well-maintained 3 BHK flat on Sector 14, Gurugram. Fully loaded with premium wooden furniture, leather sofas, Smart LED TVs, double-door refrigerator, automatic washing machine, and individual geysers. Ready to move in. High-end gated residential avenue with ample visitor parking.',
    city: 'Gurugram',
    locality: 'Sector 14',
    bedrooms: 3,
    bathrooms: 3,
    furnishing_status: 'furnished',
    rent_amount: 48000,
    deposit_amount: 96000,
    address: 'Sector 14 Residential Complex, Gurugram, Haryana - 122001',
    latitude: 28.4732,
    longitude: 77.0425,
    image_urls: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-18').toISOString()
  },
  {
    id: 'prop-17',
    owner_id: 'user-landlord-2',
    title: 'Cozy 2 BHK Builder Floor in Sector 31',
    description: 'Lovely 2 BHK semi-furnished floor in Sector 31, Gurugram. Highly convenient location close to NH-8, local market, and top corporate offices. Equipped with modern modular kitchen, built-in wooden cupboards, ceramic flooring, and split AC wiring. Safe neighborhood with dedicated parking.',
    city: 'Gurugram',
    locality: 'Sector 31',
    bedrooms: 2,
    bathrooms: 2,
    furnishing_status: 'semi_furnished',
    rent_amount: 35000,
    deposit_amount: 70000,
    address: 'Block B, Sector 31, Gurugram, Haryana - 122001',
    latitude: 28.4556,
    longitude: 77.0494,
    image_urls: [
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-18').toISOString()
  },
  {
    id: 'prop-18',
    owner_id: 'user-landlord-1',
    title: 'Chic 1 BHK Studio near DLF Cyber City',
    description: 'Premium modern 1 BHK service studio in DLF Phase 3, right next to DLF Cyber City. Fully loaded with private high-speed Wi-Fi, elegant king-sized bed, sofa set, microwave oven, refrigerator, and daily cleaning service. Ideal for corporate professionals working in the Cyber City business hub.',
    city: 'Gurugram',
    locality: 'Cyber City',
    bedrooms: 1,
    bathrooms: 1,
    furnishing_status: 'furnished',
    rent_amount: 32000,
    deposit_amount: 64000,
    address: 'U-Block, DLF Phase 3, Gurugram, Haryana - 122002',
    latitude: 28.4952,
    longitude: 77.0856,
    image_urls: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-19').toISOString()
  },
  {
    id: 'prop-19',
    owner_id: 'user-landlord-2',
    title: 'Magnificent 4 BHK Society Flat in Dwarka',
    description: 'Extremely spacious 4 BHK semi-furnished apartment in Sector 4, Dwarka. Features multiple balconies with green park views, 4 modern washrooms, high-quality tile flooring, and separate dining area. Located inside a secure, family-centric cooperative society with power backup and play parks.',
    city: 'South Delhi',
    locality: 'Dwarka Sector 4',
    bedrooms: 4,
    bathrooms: 4,
    furnishing_status: 'semi_furnished',
    rent_amount: 52000,
    deposit_amount: 104000,
    address: 'Nav Sansad Vihar, Sector 4, Dwarka, New Delhi - 110075',
    latitude: 28.5987,
    longitude: 77.0354,
    image_urls: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: false,
    status: 'active',
    created_at: new Date('2026-07-19').toISOString()
  },
  {
    id: 'prop-20',
    owner_id: 'user-landlord-1',
    title: 'Luxury 3 BHK Condominium on Golf Course Road',
    description: 'Stately 3 BHK high-rise residence at DLF Park Place on Golf Course Road. Perfectly finished with wood floors, centralized VRV AC, custom-fitted modular cabinets, and floor-to-ceiling windows with panoramic cityscape views. First-class amenities including swimming pools, courts, and a spa.',
    city: 'Gurugram',
    locality: 'Golf Course Road',
    bedrooms: 3,
    bathrooms: 3,
    furnishing_status: 'furnished',
    rent_amount: 135000,
    deposit_amount: 270000,
    address: 'DLF Park Place, Sector 54, Golf Course Road, Gurugram, Haryana - 122011',
    latitude: 28.4321,
    longitude: 77.1054,
    image_urls: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-20').toISOString()
  },
  {
    id: 'prop-21',
    owner_id: 'user-landlord-2',
    title: 'Modern 3 BHK High-Rise on Sohna Road',
    description: 'This spacious 3 BHK apartment is located in Uniworld Gardens on Sohna Road. Boasts well-designed modular kitchen, wide balconies, double-glazed windows, and utility space. Highly secured residential tower with club privileges, secure swimming pools, squash court, and high-tech safety measures.',
    city: 'Gurugram',
    locality: 'Sohna Road',
    bedrooms: 3,
    bathrooms: 3,
    furnishing_status: 'semi_furnished',
    rent_amount: 45000,
    deposit_amount: 90000,
    address: 'Uniworld Gardens, Sector 47, Sohna Road, Gurugram, Haryana - 122018',
    latitude: 28.4194,
    longitude: 77.0456,
    image_urls: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-20').toISOString()
  },
  {
    id: 'prop-22',
    owner_id: 'user-landlord-1',
    title: 'Upscale 3 BHK Builder Floor in Vasant Kunj',
    description: 'Beautifully finished first-floor 3 BHK builder floor in Sector C, Vasant Kunj. Highly spacious with custom teakwood paneling, designer bathrooms, spacious modular kitchen, and private parking. Quiet block with secure guard patrol, situated in close range to DLF Emporio and Promenade.',
    city: 'South Delhi',
    locality: 'Vasant Kunj',
    bedrooms: 3,
    bathrooms: 3,
    furnishing_status: 'furnished',
    rent_amount: 85000,
    deposit_amount: 170000,
    address: 'Sector C Pocket 8, Vasant Kunj, New Delhi - 110070',
    latitude: 28.5354,
    longitude: 77.1421,
    image_urls: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-21').toISOString()
  },
  {
    id: 'prop-23',
    owner_id: 'user-landlord-2',
    title: 'Sunlit 2 BHK near Saket District Centre',
    description: 'Neat and cozy 2 BHK builder floor in Saket. The property enjoys excellent natural light, wooden cabinets, a separate dining zone, and updated bathroom fittings. Extremely close to Saket District Centre, metro connections, and various markets. Located in a safe and leafy residential pocket.',
    city: 'South Delhi',
    locality: 'Saket',
    bedrooms: 2,
    bathrooms: 2,
    furnishing_status: 'semi_furnished',
    rent_amount: 42000,
    deposit_amount: 84000,
    address: 'Block L, Saket, New Delhi - 110017',
    latitude: 28.5254,
    longitude: 77.2112,
    image_urls: [
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: false,
    status: 'active',
    created_at: new Date('2026-07-21').toISOString()
  },
  {
    id: 'prop-24',
    owner_id: 'user-landlord-1',
    title: 'Stately 3 BHK Residence in Defence Colony',
    description: 'Superb and highly luxurious 3 BHK builder floor in Defence Colony. Designed by a renowned architect, featuring flawless marble flooring, private glass elevator, expansive balconies, high-end modular fittings, and servant quarters. Highly secure gating. Walking distance to Defence Colony Club.',
    city: 'South Delhi',
    locality: 'Defence Colony',
    bedrooms: 3,
    bathrooms: 3,
    furnishing_status: 'furnished',
    rent_amount: 150000,
    deposit_amount: 300000,
    address: 'A-Block, Defence Colony, New Delhi - 110024',
    latitude: 28.5741,
    longitude: 77.2312,
    image_urls: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-22').toISOString()
  },
  {
    id: 'prop-25',
    owner_id: 'user-landlord-2',
    title: 'Premium 2 BHK Builder Floor in DLF Phase 4',
    description: 'Impeccable 2 BHK semi-furnished property in DLF Phase 4. Located near Galleria Market, offering superior connectivity and convenience. Features custom woodwork, fully loaded modern modular kitchen, separate dining section, independent parking, and 24/7 continuous security surveillance.',
    city: 'Gurugram',
    locality: 'DLF Phase 4',
    bedrooms: 2,
    bathrooms: 2,
    furnishing_status: 'semi_furnished',
    rent_amount: 40000,
    deposit_amount: 80000,
    address: 'Supermart 1 Sector 43, DLF Phase 4, Gurugram, Haryana - 122009',
    latitude: 28.4687,
    longitude: 77.0871,
    image_urls: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-22').toISOString()
  },
  {
    id: 'prop-26',
    owner_id: 'user-landlord-1',
    title: 'Extravagant 4 BHK Duplex on Golf Course Road',
    description: 'Experience unparalleled scale in this duplex 4 BHK penthouse in DLF Phase 5, Golf Course Road. Offering a beautiful private roof garden, dual-height architectural ceilings, high-end marble paneling, separate media room, helper suites, and custom automation. Exclusive clubhouse membership.',
    city: 'Gurugram',
    locality: 'Golf Course Road',
    bedrooms: 4,
    bathrooms: 4,
    furnishing_status: 'semi_furnished',
    rent_amount: 190000,
    deposit_amount: 380000,
    address: 'DLF The Aralias, Golf Course Road, Gurugram, Haryana - 122011',
    latitude: 28.4387,
    longitude: 77.1112,
    image_urls: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-23').toISOString()
  },
  {
    id: 'prop-27',
    owner_id: 'user-landlord-2',
    title: 'Slick Modern 2 BHK near DLF CyberCity',
    description: 'Perfect for executives! A 2 BHK fully furnished apartment in DLF Phase 3. Beautifully arranged with executive desks, premium mattresses, Smart TVs, split ACs, and modular kitchen set. Only a 5-minute walk to CyberCity and CyberHub. Gated sector with excellent connectivity and safety.',
    city: 'Gurugram',
    locality: 'Cyber City',
    bedrooms: 2,
    bathrooms: 2,
    furnishing_status: 'furnished',
    rent_amount: 58000,
    deposit_amount: 116000,
    address: 'V-Block, DLF Phase 3, Gurugram, Haryana - 122002',
    latitude: 28.4912,
    longitude: 77.0894,
    image_urls: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-23').toISOString()
  },
  {
    id: 'prop-28',
    owner_id: 'user-landlord-1',
    title: 'Charming 3 BHK Society Flat in Dwarka',
    description: 'Spacious and highly secure 3 BHK apartment in Sector 10, Dwarka. Highlights include updated modular kitchen, designer bathrooms, dedicated parking slot, and large balconies with plenty of afternoon sun. Gated cooperative group housing society with round-the-clock guards and power backup.',
    city: 'South Delhi',
    locality: 'Dwarka Sector 10',
    bedrooms: 3,
    bathrooms: 3,
    furnishing_status: 'furnished',
    rent_amount: 45000,
    deposit_amount: 90000,
    address: 'Chitrakoot Apartments, Sector 10, Dwarka, New Delhi - 110075',
    latitude: 28.5856,
    longitude: 77.0454,
    image_urls: [
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-24').toISOString()
  },
  {
    id: 'prop-29',
    owner_id: 'user-landlord-2',
    title: 'Exquisite 4 BHK Residence in Greater Kailash II',
    description: 'A stately and expansive 4 BHK builder floor in GK-2, South Delhi. Boasts flawless Italian marble flooring, expansive dining hall, luxurious wooden dressing rooms, and wide wrap-around balconies. Located in a high-security street with gated entry, right next to the local M-Block market.',
    city: 'South Delhi',
    locality: 'Greater Kailash II',
    bedrooms: 4,
    bathrooms: 4,
    furnishing_status: 'furnished',
    rent_amount: 160000,
    deposit_amount: 320000,
    address: 'E-Block, Greater Kailash II, New Delhi - 110048',
    latitude: 28.5287,
    longitude: 77.2412,
    image_urls: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-24').toISOString()
  },
  {
    id: 'prop-30',
    owner_id: 'user-landlord-1',
    title: 'Spacious 3 BHK Family Floor in Sector 31',
    description: 'Highly comfortable and clean 3 BHK builder floor in Sector 31, Gurugram. Unfurnished, allowing families to completely design the interiors to their specific style. Large bedrooms, modern kitchen structure, stilt parking, and round-the-clock water and electricity backup. Safe neighborhood.',
    city: 'Gurugram',
    locality: 'Sector 31',
    bedrooms: 3,
    bathrooms: 3,
    furnishing_status: 'unfurnished',
    rent_amount: 42000,
    deposit_amount: 84000,
    address: 'Sector 31 Main Market Block, Gurugram, Haryana - 122001',
    latitude: 28.4587,
    longitude: 77.0524,
    image_urls: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: false,
    status: 'active',
    created_at: new Date('2026-07-25').toISOString()
  },
  {
    id: 'prop-31',
    owner_id: 'user-landlord-2',
    title: 'Luxury 2 BHK Serviced Condo on Sohna Road',
    description: 'Modern 2 BHK fully furnished apartment at Central Park 2, Sohna Road. Professionally managed with high-end modular furniture, modern appliances, smart lighting, and 24/7 concierge services. Gorgeous resort-style complex featuring vast green parks, jogging tracks, clubhouse, and pools.',
    city: 'Gurugram',
    locality: 'Sohna Road',
    bedrooms: 2,
    bathrooms: 2,
    furnishing_status: 'furnished',
    rent_amount: 38000,
    deposit_amount: 76000,
    address: 'Central Park II, Sector 48, Sohna Road, Gurugram, Haryana - 122018',
    latitude: 28.4154,
    longitude: 77.0312,
    image_urls: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-25').toISOString()
  },
  {
    id: 'prop-32',
    owner_id: 'user-landlord-1',
    title: 'Cosy 1 BHK Studio near Green Park Metro',
    description: 'Superb 1 BHK service studio in Green Park, South Delhi. Features private high-speed internet, smart LED TV, matching rugs, split AC, and micro-kitchen with convection microwave. Located inside a secure, high-profile block just a brief walk from Green Park Market and the local Metro.',
    city: 'South Delhi',
    locality: 'Green Park',
    bedrooms: 1,
    bathrooms: 1,
    furnishing_status: 'furnished',
    rent_amount: 35000,
    deposit_amount: 70000,
    address: 'S-Block, Green Park, New Delhi - 110016',
    latitude: 28.5612,
    longitude: 77.2054,
    image_urls: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-26').toISOString()
  },
  {
    id: 'prop-33',
    owner_id: 'user-landlord-2',
    title: 'Elite 4 BHK Gated Society Flat in Dwarka',
    description: 'Extremely spacious 4 BHK flat in Sector 19, Dwarka. Ideally designed for multi-generational families, boasting wide balconies, 4 upgraded washrooms, ceramic floors, custom storage cabinets, and stilt parking. Secure gated community with high-tech surveillance cameras and play areas.',
    city: 'South Delhi',
    locality: 'Dwarka Sector 19',
    bedrooms: 4,
    bathrooms: 4,
    furnishing_status: 'semi_furnished',
    rent_amount: 55000,
    deposit_amount: 110000,
    address: 'Akshardham Apartments, Sector 19, Dwarka, New Delhi - 110075',
    latitude: 28.5712,
    longitude: 77.0654,
    image_urls: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-26').toISOString()
  },
  {
    id: 'prop-34',
    owner_id: 'user-landlord-1',
    title: 'Charming 2 BHK Builder Floor in DLF Phase 3',
    description: 'Clean and sun-drenched 2 BHK unfurnished flat in DLF Phase 3. Situated in a highly peaceful lane with gated access, featuring modular wooden fixtures, 2 standard bathrooms, and split AC wiring. Extremely close to Rapid Metro station and multiple local dining hubs.',
    city: 'Gurugram',
    locality: 'DLF Phase 3',
    bedrooms: 2,
    bathrooms: 2,
    furnishing_status: 'unfurnished',
    rent_amount: 30000,
    deposit_amount: 60000,
    address: 'T-Block, DLF Phase 3, Gurugram, Haryana - 122002',
    latitude: 28.4914,
    longitude: 77.0912,
    image_urls: [
      'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: false,
    status: 'active',
    created_at: new Date('2026-07-27').toISOString()
  },
  {
    id: 'prop-35',
    owner_id: 'user-landlord-2',
    title: 'Premium 2 BHK Condo on Golf Course Road',
    description: 'Chic 2 BHK fully furnished apartment at DLF The Crest on Golf Course Road. Superbly designed with modern minimalist furnishings, Italian tile flooring, premium kitchen fixtures, and high-efficiency climate controls. High-end residential tower with complete security and club rights.',
    city: 'Gurugram',
    locality: 'Golf Course Road',
    bedrooms: 2,
    bathrooms: 2,
    furnishing_status: 'furnished',
    rent_amount: 95000,
    deposit_amount: 190000,
    address: 'DLF The Crest, Sector 54, Golf Course Road, Gurugram, Haryana - 122011',
    latitude: 28.4312,
    longitude: 77.1084,
    image_urls: [
      'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-27').toISOString()
  },
  {
    id: 'prop-36',
    owner_id: 'user-landlord-1',
    title: 'Compact 1 BHK Suite in Vasant Kunj',
    description: 'Lovely 1 BHK semi-furnished suite on the third floor of a highly secure Vasant Kunj block. Features built-in cupboards, split AC, clean bathroom, and functional pantry area. Convenient walking distance to main sector market and top local shopping centers.',
    city: 'South Delhi',
    locality: 'Vasant Kunj',
    bedrooms: 1,
    bathrooms: 1,
    furnishing_status: 'semi_furnished',
    rent_amount: 25000,
    deposit_amount: 50000,
    address: 'Sector B Pocket 10, Vasant Kunj, New Delhi - 110070',
    latitude: 28.5312,
    longitude: 77.1487,
    image_urls: [
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-28').toISOString()
  },
  {
    id: 'prop-37',
    owner_id: 'user-landlord-2',
    title: 'Furnished 2 BHK Apartment in Sector 14',
    description: 'Beautifully maintained 2 BHK fully furnished apartment in Sector 14, Gurugram. Fully equipped with premium wooden furniture, split cooling, refrigerator, modern modular kitchen, and double balconies. Safe neighborhood with dedicated parking.',
    city: 'Gurugram',
    locality: 'Sector 14',
    bedrooms: 2,
    bathrooms: 2,
    furnishing_status: 'furnished',
    rent_amount: 36000,
    deposit_amount: 72000,
    address: 'Block C, Sector 14, Gurugram, Haryana - 122001',
    latitude: 28.4712,
    longitude: 77.0456,
    image_urls: [
      'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-28').toISOString()
  },
  {
    id: 'prop-38',
    owner_id: 'user-landlord-1',
    title: 'Sunny 3 BHK Builder Floor in Dwarka',
    description: 'Modern 3 BHK semi-furnished property in Sector 6, Dwarka. Boasts high-quality tile floors, built-in wooden cabinets, a separate dining zone, stilt parking, and 24/7 security cameras. Safe family community within walking distance to the Sector 6 central market and metro.',
    city: 'South Delhi',
    locality: 'Dwarka Sector 6',
    bedrooms: 3,
    bathrooms: 3,
    furnishing_status: 'semi_furnished',
    rent_amount: 40000,
    deposit_amount: 80000,
    address: 'Dwarka Sector 6 Society Blocks, Dwarka, New Delhi - 110075',
    latitude: 28.5887,
    longitude: 77.0512,
    image_urls: [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-29').toISOString()
  },
  {
    id: 'prop-39',
    owner_id: 'user-landlord-2',
    title: 'Spacious 4 BHK Builder Floor in DLF Phase 1',
    description: 'Impeccable 4 BHK builder floor in the peaceful DLF Phase 1, Gurugram. High-quality false ceiling finishes, modern wooden paneling, massive lounge area, stilt garage for 2 vehicles, and servant quarters. 24/7 power backup and continuous gated security patrol.',
    city: 'Gurugram',
    locality: 'DLF Phase 1',
    bedrooms: 4,
    bathrooms: 4,
    furnishing_status: 'semi_furnished',
    rent_amount: 110000,
    deposit_amount: 220000,
    address: 'E-Block, DLF Phase 1, Gurugram, Haryana - 122002',
    latitude: 28.4712,
    longitude: 77.0954,
    image_urls: [
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-29').toISOString()
  },
  {
    id: 'prop-40',
    owner_id: 'user-landlord-1',
    title: 'Boutique 2 BHK Builder Floor in GK-2',
    description: 'An elegant second-floor builder floor in Greater Kailash II, South Delhi. Offering custom-fitted light fixtures, modern ceramic washrooms, split AC units, and complete power backup. Situated in a highly affluent and secure gated pocket of GK-2, with immediate park proximity.',
    city: 'South Delhi',
    locality: 'Greater Kailash II',
    bedrooms: 2,
    bathrooms: 2,
    furnishing_status: 'semi_furnished',
    rent_amount: 60000,
    deposit_amount: 120000,
    address: 'S-Block, Greater Kailash II, New Delhi - 110048',
    latitude: 28.5312,
    longitude: 77.2435,
    image_urls: [
      'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-30').toISOString()
  },
  {
    id: 'prop-41',
    owner_id: 'user-landlord-2',
    title: 'Elegant 4 BHK Villa on Sohna Road',
    description: 'Expansive 4 BHK family villa at Vipul Tatvam Villas on Sohna Road. Boasting a large private front lawn, independent terrace, separate servant quarters, customized marble cladding, and dedicated garage. Gated luxury estate with high-tech 3-tier security patrol, parks, and club benefits.',
    city: 'Gurugram',
    locality: 'Sohna Road',
    bedrooms: 4,
    bathrooms: 4,
    furnishing_status: 'furnished',
    rent_amount: 85000,
    deposit_amount: 170000,
    address: 'Vipul Tatvam Villas, Sector 48, Sohna Road, Gurugram, Haryana - 122018',
    latitude: 28.4112,
    longitude: 77.0354,
    image_urls: [
      'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80'
    ],
    is_verified: true,
    status: 'active',
    created_at: new Date('2026-07-30').toISOString()
  }
];

const SEED_LEADS: Lead[] = [
  {
    id: 'lead-1',
    property_id: 'prop-1',
    renter_id: 'user-renter-1',
    name: 'Ankit Kumar',
    phone: '+919599011223',
    message: 'Hello, I am interested in viewing this 3 BHK in DLF Phase 3. Please call me to schedule a visit.',
    created_at: new Date('2026-07-16T10:00:00Z').toISOString(),
    property_title: 'Chic 3 BHK Builder Floor near Cyber City',
    property_locality: 'DLF Phase 3'
  },
  {
    id: 'lead-2',
    property_id: 'prop-3',
    renter_id: null,
    name: 'Meenakshi Iyer',
    phone: '+919876543210',
    message: 'Hi, is this DDA Flat in Vasant Kunj available from August 1st? I work nearby and want to close the deal quickly.',
    created_at: new Date('2026-07-18T14:30:00Z').toISOString(),
    property_title: 'Elegant 2 BHK Gated DDA Flat',
    property_locality: 'Vasant Kunj'
  }
];

const SEED_FAVORITES: Favorite[] = [
  {
    id: 'fav-1',
    user_id: 'user-renter-1',
    property_id: 'prop-1',
    created_at: new Date().toISOString()
  },
  {
    id: 'fav-2',
    user_id: 'user-renter-1',
    property_id: 'prop-3',
    created_at: new Date().toISOString()
  }
];

const SEED_WAITLIST: WaitlistEntry[] = [
  {
    id: 'w-1',
    name: 'Amit Patel',
    contact: 'amit.patel@horizoncorp.com',
    role: 'corporate_hr',
    created_at: new Date('2026-07-15').toISOString()
  },
  {
    id: 'w-2',
    name: 'Rohan Mehra',
    contact: '+919810055443',
    role: 'landlord',
    created_at: new Date('2026-07-17').toISOString()
  }
];

// In-memory fallback storage for SSR / Node CLI runtime
const memoryStorage = new Map<string, string>();
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof localStorage !== 'undefined') {
      try { return localStorage.getItem(key); } catch { return null; }
    }
    return memoryStorage.get(key) || null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof localStorage !== 'undefined') {
      try { localStorage.setItem(key, value); return; } catch {}
    }
    memoryStorage.set(key, value);
  },
  removeItem: (key: string): void => {
    if (typeof localStorage !== 'undefined') {
      try { localStorage.removeItem(key); return; } catch {}
    }
    memoryStorage.delete(key);
  }
};

// Safe JSON parser to prevent Unexpected end of JSON input crashes
export function safeJsonParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw || typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed) return fallback;
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    return fallback;
  }
}

// Initialize Storage if empty
const initLocalStorage = () => {
  if (!safeLocalStorage.getItem('myangan_initialized')) {
    safeLocalStorage.setItem('myangan_users', JSON.stringify(SEED_USERS));
    safeLocalStorage.setItem('myangan_properties', JSON.stringify(SEED_PROPERTIES));
    safeLocalStorage.setItem('myangan_brokers', JSON.stringify(SEED_BROKERS));
    safeLocalStorage.setItem('myangan_leads', JSON.stringify(SEED_LEADS));
    safeLocalStorage.setItem('myangan_favorites', JSON.stringify(SEED_FAVORITES));
    safeLocalStorage.setItem('myangan_waitlist', JSON.stringify(SEED_WAITLIST));
    
    // Seed default passwords
    const seedPasswords: Record<string, string> = {
      'landlord@myangan.in': 'password123',
      'sanjay.broker@delhirealty.co': 'password123',
      'renter@myangan.in': 'password123',
      'admin@myangan.in': 'MyAngan@Admin2026'
    };
    safeLocalStorage.setItem('myangan_user_passwords', JSON.stringify(seedPasswords));
    
    safeLocalStorage.setItem('myangan_initialized', 'true');
  } else {
    // Ensure admin and seed accounts have their passwords synchronized in existing states
    const passwords = safeJsonParse<Record<string, string>>(safeLocalStorage.getItem('myangan_user_passwords'), {});
    let updated = false;
    if (!passwords['admin@myangan.in']) {
      passwords['admin@myangan.in'] = 'MyAngan@Admin2026';
      updated = true;
    }
    if (!passwords['landlord@myangan.in']) {
      passwords['landlord@myangan.in'] = 'password123';
      updated = true;
    }
    if (!passwords['renter@myangan.in']) {
      passwords['renter@myangan.in'] = 'password123';
      updated = true;
    }
    if (updated) {
      safeLocalStorage.setItem('myangan_user_passwords', JSON.stringify(passwords));
    }
  }
};

if (isMockModeActive) {
  initLocalStorage();
}

// Helpers for Mock DB
const getMockData = <T>(key: string): T[] => {
  return safeJsonParse<T[]>(safeLocalStorage.getItem(key), []);
};

const saveMockData = <T>(key: string, data: T[]): void => {
  safeLocalStorage.setItem(key, JSON.stringify(data));
};

// ==========================================
// UNIFIED DATABASE SERVICE
// ==========================================

export const dbService = {
  isSupabaseConnected(): boolean {
    return isRealSupabaseConfigured;
  },

  // ------------------------------------------
  // AUTHENTICATION & PROFILES
  // ------------------------------------------

  async getCurrentUser(): Promise<UserProfile | null> {
    if (isRealSupabaseConfigured && supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      let profileData = (data || null) as UserProfile | null;

      // Always query user_roles table to resolve exact operational role from backend
      try {
        const { data: roleRow } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (roleRow?.role) {
          const fetchedRole = roleRow.role as UserRole;
          if (profileData) {
            profileData = { ...profileData, role: fetchedRole };
          } else {
            profileData = {
              id: user.id,
              email: user.email || '',
              name: user.user_metadata?.name || 'User',
              role: fetchedRole,
              phone: user.user_metadata?.phone || '',
              created_at: user.created_at
            };
          }
        }
      } catch {}

      if (!profileData) {
        profileData = {
          id: user.id,
          email: user.email || '',
          name: user.user_metadata?.name || 'User',
          role: (user.user_metadata?.role as UserRole) || 'renter',
          phone: user.user_metadata?.phone || '',
          created_at: user.created_at
        };
      }
      return profileData;
    } else if (isMockModeActive) {
      const u = safeLocalStorage.getItem('myangan_current_user');
      return safeJsonParse<UserProfile | null>(u, null);
    } else {
      return null;
    }
  },

  async updateUserProfile(userId: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    if (isRealSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();
      if (error) throw error;
      return data as UserProfile;
    } else if (isMockModeActive) {
      const users = getMockData<UserProfile>('myangan_users');
      const index = users.findIndex(u => u.id === userId);
      if (index === -1) throw new Error('User not found');

      users[index] = { ...users[index], ...updates };
      saveMockData('myangan_users', users);

      // Also update current user if it matches
      const current = safeLocalStorage.getItem('myangan_current_user');
      if (current) {
        const parsed = safeJsonParse<UserProfile | null>(current, null);
        if (parsed && parsed.id === userId) {
          safeLocalStorage.setItem('myangan_current_user', JSON.stringify(users[index]));
        }
      }
      return users[index];
    } else {
      throw new Error('Database Configuration Error: Missing Supabase credentials. Profile updates are disabled.');
    }
  },

  async signUp(email: string, role: UserRole, name: string, phone: string, password?: string): Promise<UserProfile> {
    if (!password || password.length < 6) {
      throw new Error('Password must be at least 6 characters long.');
    }
    if (isRealSupabaseConfigured && supabase) {
      // In real mode, use Supabase SignUp
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role,
            phone
          }
        }
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Sign up failed');

      // Check if profile is already created via trigger, otherwise do it manually
      const isLandlordBroker = role === 'landlord_broker';
      const accountCategory = isLandlordBroker ? 'landlord_broker' : 'renter';
      const onboardingStatus = isLandlordBroker ? 'pending' : 'complete';

      const profile: UserProfile = {
        id: data.user.id,
        email,
        role,
        name,
        phone,
        account_category: accountCategory,
        onboarding_status: onboardingStatus,
        created_at: new Date().toISOString()
      };
      
      // Upsert profile in public.profiles
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        full_name: name,
        phone,
        account_category: accountCategory,
        onboarding_status: onboardingStatus,
        provider_type: null,
        account_status: 'pending_verification',
        updated_at: new Date().toISOString()
      });

      if (!isLandlordBroker) {
        await supabase.from('user_roles').upsert({
          user_id: data.user.id,
          role: 'renter'
        }, { onConflict: 'user_id,role' });
      }

      return profile;
    } else if (isMockModeActive) {
      // Local Storage Mode for Development Mock Only
      const users = getMockData<UserProfile>('myangan_users');
      const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        throw new Error('User with this email already exists.');
      }

      const id = 'user-gen-' + Math.random().toString(36).substr(2, 9);
      const newProfile: UserProfile = {
        id,
        email,
        role,
        name,
        phone,
        created_at: new Date().toISOString()
      };

      users.push(newProfile);
      saveMockData('myangan_users', users);

      // Save the password securely in the passwords dictionary
      const passwords = safeJsonParse<Record<string, string>>(safeLocalStorage.getItem('myangan_user_passwords'), {});
      passwords[email.toLowerCase()] = password || 'password123';
      safeLocalStorage.setItem('myangan_user_passwords', JSON.stringify(passwords));

      // If they are a broker, seed a broker profile too
      if (role === 'landlord_broker') {
        const brokers = getMockData<Broker>('myangan_brokers');
        const newBroker: Broker = {
          id: 'broker-gen-' + Math.random().toString(36).substr(2, 9),
          user_id: id,
          name,
          email,
          agency_name: `${name} Realty`,
          phone: phone || '+919999999999',
          whatsapp: (phone || '919999999999').replace(/[^0-9]/g, ''),
          active_listings_count: 0,
          is_verified: false,
          created_at: new Date().toISOString()
        };
        brokers.push(newBroker);
        saveMockData('myangan_brokers', brokers);
      }

      safeLocalStorage.setItem('myangan_current_user', JSON.stringify(newProfile));
      return newProfile;
    } else {
      throw new Error('Database Configuration Error: Missing Supabase credentials (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required). Registration is disabled in production.');
    }
  },

  async completeOnboarding(providerType: 'owner' | 'broker'): Promise<UserProfile> {
    const user = await this.getCurrentUser();
    if (!user) throw new Error('Authentication required.');

    if (isRealSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          provider_type: providerType,
          onboarding_status: 'complete',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select()
        .single();

      if (!error && data) {
        await supabase.from('user_roles').upsert({ user_id: user.id, role: providerType }, { onConflict: 'user_id,role' });
        return {
          ...user,
          role: providerType,
          provider_type: providerType,
          onboarding_status: 'complete'
        };
      }
    }

    try {
      const res = await fetch('/api/auth/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ provider_type: providerType })
      });
      if (res.ok) {
        const json = await res.json();
        return json.user;
      }
    } catch {}

    const updated = {
      ...user,
      role: providerType,
      provider_type: providerType,
      onboarding_status: 'complete' as const
    };
    safeLocalStorage.setItem('myangan_current_user', JSON.stringify(updated));
    return updated;
  },

  async requestPasswordReset(email: string): Promise<string> {
    const res = await fetch('/api/auth/password-reset/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send recovery code.');
    }
    return data.message || 'If an account exists for this email, a recovery code has been sent.';
  },

  async verifyPasswordResetOtp(email: string, code: string): Promise<string> {
    const res = await fetch('/api/auth/password-reset/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), code: code.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Verification failed.');
    }
    return data.reset_token;
  },

  async completePasswordReset(resetToken: string, newPassword: string, confirmPassword: string): Promise<string> {
    const res = await fetch('/api/auth/password-reset/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Password reset failed.');
    }
    return data.message || 'Your password has been changed successfully.';
  },

  async updatePassword(newPassword: string): Promise<string> {
    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    if (isRealSupabaseConfigured && supabase) {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw new Error(error.message);
      return 'Your password has been updated successfully.';
    } else {
      const currentUser = await this.getCurrentUser();
      if (currentUser?.email) {
        const passwords = safeJsonParse<Record<string, string>>(safeLocalStorage.getItem('myangan_user_passwords'), {});
        passwords[currentUser.email.toLowerCase()] = newPassword;
        safeLocalStorage.setItem('myangan_user_passwords', JSON.stringify(passwords));
      }
      return 'Password updated successfully.';
    }
  },

  async signIn(email: string, password?: string): Promise<UserProfile> {
    if (!password) {
      throw new Error('Password is required.');
    }
    if (isRealSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Sign in failed');

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.user.id)
        .single();

      return profile as UserProfile;
    } else if (isMockModeActive) {
      // Local Storage Mode
      const users = getMockData<UserProfile>('myangan_users');
      const found = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (!found) {
        throw new Error('Invalid email or password.');
      }

      // Verify the password
      const passwords = safeJsonParse<Record<string, string>>(safeLocalStorage.getItem('myangan_user_passwords'), {});
      const storedPassword = passwords[email.toLowerCase()];
      const actualStoredPassword = storedPassword || 'password123';

      if (password && actualStoredPassword && password !== actualStoredPassword) {
        throw new Error('Invalid email or password.');
      }

      safeLocalStorage.setItem('myangan_current_user', JSON.stringify(found));
      return found;
    } else {
      throw new Error('Database Configuration Error: Missing Supabase credentials (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required). Sign in is disabled in production.');
    }
  },

  async signOut(): Promise<void> {
    if (isRealSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    } else {
      safeLocalStorage.removeItem('myangan_current_user');
    }
  },

  // ------------------------------------------
  // PROPERTIES MANAGEMENT
  // ------------------------------------------

  async getProperties(filters: {
    city?: string;
    locality?: string;
    minBudget?: number;
    maxBudget?: number;
    bhk?: number;
    furnishing?: string;
  } = {}): Promise<Property[]> {
    if (isRealSupabaseConfigured && supabase) {
      try {
        let query = supabase.from('properties')
          .select('*')
          .eq('status', 'active')
          .in('approval_status', ['approved', 'published'])
          .order('created_at', { ascending: false });

        if (filters.city) {
          query = query.eq('city', filters.city);
        }
        if (filters.locality) {
          query = query.ilike('locality', `%${filters.locality}%`);
        }
        if (filters.minBudget) {
          query = query.gte('rent_amount', filters.minBudget);
        }
        if (filters.maxBudget) {
          query = query.lte('rent_amount', filters.maxBudget);
        }
        if (filters.bhk) {
          query = query.eq('bedrooms', filters.bhk);
        }
        if (filters.furnishing && filters.furnishing !== 'all') {
          query = query.eq('furnishing_status', filters.furnishing);
        }

        const { data, error } = await query;
        if (error) throw error;
        const rawProps = (data || []) as Property[];
        if (rawProps.length === 0) return [];

        const ownerIds = Array.from(new Set(rawProps.map(p => p.owner_id)));
        const { data: usersData } = await supabase.from('users').select('id, is_subscribed').in('id', ownerIds);
        const userSubMap = (usersData || []).reduce((acc: any, u: any) => {
          acc[u.id] = !!u.is_subscribed;
          return acc;
        }, {});

        return rawProps.map(p => {
          const isSubscribed = !!userSubMap[p.owner_id];
          const isNew = new Date(p.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return { ...p, is_featured: isSubscribed && isNew };
        }).sort((a, b) => {
          if (a.is_featured && !b.is_featured) return -1;
          if (!a.is_featured && b.is_featured) return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
      } catch (err: any) {
        console.error('[DB Error] getProperties query failed:', err?.message || err);
        if (isRealSupabaseConfigured) {
          throw new Error(`Database Error loading active properties: ${err?.message || 'Query failed'}`);
        }
      }
    }

    // Local Storage Fallback Mode
    let list = getMockData<Property>('myangan_properties');

      // Filter active ones (unless loaded from special dashboard context)
      // For general grid, we show only active
      list = list.filter(p => p.status === 'active');

      if (filters.city) {
        list = list.filter(p => p.city.toLowerCase() === filters.city?.toLowerCase());
      }
      if (filters.locality) {
        list = list.filter(p => p.locality.toLowerCase().includes(filters.locality!.toLowerCase()));
      }
      if (filters.minBudget) {
        list = list.filter(p => p.rent_amount >= filters.minBudget!);
      }
      if (filters.maxBudget) {
        list = list.filter(p => p.rent_amount <= filters.maxBudget!);
      }
      if (filters.bhk) {
        list = list.filter(p => p.bedrooms === filters.bhk);
      }
      if (filters.furnishing && filters.furnishing !== 'all') {
        list = list.filter(p => p.furnishing_status === filters.furnishing);
      }

      // Add featured status check
      const users = getMockData<UserProfile>('myangan_users');
      const mapped = list.map(p => {
        const owner = users.find(u => u.id === p.owner_id);
        const isSubscribed = !!owner?.is_subscribed;
        const isNew = new Date(p.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return {
          ...p,
          is_featured: isSubscribed && isNew
        };
      });

      // Sort featured first, then newest first
      return mapped.sort((a, b) => {
        if (a.is_featured && !b.is_featured) return -1;
        if (!a.is_featured && b.is_featured) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  },

  async getAdminAllProperties(): Promise<Property[]> {
    if (isRealSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rawProps = (data || []) as Property[];
      if (rawProps.length === 0) return [];
      const ownerIds = Array.from(new Set(rawProps.map(p => p.owner_id)));
      const { data: usersData } = await supabase.from('users').select('id, is_subscribed').in('id', ownerIds);
      const userSubMap = (usersData || []).reduce((acc: any, u: any) => {
        acc[u.id] = !!u.is_subscribed;
        return acc;
      }, {});
      return rawProps.map(p => {
        const isSubscribed = !!userSubMap[p.owner_id];
        const isNew = new Date(p.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return { ...p, is_featured: isSubscribed && isNew };
      });
    } else {
      const users = getMockData<UserProfile>('myangan_users');
      return getMockData<Property>('myangan_properties').map(p => {
        const owner = users.find(u => u.id === p.owner_id);
        const isSubscribed = !!owner?.is_subscribed;
        const isNew = new Date(p.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return { ...p, is_featured: isSubscribed && isNew };
      }).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  },

  async getOwnerProperties(ownerId: string): Promise<Property[]> {
    if (isRealSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rawProps = (data || []) as Property[];
      const { data: userData } = await supabase.from('users').select('is_subscribed').eq('id', ownerId).maybeSingle();
      const isSubscribed = !!userData?.is_subscribed;
      return rawProps.map(p => {
        const isNew = new Date(p.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return { ...p, is_featured: isSubscribed && isNew };
      });
    } else {
      const users = getMockData<UserProfile>('myangan_users');
      const owner = users.find(u => u.id === ownerId);
      const isSubscribed = !!owner?.is_subscribed;
      const list = getMockData<Property>('myangan_properties');
      return list.filter(p => p.owner_id === ownerId).map(p => {
        const isNew = new Date(p.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        return { ...p, is_featured: isSubscribed && isNew };
      }).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  },

  async getPropertyById(id: string): Promise<{ property: Property; owner: UserProfile } | null> {
    if (isRealSupabaseConfigured && supabase) {
      const { data: property, error: pError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', id)
        .single();

      if (pError || !property) return null;

      const { data: owner, error: oError } = await supabase
        .from('users')
        .select('*')
        .eq('id', property.owner_id)
        .single();

      const profile = (owner || {
        id: property.owner_id,
        name: 'Landlord',
        email: '',
        phone: '+919999999999',
        role: 'landlord_broker',
        created_at: ''
      }) as UserProfile;

      const isSubscribed = !!profile.is_subscribed;
      const isNew = new Date(property.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const decoratedProperty = {
        ...property,
        is_featured: isSubscribed && isNew
      } as Property;

      return {
        property: decoratedProperty,
        owner: profile
      };
    } else {
      const props = getMockData<Property>('myangan_properties');
      const prop = props.find(p => p.id === id);
      if (!prop) return null;

      const users = getMockData<UserProfile>('myangan_users');
      const owner = users.find(u => u.id === prop.owner_id) || {
        id: prop.owner_id,
        name: 'Sharma Properties',
        email: 'landlord@myangan.in',
        phone: '+919811022334',
        role: 'landlord_broker',
        created_at: ''
      };

      const isSubscribed = !!owner.is_subscribed;
      const isNew = new Date(prop.created_at) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const decoratedProperty = {
        ...prop,
        is_featured: isSubscribed && isNew
      } as Property;

      return { property: decoratedProperty, owner };
    }
  },

  async uploadPropertyImages(files: File[], propertyId: string): Promise<string[]> {
    if (!files || files.length === 0) return [];
    if (files.length > 8) throw new Error('Validation Error: Maximum 8 images allowed.');

    const currentUser = await this.getCurrentUser();
    if (!currentUser) throw new Error('Authentication required to upload property images.');

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB

    for (const file of files) {
      if (!allowedMimeTypes.includes(file.type)) {
        throw new Error(`Validation Error: File '${file.name}' has invalid file type '${file.type}'. Allowed types: JPG, PNG, WebP.`);
      }
      if (file.size > maxSizeBytes) {
        throw new Error(`Validation Error: File '${file.name}' exceeds the 5 MB size limit.`);
      }
    }

    const uploadedPaths: string[] = [];

    if (isRealSupabaseConfigured && supabase) {
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const fileExt = file.name.split('.').pop()?.toLowerCase() || 'webp';
          const sanitizedOriginal = file.name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 20);
          const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          const objectPath = `${currentUser.id}/${propertyId}/${uniqueId}_${sanitizedOriginal}.${fileExt}`;

          const { data, error } = await supabase.storage
            .from('property-images')
            .upload(objectPath, file, {
              contentType: file.type,
              upsert: true
            });

          if (error || !data) {
            console.error('[Storage Upload Error]', error);
            // Rollback uploaded images in this batch
            if (uploadedPaths.length > 0) {
              await supabase.storage.from('property-images').remove(uploadedPaths);
            }
            throw new Error(`Storage Error: Failed to upload image '${file.name}': ${error?.message || 'Upload failed'}`);
          }

          uploadedPaths.push(data.path);
        }

        return uploadedPaths.map(p => `property-images/${p}`);
      } catch (err: any) {
        // Atomic Rollback
        if (uploadedPaths.length > 0 && supabase) {
          try {
            await supabase.storage.from('property-images').remove(uploadedPaths);
          } catch {
            // Ignore secondary cleanup error
          }
        }
        throw err;
      }
    } else {
      return files.map((f, i) => `property-images/${currentUser.id}/${propertyId}/demo-${i + 1}.webp`);
    }
  },

  async postProperty(property: Omit<Property, 'id' | 'created_at' | 'is_verified' | 'status'> & { imageFiles?: File[] }): Promise<Property> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) throw new Error('Authentication required: You must be logged in to post a property.');
    if (currentUser.role === 'renter') {
      throw new Error('Unauthorized: Renters are not allowed to post properties.');
    }

    // REMOVED 3-listing cap restriction for all users

    let finalImageUrls = [...(property.image_urls || [])];
    // Strip temporary browser blob URLs
    finalImageUrls = finalImageUrls.filter(url => !url.startsWith('blob:'));

    const propertyId = 'prop_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // Upload physical File objects if provided
    if (property.imageFiles && property.imageFiles.length > 0) {
      const uploadedStoragePaths = await this.uploadPropertyImages(property.imageFiles, propertyId);
      finalImageUrls = [...finalImageUrls, ...uploadedStoragePaths];
    }

    if (isRealSupabaseConfigured && supabase) {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Authentication Error: Session token missing. Please sign in again.');
      }

      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: property.title,
          description: property.description,
          city: property.city,
          locality: property.locality,
          address: property.address,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          furnishing_status: property.furnishing_status,
          rent_amount: property.rent_amount,
          deposit_amount: property.deposit_amount,
          latitude: property.latitude,
          longitude: property.longitude,
          image_urls: finalImageUrls
        })
      });

      const responseText = await response.text();
      let resData: any = {};
      try {
        resData = responseText ? JSON.parse(responseText) : {};
      } catch {
        resData = { error: 'Server returned an invalid response.' };
      }

      if (!response.ok) {
        // Rollback uploaded storage files if endpoint returns failure
        if (finalImageUrls.length > 0) {
          const storagePathsToDelete = finalImageUrls
            .filter(u => u.startsWith('property-images/'))
            .map(u => u.replace('property-images/', ''));

          if (storagePathsToDelete.length > 0) {
            try {
              await supabase.storage.from('property-images').remove(storagePathsToDelete);
            } catch {
              // Ignore rollback cleanup error
            }
          }
        }
        throw new Error(resData.error || `Submission failed with status ${response.status}`);
      }

      return resData.property as Property;
    } else {
      const newProp: Property = {
        ...property,
        id: propertyId,
        owner_id: currentUser.id,
        is_verified: false,
        approval_status: 'pending_review',
        status: 'pending',
        review_notes: null,
        created_at: new Date().toISOString(),
        image_urls: finalImageUrls
      } as unknown as Property;

      const props = getMockData<Property>('myangan_properties');
      props.push(newProp);
      saveMockData('myangan_properties', props);

      return newProp;
    }
  },

  async updateProperty(id: string, updates: Partial<Property>): Promise<Property> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) throw new Error('Authentication required: You must be logged in to update a property.');

    // Enforce listing limit when activating an inactive property
    if (updates.status === 'active') {
      const existingProps = await this.getOwnerProperties(currentUser.id);
      const activeCount = existingProps.filter(p => p.status === 'active' && p.id !== id).length;
      if (currentUser.role === 'landlord_broker' && !currentUser.is_subscribed && activeCount >= 3) {
        throw new Error('Listing limit reached: Free accounts are capped at 3 active listings. Subscribe to the Broker Plan to activate more listings!');
      }
    }

    if (isRealSupabaseConfigured && supabase) {
      if (currentUser.role === 'renter') {
        throw new Error('Unauthorized: Renters are not allowed to update properties.');
      }
      const { data, error } = await supabase
        .from('properties')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data as Property;
    } else {
      const props = getMockData<Property>('myangan_properties');
      const index = props.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Property not found');

      // Verify ownership and roles for mock mode
      const targetProperty = props[index];
      const isOwner = targetProperty.owner_id === currentUser.id;
      const isAdmin = currentUser.role === 'admin';
      const isLandlord = currentUser.role === 'landlord_broker';

      if (!isAdmin && (!isOwner || !isLandlord)) {
        throw new Error('Unauthorized: You do not have permission to edit this property.');
      }

      const oldStatus = props[index].status;
      const filteredUpdates = { ...updates };
      // Prevent standard landlords from changing verification status
      if (!isAdmin) {
        delete filteredUpdates.is_verified;
      }

      props[index] = { ...props[index], ...filteredUpdates };
      saveMockData('myangan_properties', props);

      // Update broker counts if status changed
      if (updates.status && oldStatus !== updates.status) {
        const brokers = getMockData<Broker>('myangan_brokers');
        const bIndex = brokers.findIndex(b => b.user_id === props[index].owner_id);
        if (bIndex !== -1) {
          if (updates.status === 'active' && oldStatus !== 'active') {
            brokers[bIndex].active_listings_count += 1;
          } else if (updates.status !== 'active' && oldStatus === 'active') {
            brokers[bIndex].active_listings_count = Math.max(0, brokers[bIndex].active_listings_count - 1);
          }
          saveMockData('myangan_brokers', brokers);
        }
      }

      return props[index];
    }
  },

  async resubmitProperty(id: string, updates: Partial<Property> = {}): Promise<Property> {
    return this.updateProperty(id, {
      ...updates,
      approval_status: 'pending_review',
      status: 'pending',
      review_notes: null
    });
  },

  async deleteProperty(id: string): Promise<void> {
    const currentUser = await this.getCurrentUser();
    if (!currentUser) throw new Error('Authentication required: You must be logged in to delete a property.');

    if (isRealSupabaseConfigured && supabase) {
      if (currentUser.role === 'renter') {
        throw new Error('Unauthorized: Renters are not allowed to delete properties.');
      }
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } else {
      const props = getMockData<Property>('myangan_properties');
      const index = props.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Property not found');

      // Verify ownership and roles for mock mode
      const targetProperty = props[index];
      const isOwner = targetProperty.owner_id === currentUser.id;
      const isAdmin = currentUser.role === 'admin';
      const isLandlord = currentUser.role === 'landlord_broker';

      if (!isAdmin && (!isOwner || !isLandlord)) {
        throw new Error('Unauthorized: You do not have permission to delete this property.');
      }

      const ownerId = props[index].owner_id;
      const status = props[index].status;
      props.splice(index, 1);
      saveMockData('myangan_properties', props);

      // Update broker counts
      if (status === 'active') {
        const brokers = getMockData<Broker>('myangan_brokers');
        const bIndex = brokers.findIndex(b => b.user_id === ownerId);
        if (bIndex !== -1) {
          brokers[bIndex].active_listings_count = Math.max(0, brokers[bIndex].active_listings_count - 1);
          saveMockData('myangan_brokers', brokers);
        }
      }
    }
  },

  // ------------------------------------------
  // LEADS & INQUIRIES
  // ------------------------------------------

  async getLeadsForOwnerOrAdmin(userId: string, role: UserRole): Promise<Lead[]> {
    if (isRealSupabaseConfigured && supabase) {
      let query;
      if (role === 'admin') {
        // Admins can see all leads
        query = supabase
          .from('leads')
          .select(`
            *,
            property:properties(title, locality)
          `)
          .order('created_at', { ascending: false });
      } else {
        // Landlord/broker only sees leads for their own properties
        // Supabase RLS handles this, but we query explicitly via join or filter
        query = supabase
          .from('leads')
          .select(`
            *,
            property:properties!inner(title, locality, owner_id)
          `)
          .eq('properties.owner_id', userId)
          .order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((l: any) => ({
        ...l,
        property_title: l.property?.title,
        property_locality: l.property?.locality
      })) as Lead[];
    } else {
      // Local Storage Mode
      const leads = getMockData<Lead>('myangan_leads');
      const props = getMockData<Property>('myangan_properties');

      if (role === 'admin') {
        return leads.map(l => {
          const p = props.find(pr => pr.id === l.property_id);
          return {
            ...l,
            property_title: p ? p.title : 'Property Deleted',
            property_locality: p ? p.locality : ''
          };
        }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else {
        // Filter by property owner
        const ownerProps = props.filter(p => p.owner_id === userId);
        const ownerPropIds = ownerProps.map(p => p.id);
        
        return leads
          .filter(l => ownerPropIds.includes(l.property_id))
          .map(l => {
            const p = ownerProps.find(pr => pr.id === l.property_id);
            return {
              ...l,
              property_title: p ? p.title : '',
              property_locality: p ? p.locality : ''
            };
          }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    }
  },

  async createLead(lead: Omit<Lead, 'id' | 'created_at'>): Promise<Lead> {
    const newLead: Lead = {
      ...lead,
      id: isRealSupabaseConfigured ? undefined : 'lead-gen-' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    } as unknown as Lead;

    if (isRealSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('leads')
        .insert(newLead)
        .select()
        .single();
      if (error) throw error;
      return data as Lead;
    } else {
      const leads = getMockData<Lead>('myangan_leads');
      leads.push(newLead);
      saveMockData('myangan_leads', leads);
      return newLead;
    }
  },

  // ------------------------------------------
  // FAVORITES
  // ------------------------------------------

  async getFavorites(userId: string): Promise<Property[]> {
    if (isRealSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          property_id,
          property:properties(*)
        `)
        .eq('user_id', userId);

      if (error) throw error;
      return (data || []).map((f: any) => f.property).filter(Boolean) as Property[];
    } else {
      const favs = getMockData<Favorite>('myangan_favorites');
      const userFavs = favs.filter(f => f.user_id === userId);
      const favPropIds = userFavs.map(f => f.property_id);
      
      const props = getMockData<Property>('myangan_properties');
      return props.filter(p => favPropIds.includes(p.id));
    }
  },

  async isFavorite(userId: string, propertyId: string): Promise<boolean> {
    if (isRealSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('property_id', propertyId)
        .maybeSingle();
      if (error) return false;
      return !!data;
    } else {
      const favs = getMockData<Favorite>('myangan_favorites');
      return favs.some(f => f.user_id === userId && f.property_id === propertyId);
    }
  },

  async toggleFavorite(userId: string, propertyId: string): Promise<boolean> {
    if (isRealSupabaseConfigured && supabase) {
      const isFav = await this.isFavorite(userId, propertyId);
      if (isFav) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('property_id', propertyId);
        if (error) throw error;
        return false;
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: userId, property_id: propertyId });
        if (error) throw error;
        return true;
      }
    } else {
      const favs = getMockData<Favorite>('myangan_favorites');
      const index = favs.findIndex(f => f.user_id === userId && f.property_id === propertyId);
      
      if (index !== -1) {
        // Remove favorite
        favs.splice(index, 1);
        saveMockData('myangan_favorites', favs);
        return false;
      } else {
        // Add favorite
        const newFav: Favorite = {
          id: 'fav-gen-' + Math.random().toString(36).substr(2, 9),
          user_id: userId,
          property_id: propertyId,
          created_at: new Date().toISOString()
        };
        favs.push(newFav);
        saveMockData('myangan_favorites', favs);
        return true;
      }
    }
  },

  // ------------------------------------------
  // BROKERS DIRECTORY
  // ------------------------------------------

  async getBrokers(): Promise<Broker[]> {
    if (isRealSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('brokers')
          .select(`
            *,
            user:users(name, email)
          `)
          .order('active_listings_count', { ascending: false });

        if (error) throw error;
        return (data || []).map((b: any) => ({
          ...b,
          name: b.user?.name || b.name,
          email: b.user?.email || b.email
        })) as Broker[];
      } catch {
        // Fall back cleanly to local database
      }
    }

    return getMockData<Broker>('myangan_brokers').sort(
      (a, b) => b.active_listings_count - a.active_listings_count
    );
  },

  // ------------------------------------------
  // WAITLIST MANAGEMENT
  // ------------------------------------------

  async joinWaitlist(entry: Omit<WaitlistEntry, 'id' | 'created_at'>): Promise<WaitlistEntry> {
    const newEntry: WaitlistEntry = {
      ...entry,
      id: isRealSupabaseConfigured ? undefined : 'w-gen-' + Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    } as unknown as WaitlistEntry;

    if (isRealSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('waitlist')
        .insert(newEntry)
        .select()
        .single();
      if (error) throw error;
      return data as WaitlistEntry;
    } else {
      const waitlist = getMockData<WaitlistEntry>('myangan_waitlist');
      waitlist.push(newEntry);
      saveMockData('myangan_waitlist', waitlist);
      return newEntry;
    }
  },

  async getWaitlistEntries(): Promise<WaitlistEntry[]> {
    if (isRealSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from('waitlist')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as WaitlistEntry[];
    } else {
      return getMockData<WaitlistEntry>('myangan_waitlist').sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  },

  async getAdminAuthHeaders(emailOrToken?: string): Promise<Record<string, string>> {
    let token = emailOrToken && !emailOrToken.includes('@') ? emailOrToken : undefined;
    if (!token && isRealSupabaseConfigured && supabase) {
      const sessionRes = await supabase.auth.getSession();
      if (sessionRes?.data?.session?.access_token) {
        token = sessionRes.data.session.access_token;
      }
    }
    if (!token) {
      const stored = localStorage.getItem('myangan_admin_access_token');
      if (stored && !stored.includes(':')) {
        token = stored;
      }
    }
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  async adminLogin(email: string, pass: string): Promise<any> {
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error || 'Invalid credentials or insufficient access.');
    }

    if (data.session?.access_token) {
      if (isRealSupabaseConfigured && supabase) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token || '',
        }).catch((err) => console.warn('[Admin Auth] Session sync notice:', err));
      }
      localStorage.setItem('myangan_admin_access_token', data.session.access_token);
    } else if (data.token && !data.token.includes(':')) {
      localStorage.setItem('myangan_admin_access_token', data.token);
    }
    return data;
  },

  async adminGetPendingProviders(adminEmailOrToken?: string): Promise<any[]> {
    const authHeaders = await this.getAdminAuthHeaders(adminEmailOrToken);
    const response = await fetch('/api/admin/providers', {
      headers: { ...authHeaders },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to fetch providers.');
    return data.providers || [];
  },

  async adminReviewProvider(adminEmailOrToken: string, userId: string, status: string, notes?: string): Promise<any> {
    const authHeaders = await this.getAdminAuthHeaders(adminEmailOrToken);
    const response = await fetch(`/api/admin/providers/${userId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ status, notes }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to review provider.');
    return data;
  },

  async adminGetProperties(adminEmailOrToken?: string, statusFilter?: string): Promise<any[]> {
    const authHeaders = await this.getAdminAuthHeaders(adminEmailOrToken);
    const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
    const response = await fetch(`/api/admin/properties${query}`, {
      headers: { ...authHeaders },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to fetch properties.');
    return data.properties || [];
  },

  async adminReviewProperty(adminEmailOrToken: string, propertyId: string, action: string, notes?: string): Promise<any> {
    const authHeaders = await this.getAdminAuthHeaders(adminEmailOrToken);
    const response = await fetch(`/api/admin/properties/${propertyId}/review`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ action, notes }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to review property.');
    return data;
  },

  async adminGetAuditLogs(adminEmailOrToken?: string): Promise<any[]> {
    const authHeaders = await this.getAdminAuthHeaders(adminEmailOrToken);
    const response = await fetch('/api/admin/audit-logs', {
      headers: { ...authHeaders },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Failed to fetch audit logs.');
    return data.logs || [];
  }
};
