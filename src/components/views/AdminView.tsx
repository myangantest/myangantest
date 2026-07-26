/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Complete Administrator Dashboard (/admin/dashboard)
 */

import React, { useState, useEffect } from 'react';
import { 
  Shield, CheckCircle2, AlertTriangle, Eye, Check, X, Users, Home, Clock, 
  Search, RefreshCw, FileText, Activity, AlertCircle, RotateCcw, Ban, Edit3 
} from 'lucide-react';
import { dbService } from '../../lib/db';
import { UserProfile, Property } from '../../types';

interface AdminViewProps {
  navigateTo: (route: string, params?: any) => void;
  currentUser: UserProfile | null;
}

export default function AdminView({ navigateTo, currentUser }: AdminViewProps) {
  const [activeTab, setActiveTab] = useState<'providers' | 'pending_listings' | 'approved_listings' | 'rejected_listings' | 'suspended_listings' | 'audit_logs'>('providers');
  
  const [providers, setProviders] = useState<any[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal / Review action state
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAdminData = async () => {
    if (!currentUser || ((currentUser.role as any) !== 'admin' && (currentUser.account_category as any) !== 'admin')) return;

    setLoading(true);
    setError(null);
    try {
      const pData = await dbService.adminGetPendingProviders(currentUser.email);
      const propsData = await dbService.adminGetProperties(currentUser.email, 'all');
      const logsData = await dbService.adminGetAuditLogs(currentUser.email);

      setProviders(pData);
      setProperties(propsData);
      setAuditLogs(logsData);
    } catch (err: any) {
      console.error('[Admin Dashboard Error]', err);
      setError('Failed to fetch administrator data registries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo({ top: 0 });
    if (!currentUser || ((currentUser.role as any) !== 'admin' && (currentUser.account_category as any) !== 'admin')) {
      navigateTo('admin-login');
      return;
    }
    fetchAdminData();
  }, [currentUser]);

  const handleProviderReview = async () => {
    if (!selectedItem || !reviewAction) return;

    if (['rejected', 'suspended', 'additional_information_required'].includes(reviewAction) && !reviewNotes.trim()) {
      alert('Review notes are required for this decision.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dbService.adminReviewProvider(currentUser!.email, selectedItem.id, reviewAction, reviewNotes);
      setSuccessMessage(`Provider account status updated to "${reviewAction.replace('_', ' ')}".`);
      setSelectedItem(null);
      setReviewAction(null);
      setReviewNotes('');
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update provider account status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePropertyReview = async () => {
    if (!selectedItem || !reviewAction) return;

    if (['reject', 'suspend', 'request_changes'].includes(reviewAction) && !reviewNotes.trim()) {
      alert('Review notes are required for this decision.');
      return;
    }

    setIsSubmitting(true);
    try {
      await dbService.adminReviewProperty(currentUser!.email, selectedItem.id, reviewAction, reviewNotes);
      setSuccessMessage(`Property listing decision "${reviewAction.replace('_', ' ')}" executed successfully.`);
      setSelectedItem(null);
      setReviewAction(null);
      setReviewNotes('');
      await fetchAdminData();
    } catch (err: any) {
      alert(err.message || 'Failed to update property review status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser || ((currentUser.role as any) !== 'admin' && (currentUser.account_category as any) !== 'admin')) {
    return null;
  }

  const filteredProviders = providers.filter(p => 
    p.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredProperties = (statusFilter: string) => {
    return properties.filter(p => {
      const matchStatus = statusFilter === 'all' ? true : (p.approval_status || 'pending_review') === statusFilter;
      const matchSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.locality.toLowerCase().includes(searchQuery.toLowerCase());
      return matchStatus && matchSearch;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 bg-slate-900 min-h-screen text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
            <Shield className="w-8 h-8 text-orange-500" />
            Admin Operations Console
          </h1>
          <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">
            Internal Verification &amp; Property Listing Governance
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Synchronize Queues</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Sub-tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('providers')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'providers' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Owner/Broker Reviews ({providers.filter(p => p.account_status === 'pending_verification' || !p.account_status).length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pending_listings')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'pending_listings' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pending Listings ({properties.filter(p => (p.approval_status || 'pending_review') === 'pending_review').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('approved_listings')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'approved_listings' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Approved Listings ({properties.filter(p => (p.approval_status || 'pending_review') === 'approved').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rejected_listings')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'rejected_listings' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <X className="w-4 h-4" />
          <span>Rejected Listings ({properties.filter(p => (p.approval_status || 'pending_review') === 'rejected' || (p.approval_status || 'pending_review') === 'changes_requested').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('suspended_listings')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'suspended_listings' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Ban className="w-4 h-4" />
          <span>Suspended Listings ({properties.filter(p => (p.approval_status || 'pending_review') === 'suspended').length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audit_logs')}
          className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'audit_logs' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Audit Activity ({auditLogs.length})</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, title, email or locality..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500"
        />
      </div>

      {/* TAB 1: PROVIDERS */}
      {activeTab === 'providers' && (
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-500" />
            Owner / Broker Verification Queue
          </h2>

          {filteredProviders.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No provider accounts match the filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Provider Details</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Account Status</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {filteredProviders.map(p => (
                    <tr key={p.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="py-4 px-4">
                        <div className="font-semibold text-white">{p.name || p.full_name || 'Provider Account'}</div>
                        <div className="text-slate-400">{p.email}</div>
                      </td>
                      <td className="py-4 px-4 uppercase font-mono text-[11px] text-orange-400">
                        {p.provider_type || 'Owner'}
                      </td>
                      <td className="py-4 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                          p.account_status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          p.account_status === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {p.account_status === 'approved' ? 'Owner profile reviewed' : (p.account_status || 'Verification pending')}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        {p.is_verified ? (
                          <span className="text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Reviewed &amp; Verified
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-[11px]">Verification Pending</span>
                        )}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => { setSelectedItem(p); setReviewAction('approved'); }}
                            className="px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 font-semibold transition-colors cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => { setSelectedItem(p); setReviewAction('rejected'); }}
                            className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 font-semibold transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => { setSelectedItem(p); setReviewAction('additional_information_required'); }}
                            className="px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 font-semibold transition-colors cursor-pointer"
                          >
                            Request Info
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2-5: PROPERTY LISTINGS QUEUES */}
      {['pending_listings', 'approved_listings', 'rejected_listings', 'suspended_listings'].includes(activeTab) && (
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 capitalize">
            <Home className="w-5 h-5 text-orange-500" />
            {activeTab.replace('_', ' ')} Queue
          </h2>

          {(() => {
            const statusMap: Record<string, string> = {
              pending_listings: 'pending_review',
              approved_listings: 'approved',
              rejected_listings: 'rejected',
              suspended_listings: 'suspended',
            };
            const propsList = filteredProperties(statusMap[activeTab]);

            if (propsList.length === 0) {
              return (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No property listings in this queue.
                </div>
              );
            }

            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {propsList.map(prop => (
                  <div key={prop.id} className="bg-slate-900 border border-slate-700/80 rounded-xl overflow-hidden flex flex-col justify-between p-4 space-y-4">
                    <div>
                      <div className="relative h-40 rounded-lg overflow-hidden mb-3 bg-slate-800">
                        <img
                          src={prop.image_urls?.[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80'}
                          alt={prop.title}
                          className="w-full h-full object-cover"
                        />
                        <span className={`absolute top-2 right-2 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          (prop.approval_status || 'pending_review') === 'approved' ? 'bg-emerald-500 text-white' :
                          (prop.approval_status || 'pending_review') === 'rejected' ? 'bg-red-500 text-white' :
                          'bg-amber-500 text-slate-900'
                        }`}>
                          {prop.approval_status || 'pending_review'}
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-sm line-clamp-1">{prop.title}</h3>
                      <p className="text-xs text-slate-400">{prop.locality}, {prop.city}</p>
                      <p className="text-sm font-bold text-emerald-400 mt-2">₹{prop.rent_amount.toLocaleString('en-IN')}/month</p>
                      {prop.review_notes && (
                        <div className="mt-2 text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                          <strong>Admin Notes:</strong> {prop.review_notes}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
                      {activeTab === 'pending_listings' && (
                        <>
                          <button
                            onClick={() => { setSelectedItem(prop); setReviewAction('approve'); }}
                            className="flex-1 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 text-xs font-semibold cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => { setSelectedItem(prop); setReviewAction('reject'); }}
                            className="flex-1 py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 text-xs font-semibold cursor-pointer"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => { setSelectedItem(prop); setReviewAction('request_changes'); }}
                            className="w-full py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg hover:bg-amber-500/20 text-xs font-semibold cursor-pointer"
                          >
                            Request Changes
                          </button>
                        </>
                      )}

                      {activeTab === 'approved_listings' && (
                        <button
                          onClick={() => { setSelectedItem(prop); setReviewAction('suspend'); }}
                          className="w-full py-1.5 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 text-xs font-semibold cursor-pointer"
                        >
                          Suspend Listing
                        </button>
                      )}

                      {(activeTab === 'rejected_listings' || activeTab === 'suspended_listings') && (
                        <button
                          onClick={() => { setSelectedItem(prop); setReviewAction('restore'); }}
                          className="w-full py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 text-xs font-semibold cursor-pointer"
                        >
                          Restore Listing
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* TAB 6: AUDIT LOGS */}
      {activeTab === 'audit_logs' && (
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-500" />
            Administrative Audit Log Stream
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono tracking-wider border-b border-slate-700">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Type</th>
                  <th className="py-3 px-4">Target ID</th>
                  <th className="py-3 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {auditLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-700/30 font-mono text-[11px]">
                    <td className="py-3 px-4 text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                    <td className="py-3 px-4 text-orange-400 font-bold">{log.action}</td>
                    <td className="py-3 px-4 text-slate-300">{log.target_type || '-'}</td>
                    <td className="py-3 px-4 text-slate-400">{log.target_id || '-'}</td>
                    <td className="py-3 px-4 text-slate-400 truncate max-w-xs">{JSON.stringify(log.details || {})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL FOR CONFIRMATION & REVIEW NOTES */}
      {selectedItem && reviewAction && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 max-w-md w-full rounded-2xl p-6 space-y-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white capitalize">
              Confirm Decision: {reviewAction.replace('_', ' ')}
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Review Notes / Reason {['rejected', 'suspended', 'request_changes', 'additional_information_required'].includes(reviewAction) ? '(Required)' : '(Optional)'}
              </label>
              <textarea
                rows={4}
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Provide official review feedback..."
                className="w-full p-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-500 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setSelectedItem(null); setReviewAction(null); }}
                className="flex-1 py-2.5 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={activeTab === 'providers' ? handleProviderReview : handlePropertyReview}
                className="flex-1 py-2.5 bg-orange-500 text-white hover:bg-orange-600 rounded-xl text-xs font-semibold transition-colors shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Decision'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
