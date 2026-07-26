/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Property, UserProfile } from '../../types';
import { dbService } from '../../lib/db';
import PropertyCard from '../PropertyCard';
import { Search, MapPin, ShieldCheck, ArrowRight, Home, Users, CheckCircle, Smartphone } from 'lucide-react';

interface LandingViewProps {
  navigateTo: (route: string, params?: any) => void;
  currentUser: UserProfile | null;
  compareIds?: string[];
  onCompareToggle?: (id: string) => void;
}

export default function LandingView({ navigateTo, currentUser, compareIds = [], onCompareToggle }: LandingViewProps) {
  const [searchCity, setSearchCity] = useState<'Gurugram' | 'South Delhi' | ''>('');
  const [searchLocality, setSearchLocality] = useState('');
  const [searchBhk, setSearchBhk] = useState<number | ''>('');
  const [searchBudget, setSearchBudget] = useState<number | ''>('');
  const [featured, setFeatured] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Scroll to top
    window.scrollTo({ top: 0 });
    
    // Fetch only verified properties to feature on landing
    dbService.getProperties().then((all) => {
      const verifiedOnly = all.filter(p => p.is_verified).slice(0, 3);
      setFeatured(verifiedOnly.length > 0 ? verifiedOnly : all.slice(0, 3));
      setLoading(false);
    });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigateTo('properties', {
      city: searchCity,
      locality: searchLocality,
      bhk: searchBhk,
      maxBudget: searchBudget
    });
  };

  return (
    <div className="space-y-16 pb-16">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-b from-slate-100 via-slate-50 to-white text-slate-900 py-24 lg:py-32 px-4 overflow-hidden border-b border-slate-200/50">
        {/* Background Accent Grid */}
        <div className="absolute inset-0 opacity-15 bg-[linear-gradient(to_right,rgba(148,163,184,0.15)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.15)_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        
        {/* Decorative Golden Circle */}
        <div className="absolute top-[28%] left-[55%] -translate-x-1/2 w-[480px] h-[480px] bg-amber-500/[0.05] rounded-full border border-amber-500/[0.02] pointer-events-none z-0"></div>

        <div className="max-w-7xl mx-auto text-center relative z-10 space-y-8">
          <div className="space-y-4 max-w-3xl mx-auto">
            <span className="text-amber-600 font-mono text-xs uppercase tracking-widest font-semibold bg-amber-500/10 px-4 py-1.5 rounded-full border border-amber-500/20 inline-block">
              DELHI NCR'S PREMIUM RENTAL PORTAL
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6.5xl font-display font-bold tracking-tight leading-tight text-slate-900">
              Find Homes and Flats for Rent Across Delhi NCR
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
              MyAngan helps people discover rental properties across Gurugram, Delhi, Noida, Greater Noida, Ghaziabad, Faridabad and nearby NCR areas. Connect directly with landlords and verified local brokers to find your ideal home without hidden fees.
            </p>
          </div>

          {/* Search Form Card */}
          <form
            onSubmit={handleSearch}
            className="max-w-4xl mx-auto bg-white text-slate-800 p-5 sm:p-6 rounded-3xl shadow-[0_15px_30px_rgba(0,0,0,0.05)] border border-slate-200/80 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end text-left"
          >
            {/* City */}
            <div className="space-y-1.5 w-full">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">CITY</label>
              <div className="relative">
                <select
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value as any)}
                  className="w-full pl-4 pr-10 py-3.5 bg-slate-50/80 border border-slate-200/50 rounded-xl text-sm text-slate-800 font-medium focus:outline-none focus:border-amber-500 focus:bg-white transition-all appearance-none cursor-pointer shadow-sm"
                >
                  <option value="">Any City</option>
                  <option value="Gurugram">Gurugram</option>
                  <option value="South Delhi">South Delhi</option>
                </select>
                <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Locality */}
            <div className="space-y-1.5 w-full">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">LOCALITY</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. DLF Phase 3"
                  value={searchLocality}
                  onChange={(e) => setSearchLocality(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200/50 rounded-xl text-sm placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white transition-all shadow-sm"
                />
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* BHK / Bedrooms */}
            <div className="space-y-1.5 w-full">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">BHK SIZE</label>
              <div className="relative">
                <select
                  value={searchBhk}
                  onChange={(e) => setSearchBhk(e.target.value ? Number(e.target.value) : '')}
                  className="w-full pl-4 pr-10 py-3.5 bg-slate-50/80 border border-slate-200/50 rounded-xl text-sm text-slate-800 font-medium focus:outline-none focus:border-amber-500 focus:bg-white transition-all appearance-none cursor-pointer shadow-sm"
                >
                  <option value="">Any BHK</option>
                  <option value="1">1 BHK</option>
                  <option value="2">2 BHK</option>
                  <option value="3">3 BHK</option>
                  <option value="4">4 BHK</option>
                </select>
                <ChevronDownIcon className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Search Button */}
            <div className="w-full">
              <button
                type="submit"
                className="w-full h-[50px] bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10 hover:shadow-xl hover:shadow-amber-500/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                <Search className="w-4 h-4" />
                <span>Search Homes</span>
              </button>
            </div>
          </form>

          {/* Quick Stats */}
          <div className="flex flex-wrap justify-center gap-8 text-xs font-mono text-slate-500 pt-4">
            <span className="flex items-center gap-1.5 font-semibold"><ShieldCheck className="w-4 h-4 text-amber-600" /> 100% Verified Listings</span>
            <span className="flex items-center gap-1.5 font-semibold"><ShieldCheck className="w-4 h-4 text-amber-600" /> Zero Fake Leads</span>
            <span className="flex items-center gap-1.5 font-semibold"><ShieldCheck className="w-4 h-4 text-amber-600" /> Real-time WhatsApp Inquiries</span>
          </div>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8">
          <div>
            <span className="text-orange-500 font-mono text-xs uppercase tracking-wider font-semibold block mb-1">
              EXCLUSIVE VERIFIED LISTINGS
            </span>
            <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">
              Featured Properties in Gurugram & South Delhi
            </h2>
          </div>
          <button
            onClick={() => navigateTo('properties')}
            className="text-orange-600 hover:text-orange-700 font-semibold text-sm flex items-center gap-1 group transition-colors mt-2 sm:mt-0 cursor-pointer"
          >
            <span>View all listings</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-xl h-96 border border-slate-100 animate-pulse flex flex-col p-4 space-y-4">
                <div className="w-full h-48 bg-slate-200 rounded-lg" />
                <div className="h-6 bg-slate-200 rounded w-1/2" />
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-200 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featured.map((p) => (
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
        )}
      </section>

      {/* How it Works Section */}
      <section className="bg-slate-50 border-y border-slate-100 py-16 px-4">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-orange-500 font-mono text-xs uppercase tracking-wider font-semibold block">
              TRANSPARENT PROCESS
            </span>
            <h2 className="text-3xl font-display font-bold text-slate-900 tracking-tight">
              Streamlining Renting in Delhi NCR
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              We eliminate complex brokerage hierarchies. Renters connect directly with verified property owners and certified local brokers.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {/* Step 1 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-lg">
                1
              </div>
              <h3 className="font-display font-bold text-slate-800 text-lg">Explore Handpicked Homes</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Filter premium verified options across prominent South Delhi sectors & major Gurugram gated communities. No duplicate dummy postings.
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-lg">
                2
              </div>
              <h3 className="font-display font-bold text-slate-800 text-lg">Submit Verified Inquiry</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter your details to generate a secure lead record. Only the property’s direct owner sees your profile — preventing spam calls.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4 flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold text-lg">
                3
              </div>
              <h3 className="font-display font-bold text-slate-800 text-lg">Direct WhatsApp Call</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Instantly trigger a structured pre-filled chat link to standard WhatsApp. Discuss rental terms directly with the owner without an intermediary.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action to Post */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-orange-500/[0.04] rounded-3xl text-slate-800 p-8 md:p-12 shadow-xs border border-orange-200/50 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500 rounded-full blur-[100px] opacity-10"></div>
          
          <div className="space-y-4 max-w-xl text-center md:text-left">
            <h3 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-slate-900">
              Are you a Landlord or Broker in Delhi NCR?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              List your properties in premium localities, receive verified renter lead logs, and communicate directly. Free listing during our launch phase.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => {
                if (currentUser && currentUser.role === 'landlord_broker') {
                  navigateTo('post-property');
                } else {
                  navigateTo('auth', { targetRole: 'landlord_broker' });
                }
              }}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm rounded-xl text-center transition-colors shadow-md cursor-pointer"
            >
              List Property Free
            </button>
            <button
              onClick={() => navigateTo('waitlist')}
              className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-medium text-sm rounded-xl text-center transition-colors cursor-pointer"
            >
              Join Waitlist
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// Small Icon Helper Component
function ChevronDownIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
