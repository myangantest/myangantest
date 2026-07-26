/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Property, Lead, WaitlistEntry, UserProfile, UserRole } from '../../types';
import { dbService } from '../../lib/db';
import { Shield, CheckCircle2, AlertTriangle, Eye, Check, X, FileSpreadsheet, Users, Home, Clock, MessageSquare, Phone, Globe, Database } from 'lucide-react';
import SeoAdminView from './SeoAdminView';
import MigrationView from './MigrationView';

interface AdminViewProps {
  navigateTo: (route: string, params?: any) => void;
  currentUser: UserProfile | null;
}

export default function AdminView({ navigateTo, currentUser }: AdminViewProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Admin Sub-tab
  const [activeTab, setActiveTab] = useState<'properties' | 'leads' | 'waitlist' | 'seo' | 'migration'>('properties');

  const fetchAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const pData = await dbService.getAdminAllProperties();
      const lData = await dbService.getLeadsForOwnerOrAdmin('', 'admin');
      const wData = await dbService.getWaitlistEntries();
      
      setProperties(pData);
      setLeads(lData);
      setWaitlist(wData);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch administrator data registries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
    // Check admin permissions
    if (!currentUser || currentUser.role !== 'admin') {
      navigateTo('auth');
      return;
    }
    fetchAdminData();
  }, [currentUser]);

  const handleToggleVerify = async (propertyId: string, currentVerified: boolean) => {
    try {
      await dbService.updateProperty(propertyId, { is_verified: !currentVerified });
      // Update local state
      setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, is_verified: !currentVerified } : p));
    } catch (err) {
      console.error(err);
      alert('Failed to toggle property verification.');
    }
  };

  const getRoleLabel = (role: string) => {
    if (role === 'corporate_hr') return 'Corporate HR';
    if (role === 'landlord') return 'Landlord';
    return 'Real Estate Broker';
  };

  if (!currentUser || currentUser.role !== 'admin') return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Shield className="w-8 h-8 text-orange-500" />
            Super Admin Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 font-mono uppercase tracking-wider">
            Secured Database Registry Management Console
          </p>
        </div>

        {/* Dynamic Sync Trigger */}
        <button
          onClick={fetchAdminData}
          className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-colors"
        >
          <RefreshIcon className="w-3.5 h-3.5" />
          <span>Synchronize Tables</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-4 rounded-xl">
          {error}
        </div>
      )}

      {/* Admin Bento Quick Counts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <button
          onClick={() => setActiveTab('properties')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'properties'
              ? 'bg-[#0F1F3D] text-white border-[#0F1F3D]'
              : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Home className="w-5 h-5 text-orange-500 mb-2" />
          <span className="text-[10px] uppercase font-mono block tracking-wider opacity-85">Manage Listings</span>
          <span className="text-2xl font-display font-extrabold block">{properties.length}</span>
          <span className="text-[9px] text-slate-400 font-mono block mt-1">
            {properties.filter(p => !p.is_verified).length} awaiting approval
          </span>
        </button>

        <button
          onClick={() => setActiveTab('leads')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'leads'
              ? 'bg-[#0F1F3D] text-white border-[#0F1F3D]'
              : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <MessageSquare className="w-5 h-5 text-orange-500 mb-2" />
          <span className="text-[10px] uppercase font-mono block tracking-wider opacity-85">Global Leads</span>
          <span className="text-2xl font-display font-extrabold block">{leads.length}</span>
          <span className="text-[9px] text-slate-400 font-mono block mt-1">Direct customer logs</span>
        </button>

        <button
          onClick={() => setActiveTab('waitlist')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'waitlist'
              ? 'bg-[#0F1F3D] text-white border-[#0F1F3D]'
              : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Users className="w-5 h-5 text-orange-500 mb-2" />
          <span className="text-[10px] uppercase font-mono block tracking-wider opacity-85">Launch Waitlist</span>
          <span className="text-2xl font-display font-extrabold block">{waitlist.length}</span>
          <span className="text-[9px] text-slate-400 font-mono block mt-1">B2B & corporate contacts</span>
        </button>

        <button
          onClick={() => setActiveTab('seo')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'seo'
              ? 'bg-[#0F1F3D] text-white border-[#0F1F3D]'
              : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Globe className="w-5 h-5 text-orange-500 mb-2" />
          <span className="text-[10px] uppercase font-mono block tracking-wider opacity-85">SEO Management</span>
          <span className="text-2xl font-display font-extrabold block">15</span>
          <span className="text-[9px] text-slate-400 font-mono block mt-1">Active search directories</span>
        </button>

        <button
          onClick={() => setActiveTab('migration')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'migration'
              ? 'bg-[#0F1F3D] text-white border-[#0F1F3D]'
              : 'bg-white border-slate-100 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Database className="w-5 h-5 text-orange-500 mb-2" />
          <span className="text-[10px] uppercase font-mono block tracking-wider opacity-85 font-bold">Data Migration</span>
          <span className="text-2xl font-display font-extrabold block">LocalStorage</span>
          <span className="text-[9px] text-slate-400 font-mono block mt-1">Audit &amp; Sync Engine</span>
        </button>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-500 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono">Loading admin registries...</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          
          {/* TAB 1: PROPERTIES APPROVAL TABLE */}
          {activeTab === 'properties' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Image & Title</th>
                    <th className="py-3 px-4">Owner ID</th>
                    <th className="py-3 px-4">Locality & City</th>
                    <th className="py-3 px-4">Rent (INR)</th>
                    <th className="py-3 px-4 text-center">Status Badge</th>
                    <th className="py-3 px-4 text-right">Verification Toggle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {properties.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-3">
                          <img src={p.image_urls[0]} alt="" className="w-12 h-10 rounded object-cover shrink-0 border" referrerPolicy="no-referrer" />
                          <button
                            onClick={() => navigateTo('property-detail', { id: p.id })}
                            className="font-bold text-slate-800 hover:text-orange-500 transition-colors text-left"
                          >
                            {p.title}
                          </button>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-mono text-slate-400 text-[10px]">{p.owner_id.substr(0, 8)}...</td>
                      <td className="py-4 px-4 text-slate-600 font-medium">{p.locality}, {p.city}</td>
                      <td className="py-4 px-4 font-bold text-slate-800">₹{p.rent_amount.toLocaleString()}</td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          p.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => handleToggleVerify(p.id, p.is_verified)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                            p.is_verified
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                          }`}
                        >
                          {p.is_verified ? '✓ Approved/Verified' : 'Verify Listing'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: GLOBAL LEADS LOGS */}
          {activeTab === 'leads' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Lead Inquirer Name</th>
                    <th className="py-3 px-4">Phone Number</th>
                    <th className="py-3 px-4">Associated Listing</th>
                    <th className="py-3 px-4">Message Context</th>
                    <th className="py-3 px-4 text-right">Inquiry Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {leads.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-800">{l.name}</td>
                      <td className="py-4 px-4 font-mono text-slate-600">
                        <a href={`tel:${l.phone}`} className="hover:underline text-blue-600 flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 shrink-0 text-slate-400" /> {l.phone}
                        </a>
                      </td>
                      <td className="py-4 px-4 font-semibold text-slate-700">
                        <button
                          onClick={() => navigateTo('property-detail', { id: l.property_id })}
                          className="hover:text-orange-500 hover:underline text-left"
                        >
                          {l.property_title || 'View Property'}
                        </button>
                      </td>
                      <td className="py-4 px-4 text-slate-500 max-w-xs truncate italic">"{l.message}"</td>
                      <td className="py-4 px-4 text-right font-mono text-slate-400 text-[10px]">
                        {new Date(l.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: WAITLIST APPLICATIONS */}
          {activeTab === 'waitlist' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Applicant Contact Name</th>
                    <th className="py-3 px-4">Contact Phone or Email</th>
                    <th className="py-3 px-4">Stakeholder Role</th>
                    <th className="py-3 px-4 text-right">Registry Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {waitlist.map((w) => (
                    <tr key={w.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-800">{w.name}</td>
                      <td className="py-4 px-4 font-mono text-slate-700 font-semibold">{w.contact}</td>
                      <td className="py-4 px-4">
                        <span className="px-2.5 py-1 text-[10px] font-bold bg-orange-50 text-orange-800 border border-orange-100 rounded">
                          {getRoleLabel(w.role)}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-slate-400 text-[10px]">
                        {new Date(w.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 4: SEO LANDING PAGES AND METADATA */}
          {activeTab === 'seo' && (
            <div className="p-6">
              <SeoAdminView />
            </div>
          )}

          {/* TAB 5: LEGACY LOCALSTORAGE DATA MIGRATION */}
          {activeTab === 'migration' && (
            <div className="p-6">
              <MigrationView currentUser={currentUser} />
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// Small Icon Helpers
function RefreshIcon(props: React.SVGProps<SVGSVGElement>) {
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
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  );
}
