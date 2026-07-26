import React, { useState } from 'react';
import { Building2, Briefcase, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { UserProfile } from '../../types';
import { dbService } from '../../lib/db';

interface OnboardingViewProps {
  currentUser: UserProfile | null;
  navigateTo: (route: string, params?: any) => void;
  onAuthSuccess: (user: UserProfile) => void;
}

export default function OnboardingView({ currentUser, navigateTo, onAuthSuccess }: OnboardingViewProps) {
  const [selectedType, setSelectedType] = useState<'owner' | 'broker'>('owner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCompleteOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      navigateTo('auth');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const updatedUser = await dbService.completeOnboarding(selectedType);
      onAuthSuccess(updatedUser);
      navigateTo('dashboard');
    } catch (err: any) {
      console.error('Onboarding submission error:', err);
      setError(err.message || 'Failed to complete onboarding.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 text-orange-600 rounded-full mb-3">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold font-display text-slate-900">Complete Your Landlord / Broker Profile</h1>
          <p className="text-slate-500 text-sm mt-1">
            Please specify your primary role to customize your MyAngan management tools.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleCompleteOnboarding} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Owner Option Card */}
            <div
              onClick={() => setSelectedType('owner')}
              className={`cursor-pointer p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between ${
                selectedType === 'owner'
                  ? 'border-orange-500 bg-orange-50/40 shadow-md ring-2 ring-orange-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${selectedType === 'owner' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Building2 className="w-6 h-6" />
                  </div>
                  {selectedType === 'owner' && <CheckCircle2 className="w-6 h-6 text-orange-500" />}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Property Owner</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  I own flats, houses or PG accommodations and want to list directly for verified renters in Delhi NCR.
                </p>
              </div>
            </div>

            {/* Broker Option Card */}
            <div
              onClick={() => setSelectedType('broker')}
              className={`cursor-pointer p-6 rounded-2xl border-2 transition-all duration-200 flex flex-col justify-between ${
                selectedType === 'broker'
                  ? 'border-orange-500 bg-orange-50/40 shadow-md ring-2 ring-orange-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${selectedType === 'broker' ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    <Briefcase className="w-6 h-6" />
                  </div>
                  {selectedType === 'broker' && <CheckCircle2 className="w-6 h-6 text-orange-500" />}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-1">Broker / Real Estate Agent</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  I am a professional agent managing client property listings and lead streams across Delhi NCR.
                </p>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 text-base disabled:opacity-50"
          >
            {loading ? 'Saving Profile...' : 'Complete Setup & Enter Dashboard'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
