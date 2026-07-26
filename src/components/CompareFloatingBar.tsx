/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Property } from '../types';
import { dbService } from '../lib/db';
import { ArrowLeftRight, X, Sparkles } from 'lucide-react';

interface CompareFloatingBarProps {
  compareIds: string[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onCompareNow: () => void;
}

export default function CompareFloatingBar({
  compareIds,
  onRemove,
  onClear,
  onCompareNow
}: CompareFloatingBarProps) {
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    const loadProps = async () => {
      if (compareIds.length === 0) {
        setProperties([]);
        return;
      }
      try {
        const all = await dbService.getProperties();
        const filtered = all.filter((p) => compareIds.includes(p.id));
        setProperties(filtered);
      } catch (err) {
        console.error('Error loading compared properties:', err);
      }
    };
    loadProps();
  }, [compareIds]);

  if (compareIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-2xl bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 p-4 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* List of property thumbnails */}
      <div className="flex flex-col gap-1.5 w-full sm:w-auto">
        <div className="flex items-center gap-2">
          <span className="p-1 bg-amber-500 rounded text-slate-900">
            <ArrowLeftRight className="w-3.5 h-3.5 font-bold" />
          </span>
          <span className="font-display font-bold text-sm tracking-tight">
            Compare Properties ({compareIds.length}/4)
          </span>
        </div>
        
        {/* Thumbnails row */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {properties.map((p) => (
            <div key={p.id} className="group relative flex items-center bg-slate-800 border border-slate-700/50 rounded-lg p-1 pr-2.5 max-w-[160px] truncate">
              <img
                src={p.image_urls[0] || 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=100&q=80'}
                alt={p.title}
                className="w-7 h-7 object-cover rounded-md shrink-0"
                referrerPolicy="no-referrer"
              />
              <span className="text-[10px] font-medium ml-1.5 truncate text-slate-200">
                {p.title}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(p.id);
                }}
                className="ml-1.5 p-0.5 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                title="Remove"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
          {compareIds.length < 2 && (
            <span className="text-[10px] text-slate-400 italic">
              Add at least 1 more to compare...
            </span>
          )}
        </div>
      </div>

      {/* Primary Actions */}
      <div className="flex items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
        <button
          onClick={onClear}
          className="text-xs text-slate-400 hover:text-white transition-colors py-2 px-3 cursor-pointer font-medium"
        >
          Clear
        </button>

        <button
          onClick={onCompareNow}
          disabled={compareIds.length < 2}
          className="w-full sm:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-800 disabled:text-slate-500 disabled:border-slate-700 border border-transparent text-slate-900 font-bold text-xs rounded-xl shadow-md disabled:shadow-none transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          title={compareIds.length < 2 ? 'Select at least 2 properties to compare' : 'Compare selected side-by-side'}
        >
          <span>Compare Now</span>
          <ArrowLeftRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
