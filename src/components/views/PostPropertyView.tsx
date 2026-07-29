/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Property, FurnishingStatus, UserProfile } from '../../types';
import { dbService } from '../../lib/db';
import { Building2, Upload, MapPin, IndianRupee, Bed, Bath, Sofa, Image as ImageIcon, ArrowLeft, Plus, Check, Sparkles, AlertCircle } from 'lucide-react';
import RazorpayModal from '../RazorpayModal';

interface PostPropertyViewProps {
  navigateTo: (route: string, params?: any) => void;
  currentUser: UserProfile | null;
}

// Pre-seeded high-quality stock images to allow quick demo previews
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

  // Image Selection & Temporary Previews
  const [selectedStock, setSelectedStock] = useState<string[]>([]);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Form Status
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) {
      navigateTo('auth');
      return;
    }

    const role = currentUser.role;
    const allowedRoles = ['owner', 'broker', 'landlord', 'admin', 'landlord_broker'];
    if (!allowedRoles.includes(role) || role === 'renter') {
      navigateTo('properties');
      return;
    }
  }, [currentUser, navigateTo]);

  // Clean up Object URLs on unmount
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [previewUrls]);

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

  // Process selected file objects
  const processFiles = (files: FileList | File[]) => {
    const newFiles: File[] = [];
    const newPreviews: string[] = [];
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeBytes = 5 * 1024 * 1024; // 5 MB

    let fileError: string | null = null;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!allowedMimeTypes.includes(file.type)) {
        fileError = `File '${file.name}' is not supported. Please select JPG, PNG, or WebP images.`;
        break;
      }
      if (file.size > maxSizeBytes) {
        fileError = `File '${file.name}' exceeds the maximum allowed size of 5 MB.`;
        break;
      }
      if (rawFiles.length + newFiles.length >= 8) {
        fileError = 'Maximum of 8 property images allowed.';
        break;
      }

      newFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    if (fileError) {
      setSubmitError(fileError);
      return;
    }

    setSubmitError(null);
    setRawFiles(prev => [...prev, ...newFiles]);
    setPreviewUrls(prev => [...prev, ...newPreviews]);
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  useEffect(() => {
    return () => {
      previewUrls.forEach(url => {
        if (url && url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [previewUrls]);

  const removeUploadedFile = (index: number) => {
    const urlToRemove = previewUrls[index];
    if (urlToRemove && urlToRemove.startsWith('blob:')) {
      URL.revokeObjectURL(urlToRemove);
    }
    setRawFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
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
    setSubmitError(null);

    if (!currentUser) {
      setSubmitError('Authentication Error: You must be logged in to submit a property.');
      return;
    }

    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = 'Listing title is required.';
    } else if (title.trim().length < 15) {
      newErrors.title = 'Title must be at least 15 characters to attract renters.';
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

    // Geolocation fallbacks for Delhi NCR mapping
    let lat = Number(latitude);
    let lng = Number(longitude);

    if (!lat || !lng) {
      if (city === 'Gurugram') {
        lat = 28.4595 + (Math.random() - 0.5) * 0.05;
        lng = 77.0266 + (Math.random() - 0.5) * 0.05;
      } else {
        lat = 28.5293 + (Math.random() - 0.5) * 0.04;
        lng = 77.1523 + (Math.random() - 0.5) * 0.04;
      }
    }

    setSubmitting(true);
    try {
      await dbService.postProperty({
        owner_id: currentUser.id,
        title: title.trim(),
        description: description.trim() || 'No description provided.',
        city,
        locality: locality.trim(),
        bedrooms,
        bathrooms,
        furnishing_status: furnishingStatus,
        rent_amount: Number(rentAmount),
        deposit_amount: Number(depositAmount),
        address: address.trim(),
        latitude: lat,
        longitude: lng,
        image_urls: selectedStock,
        imageFiles: rawFiles,
      });

      alert('Property listed successfully! It has been submitted for admin verification and review.');
      navigateTo('dashboard');
    } catch (err: any) {
      console.error('[Property Post Error]', err);
      setSubmitError(err.message || 'Failed to list property. Please check your network connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

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
            Back to Dashboard
          </button>
          <h1 className="font-display font-extrabold text-2xl text-slate-900 tracking-tight">Post a New Rental Property</h1>
          <p className="text-xs text-slate-500">
            Submit high-trust rental listings in Gurugram & South Delhi. All listings undergo mandatory admin review.
          </p>
        </div>
      </div>

      {/* Global Submit Error Banner */}
      {submitError && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 text-xs font-semibold">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <p className="font-bold text-red-900">Submission Error</p>
            <p className="text-red-700">{submitError}</p>
          </div>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 shadow-xs space-y-8">
        
        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="font-display font-bold text-slate-800 text-base border-b border-slate-50 pb-2">1. Basic Property Details</h3>
          
          <div className="space-y-1" id="error-anchor-title">
            <label className="text-xs font-semibold text-slate-600 block">Property Title <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="e.g., Luxury 3 BHK Builder Floor near Golf Course Road"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (errors.title) setErrors(prev => ({ ...prev, title: '' }));
              }}
              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-lg text-xs focus:outline-none transition-all ${
                errors.title ? 'border-red-500 focus:border-red-500 bg-red-50/10' : 'border-slate-200 focus:border-orange-500'
              }`}
            />
            {errors.title && (
              <p className="text-[11px] text-red-500 font-semibold font-mono mt-1">{errors.title}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Target City <span className="text-red-500">*</span></label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value as 'Gurugram' | 'South Delhi')}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-lg text-xs focus:outline-none transition-all"
              >
                <option value="Gurugram">Gurugram (NCR)</option>
                <option value="South Delhi">South Delhi</option>
              </select>
            </div>

            <div className="space-y-1" id="error-anchor-locality">
              <label className="text-xs font-semibold text-slate-600 block">Locality / Sector Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="e.g., Sector 54, Golf Course Road or Vasant Kunj"
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

          <div className="space-y-1" id="error-anchor-address">
            <label className="text-xs font-semibold text-slate-600 block">Complete Physical Address <span className="text-red-500">*</span></label>
            <input
              type="text"
              placeholder="House/Tower Number, Block, Street Name, Zipcode"
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

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-600 block">Property Description & Highlights</label>
            <textarea
              rows={4}
              placeholder="Describe key features, society security, nearby metro station, parking availability, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-lg text-xs focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Configuration & Layout */}
        <div className="space-y-4">
          <h3 className="font-display font-bold text-slate-800 text-base border-b border-slate-50 pb-2">2. Configuration & Amenities</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Bedrooms (BHK)</label>
              <select
                value={bedrooms}
                onChange={(e) => setBedrooms(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-lg text-xs focus:outline-none"
              >
                <option value={1}>1 BHK (Studio / Single)</option>
                <option value={2}>2 BHK</option>
                <option value={3}>3 BHK</option>
                <option value={4}>4 BHK</option>
                <option value={5}>5+ BHK Penthouse</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Bathrooms</label>
              <select
                value={bathrooms}
                onChange={(e) => setBathrooms(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-lg text-xs focus:outline-none"
              >
                <option value={1}>1 Bathroom</option>
                <option value={2}>2 Bathrooms</option>
                <option value={3}>3 Bathrooms</option>
                <option value={4}>4+ Bathrooms</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 block">Furnishing Status</label>
              <select
                value={furnishingStatus}
                onChange={(e) => setFurnishingStatus(e.target.value as FurnishingStatus)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 focus:border-orange-500 rounded-lg text-xs focus:outline-none"
              >
                <option value="unfurnished">Unfurnished</option>
                <option value="semi_furnished">Semi Furnished</option>
                <option value="furnished">Fully Furnished</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <label className="text-xs font-semibold text-slate-600 block">Upload Real Estate Images (Max 8 files, 5 MB limit per file)</label>
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
                <p className="text-[10px] text-slate-400 mt-0.5">Supports JPG, PNG, WebP. Maximum 8 photos (5 MB each).</p>
              </div>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
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

          {/* User Uploaded File Previews */}
          {previewUrls.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-slate-800 block">Uploaded Local Photos ({previewUrls.length})</span>
              <div className="flex flex-wrap gap-2">
                {previewUrls.map((url, idx) => (
                  <div key={idx} className="relative w-20 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shrink-0 group">
                    <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeUploadedFile(idx)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-[10px] flex items-center justify-center cursor-pointer hover:bg-red-700 font-bold shadow-xs"
                      title="Remove file"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Stock Quick Seed Area */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-500 block">Optional Stock Assets (Demo Assets):</span>
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
                      <span>{img.name} (Demo)</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
            {submitting ? 'Submitting Property...' : 'Submit for Admin Review'}
          </button>
        </div>

      </form>
    </div>
  );
}
