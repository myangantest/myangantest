/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Property, UserProfile } from '../../types';
import { dbService } from '../../lib/db';
import LeafletMap from '../LeafletMap';
import { ArrowLeft, CheckCircle2, Calendar, Phone, ShieldCheck, Heart, Share2, Bed, Bath, Sofa, MessageSquare, Send } from 'lucide-react';

interface PropertyDetailViewProps {
  propertyId: string;
  navigateTo: (route: string, params?: any) => void;
  currentUser: UserProfile | null;
  onOpenPassport?: (property: Property) => void;
}

export default function PropertyDetailView({ propertyId, navigateTo, currentUser, onOpenPassport }: PropertyDetailViewProps) {
  const [data, setData] = useState<{ property: Property; owner: UserProfile } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeImage, setActiveImage] = useState('');
  const [isFav, setIsFav] = useState(false);

  // Inquiry Modal State
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [renterName, setRenterName] = useState(currentUser?.name || '');
  const [renterPhone, setRenterPhone] = useState(currentUser?.phone || '');
  const [inquiryMsg, setInquiryMsg] = useState('');
  const [submittingLead, setSubmittingLead] = useState(false);
  const [leadSuccess, setLeadSuccess] = useState(false);
  const [inquiryErrors, setInquiryErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    window.scrollTo({ top: 0 });
    fetchPropertyDetails();
  }, [propertyId]);

  const fetchPropertyDetails = async () => {
    setLoading(true);
    try {
      const res = await dbService.getPropertyById(propertyId);
      if (!res) {
        setError('Property listing not found or has been removed.');
        return;
      }
      setData(res);
      setActiveImage(res.property.image_urls[0] || '');
      setInquiryMsg(`Hi ${res.owner.name.split(' ')[0]}, I am extremely interested in your rental listing: "${res.property.title}" in ${res.property.locality}, ${res.property.city}. Is this still available for viewing?`);

      if (currentUser) {
        const fav = await dbService.isFavorite(currentUser.id, res.property.id);
        setIsFav(fav);
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred while fetching details.');
    } finally {
      setLoading(false);
    }
  };

  const handleFavoriteToggle = async () => {
    if (!currentUser) {
      alert('Please sign in to save properties to your favorites.');
      return;
    }
    if (!data) return;

    try {
      const res = await dbService.toggleFavorite(currentUser.id, data.property.id);
      setIsFav(res);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;

    const errors: Record<string, string> = {};

    if (!renterName.trim()) {
      errors.renterName = 'Your name is required.';
    } else if (renterName.trim().length < 3) {
      errors.renterName = 'Your name must be at least 3 characters.';
    }

    const digitsOnly = renterPhone.replace(/[^0-9]/g, '');
    if (!renterPhone.trim()) {
      errors.renterPhone = 'Contact phone number is required.';
    } else if (digitsOnly.length < 10) {
      errors.renterPhone = 'Please enter a valid mobile number with at least 10 digits.';
    }

    if (!inquiryMsg.trim()) {
      errors.inquiryMsg = 'Message cannot be empty.';
    }

    if (Object.keys(errors).length > 0) {
      setInquiryErrors(errors);
      return;
    }

    setInquiryErrors({});
    setSubmittingLead(true);
    try {
      // 1. Write lead to database
      await dbService.createLead({
        property_id: data.property.id,
        renter_id: currentUser?.id || null,
        name: renterName,
        phone: renterPhone,
        message: inquiryMsg
      });

      // 1.5 Dispatch transactional notification emails via Express backend
      try {
        await fetch('/api/notifications/inquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            propertyId: data.property.id,
            renterName,
            renterPhone,
            message: inquiryMsg,
            renterEmail: currentUser?.email || '',
            // Fallback params for backward compatibility
            tenantName: renterName,
            tenantPhone: renterPhone,
            tenantEmail: currentUser?.email || '',
            fallbackDetails: {
              property: data.property,
              owner: data.owner
            }
          }),
        });
      } catch (notificationError) {
        console.error('Failed to dispatch transactional inquiry emails:', notificationError);
      }

      setLeadSuccess(true);
      setTimeout(() => {
        setLeadSuccess(false);
        setInquiryOpen(false);

        // 2. Open WhatsApp Redirect Link
        // Pre-fill international format (India: +91 or pre-format phone)
        const rawPhone = data.owner.phone || '+919999912345';
        const formattedPhone = rawPhone.replace(/[^0-9]/g, ''); // strip plus etc
        const whatsappText = encodeURIComponent(
          `Namaste, I am interested in your property "${data.property.title}" listed on MyAngan (${data.property.locality}, ${data.property.city}) for Rent: ${formatRent(data.property.rent_amount)}/mo. My Name is ${renterName} (Ph: ${renterPhone}). Let's connect!`
        );
        
        window.open(`https://wa.me/${formattedPhone}?text=${whatsappText}`, '_blank');
      }, 1500);

    } catch (err) {
      console.error(err);
      alert('Failed to submit inquiry. Please try again.');
    } finally {
      setSubmittingLead(false);
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

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 font-mono">Fetching full property brochure...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="bg-red-50 text-red-700 text-sm p-4 rounded-xl border border-red-200">
          {error || 'Listing not found.'}
        </div>
        <button
          onClick={() => navigateTo('properties')}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
        >
          Back to Listings
        </button>
      </div>
    );
  }

  const { property, owner } = data;

  // Static Amenities list
  const amenities = [
    { label: 'Gated Society Security', checked: true },
    { label: 'Elevator / Lift', checked: property.bedrooms >= 3 },
    { label: 'Assigned Covered Parking', checked: true },
    { label: 'Power Backup Support', checked: property.rent_amount > 50000 },
    { label: 'Modern Modular Kitchen', checked: property.furnishing_status !== 'unfurnished' },
    { label: 'Broadband Fiber Installed', checked: true },
    { label: 'Wrap-around Balconies', checked: property.bedrooms >= 2 },
    { label: 'Municipal Water Connection', checked: true },
    { label: 'In-Unit Air Conditioning', checked: property.furnishing_status === 'furnished' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Back Button & Top Meta */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <button
          onClick={() => navigateTo('properties')}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-semibold group cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to All Listings</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleFavoriteToggle}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              isFav
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFav ? 'fill-current text-red-500' : ''}`} />
            <span>{isFav ? 'Saved to Favorites' : 'Save'}</span>
          </button>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Link copied to clipboard! You can share it now.');
            }}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs font-medium hover:bg-slate-50 cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Share Listing</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Gallery + details left, sidebar right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2 Columns: Media Gallery & Content */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Custom Photo Gallery */}
          <div className="space-y-3">
            <div className="relative aspect-[16/9] w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
              <img
                src={activeImage}
                alt={property.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {property.is_verified && (
                <div className="absolute top-4 left-4 bg-[#0F1F3D]/95 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-md">
                  <CheckCircle2 className="w-4 h-4 text-orange-500" />
                  <span>Verified Safe Listing</span>
                </div>
              )}
            </div>

            {/* Thumbnails */}
            {property.image_urls.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {property.image_urls.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImage(url)}
                    className={`relative w-24 aspect-video rounded-lg overflow-hidden shrink-0 border-2 cursor-pointer transition-all ${
                      activeImage === url ? 'border-orange-500 scale-95 shadow-sm' : 'border-transparent opacity-85 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Configuration Summary Badges */}
          <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
            <div className="flex flex-col items-center p-2">
              <Bed className="w-5 h-5 text-orange-500 mb-1" />
              <span className="text-xs text-slate-400 font-medium">BHK configuration</span>
              <span className="text-sm font-bold text-slate-800">{property.bedrooms} BHK</span>
            </div>
            <div className="flex flex-col items-center p-2">
              <Bath className="w-5 h-5 text-orange-500 mb-1" />
              <span className="text-xs text-slate-400 font-medium">Bathrooms</span>
              <span className="text-sm font-bold text-slate-800">{property.bathrooms} Baths</span>
            </div>
            <div className="flex flex-col items-center p-2">
              <Sofa className="w-5 h-5 text-orange-500 mb-1" />
              <span className="text-xs text-slate-400 font-medium">Furnishing</span>
              <span className="text-sm font-bold text-slate-800">{getFurnishingLabel(property.furnishing_status)}</span>
            </div>
          </div>

          {/* About This Property */}
          <div className="space-y-4">
            <h2 className="text-xl font-display font-bold text-slate-900 border-b border-slate-50 pb-2">
              About This Property
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
              {property.description}
            </p>
          </div>

          {/* Address & Amenities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div className="space-y-3">
              <h3 className="font-display font-bold text-slate-800 text-sm">Exact Location</h3>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                <p className="text-xs font-semibold text-slate-800">{property.locality}, {property.city}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{property.address}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-display font-bold text-slate-800 text-sm">Property Amenities</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {amenities.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-slate-600">
                    <CheckCircle2 className={`w-4 h-4 shrink-0 ${item.checked ? 'text-emerald-500' : 'text-slate-300'}`} />
                    <span className={item.checked ? 'font-medium text-slate-800' : 'text-slate-400'}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Leaflet Dynamic Location Map */}
          <div className="space-y-3 pt-4">
            <h3 className="font-display font-bold text-slate-800 text-sm">Interactive Neighborhood Map</h3>
            <LeafletMap
              latitude={property.latitude || 28.4894}
              longitude={property.longitude || 77.0886}
              title={property.locality}
            />
          </div>

        </div>

        {/* Right 1 Column: Sticky Price details, Landlord profile, and CTA */}
        <div className="space-y-6">
          
          {/* Pricing & Quick CTA Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-lg p-6 space-y-6 lg:sticky lg:top-20 z-10">
            <div className="space-y-2 border-b border-slate-50 pb-4">
              <span className="text-[10px] font-mono font-bold text-orange-600 uppercase tracking-widest bg-orange-50 px-2 py-0.5 rounded">
                AVAILABLE NOW
              </span>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-2xl sm:text-3xl font-display font-extrabold text-slate-900">
                  {formatRent(property.rent_amount)}
                  <span className="text-sm font-sans font-normal text-slate-400"> / mo</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs pt-2">
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-medium">Security Deposit</span>
                  <span className="font-bold text-slate-800">{formatRent(property.deposit_amount)}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded border border-slate-100">
                  <span className="text-[10px] text-slate-400 block font-medium">Notice Period</span>
                  <span className="font-bold text-slate-800">1 Month</span>
                </div>
              </div>
            </div>

            {/* Owner Information */}
            <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <h4 className="text-[11px] font-mono text-slate-400 uppercase tracking-wider font-bold">LISTED BY DIRECT</h4>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#0F1F3D] text-white flex items-center justify-center font-bold text-sm">
                  {owner.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h5 className="font-bold text-slate-800 text-sm leading-tight">{owner.name}</h5>
                  <p className="text-[10px] text-orange-600 font-semibold uppercase mt-0.5">
                    {owner.role === 'landlord_broker' ? 'Landlord / Broker Agent' : 'Admin Representative'}
                  </p>
                </div>
              </div>
              
              <div className="pt-2 text-xs text-slate-500 font-mono space-y-1">
                <p>Member since: {new Date(owner.created_at || '2026-01-01').toLocaleDateString()}</p>
                {property.is_verified && (
                  <p className="text-emerald-600 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Identity Verified
                  </p>
                )}
              </div>
            </div>

            {/* Enquire Now Action Button */}
            <button
              onClick={() => setInquiryOpen(true)}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow transition-all duration-300 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Enquire & Connect on WhatsApp</span>
            </button>

            {/* Property Passport Drawer Trigger */}
            <button
              onClick={() => onOpenPassport && onOpenPassport(property)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>View Property Passport Certificate</span>
            </button>

            {/* Create Lease Agreement Trigger */}
            <button
              onClick={() => navigateTo('lease-agreement')}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 border border-slate-200 transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-orange-600" />
              <span>Generate Digital Lease Agreement</span>
            </button>

            <div className="text-center">
              <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-slate-300" /> Direct connection, no hidden setup fees.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Inquiry Modal */}
      {inquiryOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-100 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-[#0F1F3D] text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-base">Secure Renter Inquiry Log</h3>
                <p className="text-[10px] text-slate-300">Submit inquiry log to initiate WhatsApp chat</p>
              </div>
              <button
                onClick={() => {
                  setInquiryOpen(false);
                  setInquiryErrors({});
                }}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEnquirySubmit} className="p-6 space-y-4">
              {leadSuccess ? (
                <div className="text-center py-6 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto animate-bounce border border-emerald-100">
                    ✓
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-display font-bold text-slate-800">Inquiry Logged Successfully!</h4>
                    <p className="text-xs text-slate-500">Redirecting you to direct WhatsApp chat...</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-lg text-xs space-y-1">
                    <p className="text-slate-400 font-mono font-bold">INQUIRING FOR:</p>
                    <p className="font-bold text-slate-800">{property.title}</p>
                    <p className="text-slate-500 font-medium">Rent: {formatRent(property.rent_amount)}/mo • Locality: {property.locality}</p>
                  </div>

                  {/* Name Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 block">Your Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Amit Patel"
                      value={renterName}
                      onChange={(e) => {
                        setRenterName(e.target.value);
                        if (inquiryErrors.renterName) setInquiryErrors(prev => ({ ...prev, renterName: '' }));
                      }}
                      className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs focus:outline-none transition-all ${
                        inquiryErrors.renterName ? 'border-red-500 focus:border-red-500 bg-red-50/10' : 'border-slate-200 focus:border-orange-500'
                      }`}
                    />
                    {inquiryErrors.renterName && (
                      <p className="text-[11px] text-red-500 font-semibold font-mono mt-1">{inquiryErrors.renterName}</p>
                    )}
                  </div>

                  {/* Contact Phone */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 block">Contact Phone Number (WhatsApp)</label>
                    <input
                      type="tel"
                      placeholder="e.g. +91 99999 88888"
                      value={renterPhone}
                      onChange={(e) => {
                        setRenterPhone(e.target.value);
                        if (inquiryErrors.renterPhone) setInquiryErrors(prev => ({ ...prev, renterPhone: '' }));
                      }}
                      className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs focus:outline-none transition-all ${
                        inquiryErrors.renterPhone ? 'border-red-500 focus:border-red-500 bg-red-50/10' : 'border-slate-200 focus:border-orange-500'
                      }`}
                    />
                    {inquiryErrors.renterPhone && (
                      <p className="text-[11px] text-red-500 font-semibold font-mono mt-1">{inquiryErrors.renterPhone}</p>
                    )}
                  </div>

                  {/* Inquiry Message */}
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-500 block">Personalized Message</label>
                    <textarea
                      rows={3}
                      value={inquiryMsg}
                      onChange={(e) => {
                        setInquiryMsg(e.target.value);
                        if (inquiryErrors.inquiryMsg) setInquiryErrors(prev => ({ ...prev, inquiryMsg: '' }));
                      }}
                      className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs focus:outline-none resize-none transition-all ${
                        inquiryErrors.inquiryMsg ? 'border-red-500 focus:border-red-500 bg-red-50/10' : 'border-slate-200 focus:border-orange-500'
                      }`}
                    />
                    {inquiryErrors.inquiryMsg && (
                      <p className="text-[11px] text-red-500 font-semibold font-mono mt-1">{inquiryErrors.inquiryMsg}</p>
                    )}
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submittingLead}
                      className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submittingLead ? 'Logging lead...' : 'Confirm Inquiry & Chat Now'}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
