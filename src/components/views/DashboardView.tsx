/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Property, Lead, UserProfile, PropertyStatus } from '../../types';
import { dbService } from '../../lib/db';
import { LayoutDashboard, CheckCircle2, AlertCircle, Trash2, Home, MessageSquare, Phone, Clock, Plus, RefreshCw, X } from 'lucide-react';
import RazorpayModal from '../RazorpayModal';
import { Star, Sparkles, ShieldCheck } from 'lucide-react';

interface DashboardViewProps {
  navigateTo: (route: string, params?: any) => void;
  currentUser: UserProfile | null;
  onOpenMaintenance?: () => void;
}

export default function DashboardView({ navigateTo, currentUser, onOpenMaintenance }: DashboardViewProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Subscription Flow States
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);
  const [localUser, setLocalUser] = useState<UserProfile | null>(currentUser);

  useEffect(() => {
    setLocalUser(currentUser);
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

  // Quick edit modal
  const [editingProp, setEditingProp] = useState<Property | null>(null);
  const [editStatus, setEditStatus] = useState<PropertyStatus>('active');

  const fetchDashboardData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const pData = await dbService.getOwnerProperties(currentUser.id);
      const lData = await dbService.getLeadsForOwnerOrAdmin(currentUser.id, currentUser.role);
      setProperties(pData);
      setLeads(lData);
    } catch (err: any) {
      console.error(err);
      setError('An error occurred while loading your dashboard.');
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
    const allowedRoles = ['owner', 'broker', 'landlord', 'admin', 'landlord_broker'];
    if (!allowedRoles.includes(currentUser.role) || currentUser.role === 'renter') {
      navigateTo('properties');
      return;
    }
    fetchDashboardData();
  }, [currentUser]);

  const handleStatusChange = async (propertyId: string, newStatus: PropertyStatus) => {
    try {
      await dbService.updateProperty(propertyId, { status: newStatus });
      // Refresh local list
      setProperties(prev => prev.map(p => p.id === propertyId ? { ...p, status: newStatus } : p));
      setEditingProp(null);
    } catch (err) {
      console.error(err);
      alert('Failed to update property status.');
    }
  };

  const handleDelete = async (propertyId: string) => {
    if (!confirm('Are you absolutely sure you want to permanently delete this listing? This action cannot be undone.')) {
      return;
    }

    try {
      await dbService.deleteProperty(propertyId);
      setProperties(prev => prev.filter(p => p.id !== propertyId));
      alert('Property deleted successfully.');
    } catch (err) {
      console.error(err);
      alert('Failed to delete property.');
    }
  };

  const getStatusBadge = (status: PropertyStatus) => {
    if (status === 'rented') {
      return (
        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded uppercase">
          Rented out
        </span>
      );
    }
    if (status === 'inactive') {
      return (
        <span className="text-[10px] font-mono font-bold bg-red-50 text-red-600 border border-red-100 px-2 py-0.5 rounded uppercase">
          Inactive
        </span>
      );
    }
    return (
      <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded uppercase">
        Active Listings
      </span>
    );
  };

  if (!currentUser || (currentUser.role !== 'landlord_broker' && currentUser.role !== 'admin')) return null;

  // Stats calculation
  const totalListings = properties.length;
  const activeCount = properties.filter(p => p.status === 'active').length;
  const rentedCount = properties.filter(p => p.status === 'rented').length;
  const verifiedCount = properties.filter(p => p.is_verified).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="text-orange-500 w-8 h-8" />
            Landlord Broker Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage your rental listings, update availability, and review inquiries in real time.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {onOpenMaintenance && (
            <button
              onClick={onOpenMaintenance}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Clock className="w-4 h-4 text-orange-400" />
              <span>Maintenance OS</span>
            </button>
          )}
          <button
            onClick={() => navigateTo('lease-agreement')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center gap-2 border border-slate-200 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-orange-600" />
            <span>e-Agreement</span>
          </button>
          <button
            onClick={() => navigateTo('post-property')}
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl flex items-center gap-2 shadow-md hover:shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post a Property</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-4 rounded-xl">
          {error}
        </div>
      )}

      {/* Stats Summary Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Total Listed</span>
          <span className="text-3xl font-display font-extrabold text-slate-800 block">{totalListings}</span>
          <span className="text-[10px] text-slate-400 font-mono">All posted properties</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Active</span>
          <span className="text-3xl font-display font-extrabold text-emerald-600 block">{activeCount}</span>
          <span className="text-[10px] text-slate-400 font-mono">Live & searchable</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Rented Out</span>
          <span className="text-3xl font-display font-extrabold text-orange-500 block">{rentedCount}</span>
          <span className="text-[10px] text-slate-400 font-mono">Completed deals</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-1">
          <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Verified Portal</span>
          <span className="text-3xl font-display font-extrabold text-blue-600 block">{verifiedCount}</span>
          <span className="text-[10px] text-slate-400 font-mono">Trust score: {totalListings ? Math.round((verifiedCount/totalListings)*100) : 0}%</span>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-slate-500 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-mono">Loading landlord details...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left 2 Columns: Properties list */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-display font-bold text-slate-900 border-b border-slate-50 pb-2">
              Your Rental Properties ({properties.length})
            </h2>

            {properties.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center space-y-4">
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                  <Home className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-slate-800 text-sm">No properties posted yet</h3>
                  <p className="text-xs text-slate-500">List your property in Gurugram or South Delhi for free and start receiving inquiries.</p>
                </div>
                <button
                  onClick={() => navigateTo('post-property')}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-bold cursor-pointer"
                >
                  Post a Property
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {properties.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between hover:shadow-xs transition-shadow"
                  >
                    <div className="flex gap-4 items-center cursor-pointer" onClick={() => navigateTo('property-detail', { id: p.id })}>
                      <img
                        src={p.image_urls[0]}
                        alt=""
                        className="w-20 h-16 rounded-lg object-cover shrink-0 border border-slate-50"
                        referrerPolicy="no-referrer"
                      />
                      <div className="space-y-1">
                        <h4 className="font-display font-bold text-slate-800 text-sm hover:text-orange-500 transition-colors">{p.title}</h4>
                        <p className="text-[11px] text-slate-500">{p.locality}, {p.city}</p>
                        <div className="flex flex-wrap gap-2 items-center pt-1.5">
                          {getStatusBadge(p.status)}
                          <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                            (p as any).approval_status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            (p as any).approval_status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                            (p as any).approval_status === 'changes_requested' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            Review: {(p as any).approval_status || 'pending_review'}
                          </span>
                          {p.is_verified && (
                            <span className="text-[9px] font-mono font-bold bg-blue-50 text-blue-600 border border-blue-100 px-1.5 py-0.5 rounded">
                              Verified
                            </span>
                          )}
                        </div>
                        {(p as any).review_notes && (
                          <p className="text-[11px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-100 mt-1 font-mono">
                            <strong>Admin Feedback:</strong> {(p as any).review_notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="flex gap-2 items-center w-full sm:w-auto shrink-0 justify-end border-t sm:border-t-0 pt-3 sm:pt-0">
                      {((p as any).approval_status === 'changes_requested' || (p as any).approval_status === 'rejected') && (
                        <button
                          onClick={async () => {
                            try {
                              await dbService.resubmitProperty(p.id);
                              alert('Property resubmitted for review successfully.');
                              const props = await dbService.getOwnerProperties(currentUser.id);
                              setProperties(props);
                            } catch (err: any) {
                              alert(err.message || 'Failed to resubmit property.');
                            }
                          }}
                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <RefreshCw className="w-3.5 h-3.5" /> Resubmit
                        </button>
                      )}
                      <button
                        onClick={() => { setEditingProp(p); setEditStatus(p.status); }}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 cursor-pointer flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-slate-400" /> Status
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 hover:bg-red-50 text-red-600 hover:border-red-200 border border-transparent rounded-lg cursor-pointer"
                        title="Delete Property"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Lead inquiries list */}
          <div className="space-y-6">
            
            {/* Broker Premium Card */}
            <div className={`p-6 rounded-2xl border ${
              localUser?.is_subscribed 
                ? 'bg-amber-50/40 border-amber-200 shadow-xs' 
                : 'bg-white border-slate-100 shadow-xs'
            } space-y-4`}>
              {localUser?.is_subscribed ? (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                      <h3 className="font-display font-bold text-slate-900 text-sm">Premium Broker Plan</h3>
                    </div>
                    <span className="text-[9px] font-mono font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Active
                    </span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-600">
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Unlimited active listings unlocked</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>Featured badge active on listings (first 7 days)</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-3">
                      Subscribed on: {localUser.subscribed_at ? new Date(localUser.subscribed_at).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-5 h-5 text-orange-500" />
                      <h3 className="font-display font-bold text-slate-800 text-sm">Upgrade to Broker Plan</h3>
                    </div>
                    <span className="text-[11px] font-bold text-orange-500 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-md">₹999/mo</span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Unlock premium capabilities and amplify your listing reach across Delhi NCR:
                  </p>
                  <div className="space-y-3 text-xs text-slate-600">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-800">Unlimited Active Listings</span>
                        <p className="text-[10px] text-slate-500">Free accounts are capped at 3 active properties (Using {activeCount}/3)</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-800">Premium "Featured" Badge</span>
                        <p className="text-[10px] text-slate-500">Highlight new listings for 7 days with top search priority</p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsRazorpayOpen(true)}
                    className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-white" />
                    <span>Upgrade to Broker Plan</span>
                  </button>
                </>
              )}
            </div>

            <h2 className="text-lg font-display font-bold text-slate-900 border-b border-slate-50 pb-2">
              Recent Renter Leads ({leads.length})
            </h2>

            {leads.length === 0 ? (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center space-y-2">
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h4 className="font-display font-bold text-slate-700 text-xs">No inquiries logged yet</h4>
                <p className="text-[10px] text-slate-400">Inquiries submitted by renters on your listings appear here instantly.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {leads.map((l) => (
                  <div
                    key={l.id}
                    className="bg-white border border-slate-100 rounded-xl p-4 space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">{l.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {new Date(l.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <button
                        onClick={() => {
                          const formattedPhone = l.phone.replace(/[^0-9]/g, '');
                          const replyText = encodeURIComponent(`Hi ${l.name}, thank you for inquiring about my listing "${l.property_title}" on MyAngan. Please let me know when we can discuss details.`);
                          window.open(`https://wa.me/${formattedPhone}?text=${replyText}`, '_blank');
                        }}
                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 text-[10px] font-bold rounded flex items-center gap-1 cursor-pointer"
                        title="Chat on WhatsApp"
                      >
                        <Phone className="w-3 h-3" /> Reply Chat
                      </button>
                    </div>

                    <div className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-100 italic">
                      "{l.message}"
                    </div>

                    <div className="text-[10px] text-slate-400">
                      Property: <span className="font-semibold text-slate-700 truncate inline-block max-w-[180px] align-bottom">{l.property_title}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Edit Status Modal */}
      {editingProp && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-100 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
              <h3 className="font-display font-bold text-slate-800 text-sm">Update Property Availability</h3>
              <button onClick={() => setEditingProp(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <p className="text-xs text-slate-500">
              Change the status of <span className="font-semibold text-slate-800">"{editingProp.title}"</span>. Marked rented items won't be visible in public listings.
            </p>

            <div className="space-y-2">
              <button
                onClick={() => handleStatusChange(editingProp.id, 'active')}
                className={`w-full text-left p-3 rounded-lg border text-xs font-semibold flex items-center justify-between cursor-pointer ${
                  editStatus === 'active' ? 'bg-emerald-50 border-emerald-400 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <span>Active (Available for Rent)</span>
                {editStatus === 'active' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
              </button>

              <button
                onClick={() => handleStatusChange(editingProp.id, 'rented')}
                className={`w-full text-left p-3 rounded-lg border text-xs font-semibold flex items-center justify-between cursor-pointer ${
                  editStatus === 'rented' ? 'bg-slate-50 border-orange-400 text-orange-800' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <span>Rented Out (Hide from listings)</span>
                {editStatus === 'rented' && <CheckCircle2 className="w-4 h-4 text-orange-500" />}
              </button>

              <button
                onClick={() => handleStatusChange(editingProp.id, 'inactive')}
                className={`w-full text-left p-3 rounded-lg border text-xs font-semibold flex items-center justify-between cursor-pointer ${
                  editStatus === 'inactive' ? 'bg-red-50 border-red-300 text-red-800' : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                <span>Deactivated (Hidden)</span>
                {editStatus === 'inactive' && <CheckCircle2 className="w-4 h-4 text-red-600" />}
              </button>
            </div>
          </div>
        </div>
      )}

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
