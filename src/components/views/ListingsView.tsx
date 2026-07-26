/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Property, UserProfile } from '../../types';
import { dbService } from '../../lib/db';
import PropertyCard from '../PropertyCard';
import { SlidersHorizontal, MapPin, Search, Grid, X, ChevronRight, Info } from 'lucide-react';

interface ListingsViewProps {
  navigateTo: (route: string, params?: any) => void;
  currentUser: UserProfile | null;
  initialFilters?: {
    city?: string;
    locality?: string;
    bhk?: number | '';
    maxBudget?: number | '';
  };
  compareIds?: string[];
  onCompareToggle?: (id: string) => void;
}

export default function ListingsView({
  navigateTo,
  currentUser,
  initialFilters,
  compareIds = [],
  onCompareToggle
}: ListingsViewProps) {
  // Filters State
  const [city, setCity] = useState<string>(
    initialFilters?.city || ''
  );
  const [locality, setLocality] = useState(initialFilters?.locality || '');
  const [bhk, setBhk] = useState<number | ''>(initialFilters?.bhk || '');
  const [furnishing, setFurnishing] = useState<string>('all');
  const [minBudget, setMinBudget] = useState<number | ''>('');
  const [maxBudget, setMaxBudget] = useState<number | ''>(initialFilters?.maxBudget || '');

  // Properties list State
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  const fetchFilteredData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dbService.getProperties({
        city,
        locality,
        minBudget: minBudget || undefined,
        maxBudget: maxBudget || undefined,
        bhk: bhk || undefined,
        furnishing: furnishing !== 'all' ? furnishing : undefined
      });
      setProperties(data);
      setCurrentPage(1); // reset to page 1 on filter
    } catch (err: any) {
      console.error(err);
      setError('Failed to load listings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Run fetch when filters change
  useEffect(() => {
    fetchFilteredData();
  }, [city, bhk, furnishing]); // Trigger immediate fetch on these selection changes

  // Form submit handler for text inputs (locality, min/max budget)
  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFilteredData();
  };

  const handleClearFilters = () => {
    setCity('');
    setLocality('');
    setBhk('');
    setFurnishing('all');
    setMinBudget('');
    setMaxBudget('');
    setCurrentPage(1);
    // Trigger immediate reloading after clear
    setTimeout(() => {
      dbService.getProperties().then(setProperties).catch(console.error);
    }, 50);
  };

  // Pagination Calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = properties.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(properties.length / itemsPerPage);

  // City descriptions and local SEO guides to prevent "thin content"
  const cityInfoMap: Record<string, { title: string; intro: string; guide: string; societies: string[] }> = {
    'gurugram': {
      title: 'Flats & Apartments for Rent in Gurugram',
      intro: 'Discover premium, verified builder floors, apartments, and penthouses for rent in Gurugram. Direct owner & broker listings with zero fake lead listings.',
      guide: 'Gurugram (formerly Gurgaon) is the leading commercial hub of Haryana. Connected by the Delhi Metro and Rapid Metro, key residential areas include DLF Phase 1-5, Sector 54, Sector 43, and Golf Course Extension. It offers a premium lifestyle perfect for corporate professionals and families.',
      societies: ['DLF Park Place', 'Ireo Skyon', 'M3M Golfestate', 'Central Park II']
    },
    'south delhi': {
      title: 'Verified Homes & Flats for Rent in South Delhi',
      intro: 'Explore luxury builder floors, verified flats, and independent homes for rent in the most prestigious residential sectors of South Delhi.',
      guide: 'South Delhi is renowned for its lush greenery, wide roads, and elite neighborhoods. Major residential pockets like Vasant Kunj, Saket, Greater Kailash (I & II), and Hauz Khas offer rich cultural heritage, proximity to top universities, and superb connectivity via the Yellow and Magenta Metro lines.',
      societies: ['DLF Multi-Storey Apartments', 'Vasant Kunj Sectors', 'Saket Residential Enclave', 'GK Builder Floors']
    },
    'noida': {
      title: 'Apartments & Flats for Rent in Noida',
      intro: 'Browse verified high-rise apartments and flats for rent in Noida. Top-tier residential complexes with gated security and world-class amenities.',
      guide: 'Noida (New Okhla Industrial Development Authority) is a well-planned city in Uttar Pradesh. Boasting excellent connectivity via the Aqua Line and DND Flyway, key sectors like Sector 15, Sector 50, Sector 62, and Sector 137 are highly popular for budget-friendly as well as luxury gated societies.',
      societies: ['ATS One Hamlet', 'Supertech Capetown', 'Amrapali Zodiac', 'Cleo County']
    },
    'greater noida': {
      title: 'Gated Society Apartments for Rent in Greater Noida',
      intro: 'Find spacious, affordable builder floors, villas, and apartments for rent in Greater Noida with verified listings and direct owner connections.',
      guide: 'Greater Noida is a modern extension of Noida, featuring ultra-wide sectors, educational hubs (Knowledge Park), and excellent road infrastructure like the Yamuna Expressway. Gated communities near Pari Chowk and Sector 150 offer peaceful living with high security and excellent green cover.',
      societies: ['Omaxe Palm Greens', 'Eldeco Green Meadows', 'Purvanchal Royal City', 'Godrej Golf Links']
    },
    'ghaziabad': {
      title: 'Residential Flats for Rent in Ghaziabad',
      intro: 'Search premium verified flats for rent in Ghaziabad. High-density residential pockets with excellent family amenities and direct Delhi connectivity.',
      guide: 'Ghaziabad is a major residential hub in western Uttar Pradesh. Top premium neighborhoods like Indirapuram, Vaishali, and Vasundhara feature excellent high-rise societies, rapid connectivity to East Delhi via the Blue Line Metro, and self-sufficient local retail markets.',
      societies: ['Shipra Sun City', 'ATS Advantage', 'Amrapali Royal', 'Mahagun Mansion']
    },
    'faridabad': {
      title: 'Verified Homes & Flats for Rent in Faridabad',
      intro: 'Find affordable and premium residential apartments for rent in Faridabad. Quick metro connectivity to Delhi and Gurugram.',
      guide: 'Faridabad is the largest industrial city in Haryana. Residential sectors such as Sector 15, Sector 21, and the developing Neharpar area (Greater Faridabad) offer outstanding gated societies, highly affordable pricing, and rapid transit via the Violet Metro line directly into Central Delhi.',
      societies: ['Puri Pranayam', 'Omaxe Heights', 'RPS Savana', 'BPTP Park Grandsura']
    }
  };

  const activeCityKey = city ? city.toLowerCase() : '';
  const citySEO = cityInfoMap[activeCityKey] || {
    title: 'Rental Properties in Delhi NCR',
    intro: 'Showing handpicked homes in premium neighborhoods of Gurugram, South Delhi, Noida, and surrounding areas. Start your verified rental search today.',
    guide: 'Delhi National Capital Region (NCR) comprises several major cities offering diverse rental opportunities. From independent builder floors in South Delhi to modern, high-rise luxury apartments in Gurugram and Noida, MyAngan provides direct, transparent access to fully verified, high-quality listings.',
    societies: []
  };

  const allNCRCities = [
    { name: 'Gurugram', url: '/rentals/gurugram' },
    { name: 'Delhi', url: '/rentals/delhi' },
    { name: 'Noida', url: '/rentals/noida' },
    { name: 'Greater Noida', url: '/rentals/greater-noida' },
    { name: 'Ghaziabad', url: '/rentals/ghaziabad' },
    { name: 'Faridabad', url: '/rentals/faridabad' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* SEO Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Link to="/" className="hover:text-orange-600 transition-colors">Home</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        {city ? (
          <>
            <Link to="/properties" className="hover:text-orange-600 transition-colors">Rentals</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-800 font-semibold">{city === 'South Delhi' ? 'Delhi' : city}</span>
          </>
        ) : (
          <span className="text-slate-800 font-semibold">Rentals</span>
        )}
      </nav>

      {/* Page Header */}
      <div className="border-b border-slate-100 pb-6 space-y-3">
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight" id="listings-h1">
          {citySEO.title}
        </h1>
        <p className="text-sm text-slate-600 max-w-4xl leading-relaxed">
          {citySEO.intro}
        </p>

        {/* Crawlable Local Quick Links Bar */}
        <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Browse Hubs:</span>
          {allNCRCities.map((item) => (
            <Link
              key={item.url}
              to={item.url}
              onClick={() => {
                const targetCity = item.name === 'Delhi' ? 'South Delhi' : item.name;
                setCity(targetCity);
              }}
              className={`px-2.5 py-1 rounded-full border transition-all ${
                (city === 'South Delhi' && item.name === 'Delhi') || (city === item.name)
                  ? 'bg-orange-500 border-orange-500 text-white font-semibold'
                  : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              {item.name}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        {/* Filters Sidebar Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-6 lg:sticky lg:top-20 z-20">
          <div className="flex items-center justify-between border-b border-slate-50 pb-3">
            <span className="font-display font-bold text-slate-800 text-sm flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-orange-500" />
              Filter Listings
            </span>
            <button
              onClick={handleClearFilters}
              className="text-[11px] font-mono text-orange-600 hover:underline cursor-pointer"
            >
              Reset All
            </button>
          </div>

          <form onSubmit={handleApplyFilters} className="space-y-4">
            {/* City Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">City</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="">All Cities</option>
                <option value="Gurugram">Gurugram</option>
                <option value="South Delhi">South Delhi</option>
                <option value="Noida">Noida</option>
                <option value="Greater Noida">Greater Noida</option>
                <option value="Ghaziabad">Ghaziabad</option>
                <option value="Faridabad">Faridabad</option>
              </select>
            </div>

            {/* Locality Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Locality Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Vasant Kunj"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                />
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            {/* BHK Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">BHK Size</label>
              <select
                value={bhk}
                onChange={(e) => setBhk(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="">Any BHK</option>
                <option value="1">1 BHK</option>
                <option value="2">2 BHK</option>
                <option value="3">3 BHK</option>
                <option value="4">4 BHK</option>
              </select>
            </div>

            {/* Furnishing */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Furnishing</label>
              <select
                value={furnishing}
                onChange={(e) => setFurnishing(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="all">Any Furnishing</option>
                <option value="unfurnished">Unfurnished</option>
                <option value="semi_furnished">Semi Furnished</option>
                <option value="furnished">Fully Furnished</option>
              </select>
            </div>

            {/* Budget Range Inputs */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Monthly Budget (INR)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  value={minBudget}
                  onChange={(e) => setMinBudget(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                />
                <input
                  type="number"
                  placeholder="Max"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Apply Button */}
            <button
              type="submit"
              className="w-full py-2 bg-[#0F1F3D] hover:bg-[#1b2f54] text-white font-semibold text-xs rounded-lg shadow-sm transition-colors cursor-pointer mt-2"
            >
              Apply Filter
            </button>
          </form>
        </div>

        {/* Listings Grid */}
        <div className="lg:col-span-3 space-y-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-4 rounded-xl">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm flex flex-col h-full animate-pulse">
                  {/* Top Image area */}
                  <div className="relative aspect-video w-full bg-slate-200 shrink-0">
                    <div className="absolute top-3 left-3 bg-slate-300 h-7 w-28 rounded-md" />
                    <div className="absolute bottom-3 left-3 bg-slate-300 h-5 w-20 rounded" />
                    <div className="absolute top-3 right-3 bg-slate-300 rounded-full w-8 h-8" />
                  </div>
                  {/* Details section */}
                  <div className="p-5 flex flex-col justify-between flex-grow space-y-4">
                    <div className="space-y-3">
                      <div className="h-6 bg-slate-300 rounded w-5/12" />
                      <div className="h-5 bg-slate-300 rounded w-11/12" />
                      <div className="flex gap-2 items-center">
                        <div className="w-3.5 h-3.5 bg-slate-300 rounded-full shrink-0" />
                        <div className="h-3 bg-slate-300 rounded w-8/12" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4 pt-4 border-t border-slate-100">
                      <div className="h-4 bg-slate-300 rounded w-16" />
                      <div className="h-4 bg-slate-300 rounded w-16" />
                      <div className="ml-auto h-4 bg-slate-300 rounded w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : properties.length === 0 ? (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-bold text-slate-800 text-base">No properties match your filters</h3>
                <p className="text-xs text-slate-500">
                  Try widening your budget range, clearing the locality search, or looking for semi-furnished flats.
                </p>
              </div>
              <button
                onClick={handleClearFilters}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <>
              {/* Properties Count */}
              <div className="flex items-center justify-between text-xs text-slate-500 font-mono bg-slate-50 p-3 rounded-lg border border-slate-100">
                <span className="flex items-center gap-1">
                  <Grid className="w-3.5 h-3.5 text-slate-400" />
                  Found {properties.length} Active Listings
                </span>
                <span>Page {currentPage} of {totalPages || 1}</span>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {currentItems.map((p) => (
                  <PropertyCard
                    key={p.id}
                    property={p}
                    currentUserId={currentUser?.id}
                    onCardClick={() => navigateTo('property-detail', { id: p.id })}
                    isComparing={compareIds.includes(p.id)}
                    onCompareToggle={onCompareToggle ? () => onCompareToggle(p.id) : undefined}
                  />
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                    <button
                      key={pNum}
                      onClick={() => setCurrentPage(pNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        pNum === currentPage
                          ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/20'
                          : 'border border-slate-200 hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {pNum}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-medium hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* City-Specific Local Guide Section to prevent "thin content" and boost SEO rankings */}
      <div className="mt-12 bg-slate-50 rounded-2xl border border-slate-100 p-6 md:p-8 space-y-6">
        <div className="flex items-start gap-3">
          <div className="p-2.5 bg-orange-100 text-orange-600 rounded-xl mt-0.5">
            <Info className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-display font-bold text-slate-900">
              {city ? `${city} Rental Guide & Local Market Insights` : 'Delhi NCR Rental Housing Guide'}
            </h2>
            <p className="text-xs text-slate-500 font-mono">Expert localized overview of key sectors, societies & transit hubs</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {/* Market Overview */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono text-[11px]">Local Overview</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {citySEO.guide}
            </p>
          </div>

          {/* Premium Gated Societies */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono text-[11px]">Popular Societies</h3>
            {citySEO.societies.length > 0 ? (
              <ul className="text-sm text-slate-600 space-y-1.5">
                {citySEO.societies.map((soc, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span>
                    <span>{soc}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-600 leading-relaxed">
                Popular premium societies span DLF Phase 1-5, Cyber City, and Sector 54 in Gurugram, alongside premium builder floors and private colonies in Vasant Kunj, GK, and Saket in Delhi.
              </p>
            )}
          </div>

          {/* Rent & Living Standards */}
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono text-[11px]">Why Rent with MyAngan?</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              MyAngan guarantees 100% verified, active listing profiles. Renters connect directly with authorized landlords and vetted local brokers, saving time, avoiding bait-and-switch listings, and reducing unnecessary brokerage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
