/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Property, UserProfile } from '../../types';
import { dbService } from '../../lib/db';
import PropertyCard from '../PropertyCard';
import { Heart, Search } from 'lucide-react';

interface FavoritesViewProps {
  navigateTo: (route: string, params?: any) => void;
  currentUser: UserProfile | null;
  compareIds?: string[];
  onCompareToggle?: (id: string) => void;
}

export default function FavoritesView({
  navigateTo,
  currentUser,
  compareIds = [],
  onCompareToggle
}: FavoritesViewProps) {
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const data = await dbService.getFavorites(currentUser.id);
      setFavorites(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (!currentUser) {
      navigateTo('auth');
      return;
    }
    fetchFavorites();
  }, [currentUser]);

  if (!currentUser) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Heart className="w-8 h-8 text-red-500 fill-current" />
          My Saved Properties
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review and contact the landlords of your favorite properties in South Delhi and Gurugram.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono">Loading saved listings...</p>
        </div>
      ) : favorites.length === 0 ? (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-300 mx-auto">
            <Heart className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display font-bold text-slate-800 text-sm">No properties saved yet</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Browse our catalog of verified builder floors and penthouses in DLF Phase 3, Golf Course Road, Saket, and Vasant Kunj.
            </p>
          </div>
          <button
            onClick={() => navigateTo('properties')}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            Find Properties
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {favorites.map((p) => (
            <PropertyCard
              key={p.id}
              property={p}
              currentUserId={currentUser.id}
              onCardClick={() => navigateTo('property-detail', { id: p.id })}
              onFavoriteToggle={fetchFavorites} // Refresh list immediately if untoggled!
              isComparing={compareIds.includes(p.id)}
              onCompareToggle={onCompareToggle ? () => onCompareToggle(p.id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
