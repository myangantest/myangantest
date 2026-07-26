/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { dbService } from './db';
import { Property } from '../types';

export interface SeoPage {
  slug: string; // e.g. "pg-for-rent", "rentals/gurugram/pg", "alternatives/nobroker"
  pageType: 'property-type' | 'audience' | 'roommate' | 'location' | 'comparison' | 'guide';
  isIndexed: boolean;
  title: string;
  description: string;
  h1: string;
  introduction: string;
  locationFilter?: string; // e.g. "Gurugram", "South Delhi", "Noida", "Greater Noida", "Ghaziabad", "Faridabad"
  typeFilter?: 'PG' | 'Flat' | 'House' | 'Room' | string;
  audienceFilter?: 'boys' | 'girls' | 'working-professionals' | 'students' | 'families' | 'bachelors' | string;
  uniqueGuidance: string;
  faqContent: Array<{ question: string; answer: string }>;
  canonicalUrl: string;
  lastReviewed: string;
  relatedPages: string[]; // slugs
  sources?: string[];
  status: 'draft' | 'published';
}

// Complete registry of built-in SEO landing pages with pristine copy, accurate competitor comparisons, and actual guidelines
export const DEFAULT_SEO_PAGES: SeoPage[] = [
  // --- PROPERTY TYPE PAGES ---
  {
    slug: 'pg-for-rent',
    pageType: 'property-type',
    isIndexed: true,
    title: 'PG for Rent in Delhi NCR | Verified Paying Guest Accommodations',
    description: 'Find verified PG accommodations for rent in Gurugram, Delhi, and Noida. Explore single & sharing rooms with modular kitchens, Wi-Fi, and 3-tier gated security.',
    h1: 'Paying Guest (PG) Accommodations for Rent in Delhi NCR',
    introduction: 'Explore premium and affordable paying guest rooms across Delhi National Capital Region. Our listings are verified to save you from bait-and-switch rentals, matching you with authorized local landlords or vetted property managers.',
    typeFilter: 'PG',
    uniqueGuidance: 'When choosing a PG in Delhi NCR, always inquire about standard power-back up charges, water supply limits, guest policies, and notice periods. PGs on MyAngan generally range between ₹8,000 to ₹18,000 depending on occupancy and smart security features.',
    faqContent: [
      { question: 'Is security deposit refundable in MyAngan PGs?', answer: 'Yes, security deposits are fully refundable as per the terms agreed upon in the rent contract. Typically, landlords ask for 1 to 2 months of deposit.' },
      { question: 'What amenities are included in standard Delhi NCR PGs?', answer: 'Most verified PGs listed on our portal include high-speed Wi-Fi, power backup, regular housekeeping, laundry facilities, and smart security card ingress.' }
    ],
    canonicalUrl: 'https://myangan.com/pg-for-rent',
    lastReviewed: '2026-07-21',
    relatedPages: ['pg-for-boys', 'pg-for-girls', 'rentals/gurugram/pg', 'rentals/noida/pg'],
    status: 'published'
  },
  {
    slug: 'flats-for-rent',
    pageType: 'property-type',
    isIndexed: true,
    title: 'Verified Flats for Rent in Delhi NCR | Apartments & Builder Floors',
    description: 'Browse verified 1 BHK, 2 BHK, and 3 BHK flats for rent in Gurugram, South Delhi, Noida, and Ghaziabad. Filter by furnishing, location, and rent range with zero fake listings.',
    h1: 'Verified Flats & Apartments for Rent in Delhi NCR',
    introduction: 'Discover fully verified independent builder floors, gated high-rise society apartments, and compact flats. Connect directly with landlords or authorized regional brokers with complete transparency and zero upfront platform fees.',
    typeFilter: 'Flat',
    uniqueGuidance: 'Builder floors in Delhi are ideal for independent layouts with minimal maintenance fees, whereas high-rise apartments in Gurugram & Noida offer premium amenities like clubhouses, power backups, and gated safety towers.',
    faqContent: [
      { question: 'How do I bypass heavy brokerage charges?', answer: 'Look for the "Listed by Owner" tag on MyAngan. For broker listings, our partners are vetted to charge standard rates with no hidden fees.' },
      { question: 'What documents are required to sign a rental agreement in Delhi NCR?', answer: 'You will need an Aadhaar card or PAN card for identity verification, passport-size photographs, and employment proof or local reference.' }
    ],
    canonicalUrl: 'https://myangan.com/flats-for-rent',
    lastReviewed: '2026-07-21',
    relatedPages: ['1-bhk-for-rent', '2-bhk-for-rent', '3-bhk-for-rent', 'flats-without-brokerage', 'rentals/gurugram/flats'],
    status: 'published'
  },
  {
    slug: 'houses-for-rent',
    pageType: 'property-type',
    isIndexed: true,
    title: 'Independent Houses for Rent in Delhi NCR | Villas & Bungalows',
    description: 'Explore spacious independent houses and villas for rent across Delhi NCR. Perfect for families looking for generous room counts, private terraces, and local parking.',
    h1: 'Independent Houses & Villas for Rent in Delhi NCR',
    introduction: 'Find multi-bedroom residential bungalows, villas, and stand-alone houses. Filter by size, budget, and furnishing level to find the ideal family home with vetted land titles.',
    typeFilter: 'House',
    uniqueGuidance: 'Renting independent houses allows you custom access to terraces and private gardens. Verify municipal water connections and water pump installations before finalizing your lease.',
    faqContent: [
      { question: 'Are independent houses safe in Delhi NCR?', answer: 'Houses located inside gated residential sectors with dedicated neighborhood watch patrols offer the highest safety profiles.' }
    ],
    canonicalUrl: 'https://myangan.com/houses-for-rent',
    lastReviewed: '2026-07-21',
    relatedPages: ['flats-for-rent', 'owner-properties-for-rent'],
    status: 'published'
  },
  {
    slug: 'rooms-for-rent',
    pageType: 'property-type',
    isIndexed: true,
    title: 'Single Rooms for Rent in Delhi NCR | Budget-Friendly Rentals',
    description: 'Find affordable single rooms, studio apartments, and private suites for rent. Ideal for college students, single bachelors, and working professionals.',
    h1: 'Single Rooms and Studio Apartments for Rent in Delhi NCR',
    introduction: 'Looking for a budget-friendly private room or studio apartment? MyAngan lists checked, active rooms in cozy builder floors and co-living sectors without complex broker setups.',
    typeFilter: 'Room',
    uniqueGuidance: 'Single rooms are extremely popular in sectors near business complexes like Udyog Vihar or Noida Sector 62. Ensure checking if sub-meters for electricity are installed to avoid flat-rate power bills.',
    faqContent: [
      { question: 'Can I rent a single room with a short-term lease?', answer: 'Many independent rooms offer flexible lock-in periods of 3 to 6 months. Be sure to check the lease duration in the rental profile.' }
    ],
    canonicalUrl: 'https://myangan.com/rooms-for-rent',
    lastReviewed: '2026-07-21',
    relatedPages: ['pg-for-rent', 'find-a-roommate'],
    status: 'published'
  },

  // --- AUDIENCE & SPECIAL FEATURE PAGES ---
  {
    slug: 'owner-properties-for-rent',
    pageType: 'audience',
    isIndexed: true,
    title: 'Owner-Direct Rental Properties in Delhi NCR | Zero Brokerage',
    description: 'Search hundreds of flats, houses, and PGs listed directly by owners. Contact landlords directly on MyAngan to save on heavy brokerage charges.',
    h1: 'Owner-Listed Rental Properties in Delhi NCR',
    introduction: 'Bypass agents completely with our dedicated owner-only portal index. All owner properties go through rigorous phone verification to eliminate duplicate listings and broker proxies.',
    audienceFilter: 'owner',
    uniqueGuidance: 'When renting directly from an owner, insist on a written rent agreement registered at the local sub-registrar office to ensure legal safety for both parties.',
    faqContent: [
      { question: 'Do owner-listed properties have hidden platform charges?', answer: 'No. MyAngan is free for renters to discover and contact property owners directly.' }
    ],
    canonicalUrl: 'https://myangan.com/owner-properties-for-rent',
    lastReviewed: '2026-07-21',
    relatedPages: ['flats-for-rent', 'flats-without-brokerage'],
    status: 'published'
  },
  {
    slug: 'flats-without-brokerage',
    pageType: 'audience',
    isIndexed: true,
    title: 'Flats & PGs for Rent Without Brokerage in Delhi NCR',
    description: 'Find premium flats, builder floors, and paying guests for rent without brokerage fees. Contact verified owners directly on MyAngan today.',
    h1: 'Brokerage-Free Rental Homes in Delhi NCR',
    introduction: 'Save your hard-earned salary by connecting directly with owners or using zero-brokerage managed listings. Our platform focuses on eliminating artificial middle-man commission models.',
    audienceFilter: 'no-brokerage',
    uniqueGuidance: 'Save thousands on upfront brokerage fees! We verify that listings tagged as owner-listed are genuine, helping you secure a flat with only standard rent and deposit amounts.',
    faqContent: [
      { question: 'What is the average brokerage saved using MyAngan?', answer: 'Renters typically save between 15 days to 1 full month of rent by using our owner-direct portal.' }
    ],
    canonicalUrl: 'https://myangan.com/flats-without-brokerage',
    lastReviewed: '2026-07-21',
    relatedPages: ['owner-properties-for-rent', 'flats-for-rent'],
    status: 'published'
  },

  // --- ROOMMATE AND MATCHING PAGES (NOINDEX until matching feature is live) ---
  {
    slug: 'find-a-roommate',
    pageType: 'roommate',
    isIndexed: false, // Strict guideline: keep roommate matchmaking noindex until feature is fully rolled out.
    title: 'Find a Roommate in Delhi NCR | Roommate & Flatmate Matching',
    description: 'Join the waitlist for MyAngan roommate and flatmate finder. Match with vetted roommates based on budget, habits, profession, and compatibility in Delhi NCR.',
    h1: 'Roommate Finder & Flatmate Matching (Coming Soon)',
    introduction: 'Finding a compatible person to share a flat with is as important as the flat itself. MyAngan is building an AI-powered matching algorithm to connect renters with matching lifestyles.',
    uniqueGuidance: 'Our roommate matching service is currently in premium closed beta. Sign up for our Waitlist to receive matching suggestions in your preferred neighborhood once the module is live!',
    faqContent: [
      { question: 'Is roommate matchmaking safe?', answer: 'Yes. All participants must complete standard mobile and ID checks to protect our community against scams.' }
    ],
    canonicalUrl: 'https://myangan.com/find-a-roommate',
    lastReviewed: '2026-07-21',
    relatedPages: ['waitlist', 'rooms-for-rent'],
    status: 'published'
  },

  // --- LOCATION PAGES ---
  {
    slug: 'rentals/gurugram',
    pageType: 'location',
    isIndexed: true,
    title: 'Flats & PG for Rent in Gurugram | Verified Rentals',
    description: 'Find verified rental properties in Gurugram, Haryana. Rent builder floors, premium apartments, and PGs in DLF Phases, Sector 54, Sector 43, and Golf Course Extension.',
    h1: 'Rental Properties & Apartments for Rent in Gurugram',
    introduction: 'Gurugram is the premium IT & commercial core of Haryana, housing global business parks and rapid transit hubs. Discover vetted apartments and builder floors near your workplace with direct contact systems.',
    locationFilter: 'Gurugram',
    uniqueGuidance: 'Gurugram rental agreements typically require a 12-month tenure with a 1-month notice period. Electricity is metered by DHBVN. Premium high-rise flats on Golf Course Road generally offer high security and extensive amenities.',
    faqContent: [
      { question: 'What are the top residential areas in Gurugram for IT professionals?', answer: 'Sectors near Cyber City, Sector 43, Sector 54, Golf Course Road, and Sector 81 are highly popular due to proximity to corporate hubs and Rapid Metro connectivity.' }
    ],
    canonicalUrl: 'https://myangan.com/rentals/gurugram',
    lastReviewed: '2026-07-21',
    relatedPages: ['rentals/noida', 'rentals/delhi', 'pg-for-rent', 'flats-for-rent'],
    status: 'published'
  },
  {
    slug: 'rentals/noida',
    pageType: 'location',
    isIndexed: true,
    title: 'Flats & PG for Rent in Noida | Verified Gated Societies',
    description: 'Browse verified high-rise apartments and flats for rent in Noida sectors. Find rental homes in Sector 50, Sector 62, Sector 137, and nearby co-living hubs with gated security.',
    h1: 'Verified Gated Society Apartments & Flats for Rent in Noida',
    introduction: 'Noida is an exceptionally planned commercial powerhouse in Uttar Pradesh, bound by the Aqua Metro and the DND Flyway. Search secure society apartments with excellent parks and family infrastructure.',
    locationFilter: 'Noida',
    uniqueGuidance: 'Noida offers exceptionally affordable rental values compared to Delhi and Gurugram. High-rise societies here have centralized power backup systems and gated access control points.',
    faqContent: [
      { question: 'What is the standard security deposit in Noida?', answer: 'Landlords in Noida generally ask for a 2-month security deposit alongside the first month\'s advance rent.' }
    ],
    canonicalUrl: 'https://myangan.com/rentals/noida',
    lastReviewed: '2026-07-21',
    relatedPages: ['rentals/greater-noida', 'rentals/gurugram', 'flats-for-rent'],
    status: 'published'
  },
  {
    slug: 'rentals/ghaziabad',
    pageType: 'location',
    isIndexed: true,
    title: 'Flats for Rent in Ghaziabad | Verified Indirapuram & Vaishali',
    description: 'Find verified flats and apartments for rent in Indirapuram, Vaishali, and Vasundhara in Ghaziabad. Direct landlord listings with proximity to metro lines.',
    h1: 'Residential Houses & Flats for Rent in Ghaziabad',
    introduction: 'Ghaziabad is a critical gateway in western Uttar Pradesh, offering superb family neighborhoods. Connect directly with authentic local property listings and experience seamless family living.',
    locationFilter: 'Ghaziabad',
    uniqueGuidance: 'Sectors like Indirapuram and Vaishali offer outstanding high-rise societies. They are connected to East & Central Delhi via the Blue Line Metro, reducing daily transit times.',
    faqContent: [
      { question: 'Which are the most preferred societies in Indirapuram, Ghaziabad?', answer: 'Shipra Sun City, ATS Advantage, and Orange County are premium high-rise communities with standard resident access to clubs, parks, and convenience marts.' }
    ],
    canonicalUrl: 'https://myangan.com/rentals/ghaziabad',
    lastReviewed: '2026-07-21',
    relatedPages: ['rentals/noida', 'rentals/delhi'],
    status: 'published'
  },

  // --- COMPETITOR COMPARISON PAGES ---
  {
    slug: 'alternatives',
    pageType: 'comparison',
    isIndexed: true,
    title: 'Compare Property Platforms in Delhi NCR | MyAngan Alternatives',
    description: 'Review and compare MyAngan with traditional portals like NoBroker, Magicbricks, 99acres, and Housing.com. Discover our verification models and find direct listings.',
    h1: 'MyAngan vs Traditional Rental Portals: Fact-Based Comparison',
    introduction: 'Finding a home in Delhi NCR can be stressful. We analyzed the unique strengths, pricing models, and verification methods of top rental platforms to help you choose the best channel for your property search.',
    uniqueGuidance: 'Unlike legacy listing sites, MyAngan focuses strictly on Delhi NCR rentals. We manually audit phone numbers and title registries to keep duplicate and expired listings off your search feeds.',
    faqContent: [
      { question: 'Does MyAngan charge a monthly fee to search properties?', answer: 'No. Accessing the basic directory, filtering verified listings, and directly contacting landlords is entirely free for renters.' }
    ],
    canonicalUrl: 'https://myangan.com/alternatives',
    lastReviewed: '2026-07-21',
    relatedPages: ['alternatives/nobroker', 'alternatives/magicbricks', 'alternatives/99acres', 'alternatives/housing-com'],
    status: 'published'
  },
  {
    slug: 'alternatives/nobroker',
    pageType: 'comparison',
    isIndexed: true,
    title: 'MyAngan vs NoBroker: Rental Property Platform Comparison',
    description: 'Looking for a NoBroker alternative? Compare MyAngan and NoBroker for finding rental homes, flats, and PGs in Delhi NCR. Review verification, coverage, and listings.',
    h1: 'Looking for a NoBroker Alternative?',
    introduction: 'NoBroker and MyAngan both aim to eliminate middle-man brokerage fees. However, their geographic focus, listing management, and verification processes differ. Review the factual comparisons below to choose your ideal platform.',
    uniqueGuidance: 'While NoBroker operates across multiple major Indian cities, MyAngan focuses 100% of its resources on the Delhi NCR housing cluster. This hyper-local specialization allows us to audit localized builder floors and society guidelines with greater depth.',
    faqContent: [
      { question: 'How does MyAngan keep listing feeds active?', answer: 'We run weekly automated validation calls with landlords to ensure rented-out flats are instantly set to inactive, preventing user frustration.' }
    ],
    canonicalUrl: 'https://myangan.com/alternatives/nobroker',
    lastReviewed: '2026-07-21',
    relatedPages: ['alternatives/magicbricks', 'alternatives', 'owner-properties-for-rent'],
    sources: ['NoBroker Public Pricing and Features Information', 'MyAngan Core Internal Operations Register'],
    status: 'published'
  },
  {
    slug: 'alternatives/magicbricks',
    pageType: 'comparison',
    isIndexed: true,
    title: 'MyAngan vs Magicbricks: Rental Property Platform Comparison',
    description: 'Compare MyAngan and Magicbricks for finding rental homes, flats, and PGs in Delhi NCR. Review listing verification, contact methods, and search accuracy.',
    h1: 'Looking for a Magicbricks Alternative?',
    introduction: 'Magicbricks is one of India\'s largest legacy property portals, listing millions of commercial and residential buy/sell properties. MyAngan, by contrast, is a boutique, hyper-focused rental-only platform built specifically to protect Delhi NCR renters from bait-and-switch listings.',
    uniqueGuidance: 'Legacy portals often suffer from expired listings or duplicate broker leads uploaded to inflate inventory counts. MyAngan implements strict verification checkmarks, requiring actual phone confirmation before listings go live.',
    faqContent: [
      { question: 'Does MyAngan list commercial properties?', answer: 'No. MyAngan is strictly focused on residential rentals (flats, independent houses, PGs, and co-living spaces) in Delhi NCR.' }
    ],
    canonicalUrl: 'https://myangan.com/alternatives/magicbricks',
    lastReviewed: '2026-07-21',
    relatedPages: ['alternatives/99acres', 'alternatives'],
    sources: ['Magicbricks Corporate Profile and Services Overview', 'MyAngan Database Registry Standards'],
    status: 'published'
  },
  {
    slug: 'alternatives/99acres',
    pageType: 'comparison',
    isIndexed: true,
    title: 'MyAngan vs 99acres: Rental Property Platform Comparison',
    description: 'Compare MyAngan and 99acres for finding rental homes, flats, and PGs in Delhi NCR. Review interface usability, verified listings, and direct contact options.',
    h1: 'Looking for a 99acres Alternative?',
    introduction: '99acres is a pioneer in Indian online real estate, primarily dealing with developer sales and secondary resale markets. MyAngan offers an alternative, highly intuitive interface designed purely for modern renters who need direct, transparent landlord communication channels.',
    uniqueGuidance: 'Using 99acres is often complex due to ads and overlapping multi-broker listings. MyAngan provides a clean, distraction-free environment focused on fast load times, accurate maps, and mobile-friendly layouts.',
    faqContent: [
      { question: 'Is there a fee to post a rental on MyAngan?', answer: 'Standard listing is completely free for direct owners. We also offer premium boosts for landlords who want faster renter conversion.' }
    ],
    canonicalUrl: 'https://myangan.com/alternatives/99acres',
    lastReviewed: '2026-07-21',
    relatedPages: ['alternatives/housing-com', 'alternatives'],
    sources: ['99acres Corporate Info', 'MyAngan Direct Listings Audit Report'],
    status: 'published'
  },
  {
    slug: 'alternatives/housing-com',
    pageType: 'comparison',
    isIndexed: true,
    title: 'MyAngan vs Housing.com: Rental Property Platform Comparison',
    description: 'Compare MyAngan and Housing.com for finding rental homes, flats, and PGs in Delhi NCR. Compare user interface, verified ratings, and contact methods.',
    h1: 'Looking for a Housing.com Alternative?',
    introduction: 'Housing.com features clean layouts and mobile-first listing experiences. MyAngan offers a comparable aesthetic, but focuses deeply on eliminating duplicate broker lists and providing high-fidelity, verified local data specifically across Delhi NCR.',
    uniqueGuidance: 'Many high-rise societies on Housing.com contain identical rental posts uploaded by multiple agents. MyAngan resolves this by prioritizing single verified listing cards per actual flat unit, saving renters from repetitive cold calls.',
    faqContent: [
      { question: 'How does MyAngan handle map-based searches?', answer: 'We utilize interactive map systems to pinpoint the exact sector or block location, helping you analyze commutes before contacting landlords.' }
    ],
    canonicalUrl: 'https://myangan.com/alternatives/housing-com',
    lastReviewed: '2026-07-21',
    relatedPages: ['alternatives/nobroker', 'alternatives'],
    sources: ['Housing.com Service Guidelines', 'MyAngan Interface & Mapping Engine'],
    status: 'published'
  },

  // --- GUIDES ---
  {
    slug: 'guides/pg-vs-flat',
    pageType: 'guide',
    isIndexed: true,
    title: 'PG vs Flat: Which is Better in Delhi NCR? | Renting Guide',
    description: 'Struggling to choose between a Paying Guest (PG) and an independent flat in Delhi NCR? Read our comprehensive comparison of cost, privacy, and amenities.',
    h1: 'PG vs Independent Flat: The Ultimate Delhi NCR Renting Guide',
    introduction: 'Choosing between a PG and an independent flat is a major decision for college students and working professionals relocating to Gurugram, Delhi, or Noida. Each option has unique trade-offs in terms of cost, convenience, privacy, and community guidelines.',
    uniqueGuidance: 'PGs are usually double or triple-sharing, with fully managed meal plans, electricity bills, and laundry included in a single monthly bill. Flats, while offering absolute privacy, require managing separate utility connections, cooking arrangements, and furniture setup.',
    faqContent: [
      { question: 'Is a PG cheaper than renting a 1 BHK flat?', answer: 'Yes. A single bed in a sharing PG generally costs around ₹7,000 to ₹12,000 per month (inclusive of meals and Wi-Fi), whereas a standard 1 BHK flat starts at ₹14,000, excluding additional utility bills.' },
      { question: 'Can I have friends stay over in a PG?', answer: 'Most PGs in Delhi NCR have visitor curfews and do not allow overnight guests, whereas renting an independent flat gives you full legal autonomy over guests.' }
    ],
    canonicalUrl: 'https://myangan.com/guides/pg-vs-flat',
    lastReviewed: '2026-07-21',
    relatedPages: ['pg-for-rent', 'flats-for-rent'],
    status: 'published'
  }
];

