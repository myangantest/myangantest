/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, ShieldCheck, FileText, Lock } from 'lucide-react';

interface ContactViewProps {
  navigateTo: (route: string) => void;
}

export function TermsView() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 leading-relaxed">
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <FileText className="w-8 h-8 text-orange-500" />
          Terms of Service
        </h1>
        <p className="text-xs text-slate-400 mt-1">Last Updated: July 2026</p>
      </div>

      <div className="space-y-6 text-sm text-slate-600">
        <section className="space-y-2">
          <h2 className="font-display font-bold text-slate-800 text-base">1. Platform Services</h2>
          <p>
            Welcome to MyAngan. These Terms of Service ("Terms") govern your access to and use of our website, rental platform services, and Lead Logger, specifically focused on landlord, broker, and renter listings inside Delhi NCR (Delhi, Gurugram, Noida, Ghaziabad, and Faridabad), India.
          </p>
          <p>
            MyAngan acts as an open, direct, double-vetted listing broker directory. We do not own, manage, lease, or buy real estate assets ourselves, nor do we act as financial escrows.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display font-bold text-slate-800 text-base">2. Listing Rules for Landlords & Brokers</h2>
          <p>
            By posting a property in Gurugram or South Delhi, you warrant that the property exists, is available for rent, and that all descriptions, pricing (rent and security deposits), and photos are accurate and do not infringe on copyright. Multiple postings of the same builder floor or apartment under duplicate mock titles will result in deactivation by the admin.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display font-bold text-slate-800 text-base">3. Renter Inquiry Log & Privacy</h2>
          <p>
            When submitting an enquiry on MyAngan, your submitted contact information (Name and Phone) is logged in our databases and transferred directly to the listing's verified owner. You consent to the landlord or broker contacting you directly via phone or WhatsApp.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display font-bold text-slate-800 text-base">4. Limitation of Liability</h2>
          <p>
            MyAngan is not responsible for any disputes, damages, or claims arising from tenancies or broker deals arranged through the platform. Users are strictly urged to perform physical site visits and verify the registry of ownership before transferring security deposits.
          </p>
        </section>
      </div>
    </div>
  );
}

export function PrivacyView() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 leading-relaxed">
      <div className="border-b border-slate-100 pb-4">
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Lock className="w-8 h-8 text-orange-500" />
          Privacy Policy
        </h1>
        <p className="text-xs text-slate-400 mt-1">Last Updated: July 2026</p>
      </div>

      <div className="space-y-6 text-sm text-slate-600">
        <section className="space-y-2">
          <h2 className="font-display font-bold text-slate-800 text-base">1. Information We Collect</h2>
          <p>
            We collect personal information necessary to offer renting portals:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Identity Details:</strong> Full Name, Role type (Renter, Landlord, Broker), and email.</li>
            <li><strong>Contact Details:</strong> WhatsApp phone number.</li>
            <li><strong>Property Details:</strong> Addresses, pricing models, and photographs uploaded by hosts.</li>
            <li><strong>Inquiry Records:</strong> Custom messages sent during Lead Log submissions.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="font-display font-bold text-slate-800 text-base">2. How Data is Shared</h2>
          <p>
            We do not sell user personal data. Renter contact details are shared exclusively with the property's specific owner or broker agent when the renter explicitly submits an "Enquire Now" log.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-display font-bold text-slate-800 text-base">3. Data Security & Storage</h2>
          <p>
            All persistent profiles and database entries are stored securely in Supabase Postgres databases protected by granular Row Level Security (RLS) rules, ensuring landlords can only edit their own listings and renter leads are invisible to the public.
          </p>
        </section>
      </div>
    </div>
  );
}

export function ContactView() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setName('');
      setEmail('');
      setMessage('');
      alert('Your message has been sent to MyAngan Support. We will get back to you within 24 hours!');
    }, 1000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 space-y-10">
      <div className="border-b border-slate-100 pb-4 text-center">
        <h1 className="text-3xl font-display font-bold text-slate-900 tracking-tight">
          Connect with MyAngan Support
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Have questions about posting property or verifying listings? Drop us a line.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
        {/* Contact Details Card (Left 2 cols) */}
        <div className="md:col-span-2 bg-[#0F1F3D] text-white rounded-2xl p-6 sm:p-8 space-y-6 border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500 rounded-full blur-[80px] opacity-10"></div>
          
          <h3 className="font-display font-bold text-lg text-white">Office Location</h3>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3 text-xs text-slate-300">
              <MapPin className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-white text-sm">Delhi NCR Head Office</p>
                <p className="leading-relaxed mt-1">
                  102, S-Block, DLF Phase 3,<br />
                  Gurugram, Haryana - 122002, India
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-300 border-t border-slate-800 pt-4">
              <Phone className="w-5 h-5 text-orange-500 shrink-0" />
              <div>
                <p className="font-bold text-white text-sm">Call Support</p>
                <p className="leading-relaxed mt-1">+91 90129 44491</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-300 border-t border-slate-800 pt-4">
              <Mail className="w-5 h-5 text-orange-500 shrink-0" />
              <div>
                <p className="font-bold text-white text-sm">Email Inquiries</p>
                <p className="leading-relaxed mt-1">service@myangan.com</p>
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center gap-1.5 text-[10px] text-slate-400 font-mono border-t border-slate-800">
            <ShieldCheck className="w-4 h-4 text-orange-500" />
            <span>Official real estate compliance registered.</span>
          </div>
        </div>

        {/* Contact Form (Right 3 cols) */}
        <div className="md:col-span-3 bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="font-display font-bold text-slate-800 text-sm border-b border-slate-50 pb-2">Send us a direct message</h3>
            
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">Your Name</label>
              <input
                type="text"
                placeholder="e.g. Amit Patel"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">Email Coordinate</label>
              <input
                type="email"
                placeholder="e.g. amit@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-500 block">Message Details</label>
              <textarea
                rows={4}
                placeholder="Type your question or request details about your listing, broker account setups..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500 resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={sent}
              className="w-full py-2.5 bg-[#0F1F3D] hover:bg-[#1b2f54] text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer mt-2"
            >
              <Send className="w-4 h-4 text-orange-500" />
              <span>{sent ? 'Sending...' : 'Send Message'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
