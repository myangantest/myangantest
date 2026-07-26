/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Property } from '../types';
import { Heart, CheckCircle2, BedDouble, Bath, MapPin, Sparkles, ArrowLeftRight, Check } from 'lucide-react';
import { dbService } from '../lib/db';

interface PropertyCardProps {
  property: Property;
  onCardClick: () => void;
  currentUserId?: string;
  onFavoriteToggle?: () => void;
  isComparing?: boolean;
  onCompareToggle?: () => void;
  key?: any;
}

export default function PropertyCard({
  property,
  onCardClick,
  currentUserId,
  onFavoriteToggle,
  isComparing = false,
  onCompareToggle
}: PropertyCardProps) {
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUserId) {
      setIsFav(false);
      return;
    }
    dbService.isFavorite(currentUserId, property.id).then(setIsFav);
  }, [currentUserId, property.id]);

  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!currentUserId) {
      alert('Please sign in to save properties to your favorites.');
      return;
    }

    setLoading(true);
    try {
      const updated = await dbService.toggleFavorite(currentUserId, property.id);
      setIsFav(updated);
      if (onFavoriteToggle) {
        onFavoriteToggle();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div
      onClick={onCardClick}
      className="group bg-white rounded-xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300 cursor-pointer flex flex-col h-full relative"
    >
      {/* Property Image & Badges */}
      <div className="relative aspect-video w-full overflow-hidden bg-slate-100 shrink-0">
        <img
          src={property.image_urls[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=600&q=80'}
          alt={property.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          referrerPolicy="no-referrer"
        />
        
        {/* Badges Stack */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {property.is_featured && (
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-extrabold px-2 py-1 rounded-md flex items-center gap-1 shadow-md uppercase tracking-wider animate-pulse">
              <Sparkles className="w-3 h-3 text-white fill-white/20" />
              <span>Featured</span>
            </div>
          )}
          {property.is_verified && (
            <div className="bg-[#0F1F3D]/95 text-white text-[9px] font-extrabold px-2 py-1 rounded-md flex items-center gap-1 shadow-sm uppercase tracking-wider backdrop-blur-sm">
              <CheckCircle2 className="w-3 h-3 text-orange-500 fill-orange-500/10" />
              <span>Verified</span>
            </div>
          )}
        </div>

        {/* Furnishing Status */}
        <div className="absolute bottom-3 left-3 bg-white/90 text-slate-800 text-[10px] font-medium px-2 py-1 rounded shadow-sm backdrop-blur-sm">
          {getFurnishingLabel(property.furnishing_status)}
        </div>

        {/* Compare Toggle Button */}
        {onCompareToggle && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCompareToggle();
            }}
            className={`absolute top-3 right-14 p-2 rounded-full border shadow transition-all duration-300 backdrop-blur-sm cursor-pointer ${
              isComparing
                ? 'bg-black border-black text-white hover:bg-slate-800 scale-110'
                : 'bg-white/80 border-white text-slate-600 hover:text-black hover:bg-white hover:scale-110'
            }`}
            title={isComparing ? 'Remove from Comparison' : 'Add to Comparison'}
          >
            {isComparing ? (
              <Check className="w-4 h-4 stroke-[3]" />
            ) : (
              <ArrowLeftRight className="w-4 h-4" />
            )}
          </button>
        )}

        {/* Favorite Heart Button */}
        <button
          onClick={handleFavorite}
          disabled={loading}
          className={`absolute top-3 right-3 p-2 rounded-full border shadow transition-all duration-300 backdrop-blur-sm cursor-pointer ${
            isFav
              ? 'bg-red-500 border-red-500 text-white hover:bg-red-600 scale-110'
              : 'bg-white/80 border-white text-slate-600 hover:text-red-500 hover:bg-white hover:scale-110'
          }`}
          title={isFav ? 'Remove from Favorites' : 'Save to Favorites'}
        >
          <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Property Details */}
      <div className="p-5 flex flex-col justify-between flex-grow">
        <div className="space-y-2">
          {/* Rent & Deposit */}
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold font-display text-slate-900">
              {formatRent(property.rent_amount)}
              <span className="text-xs text-slate-400 font-sans font-normal"> / month</span>
            </span>
          </div>

          {/* Title */}
          <h3 className="font-display font-bold text-slate-800 text-base line-clamp-1 group-hover:text-orange-600 transition-colors">
            {property.title}
          </h3>

          {/* Locality & City */}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
            <span className="truncate">{property.locality}, {property.city}</span>
          </div>
        </div>

        {/* BHK / Bath / Size specs */}
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-50 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-medium">
            <BedDouble className="w-4 h-4 text-slate-400" />
            <span>{property.bedrooms} BHK</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium">
            <Bath className="w-4 h-4 text-slate-400" />
            <span>{property.bathrooms} {property.bathrooms > 1 ? 'Baths' : 'Bath'}</span>
          </div>
          <div className="ml-auto text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
            ₹{Math.round(property.deposit_amount / 1000)}k Deposit
          </div>
        </div>
      </div>
    </div>
  );
}
