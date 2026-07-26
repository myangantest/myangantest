/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Property, UserProfile } from '../../types';
import { dbService } from '../../lib/db';
import { ArrowLeft, CheckCircle2, Trash2, Plus, Search, BedDouble, Bath, MapPin, Sparkles, MessageSquare, Info } from 'lucide-react';

interface CompareViewProps {
  navigateTo: (route: string, params?: any) => void;
  currentUser: UserProfile | null;
  compareIds: string[];
  onRemoveFromCompare: (id: string) => void;
  onClearCompare: () => void;
}

export default function CompareView({
  navigateTo,
  currentUser,
  compareIds,
  onRemoveFromCompare,
  onClearCompare
}: CompareViewProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProperties = async () => {
      setLoading(true);
      try {
        if (compareIds.length === 0) {
          setProperties([]);
          return;
        }
        // Fetch all listings and filter the selected ones
        const all = await dbService.getProperties();
        const filtered = all.filter((p) => compareIds.includes(p.id));
        setProperties(filtered);
      } catch (err) {
        console.error('Error fetching properties for comparison:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [compareIds]);

  const formatRent = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getFurnishingLabel = (status: string) => {
    if (status === 'semi_furnished') return 'Semi Furnished';
    if (status === 'furnished') return 'Fully Furnished';
    return 'Unfurnished';
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-mono">Generating side-by-side property comparison...</p>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
          <Info className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">No Properties Selected</h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Browse our verified rental listings and select the properties you'd like to compare side-by-side using the Compare button on each card.
          </p>
        </div>
        <button
          onClick={() => navigateTo('properties')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
        >
          <Search className="w-4 h-4" />
          <span>Browse Property Listings</span>
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button and title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <button
            onClick={() => navigateTo('properties')}
            className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-orange-600 transition-colors cursor-pointer font-medium mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Property Listings</span>
          </button>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Compare Selected Properties
            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-mono">
              {properties.length} {properties.length === 1 ? 'Listing' : 'Listings'}
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Compare specifications, costs, sizes, furnishing status, and verify amenities side-by-side.
          </p>
        </div>

        <button
          onClick={onClearCompare}
          className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-xl transition-colors cursor-pointer self-start sm:self-center"
        >
          Clear Selection ({properties.length})
        </button>
      </div>

      {properties.length === 1 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 max-w-2xl text-amber-800 text-xs">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Pro Tip: </span>
            Add at least one more listing to compare. Click "+ Compare" on another property card from the listings page to see them side-by-side!
          </div>
        </div>
      )}

      {/* Main Side-by-Side Table Grid */}
      <div className="bg-white border border-slate-100 shadow-sm rounded-2xl overflow-hidden">
        {/* Responsive horizontal scroll wrapper */}
        <div className="overflow-x-auto">
          <table className="w-full table-fixed border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {/* Fixed Label Column */}
                <th className="w-64 p-5 text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
                  Specifications
                </th>

                {/* Property Columns */}
                {properties.map((p) => (
                  <th key={p.id} className="min-w-72 p-5 align-top relative border-l border-slate-100">
                    <button
                      onClick={() => onRemoveFromCompare(p.id)}
                      className="absolute top-4 right-4 p-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-full transition-colors cursor-pointer z-10"
                      title="Remove from Compare"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="space-y-4 pt-4">
                      <div className="aspect-video w-full rounded-xl overflow-hidden bg-slate-100 relative shadow-sm">
                        <img
                          src={p.image_urls[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=400&q=80'}
                          alt={p.title}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {p.is_featured && (
                          <div className="absolute top-2.5 left-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-md uppercase tracking-wider">
                            <Sparkles className="w-2.5 h-2.5" />
                            <span>Featured</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-500 font-mono">
                          {p.city}
                        </span>
                        <h3 className="font-display font-bold text-slate-900 text-sm line-clamp-2 hover:text-orange-500 transition-colors cursor-pointer" onClick={() => navigateTo('property-detail', { id: p.id })}>
                          {p.title}
                        </h3>
                      </div>
                    </div>
                  </th>
                ))}

                {/* Empty column slots to prompt user to add more */}
                {properties.length < 4 && Array.from({ length: 4 - properties.length }).map((_, idx) => (
                  <th key={`empty-slot-${idx}`} className="min-w-72 p-5 align-middle border-l border-slate-100 bg-slate-50/20 text-center h-full">
                    <div className="py-12 px-6 flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border border-dashed border-slate-200 rounded-full flex items-center justify-center text-slate-300">
                        <Plus className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-400">Empty Compare Slot</p>
                        <p className="text-[10px] text-slate-400">Add another listing to fill</p>
                      </div>
                      <button
                        onClick={() => navigateTo('properties')}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Add Listing
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {/* Rent Amount */}
              <tr>
                <td className="p-5 text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                  Monthly Rent
                </td>
                {properties.map((p) => (
                  <td key={p.id} className="p-5 border-l border-slate-100 font-display font-bold text-base text-slate-900">
                    {formatRent(p.rent_amount)} <span className="text-[10px] text-slate-400 font-sans font-normal">/ month</span>
                  </td>
                ))}
                {properties.length < 4 && Array.from({ length: 4 - properties.length }).map((_, idx) => (
                  <td key={`empty-rent-${idx}`} className="p-5 border-l border-slate-100 text-slate-300">—</td>
                ))}
              </tr>

              {/* Security Deposit */}
              <tr>
                <td className="p-5 text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                  Security Deposit
                </td>
                {properties.map((p) => (
                  <td key={p.id} className="p-5 border-l border-slate-100 text-xs font-medium text-slate-700">
                    {formatRent(p.deposit_amount)}
                  </td>
                ))}
                {properties.length < 4 && Array.from({ length: 4 - properties.length }).map((_, idx) => (
                  <td key={`empty-deposit-${idx}`} className="p-5 border-l border-slate-100 text-slate-300">—</td>
                ))}
              </tr>

              {/* BHK configuration */}
              <tr>
                <td className="p-5 text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                  BHK Size
                </td>
                {properties.map((p) => (
                  <td key={p.id} className="p-5 border-l border-slate-100 text-xs font-semibold text-slate-800 flex items-center gap-1.5 pt-5">
                    <BedDouble className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{p.bedrooms} BHK</span>
                  </td>
                ))}
                {properties.length < 4 && Array.from({ length: 4 - properties.length }).map((_, idx) => (
                  <td key={`empty-bhk-${idx}`} className="p-5 border-l border-slate-100 text-slate-300">—</td>
                ))}
              </tr>

              {/* Bathrooms */}
              <tr>
                <td className="p-5 text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                  Bathrooms
                </td>
                {properties.map((p) => (
                  <td key={p.id} className="p-5 border-l border-slate-100 text-xs font-medium text-slate-700 flex items-center gap-1.5 pt-5">
                    <Bath className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{p.bathrooms} {p.bathrooms > 1 ? 'Baths' : 'Bath'}</span>
                  </td>
                ))}
                {properties.length < 4 && Array.from({ length: 4 - properties.length }).map((_, idx) => (
                  <td key={`empty-bath-${idx}`} className="p-5 border-l border-slate-100 text-slate-300">—</td>
                ))}
              </tr>

              {/* Furnishing Status */}
              <tr>
                <td className="p-5 text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                  Furnishing Status
                </td>
                {properties.map((p) => (
                  <td key={p.id} className="p-5 border-l border-slate-100 text-xs font-medium text-slate-700">
                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded">
                      {getFurnishingLabel(p.furnishing_status)}
                    </span>
                  </td>
                ))}
                {properties.length < 4 && Array.from({ length: 4 - properties.length }).map((_, idx) => (
                  <td key={`empty-furnishing-${idx}`} className="p-5 border-l border-slate-100 text-slate-300">—</td>
                ))}
              </tr>

              {/* Location Locality */}
              <tr>
                <td className="p-5 text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                  Locality / Sector
                </td>
                {properties.map((p) => (
                  <td key={p.id} className="p-5 border-l border-slate-100 text-xs text-slate-700 align-top">
                    <div className="flex items-start gap-1">
                      <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-800">{p.locality}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-wide font-mono">{p.city}</p>
                      </div>
                    </div>
                  </td>
                ))}
                {properties.length < 4 && Array.from({ length: 4 - properties.length }).map((_, idx) => (
                  <td key={`empty-locality-${idx}`} className="p-5 border-l border-slate-100 text-slate-300">—</td>
                ))}
              </tr>

              {/* Verification Status */}
              <tr>
                <td className="p-5 text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                  Vetted Status
                </td>
                {properties.map((p) => (
                  <td key={p.id} className="p-5 border-l border-slate-100 text-xs">
                    {p.is_verified ? (
                      <span className="inline-flex items-center gap-1 bg-[#0F1F3D] text-white text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3 text-orange-500" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Pending Verification</span>
                    )}
                  </td>
                ))}
                {properties.length < 4 && Array.from({ length: 4 - properties.length }).map((_, idx) => (
                  <td key={`empty-vetted-${idx}`} className="p-5 border-l border-slate-100 text-slate-300">—</td>
                ))}
              </tr>

              {/* Description summary */}
              <tr>
                <td className="p-5 text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                  Overview / Details
                </td>
                {properties.map((p) => (
                  <td key={p.id} className="p-5 border-l border-slate-100 text-xs text-slate-500 line-clamp-4 overflow-hidden align-top leading-relaxed h-full">
                    {p.description}
                  </td>
                ))}
                {properties.length < 4 && Array.from({ length: 4 - properties.length }).map((_, idx) => (
                  <td key={`empty-desc-${idx}`} className="p-5 border-l border-slate-100 text-slate-300">—</td>
                ))}
              </tr>

              {/* Action column */}
              <tr>
                <td className="p-5 text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
                  Actions
                </td>
                {properties.map((p) => (
                  <td key={p.id} className="p-5 border-l border-slate-100 align-middle">
                    <div className="space-y-2">
                      <button
                        onClick={() => navigateTo('property-detail', { id: p.id })}
                        className="w-full py-2 bg-[#0F1F3D] hover:bg-[#1b2f54] text-white font-semibold text-xs rounded-xl shadow-sm transition-colors cursor-pointer text-center block"
                      >
                        View Full Details
                      </button>
                      <button
                        onClick={() => onRemoveFromCompare(p.id)}
                        className="w-full py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-[10px] rounded-lg transition-colors cursor-pointer text-center block"
                      >
                        Remove Listing
                      </button>
                    </div>
                  </td>
                ))}
                {properties.length < 4 && Array.from({ length: 4 - properties.length }).map((_, idx) => (
                  <td key={`empty-action-${idx}`} className="p-5 border-l border-slate-100 text-slate-300">—</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
