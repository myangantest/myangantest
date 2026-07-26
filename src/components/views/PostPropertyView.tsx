/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Property, FurnishingStatus, UserProfile } from '../../types';
import { dbService } from '../../lib/db';
import { Building2, Upload, MapPin, IndianRupee, Bed, Bath, Sofa, Image as ImageIcon, ArrowLeft, Plus, Check, Sparkles } from 'lucide-react';
import RazorpayModal from '../RazorpayModal';

interface PostPropertyViewProps {
  navigateTo: (route: string, params?: any) => void;
  currentUser: UserProfile | null;
}

// Pre-seeded high-quality stock images to allow quick demo listings
const SAMPLE_STOCK_IMAGES = [
  { id: '1', name: 'Living Room', url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80' },
  { id: '2', name: 'Kitchen', url: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=800&q=80' },
  { id: '3', name: 'Bedroom', url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80' },
  { id: '4', name: 'Bathroom', url: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80' },
];

export default function PostPropertyView({ navigateTo, currentUser }: PostPropertyViewProps) {
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState<'Gurugram' | 'South Delhi'>('Gurugram');
  const [locality, setLocality] = useState('');
  const [address, setAddress] = useState('');
  const [bedrooms, setBedrooms] = useState<number>(2);
  const [bathrooms, setBathrooms] = useState<number>(2);
  const [furnishingStatus, setFurnishingStatus] = useState<FurnishingStatus>('semi_furnished');
  const [rentAmount, setRentAmount] = useState<number | ''>('');
  const [depositAmount, setDepositAmount] = useState<number | ''>('');
  
  // Coordinates helper (for Leaflet mapping)
  const [latitude, setLatitude] = useState<number | ''>('');
  const [longitude, setLongitude] = useState<number | ''>('');

  // Image Selection
  const [selectedStock, setSelectedStock] = useState<string[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Subscription States
  const [activeListingsCount, setActiveListingsCount] = useState<number>(0);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);
  const [localUser, setLocalUser] = useState<UserProfile | null>(currentUser);

  useEffect(() => {
    setLocalUser(currentUser);
    if (!currentUser) {
      navigateTo('auth');
      return;
    }
    if (currentUser.role !== 'landlord_broker' && currentUser.role !== 'admin') {
      navigateTo('properties');
      return;
    }
    dbService.getOwnerProperties(currentUser.id).then((props) => {
      const activeCount = props.filter(p => p.status === 'active').length;
      setActiveListingsCount(activeCount);
      setCheckingLimit(false);
    }).catch(err => {
      console.error(err);
      setCheckingLimit(false);
    });
  }, [currentUser]);

  const handlePaymentSuccess = async (paymentId: string) => {
    if (!currentUser) return;
    try {
      const response = await fetch('/api/payment/verify-razorpay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          userId: currentUser.id
        })
      });

      const text = await response.text();
      let result: any = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        result = { error: 'Server returned an invalid response format.' };
      }

      if (!response.ok) {
        throw new Error(result.error || 'Payment verification failed.');
      }

      const updated = result.user;
      setLocalUser(updated);
      setIsRazorpayOpen(false);
      alert('Congratulations! Your Broker Plan subscription is now active! You now have unlimited active listings and featured badges.');
      window.location.reload(); // Refreshes to synchronize state everywhere
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Payment succeeded but failed to verify subscription on server. Please contact support.');
    }
  };

  const handlePaymentFailure = (errorMsg: string) => {
    alert(errorMsg);
    setIsRazorpayOpen(false);
  };

  // Auto-fill deposit based on rent (usually 2 months in Delhi NCR)
  const handleRentChange = (val: string) => {
    const num = val ? Number(val) : '';
    setRentAmount(num);
    if (errors.rentAmount) setErrors(prev => ({ ...prev, rentAmount: '' }));
    if (typeof num === 'number') {
      setDepositAmount(num * 2);
      if (errors.depositAmount) setErrors(prev => ({ ...prev, depositAmount: '' }));
    } else {
      setDepositAmount('');
    }
  };

  // Handles drag and drop uploads
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const urls: string[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        const objUrl = URL.createObjectURL(file); // Client-side safe object URL for high-res previews!
        urls.push(objUrl);
      }
      setUploadedUrls(prev => [...prev, ...urls]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const urls: string[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        const objUrl = URL.createObjectURL(file);
        urls.push(objUrl);
      }
      setUploadedUrls(prev => [...prev, ...urls]);
    }
  };

  const toggleStockImage = (url: string) => {
    if (selectedStock.includes(url)) {
      setSelectedStock(prev => prev.filter(x => x !== url));
    } else {
      setSelectedStock(prev => [...prev, url]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert('You must be signed in to list a property.');
      return;
    }

    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Listing title is required.';
    } else if (title.trim().length < 15) {
      newErrors.title = 'Title must be at least 15 characters to attract renters (e.g., location/size details).';
    }

    if (!locality.trim()) {
      newErrors.locality = 'Locality is required.';
    } else if (locality.trim().length < 3) {
      newErrors.locality = 'Locality name must be at least 3 characters.';
    }

    if (!address.trim()) {
      newErrors.address = 'Full physical address is required.';
    } else if (address.trim().length < 15) {
      newErrors.address = 'Address is too short. Please include house/block number and sector.';
    }

    if (rentAmount === '' || Number(rentAmount) <= 0) {
      newErrors.rentAmount = 'Monthly rent must be a positive number.';
    } else if (Number(rentAmount) < 1000) {
      newErrors.rentAmount = 'Rent must be at least ₹1,000 per month.';
    }

    if (depositAmount === '' || Number(depositAmount) <= 0) {
      newErrors.depositAmount = 'Security deposit must be a positive number.';
    } else if (Number(depositAmount) < Number(rentAmount)) {
      newErrors.depositAmount = 'Security deposit is typically at least equal to 1 month of rent.';
    }

    if (latitude !== '' && (Number(latitude) < 8 || Number(latitude) > 38)) {
      newErrors.latitude = 'Latitude must be a valid coordinate between 8 and 38.';
    }

    if (longitude !== '' && (Number(longitude) < 68 || Number(longitude) > 98)) {
      newErrors.longitude = 'Longitude must be a valid coordinate between 68 and 98.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const firstErrorKey = Object.keys(newErrors)[0];
      const element = document.getElementById(`error-anchor-${firstErrorKey}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        window.scrollTo({ top: 180, behavior: 'smooth' });
      }
      return;
    }

    setErrors({});

    // Combine stock selection and custom uploaded images
    const finalImages = [...selectedStock, ...uploadedUrls];
    if (finalImages.length === 0) {
      // Default to at least one sample image if none is selected
      finalImages.push('https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80');
    }

    // Geolocation fallbacks for Delhi NCR mapping
    let lat = Number(latitude);
    let lng = Number(longitude);

    if (!lat || !lng) {
      // Gurugram default coords
      if (city === 'Gurugram') {
        lat = 28.4595 + (Math.random() - 0.5) * 0.05;
        lng = 77.0266 + (Math.random() - 0.5) * 0.05;
      } else {
        // South Delhi default coords (Vasant Kunj area)
        lat = 28.5293 + (Math.random() - 0.5) * 0.04;
        lng = 77.1523 + (Math.random() - 0.5) * 0.04;
      }
    }

    setSubmitting(true);
    try {
      const newProp = await dbService.postProperty({
        owner_id: currentUser.id,
        title,
        description: description || 'No description provided by the landlord/broker.',
        city,
        locality,
        bedrooms,
        bathrooms,
        furnishing_status: furnishingStatus,
        rent_amount: Number(rentAmount),
        deposit_amount: Number(depositAmount),
        address,
        latitude: lat,
        longitude: lng,
        image_urls: finalImages
      });

      alert('Property listed successfully! It has been posted as pending verification.');
      navigateTo('dashboard'); // go to landlord dashboard
    } catch (err) {
      console.error(err);
      alert('Failed to list property. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const isCapped = currentUser?.role === 'landlord_broker' && !localUser?.is_subscribed && activeListingsCount >= 3;

  if (checkingLimit) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-mono text-slate-400">Verifying active listing limits...</p>
      </div>
    );
  }

  if (isCapped) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 space-y-8">
        <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-md text-center space-y-6">
          <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center border border-orange-100 mx-auto animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-display font-bold text-slate-900 tracking-tight">Active Listing Limit Reached</h1>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Your free broker account is capped at <span className="font-bold text-slate-800">3 active properties</span>. 
              To list this property, please upgrade to the Broker Plan or deactivate an existing listing.
            </p>
          </div>

          {/* Pricing Details */}
          <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-200/50 pb-2.5">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Broker Premium Plan</span>
              <span className="text-sm font-extrabold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-100/50">₹999 / month</span>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">Unlimited Active Properties</span>
                  <p className="text-[11px] text-slate-500">List and manage as many properties as you need simultaneously.</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">Premium Featured Badges</span>
                  <p className="text-[11px] text-slate-500">Highlight your new listings for 7 days, placing them at the top of renter searches.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              onClick={() => setIsRazorpayOpen(true)}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer flex items-center justify-center gap-2 transition-colors"
            >
              <Sparkles className="w-4 h-4 text-white animate-pulse" />
              <span>Subscribe via Razorpay (₹999/mo)</span>
            </button>
            <button
              onClick={() => navigateTo('dashboard')}
              className="w-full py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>

        <RazorpayModal
          isOpen={isRazorpayOpen}
          onClose={() => setIsRazorpayOpen(false)}
          onSuccess={handlePaymentSuccess}
          onFailure={handlePaymentFailure}
          amount={999}
          userEmail={currentUser?.email}
          userName={currentUser?.name}
          userPhone={currentUser?.phone}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-1">
          <button
            onClick={() => navigateTo('dashboard')}
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-xs font-semibold group cursor-pointer mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-orange-500" />
            Post Your Rental Listing
          </h1>
          <p className="text-xs text-slate-500">
            Submit your residential property in South Delhi or Gurugram. Free and direct renter contact.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Basic Property Details */}
        <div className="space-y-4">
          <h3 className="font-display font-bold text-slate-800 text-base border-b border-slate-50 pb-2">1. Essential Property Specs</h3>
          
          {/* Title */}
          <div className="space-y-1" id="error-anchor-title">
            <label className="text-xs font-semibold text-slate-600 block">Listing Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="e.g. Elegant 3 BHK Builder Floor near Cyber City"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
              }}
              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-lg text-xs focus:outline-none transition-all ${
                errors.title ? 'border-red-500 focus:border-red-500 bg-red-50/10' : 'border-slate-200 focus:border-orange-500'
              }`}
              maxLength={80}
            />
            {errors.title && (
              <p className="text-[11px] text-red-500 font-semibold font-mono mt-1">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 block">Property Description</label>
            <textarea
              rows={4}
              placeholder="Provide key details, near metro stations, gated security, water availability, custom woodwork, park accessibility..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Bedrooms */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">BHK Size <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  value={bedrooms}
                  onChange={(e) => setBedrooms(Number(e.target.value))}
                  className="w-full pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:border-orange-500 appearance-none cursor-pointer"
                >
                  <option value={1}>1 BHK Studio</option>
                  <option value={2}>2 BHK Apartment</option>
                  <option value={3}>3 BHK builder Floor</option>
                  <option value={4}>4 BHK Penthouse/Villa</option>
                </select>
                <Bed className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Bathrooms */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Bathrooms <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  value={bathrooms}
                  onChange={(e) => setBathrooms(Number(e.target.value))}
                  className="w-full pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:border-orange-500 appearance-none cursor-pointer"
                >
                  <option value={1}>1 Bathroom</option>
                  <option value={2}>2 Bathrooms</option>
                  <option value={3}>3 Bathrooms</option>
                  <option value={4}>4+ Bathrooms</option>
                </select>
                <Bath className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            {/* Furnishing */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Furnishing <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  value={furnishingStatus}
                  onChange={(e) => setFurnishingStatus(e.target.value as FurnishingStatus)}
                  className="w-full pl-3.5 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 font-medium focus:outline-none focus:border-orange-500 appearance-none cursor-pointer"
                >
                  <option value="unfurnished">Unfurnished</option>
                  <option value="semi_furnished">Semi Furnished</option>
                  <option value="furnished">Fully Furnished</option>
                </select>
                <Sofa className="w-3.5 h-3.5 text-slate-400 absolute right-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* Location & Coordinates */}
        <div className="space-y-4">
          <h3 className="font-display font-bold text-slate-800 text-base border-b border-slate-50 pb-2">2. Rental Property Address</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* City */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">City <span className="text-red-500">*</span></label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="Gurugram">Gurugram</option>
                <option value="South Delhi">South Delhi</option>
              </select>
            </div>

            {/* Locality */}
            <div className="space-y-1" id="error-anchor-locality">
              <label className="text-xs font-semibold text-slate-600 block">Locality <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g. DLF Phase 3 or Vasant Kunj"
                value={locality}
                onChange={(e) => {
                  setLocality(e.target.value);
                  if (errors.locality) setErrors(prev => ({ ...prev, locality: '' }));
                }}
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-lg text-xs focus:outline-none transition-all ${
                  errors.locality ? 'border-red-500 focus:border-red-500 bg-red-50/10' : 'border-slate-200 focus:border-orange-500'
                }`}
              />
              {errors.locality && (
                <p className="text-[11px] text-red-500 font-semibold font-mono mt-1">{errors.locality}</p>
              )}
            </div>
          </div>

          {/* Full Address */}
          <div className="space-y-1" id="error-anchor-address">
            <label className="text-xs font-semibold text-slate-600 block">Full Physical Address <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="e.g. Block S-25, DLF Phase 3, Sector 24, Gurugram, Haryana - 122002"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (errors.address) setErrors(prev => ({ ...prev, address: '' }));
              }}
              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-lg text-xs focus:outline-none transition-all ${
                errors.address ? 'border-red-500 focus:border-red-500 bg-red-50/10' : 'border-slate-200 focus:border-orange-500'
              }`}
            />
            {errors.address && (
              <p className="text-[11px] text-red-500 font-semibold font-mono mt-1">{errors.address}</p>
            )}
          </div>

          {/* Map Coordinates (Optional) */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1" id="error-anchor-latitude">
              <label className="text-xs font-semibold text-slate-500 block">Latitude (Optional)</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 28.4894"
                value={latitude}
                onChange={(e) => {
                  setLatitude(e.target.value ? Number(e.target.value) : '');
                  if (errors.latitude) setErrors(prev => ({ ...prev, latitude: '' }));
                }}
                className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs focus:outline-none transition-all ${
                  errors.latitude ? 'border-red-500 focus:border-red-500 bg-red-50/10' : 'border-slate-200 focus:border-orange-500'
                }`}
              />
              {errors.latitude && (
                <p className="text-[11px] text-red-500 font-semibold font-mono mt-1">{errors.latitude}</p>
              )}
            </div>
            <div className="space-y-1" id="error-anchor-longitude">
              <label className="text-xs font-semibold text-slate-500 block">Longitude (Optional)</label>
              <input
                type="number"
                step="any"
                placeholder="e.g. 77.0886"
                value={longitude}
                onChange={(e) => {
                  setLongitude(e.target.value ? Number(e.target.value) : '');
                  if (errors.longitude) setErrors(prev => ({ ...prev, longitude: '' }));
                }}
                className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-xs focus:outline-none transition-all ${
                  errors.longitude ? 'border-red-500 focus:border-red-500 bg-red-50/10' : 'border-slate-200 focus:border-orange-500'
                }`}
              />
              {errors.longitude && (
                <p className="text-[11px] text-red-500 font-semibold font-mono mt-1">{errors.longitude}</p>
              )}
            </div>
          </div>
        </div>

        {/* Pricing Details */}
        <div className="space-y-4">
          <h3 className="font-display font-bold text-slate-800 text-base border-b border-slate-50 pb-2">3. Rental Terms</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rent Amount */}
            <div className="space-y-1" id="error-anchor-rentAmount">
              <label className="text-xs font-semibold text-slate-600 block">Monthly Rent Amount (INR) <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="e.g. 45000"
                  value={rentAmount}
                  onChange={(e) => handleRentChange(e.target.value)}
                  className={`w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border rounded-lg text-xs focus:outline-none font-bold transition-all ${
                    errors.rentAmount ? 'border-red-500 focus:border-red-500 bg-red-50/10' : 'border-slate-200 focus:border-orange-500'
                  }`}
                />
                <span className="text-slate-400 font-bold text-xs absolute left-3 top-3.5">₹</span>
              </div>
              {errors.rentAmount && (
                <p className="text-[11px] text-red-500 font-semibold font-mono mt-1">{errors.rentAmount}</p>
              )}
            </div>

            {/* Deposit Amount */}
            <div className="space-y-1" id="error-anchor-depositAmount">
              <label className="text-xs font-semibold text-slate-600 block">Security Deposit (INR) <span className="text-red-500">*</span></label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="e.g. 90000"
                  value={depositAmount}
                  onChange={(e) => {
                    setDepositAmount(e.target.value ? Number(e.target.value) : '');
                    if (errors.depositAmount) setErrors(prev => ({ ...prev, depositAmount: '' }));
                  }}
                  className={`w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border rounded-lg text-xs focus:outline-none font-bold text-slate-700 transition-all ${
                    errors.depositAmount ? 'border-red-500 focus:border-red-500 bg-red-50/10' : 'border-slate-200 focus:border-orange-500'
                  }`}
                />
                <span className="text-slate-400 font-bold text-xs absolute left-3 top-3.5">₹</span>
              </div>
              {errors.depositAmount ? (
                <p className="text-[11px] text-red-500 font-semibold font-mono mt-1">{errors.depositAmount}</p>
              ) : (
                <p className="text-[10px] text-slate-400 font-mono mt-1">Auto-calculated: 2 months rent (standard NCR practice)</p>
              )}
            </div>
          </div>
        </div>

        {/* Photo Upload Zone */}
        <div className="space-y-4">
          <h3 className="font-display font-bold text-slate-800 text-base border-b border-slate-50 pb-2">4. Property Media</h3>
          
          {/* File Upload Area */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 block">Upload Real Estate Images</label>
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-6 text-center flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                dragActive ? 'border-orange-500 bg-orange-50/50' : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
              }`}
            >
              <div className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 shadow-xs">
                <Upload className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">Drag and drop photos here, or click to browse</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Supports PNG, JPEG, WEBP. Maximum 4 photos.</p>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload-input"
              />
              <label
                htmlFor="file-upload-input"
                className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-semibold shadow-xs cursor-pointer mt-2"
              >
                Select Files
              </label>
            </div>
          </div>

          {/* Stock Quick Seed Area */}
          <div className="space-y-2.5">
            <span className="text-xs font-semibold text-slate-600 block">Quick Demo: Pick realistic stock photos in one click</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {SAMPLE_STOCK_IMAGES.map((img) => {
                const isSelected = selectedStock.includes(img.url);
                return (
                  <div
                    key={img.id}
                    onClick={() => toggleStockImage(img.url)}
                    className={`relative aspect-video rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                      isSelected ? 'border-orange-500 scale-95 shadow' : 'border-slate-100 hover:opacity-100 opacity-80'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/50 text-[10px] text-white py-1 px-2 font-medium truncate flex items-center justify-between">
                      <span>{img.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Combined Image Previews */}
          {(selectedStock.length > 0 || uploadedUrls.length > 0) && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-800 block">Selected Brochure Images ({selectedStock.length + uploadedUrls.length})</span>
              <div className="flex flex-wrap gap-2">
                {[...selectedStock, ...uploadedUrls].map((url, idx) => (
                  <div key={idx} className="relative w-16 h-12 rounded border overflow-hidden bg-slate-50 shrink-0">
                    <img src={url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStock(prev => prev.filter(x => x !== url));
                        setUploadedUrls(prev => prev.filter(x => x !== url));
                      }}
                      className="absolute top-0 right-0 bg-red-600 text-white rounded-full w-4 h-4 text-[9px] flex items-center justify-center cursor-pointer hover:bg-red-700 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-50 justify-end">
          <button
            type="button"
            onClick={() => navigateTo('dashboard')}
            className="px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl text-center cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl text-center shadow-md transition-colors cursor-pointer"
          >
            {submitting ? 'Creating Listing...' : 'Publish Rental Listing'}
          </button>
        </div>

      </form>

      <RazorpayModal
        isOpen={isRazorpayOpen}
        onClose={() => setIsRazorpayOpen(false)}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
        amount={999}
        userEmail={currentUser?.email}
        userName={currentUser?.name}
        userPhone={currentUser?.phone}
      />
    </div>
  );
}
