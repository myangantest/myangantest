/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Mail, Phone, MapPin, Database, CheckCircle2, Twitter, Instagram, Facebook, Youtube } from 'lucide-react';
import MyAnganLogo from './MyAnganLogo';

interface FooterProps {
  navigateTo: (route: string) => void;
  isSupabaseConnected: boolean;
}

export default function Footer({ navigateTo, isSupabaseConnected }: FooterProps) {
  return (
    <footer className="bg-slate-50 text-slate-600 border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigateTo('landing')}>
              <div className="p-1.5 bg-black rounded-full text-white">
                <MyAnganLogo className="w-5 h-5" />
              </div>
              <span className="font-display font-bold text-lg text-slate-900">MyAngan</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Premium rental property listing and high-quality lead-generation portal for Gurugram and South Delhi, Delhi NCR, India. Verified listings, direct landlord broker contact.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-display font-semibold text-slate-800 text-sm tracking-wider uppercase mb-4">Quick Navigation</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => navigateTo('properties')} className="hover:text-orange-600 transition-colors cursor-pointer font-medium">
                  Browse Properties
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('brokers')} className="hover:text-orange-600 transition-colors cursor-pointer font-medium">
                  Broker Directory
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('waitlist')} className="hover:text-orange-600 transition-colors cursor-pointer font-medium">
                  Join the Waitlist
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('auth')} className="hover:text-orange-600 transition-colors cursor-pointer font-medium">
                  Sign In / Register
                </button>
              </li>
            </ul>
          </div>

          {/* Policies */}
          <div>
            <h3 className="font-display font-semibold text-slate-800 text-sm tracking-wider uppercase mb-4">Information</h3>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => navigateTo('terms')} className="hover:text-orange-600 transition-colors cursor-pointer font-medium">
                  Terms of Service
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('privacy')} className="hover:text-orange-600 transition-colors cursor-pointer font-medium">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => navigateTo('contact')} className="hover:text-orange-600 transition-colors cursor-pointer font-medium">
                  Contact Support
                </button>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-slate-800 text-sm tracking-wider uppercase mb-4">Delhi NCR Hub</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-2 text-xs text-slate-600 font-medium">
                <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <span>DLF Phase 3, Gurugram & Vasant Kunj, South Delhi, India</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <Phone className="w-4 h-4 text-orange-500 shrink-0" />
                <span>+91 90129 44491</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                <Mail className="w-4 h-4 text-orange-500 shrink-0" />
                <span>service@myangan.com</span>
              </div>
            </div>

            {/* Social Media Handles */}
            <div className="pt-2">
              <h4 className="font-display font-semibold text-slate-800 text-[11px] tracking-wider uppercase mb-3">Connect With Us</h4>
              <div className="flex items-center gap-3">
                <a
                  href="https://x.com/MyAnganIndia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-orange-500 text-slate-600 hover:text-white flex items-center justify-center transition-all shadow-xs"
                  aria-label="Follow us on X"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href="https://www.instagram.com/myanganindia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-orange-500 text-slate-600 hover:text-white flex items-center justify-center transition-all shadow-xs"
                  aria-label="Follow us on Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="https://www.facebook.com/myanganindia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-orange-500 text-slate-600 hover:text-white flex items-center justify-center transition-all shadow-xs"
                  aria-label="Follow us on Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href="https://youtube.com/@myanganindia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-full bg-slate-200 hover:bg-orange-500 text-slate-600 hover:text-white flex items-center justify-center transition-all shadow-xs"
                  aria-label="Subscribe on Youtube"
                >
                  <Youtube className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 mt-12 pt-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} MyAngan Real Estate Technologies. All rights reserved.</p>
          <p className="mt-2 md:mt-0 font-mono text-[10px]">Made with ❤️ for Delhi NCR Renters & Landlords</p>
        </div>
      </div>
    </footer>
  );
}
