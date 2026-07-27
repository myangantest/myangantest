/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Dedicated Reset Password View Component (/reset-password)
 * Handles password recovery session callbacks and password updating
 */

import React, { useState } from 'react';
import { KeyRound, Lock, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { dbService } from '../../lib/db';
import { UserProfile } from '../../types';

interface ResetPasswordViewProps {
  navigateTo: (route: string, params?: any) => void;
  onAuthSuccess: (user: UserProfile) => void;
}

export default function ResetPasswordView({ navigateTo, onAuthSuccess }: ResetPasswordViewProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!newPassword || newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please verify both fields.');
      return;
    }

    setLoading(true);

    try {
      // 1. Update password with Supabase / Backend auth service
      await dbService.updatePassword(newPassword);
      setSuccessMessage('Password updated successfully! Redirecting to your dashboard...');

      // 2. Fetch fresh user profile from backend database to get accurate role
      const user = await dbService.getCurrentUser();
      
      setTimeout(() => {
        if (user) {
          onAuthSuccess(user);
          // 3. Route according to verified backend role
          if (user.role === 'admin') {
            navigateTo('admin');
          } else {
            navigateTo('dashboard');
          }
        } else {
          navigateTo('auth');
        }
      }, 1500);

    } catch (err: any) {
      console.error('Password reset error:', err);
      setErrorMessage(err.message || 'Failed to update password. Please request a new recovery link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-slate-900">
      <div className="max-w-md w-full space-y-8 bg-slate-800 p-8 rounded-2xl border border-slate-700 shadow-2xl">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-500 mb-4">
            <KeyRound className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white tracking-tight">
            Set New Password
          </h2>
          <p className="mt-2 text-xs text-slate-400 font-mono uppercase tracking-wider">
            Account Recovery &amp; Security Verification
          </p>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Reset Failed</p>
              <p className="text-xs text-red-300/80 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Success</p>
              <p className="text-xs text-emerald-300/80 mt-0.5">{successMessage}</p>
            </div>
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                New Password (min 8 characters)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                />
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-700/50 text-xs text-slate-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-orange-400 shrink-0" />
            <span>After password update, your session will be restored based on your verified account permissions.</span>
          </div>

          <button
            type="submit"
            disabled={loading || !!successMessage}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-xl text-sm shadow-lg shadow-orange-500/20 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <span>Update Password &amp; Continue</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
