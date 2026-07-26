/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Lock, ShieldCheck, Check, AlertCircle, RefreshCw, Sparkles, CreditCard } from 'lucide-react';

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string) => void;
  onFailure: (errorMessage: string) => void;
  amount: number; // in INR (e.g. 999)
  planType?: string;
  userEmail?: string;
  userName?: string;
  userPhone?: string;
}

export default function RazorpayModal({
  isOpen,
  onClose,
  onSuccess,
  onFailure,
  amount,
  planType = 'broker_monthly',
  userEmail = '',
  userName = '',
  userPhone = '',
}: RazorpayModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Payments Enabled Flag check
  const paymentsEnabled = (import.meta as any).env?.VITE_PAYMENTS_ENABLED !== 'false';
  const razorpayKeyId = (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || '';

  useEffect(() => {
    if (isOpen) {
      setLoading(false);
      setErrorMsg(null);

      // Load official Razorpay Checkout SDK
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);

      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInitiateRazorpayCheckout = async () => {
    if (!paymentsEnabled) {
      setErrorMsg('Production payments are currently disabled (VITE_PAYMENTS_ENABLED=false). Contact support for activation.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Create Order on Server BEFORE launching Checkout
      const orderRes = await fetch('/api/payments/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_type: planType }),
      });

      if (!orderRes.ok) {
        const errJson = await orderRes.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to create order on server.');
      }

      const orderData = await orderRes.json();

      // 2. Configure Official Razorpay Checkout
      const options = {
        key: orderData.keyId || razorpayKeyId,
        amount: orderData.amountPaisa,
        currency: orderData.currency || 'INR',
        name: 'MyAngan Rentals',
        description: `Subscription: ${planType.replace('_', ' ').toUpperCase()}`,
        order_id: orderData.razorpayOrderId,
        prefill: {
          name: userName,
          email: userEmail,
          contact: userPhone,
        },
        theme: {
          color: '#ea580c',
        },
        handler: async function (response: any) {
          // 3. Server-side payment signature verification
          try {
            const verifyRes = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyRes.ok) {
              const verifyErr = await verifyRes.json().catch(() => ({}));
              throw new Error(verifyErr.error || 'Server-side payment verification failed.');
            }

            setLoading(false);
            onSuccess(response.razorpay_payment_id);
            onClose();
          } catch (verifyErr: any) {
            setLoading(false);
            setErrorMsg(verifyErr.message || 'Payment verification failed.');
            onFailure(verifyErr.message || 'Verification failed');
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
            console.log('[Razorpay Checkout] Dismissed by user.');
          },
        },
      };

      if ((window as any).Razorpay) {
        const rzp = new (window as any).Razorpay(options);
        rzp.on('payment.failed', function (response: any) {
          setLoading(false);
          setErrorMsg(`Payment failed: ${response.error?.description || 'Transaction declined'}`);
          onFailure(response.error?.description || 'Payment failed');
        });
        rzp.open();
      } else {
        throw new Error('Razorpay SDK failed to load. Please check your internet connection.');
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMsg(err.message || 'Failed to initiate payment.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white text-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100"
      >
        {/* Header */}
        <div className="bg-slate-950 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 text-orange-400 rounded-xl border border-orange-500/30">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg">Razorpay Secure Checkout</h3>
              <p className="text-xs text-slate-400">Official Razorpay Gateway Integration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="p-4 bg-orange-50 border border-orange-200/80 rounded-2xl flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Payable Amount</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-0.5">₹{amount.toLocaleString('en-IN')}</p>
            </div>
            <span className="px-3 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">
              {planType.replace('_', ' ').toUpperCase()}
            </span>
          </div>

          {!paymentsEnabled && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Notice:</strong> Payments are disabled (`VITE_PAYMENTS_ENABLED=false`). Contact admin to activate live credentials.
              </span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-3 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>MyAngan never collects or stores card numbers, CVVs, or UPI PINs.</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Server-side HMAC SHA-256 signature verification & webhook protection.</span>
            </div>
          </div>

          <button
            onClick={handleInitiateRazorpayCheckout}
            disabled={loading}
            className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Launching Razorpay Checkout...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Pay ₹{amount.toLocaleString('en-IN')} with Razorpay</span>
              </>
            )}
          </button>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 font-mono">
            Secured by Razorpay • PCI-DSS Level 1 Compliant Gateway
          </p>
        </div>
      </motion.div>
    </div>
  );
}
