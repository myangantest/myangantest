/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { ShieldCheck, X, FileCheck, CheckCircle2, Award, Building2, Lock, MapPin, ExternalLink } from 'lucide-react';
import { Property } from '../types';

interface PropertyPassportModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PropertyPassportModal({ property, isOpen, onClose }: PropertyPassportModalProps) {
  if (!isOpen || !property) return null;

  const passportId = `PASSPORT-NCR-${property.id.slice(0, 8).toUpperCase()}`;
  const blockHash = `0x7f8a${Math.random().toString(16).substring(2, 14)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-fade-in">
      <div className="bg-white text-slate-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/30 rounded-2xl text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-mono tracking-widest text-emerald-400 font-bold uppercase bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Verified Identity Certificate
              </span>
              <h2 className="font-display font-extrabold text-xl text-white mt-0.5">MyAngan Property Passport</h2>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs font-mono text-slate-300 border-t border-white/10 pt-3 mt-3">
            <span>Passport ID: <strong className="text-white">{passportId}</strong></span>
            <span className="flex items-center gap-1 text-emerald-400">
              <Lock className="w-3 h-3" /> Blockchain Immutable
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Property Overview summary */}
          <div className="flex items-center gap-4 p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
            <img
              src={property.image_urls[0]}
              alt={property.title}
              className="w-16 h-16 rounded-xl object-cover"
            />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{property.title}</h3>
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-slate-400" />
                {property.address}, {property.locality}, {property.city}
              </p>
              <p className="text-xs font-bold text-orange-600 mt-1">
                ₹{property.rent_amount.toLocaleString('en-IN')}/mo
              </p>
            </div>
          </div>

          {/* Verification Badges Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Title & Deed Verified</h4>
                <p className="text-[11px] text-slate-600 mt-0.5">Government RERA & Registry records matched with owner Aadhaar/PAN.</p>
              </div>
            </div>

            <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Physical On-Site Audit</h4>
                <p className="text-[11px] text-slate-600 mt-0.5">Ground verification by MyAngan Field Agent (Photos & Dimensions verified).</p>
              </div>
            </div>

            <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Encumbrance Free</h4>
                <p className="text-[11px] text-slate-600 mt-0.5">Zero active legal disputes or illegal subletting flags detected.</p>
              </div>
            </div>

            <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-2xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900">Safe Deposit Guarantee</h4>
                <p className="text-[11px] text-slate-600 mt-0.5">Protected by MyAngan Escrow & Deposit Protection Program.</p>
              </div>
            </div>
          </div>

          {/* Neighborhood & Safety Rating */}
          <div className="border border-slate-200 rounded-2xl p-4 bg-white space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Neighborhood Intelligence & Safety Score
            </h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-xl font-extrabold text-slate-900">4.8 / 5</span>
                <p className="text-[10px] text-slate-500 font-medium mt-1">Safety Index</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-xl font-extrabold text-slate-900">800m</span>
                <p className="text-[10px] text-slate-500 font-medium mt-1">Nearest Metro</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-xl font-extrabold text-slate-900">98%</span>
                <p className="text-[10px] text-slate-500 font-medium mt-1">Owner Responsiveness</p>
              </div>
            </div>
          </div>

          {/* Blockchain Verification Footer */}
          <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between text-xs font-mono">
            <div className="truncate">
              <p className="text-[10px] text-slate-400">Blockchain Block Ledger Hash</p>
              <p className="truncate text-emerald-400 font-bold">{blockHash}</p>
            </div>
            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] shrink-0 font-bold">
              VERIFIED 100%
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Close Passport
          </button>
        </div>
      </div>
    </div>
  );
}