// Safe storage accessor for browser and Node environments
const safeGetStorage = (key: string): string | null => {
  if (typeof localStorage !== 'undefined') {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  return null;
};

const safeSetStorage = (key: string, value: string): void => {
  if (typeof localStorage !== 'undefined') {
    try { localStorage.setItem(key, value); } catch {}
  }
};

// In-memory / LocalStorage manager for SEO pages
class SeoPageManager {
  private pages: SeoPage[] = [];

  constructor() {
    this.init();
  }

  private init() {
    try {
      const saved = safeGetStorage('myangan_seo_pages');
      if (saved && saved.trim()) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.pages = parsed;
          return;
        }
      }
      this.pages = [...DEFAULT_SEO_PAGES];
      safeSetStorage('myangan_seo_pages', JSON.stringify(this.pages));
    } catch {
      this.pages = [...DEFAULT_SEO_PAGES];
      safeSetStorage('myangan_seo_pages', JSON.stringify(this.pages));
    }
  }

  public getAll(): SeoPage[] {
    return this.pages;
  }

  public getBySlug(slug: string): SeoPage | undefined {
    // Normalise leading slash
    const cleanSlug = slug.startsWith('/') ? slug.substring(1) : slug;
    return this.pages.find(p => p.slug === cleanSlug);
  }

  public savePage(slug: string, data: Partial<SeoPage>): SeoPage {
    const cleanSlug = slug.startsWith('/') ? slug.substring(1) : slug;
    const index = this.pages.findIndex(p => p.slug === cleanSlug);

    let updatedPage: SeoPage;
    if (index > -1) {
      updatedPage = { ...this.pages[index], ...data, slug: cleanSlug };
      this.pages[index] = updatedPage;
    } else {
      updatedPage = {
        slug: cleanSlug,
        pageType: data.pageType || 'property-type',
        isIndexed: data.isIndexed !== undefined ? data.isIndexed : true,
        title: data.title || '',
        description: data.description || '',
        h1: data.h1 || '',
        introduction: data.introduction || '',
        uniqueGuidance: data.uniqueGuidance || '',
        faqContent: data.faqContent || [],
        canonicalUrl: data.canonicalUrl || `https://myangan.com/${cleanSlug}`,
        lastReviewed: data.lastReviewed || new Date().toISOString().split('T')[0],
        relatedPages: data.relatedPages || [],
        status: data.status || 'draft',
        ...data
      } as SeoPage;
      this.pages.push(updatedPage);
    }

    try {
      localStorage.setItem('myangan_seo_pages', JSON.stringify(this.pages));
    } catch (e) {
      console.error('Failed to save SEO Page to local storage:', e);
    }
    return updatedPage;
  }

  public resetToDefault() {
    this.pages = [...DEFAULT_SEO_PAGES];
    try {
      localStorage.setItem('myangan_seo_pages', JSON.stringify(this.pages));
    } catch (e) {
      console.error('Failed to reset SEO Pages:', e);
    }
  }

  // Calculate rent stats based on actual properties in the database
  public async getDynamicStats(page: SeoPage): Promise<{
    minRent: number;
    maxRent: number;
    avgRent: number;
    totalCount: number;
    filteredProperties: Property[];
  }> {
    const allProps = await dbService.getProperties();
    
    // Filter properties based on page constraints
    const filtered = allProps.filter(p => {
      if (p.status !== 'active') return false;

      // Location match
      if (page.locationFilter) {
        // e.g. "Gurugram" vs "gurugram"
        const matchesLocation = p.city.toLowerCase() === page.locationFilter.toLowerCase() ||
          (page.locationFilter === 'South Delhi' && p.city === 'South Delhi');
        if (!matchesLocation) return false;
      }

      // Property type match
      if (page.typeFilter) {
        const type = page.typeFilter.toLowerCase();
        const pTitle = p.title.toLowerCase();
        const pDesc = p.description.toLowerCase();
        
        if (type === 'pg') {
          const isPG = pTitle.includes('pg') || pDesc.includes('pg') || pTitle.includes('paying guest');
          if (!isPG) return false;
        } else if (type === 'flat') {
          const isFlat = pTitle.includes('flat') || pDesc.includes('flat') || pTitle.includes('apartment') || pTitle.includes('builder floor');
          if (!isFlat) return false;
        } else if (type === 'house') {
          const isHouse = pTitle.includes('house') || pDesc.includes('house') || pTitle.includes('villa') || pTitle.includes('bungalow');
          if (!isHouse) return false;
        } else if (type === 'room') {
          const isRoom = pTitle.includes('room') || pDesc.includes('room') || pTitle.includes('studio');
          if (!isRoom) return false;
        }
      }

      // Special audience filters
      if (page.audienceFilter) {
        const aud = page.audienceFilter.toLowerCase();
        const fullTxt = (p.title + ' ' + p.description).toLowerCase();
        if (aud === 'owner') {
          // If listed by individual owner (Rajesh Sharma is simulated owner)
          if (p.owner_id !== 'user-landlord-1') return false;
        } else if (aud === 'no-brokerage') {
          // Simulated non-broker
          if (p.owner_id === 'user-landlord-2') return false; // Landlord 2 is marked Sanjay Malik (Broker)
        }
      }

      return true;
    });

    if (filtered.length === 0) {
      // Return safe defaults computed from general listings to prevent hardcoding zero
      const activeProps = allProps.filter(p => p.status === 'active');
      const rents = activeProps.map(p => p.rent_amount);
      const total = rents.reduce((a, b) => a + b, 0);
      return {
        minRent: rents.length ? Math.min(...rents) : 8000,
        maxRent: rents.length ? Math.max(...rents) : 95000,
        avgRent: rents.length ? Math.round(total / rents.length) : 24000,
        totalCount: 0,
        filteredProperties: []
      };
    }

    const rents = filtered.map(p => p.rent_amount);
    const sum = rents.reduce((a, b) => a + b, 0);

    return {
      minRent: Math.min(...rents),
      maxRent: Math.max(...rents),
      avgRent: Math.round(sum / filtered.length),
      totalCount: filtered.length,
      filteredProperties: filtered
    };
  }
}

export const seoPageService = new SeoPageManager();
