/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { WaitlistRole } from '../../types';
import { dbService } from '../../lib/db';
import { Clock, CheckCircle2, User, Mail, ShieldCheck, ArrowRight } from 'lucide-react';

export default function WaitlistView() {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [role, setRole] = useState<WaitlistRole>('landlord');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) return;

    setLoading(true);
    try {
      await dbService.joinWaitlist({ name, contact, role });
      setSuccess(true);
      setName('');
      setContact('');
    } catch (err) {
      console.error(err);
      alert('Failed to join waitlist. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-16 space-y-12">
      {/* Visual Title Header */}
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <span className="text-orange-500 font-mono text-xs uppercase tracking-widest font-semibold bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100 inline-block">
          LAUNCHING NEXT MONTH • NEW DELHI NCR
        </span>
        <h1 className="text-4xl sm:text-5xl font-display font-extrabold text-slate-900 tracking-tight leading-tight">
          Join the <span className="text-[#0F1F3D]">MyAngan</span> Priority Circle
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
          Be the first to list premium builder floors, access exclusive renter leads, or source curated executive housing for your team in Gurugram & South Delhi.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Why Join Benefits */}
        <div className="space-y-6">
          <h2 className="font-display font-bold text-slate-800 text-lg">Why join our priority list?</h2>
          
          <div className="space-y-4">
            {/* Benefit 1 */}
            <div className="flex gap-3">
              <div className="p-1 bg-orange-100 text-orange-600 rounded-lg shrink-0 h-7 w-7 flex items-center justify-center">
                ✓
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Landlords: Early Access Benefits</h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                  Get premium placement for your properties and receive high-intent renter leads directly on WhatsApp with zero launch-month listing fees.
                </p>
              </div>
            </div>

            {/* Benefit 2 */}
            <div className="flex gap-3">
              <div className="p-1 bg-orange-100 text-orange-600 rounded-lg shrink-0 h-7 w-7 flex items-center justify-center">
                ✓
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Brokers: Boost Lead Conversions</h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                  List up to 15 properties simultaneously. Each of your listings will show your official verified broker agency badge to enhance credibility.
                </p>
              </div>
            </div>

            {/* Benefit 3 */}
            <div className="flex gap-3">
              <div className="p-1 bg-orange-100 text-orange-600 rounded-lg shrink-0 h-7 w-7 flex items-center justify-center">
                ✓
              </div>
              <div>
                <h4 className="font-bold text-slate-800 text-xs sm:text-sm">Corporate HRs: Sourced Placements</h4>
                <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
                  Connect with a dedicated representative to curate corporate housings, guesthouses, or premium expat rentals in gated societies with single-vendor invoices.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Waitlist submission form card */}
        <div className="bg-white border border-slate-100 shadow-2xl rounded-3xl p-6 sm:p-8 relative overflow-hidden">
          {success ? (
            <div className="text-center py-8 space-y-4 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display font-extrabold text-slate-800 text-lg">You are on the list!</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                  Thank you for joining our NCR Priority Circle. Our onboarding manager will connect with you via your submitted coordinates within 48 hours.
                </p>
              </div>
              <button
                onClick={() => setSuccess(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Submit another request
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="font-display font-bold text-slate-800 text-sm border-b border-slate-50 pb-2">Join Waitlist Registry</h3>

              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">Your Name</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Vikram Singh"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                    required
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-2.5 top-3.5" />
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">Email or Phone Coordinate</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. hr@horizonrealty.co"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                    required
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-2.5 top-3.5" />
                </div>
              </div>

              {/* Stakeholder Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">I am a:</label>
                <div className="grid grid-cols-1 gap-2 text-xs">
                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    role === 'landlord' ? 'bg-orange-50/50 border-orange-400 text-orange-900 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/50'
                  }`}>
                    <input
                      type="radio"
                      name="waitlist_role"
                      checked={role === 'landlord'}
                      onChange={() => setRole('landlord')}
                      className="accent-orange-500 cursor-pointer"
                    />
                    <div>
                      <span>Property Landlord</span>
                      <p className="text-[10px] text-slate-400 font-normal mt-0.5">I own floors or apartments in South Delhi / Gurugram</p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    role === 'broker' ? 'bg-orange-50/50 border-orange-400 text-orange-900 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/50'
                  }`}>
                    <input
                      type="radio"
                      name="waitlist_role"
                      checked={role === 'broker'}
                      onChange={() => setRole('broker')}
                      className="accent-orange-500 cursor-pointer"
                    />
                    <div>
                      <span>Independent Broker</span>
                      <p className="text-[10px] text-slate-400 font-normal mt-0.5">I manage multiple premium listings for landlords</p>
                    </div>
                  </label>

                  <label className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    role === 'corporate_hr' ? 'bg-orange-50/50 border-orange-400 text-orange-900 font-semibold' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/50'
                  }`}>
                    <input
                      type="radio"
                      name="waitlist_role"
                      checked={role === 'corporate_hr'}
                      onChange={() => setRole('corporate_hr')}
                      className="accent-orange-500 cursor-pointer"
                    />
                    <div>
                      <span>Corporate HR Manager</span>
                      <p className="text-[10px] text-slate-400 font-normal mt-0.5">I procure relocation housing for business teams</p>
                    </div>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#0F1F3D] hover:bg-[#1b2f54] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors mt-2"
              >
                {loading ? 'Submitting registry...' : 'Register Priority Onboarding'}
              </button>

              <div className="flex items-center justify-center gap-1 text-[10px] text-slate-400 font-mono pt-1 text-center">
                <ShieldCheck className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>Zero spam. No setup fees. Data is secure.</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
