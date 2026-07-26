/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Broker } from '../../types';
import { dbService } from '../../lib/db';
import { Users, Search, Phone, CheckCircle2, ShieldCheck, HelpCircle, ExternalLink } from 'lucide-react';

interface BrokersViewProps {
  navigateTo: (route: string) => void;
}

export default function BrokersView({ navigateTo }: BrokersViewProps) {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    dbService.getBrokers().then((data) => {
      setBrokers(data);
      setLoading(false);
    });
  }, []);

  const filteredBrokers = brokers.filter((b) => {
    const q = searchQuery.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.agency_name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b border-slate-100 pb-5 gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-8 h-8 text-orange-500" />
            Vetted Brokers Directory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Connect directly with verified independent brokers and boutique agencies in Delhi NCR.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search broker or agency..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono">Loading NCR broker directory...</p>
        </div>
      ) : filteredBrokers.length === 0 ? (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-display font-bold text-slate-800 text-sm">No brokers found</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            No broker profiles match your search criteria. Try searching for "Sharma" or "Malik".
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBrokers.map((b) => (
            <div
              key={b.id}
              className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-200 transition-all duration-300 space-y-4 relative flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header Profile Info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold text-lg border border-orange-100 shrink-0">
                      {b.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <h3 className="font-display font-bold text-slate-800 text-sm leading-tight">{b.name}</h3>
                        {b.is_verified && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-orange-500 fill-orange-500/10 shrink-0" title="Vetted Broker Agent" />
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">{b.agency_name}</p>
                    </div>
                  </div>

                  <span className="text-[9px] font-mono font-bold bg-[#0F1F3D]/10 text-[#0F1F3D] px-2 py-0.5 rounded shrink-0">
                    {b.active_listings_count} Live List{b.active_listings_count !== 1 && 's'}
                  </span>
                </div>

                {/* Info summary */}
                <div className="text-xs text-slate-500 space-y-1 pt-1">
                  <p>Specialization: <span className="font-medium text-slate-700">South Delhi Sectors & DLF Phases</span></p>
                  <p>Deals closed: <span className="font-medium text-slate-700">50+ successful renters placed</span></p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-50">
                <a
                  href={`tel:${b.phone}`}
                  className="flex-1 py-2 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg text-center flex items-center justify-center gap-1 transition-colors"
                >
                  <Phone className="w-3 h-3 text-slate-400" />
                  <span>Call Agent</span>
                </a>
                
                <button
                  onClick={() => {
                    const formattedWhatsapp = b.whatsapp.replace(/[^0-9]/g, '');
                    const leadText = encodeURIComponent(`Namaste ${b.name}, I found your agency profile on MyAngan. I am looking for a rental flat in Gurugram / South Delhi. Please share some of your active properties.`);
                    window.open(`https://wa.me/${formattedWhatsapp}?text=${leadText}`, '_blank');
                  }}
                  className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg text-center flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span>Chat on WhatsApp</span>
                  <ExternalLink className="w-3 h-3 text-emerald-400 shrink-0" />
                </button>
              </div>

              {b.is_verified && (
                <div className="absolute -top-1.5 -right-1.5 p-1 bg-blue-50 border border-blue-200 rounded-full text-blue-600 shadow-xs" title="Identity Vetted By Admin">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Trust banner */}
      <div className="bg-[#0F1F3D] text-white p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-display font-bold text-sm">Are you a registered broker or landlord agent in Gurugram?</h4>
            <p className="text-[11px] text-slate-300">Join our vetted list to gain visibility, display custom profiles, and direct renter logs.</p>
          </div>
        </div>
        <button
          onClick={() => navigateTo('waitlist')}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold shrink-0 shadow cursor-pointer transition-colors"
        >
          Register Agency
        </button>
      </div>
    </div>
  );
}
