/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { FileText, ShieldCheck, Download, CheckCircle2, ArrowLeft, Stamp, Calendar, DollarSign, UserCheck, Scale, Sparkles } from 'lucide-react';
import { Property } from '../../types';

interface LeaseAgreementViewProps {
  property?: Property | null;
  onBack: () => void;
}

export default function LeaseAgreementView({ property, onBack }: LeaseAgreementViewProps) {
  const [tenantName, setTenantName] = useState('Ankit Sharma');
  const [landlordName, setLandlordName] = useState(property ? 'Verified Property Owner' : 'Vikram Malhotra');
  const [startDate, setStartDate] = useState('2026-08-01');
  const [tenureMonths, setTenureMonths] = useState(11);
  const [rentAmount, setRentAmount] = useState(property?.rent_amount || 32000);
  const [depositAmount, setDepositAmount] = useState(property?.deposit_amount || 64000);
  const [lockInMonths, setLockInMonths] = useState(6);
  const [noticePeriodDays, setNoticePeriodDays] = useState(30);

  const [isSigned, setIsSigned] = useState(false);
  const [stampNumber] = useState(`IN-DL${Math.floor(100000000000 + Math.random() * 900000000000)}`);
  const [eSignTxHash] = useState(`0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`);

  const propertyAddress = property
    ? `${property.address}, ${property.locality}, ${property.city}`
    : 'Flat 402, DLF Phase 5, Golf Course Road, Gurugram, Delhi NCR';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fade-in">
      {/* Header Bar */}
      <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Listings
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Delhi NCR Model Tenancy Act Compliant
          </span>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export / Print PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Agreement Customizer Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Scale className="w-5 h-5 text-orange-600" />
            <h2 className="font-display font-bold text-lg text-slate-900">Agreement Builder</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Tenant Name
              </label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Landlord / Owner Name
              </label>
              <input
                type="text"
                value={landlordName}
                onChange={(e) => setLandlordName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Monthly Rent (₹)
                </label>
                <input
                  type="number"
                  value={rentAmount}
                  onChange={(e) => setRentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Deposit (₹)
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tenure (Months)
                </label>
                <input
                  type="number"
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Lock-in (Months)
                </label>
                <input
                  type="number"
                  value={lockInMonths}
                  onChange={(e) => setLockInMonths(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Notice (Days)
                </label>
                <input
                  type="number"
                  value={noticePeriodDays}
                  onChange={(e) => setNoticePeriodDays(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            {!isSigned ? (
              <button
                onClick={() => setIsSigned(true)}
                className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl font-semibold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <UserCheck className="w-4 h-4" />
                Sign & E-Stamp Agreement (Digital Aadhaar)
              </button>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-center text-xs text-emerald-800">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
                <p className="font-bold">Agreement Digitally Signed & Stamped</p>
                <p className="text-[10px] font-mono text-emerald-600 mt-1 truncate">Tx: {eSignTxHash}</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Document Preview */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-slate-200 shadow-md font-serif text-slate-800 space-y-6 relative overflow-hidden">
          {/* E-Stamp Banner Header */}
          <div className="border-4 border-double border-amber-800/40 p-4 rounded-xl bg-amber-50/40 flex items-center justify-between font-sans">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-800 text-white rounded-lg">
                <Stamp className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-mono font-bold uppercase text-amber-900 tracking-wider">
                  Government of NCT of Delhi / Haryana
                </p>
                <p className="text-sm font-bold text-amber-950">Certificate of Stamp Duty (e-Stamp)</p>
                <p className="text-[11px] font-mono text-amber-800">Certificate No: {stampNumber}</p>
              </div>
            </div>
            <div className="text-right font-mono">
              <span className="text-xs bg-amber-200/80 text-amber-900 px-2 py-1 rounded font-bold">
                Duty Amount: ₹500
              </span>
              <p className="text-[10px] text-amber-700 mt-1">Verified via MyAngan OS</p>
            </div>
          </div>

          {/* Title */}
          <div className="text-center font-sans">
            <h1 className="font-display font-extrabold text-2xl tracking-tight text-slate-900 uppercase">
              Residential Tenancy Agreement
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-1">
              Drafted as per Delhi NCR Model Tenancy Act, 2021
            </p>
          </div>

          <div className="text-sm leading-relaxed space-y-4 text-slate-800">
            <p>
              This Residential Tenancy Agreement is executed on this <strong>{new Date().toLocaleDateString('en-IN')}</strong> at Delhi NCR between:
            </p>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 font-sans text-xs space-y-1">
              <p>
                <strong>LANDLORD / LESSOR:</strong> <span className="text-orange-600 font-bold">{landlordName}</span>, residing in Delhi NCR, hereinafter called the FIRST PARTY.
              </p>
              <p>
                <strong>TENANT / LESSEE:</strong> <span className="text-orange-600 font-bold">{tenantName}</span>, hereinafter called the SECOND PARTY.
              </p>
              <p>
                <strong>PREMISES ADDRESS:</strong> <span className="font-semibold text-slate-900">{propertyAddress}</span>
              </p>
            </div>

            <h3 className="font-sans font-bold text-sm uppercase text-slate-900 border-b border-slate-200 pb-1">
              Key Terms & Conditions:
            </h3>

            <ol className="list-decimal pl-5 space-y-2 text-xs">
              <li>
                <strong>TENURE:</strong> The lease shall be for a period of <strong>{tenureMonths} months</strong> commencing from <strong>{startDate}</strong>.
              </li>
              <li>
                <strong>RENT & ESCROW PAYMENT:</strong> The tenant agrees to pay a monthly rent of <strong>₹{rentAmount.toLocaleString('en-IN')}</strong> on or before the 5th of each calendar month via <strong>MyAngan Rent Escrow Gateway</strong>.
              </li>
              <li>
                <strong>SECURITY DEPOSIT:</strong> The tenant has deposited a refundable security deposit of <strong>₹{depositAmount.toLocaleString('en-IN')}</strong> held safely under MyAngan Deposit Protection.
              </li>
              <li>
                <strong>LOCK-IN & NOTICE PERIOD:</strong> Both parties agree to a lock-in period of <strong>{lockInMonths} months</strong>. A <strong>{noticePeriodDays} days</strong> written notice is required prior to termination.
              </li>
              <li>
                <strong>MAINTENANCE & UTILITIES:</strong> Electricity, water, and society maintenance charges shall be paid directly by the tenant through the MyAngan App.
              </li>
            </ol>
          </div>

          {/* Signatures */}
          <div className="border-t-2 border-slate-200 pt-6 grid grid-cols-2 gap-8 font-sans text-xs">
            <div className="border border-slate-200 p-4 rounded-xl text-center space-y-3">
              <p className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Landlord Signature</p>
              <div className="h-12 flex items-center justify-center font-mono text-slate-900 font-bold italic">
                {landlordName}
              </div>
              <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded font-semibold">
                Verified via Aadhaar OTP
              </span>
            </div>

            <div className="border border-slate-200 p-4 rounded-xl text-center space-y-3">
              <p className="font-bold text-slate-500 uppercase text-[10px] tracking-wider">Tenant Signature</p>
              <div className="h-12 flex items-center justify-center font-mono text-slate-900 font-bold italic">
                {isSigned ? tenantName : <span className="text-slate-300 font-sans italic">Pending e-Sign</span>}
              </div>
              {isSigned ? (
                <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] rounded font-semibold flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Signed & Verified
                </span>
              ) : (
                <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded font-semibold">
                  Awaiting Signature
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
