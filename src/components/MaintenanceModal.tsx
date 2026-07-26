/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Wrench, X, CheckCircle2, AlertCircle, Clock, Send, ShieldAlert } from 'lucide-react';

interface MaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MaintenanceModal({ isOpen, onClose }: MaintenanceModalProps) {
  const [category, setCategory] = useState('plumbing');
  const [priority, setPriority] = useState<'normal' | 'urgent' | 'emergency'>('normal');
  const [description, setDescription] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [ticketId, setTicketId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    const newId = `TKT-${Math.floor(100000 + Math.random() * 900000)}`;
    setTicketId(newId);
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white text-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/20 border border-orange-500/30 rounded-xl text-orange-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg">MyAngan Maintenance OS</h3>
              <p className="text-xs text-slate-400">24/7 SLA-tracked repair & service ticketing</p>
            </div>
          </div>
          <button
            onClick={() => {
              setSubmitted(false);
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Issue Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              >
                <option value="plumbing">Plumbing & Water Supply</option>
                <option value="electrical">Electrical & Lighting</option>
                <option value="appliance">Appliance Repair (AC, Geyser, RO)</option>
                <option value="carpentry">Carpentry & Door Lock</option>
                <option value="painting">Painting & Deep Cleaning</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Priority / Urgency
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['normal', 'urgent', 'emergency'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition-all border cursor-pointer ${
                      priority === p
                        ? p === 'emergency'
                          ? 'bg-red-500 text-white border-red-600 shadow-sm'
                          : p === 'urgent'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm'
                          : 'bg-orange-500 text-white border-orange-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Issue Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the maintenance issue in detail (e.g. Master bathroom geyser not heating water)..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                required
              />
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs text-orange-900 flex items-start gap-2">
              <Clock className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <span>
                <strong>MyAngan SLA Guarantee:</strong> Service partner assigned within 4 hours for Urgent, and 60 minutes for Emergency requests.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Submit Maintenance Ticket
              </button>
            </div>
          </form>
        ) : (
          <div className="p-8 text-center space-y-4">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="font-display font-extrabold text-xl text-slate-900">Ticket Created Successfully</h4>
              <p className="text-xs font-mono text-slate-500 mt-1">Ticket Reference: <strong className="text-slate-900">{ticketId}</strong></p>
            </div>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              Our verified service technician has been notified and will reach out to schedule an inspection.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setDescription('');
                onClose();
              }}
              className="px-6 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
