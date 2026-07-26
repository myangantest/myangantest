/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { UserRole } from '../../types';
import { dbService } from '../../lib/db';
import { Home, ShieldCheck, Mail, Lock, User, Phone, CheckCircle2 } from 'lucide-react';

interface AuthViewProps {
  navigateTo: (route: string, params?: any) => void;
  onAuthSuccess: (user: any) => void;
  initialRole?: UserRole;
}

export default function AuthView({ navigateTo, onAuthSuccess, initialRole = 'renter' }: AuthViewProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Sign In inputs
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  
  // Sign Up inputs
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpRole, setSignUpRole] = useState<UserRole>(initialRole);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // OTP Verification state
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Timer for resend cooldown
  React.useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail.trim() || !signInPassword) return;

    setLoading(true);
    setError(null);
    try {
      const user = await dbService.signIn(signInEmail.trim(), signInPassword);
      onAuthSuccess(user);
      
      // Redirect based on role
      if (user.role === 'landlord_broker') {
        navigateTo('dashboard');
      } else if (user.role === 'admin') {
        navigateTo('admin');
      } else {
        navigateTo('properties');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpEmail.trim() || !signUpName.trim() || !signUpPassword) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signUpEmail.trim(),
          name: signUpName.trim(),
          phone: signUpPhone.trim(),
          role: signUpRole,
          password: signUpPassword,
        }),
      });

      const text = await response.text();
      let result: any = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
        result = { error: cleanText || `Server returned status code ${response.status}.` };
      }

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Registration failed.');
      }

      setIsOtpSent(true);
      setCooldown(60);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.length < 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signUpEmail.trim(),
          code: otpCode.trim(),
          purpose: 'registration_otp',
        }),
      });

      const text = await response.text();
      let result: any = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
        result = { error: cleanText || `Server returned status code ${response.status}.` };
      }

      if (!response.ok) {
        throw new Error(result.error || result.message || 'Verification failed.');
      }

      // Automatically sign in the verified user to sync client-side state
      const loggedInUser = await dbService.signIn(signUpEmail.trim(), signUpPassword);
      onAuthSuccess(loggedInUser);
      
      if (loggedInUser.role === 'landlord_broker') {
        navigateTo('dashboard');
      } else {
        navigateTo('properties');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/resend-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signUpEmail.trim(),
        }),
      });

      const text = await response.text();
      let result: any = {};
      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        result = { error: 'Server returned an invalid response format.' };
      }

      if (!response.ok) {
        throw new Error(result.error || 'Failed to resend code.');
      }

      setCooldown(60);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white border border-slate-100 shadow-xl rounded-3xl overflow-hidden">
        {/* Brand Header */}
        <div className="bg-[#0F1F3D] text-white p-8 text-center space-y-2 relative">
          <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:16px_16px]"></div>
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center mx-auto text-white shadow shadow-orange-500/20">
            <Home className="w-5 h-5" />
          </div>
          <h2 className="font-display font-bold text-xl tracking-tight">
            {isOtpSent ? 'Verify Your Account' : 'Welcome to MyAngan'}
          </h2>
          <p className="text-xs text-slate-300">
            {isOtpSent ? `We have sent a verification code to ${signUpEmail}` : 'Gurugram & South Delhi Rental Portal'}
          </p>
        </div>

        {/* Tab Headers (Only show when not in OTP verification) */}
        {!isOtpSent && (
          <div className="flex border-b border-slate-100">
            <button
              onClick={() => { setIsSignUp(false); setError(null); }}
              className={`flex-1 py-3 text-center text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                !isSignUp ? 'border-b-2 border-orange-500 text-slate-800 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsSignUp(true); setError(null); }}
              className={`flex-1 py-3 text-center text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                isSignUp ? 'border-b-2 border-orange-500 text-slate-800 font-bold' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Register Account
            </button>
          </div>
        )}

        {/* Content Form */}
        <div className="p-6 sm:p-8 space-y-4">
          
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-700 text-xs p-3 rounded-xl font-medium">
              {error}
            </div>
          )}

          {isOtpSent ? (
            /* OTP VERIFICATION FORM */
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="space-y-2 text-center">
                <label className="text-xs font-semibold text-slate-500 block">Enter 6-Digit OTP Code</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="0 0 0 0 0 0"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  className="w-full text-center py-3 bg-slate-50 border border-slate-200 rounded-xl text-xl font-mono tracking-[8px] focus:outline-none focus:border-orange-500 focus:bg-white transition-all"
                  required
                />
                <p className="text-[10px] text-slate-400 font-mono mt-1">Please inspect your email inbox for verification</p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-[#0F1F3D] hover:bg-[#1b2f54] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
                >
                  {loading ? 'Verifying...' : 'Verify & Activate Account'}
                </button>

                <div className="flex items-center justify-between text-xs pt-1.5 px-1">
                  <button
                    type="button"
                    onClick={() => { setIsOtpSent(false); setOtpCode(''); setError(null); }}
                    className="text-slate-500 hover:text-slate-800 transition-colors font-semibold cursor-pointer"
                  >
                    ← Back to Sign Up
                  </button>

                  <button
                    type="button"
                    disabled={cooldown > 0 || loading}
                    onClick={handleResendOtp}
                    className={`font-semibold cursor-pointer transition-colors ${
                      cooldown > 0 ? 'text-slate-300' : 'text-orange-500 hover:text-orange-600'
                    }`}
                  >
                    {cooldown > 0 ? `Resend Code (${cooldown}s)` : 'Resend Verification OTP'}
                  </button>
                </div>
              </div>
            </form>
          ) : !isSignUp ? (
            /* SIGN IN FORM */
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                    required
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-2.5 top-3.5" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-2.5 top-3.5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#0F1F3D] hover:bg-[#1b2f54] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors mt-2"
              >
                {loading ? 'Signing in...' : 'Sign In Now'}
              </button>
            </form>
          ) : (
            /* REGISTER SIGN UP FORM */
            <form onSubmit={handleSignUp} className="space-y-4">
              
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. Ankit Kumar"
                    value={signUpName}
                    onChange={(e) => setSignUpName(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                    required
                  />
                  <User className="w-4 h-4 text-slate-400 absolute left-2.5 top-3.5" />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="e.g. ankit@gmail.com"
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                    required
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute left-2.5 top-3.5" />
                </div>
              </div>

              {/* Phone (required for landlords/brokers) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">WhatsApp Phone Number</label>
                <div className="relative">
                  <input
                    type="tel"
                    placeholder="e.g. +91 95990 11223"
                    value={signUpPhone}
                    onChange={(e) => setSignUpPhone(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                    required
                  />
                  <Phone className="w-4 h-4 text-slate-400 absolute left-2.5 top-3.5" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500 block">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="Create a strong password"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                    required
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute left-2.5 top-3.5" />
                </div>
              </div>

              {/* Role Selection Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-500 block">Select Your Role</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSignUpRole('renter')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      signUpRole === 'renter'
                        ? 'border-orange-500 bg-orange-50/50 text-orange-800 font-bold shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-xs block">I am a Renter</span>
                    <span className="text-[9px] text-slate-400 font-normal block mt-0.5">Looking for flat</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSignUpRole('landlord_broker')}
                    className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      signUpRole === 'landlord_broker'
                        ? 'border-orange-500 bg-orange-50/50 text-orange-800 font-bold shadow-xs'
                        : 'border-slate-200 bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-xs block">Landlord/Broker</span>
                    <span className="text-[9px] text-slate-400 font-normal block mt-0.5">I want to list flat</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-[#0F1F3D] hover:bg-[#1b2f54] text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors mt-2"
              >
                {loading ? 'Creating account...' : 'Create Account Now'}
              </button>
            </form>
          )}

          {/* Core Trust details */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] text-slate-400 font-mono">
            <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0" />
            <span>Secure encryption • Direct direct verification.</span>
          </div>

        </div>
      </div>
    </div>
  );
}
