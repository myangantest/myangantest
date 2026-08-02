/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { UserProfile, UserRole } from '../types';
import { Home, Heart, Shield, LayoutDashboard, Users, Clock, LogOut, Menu, X, ChevronDown, RefreshCw, Sparkles, FileText } from 'lucide-react';
import MyAnganLogo from './MyAnganLogo';

interface NavbarProps {
  currentRoute: string;
  navigateTo: (route: string, params?: any) => void;
  currentUser: UserProfile | null;
  onSignOut: () => void;
  onOpenAiAssistant?: () => void;
}

export default function Navbar({
  currentRoute,
  navigateTo,
  currentUser,
  onSignOut,
  onOpenAiAssistant,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const getRoleLabel = (role?: UserRole): string => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'owner':
        return 'Owner';
      case 'broker':
        return 'Broker';
      case 'landlord_broker':
        return 'Landlord/Broker';
      case 'renter':
      default:
        return 'Renter';
    }
  };

  const isCompletedProvider = Boolean(
    currentUser &&
    currentUser.onboarding_status === 'complete' &&
    (currentUser.role === 'owner' || currentUser.role === 'broker' || currentUser.provider_type === 'owner' || currentUser.provider_type === 'broker')
  );

  const navLinks = [
    { label: 'Properties', route: 'properties', icon: Home },
    { label: 'Brokers', route: 'brokers', icon: Users },
    { label: 'Waitlist', route: 'waitlist', icon: Clock },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white text-slate-800 border-b border-slate-200/85 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div 
            onClick={() => { navigateTo('landing'); setMobileMenuOpen(false); }} 
            className="flex items-center gap-2 cursor-pointer group"
            id="nav-logo"
          >
            <div className="p-2 bg-black rounded-full text-white group-hover:bg-slate-900 transition-colors">
              <MyAnganLogo className="w-6 h-6" />
            </div>
            <div>
              <span className="font-display font-bold text-xl tracking-tight text-slate-900 block">MyAngan</span>
              <span className="text-[10px] text-slate-500 font-mono tracking-widest block -mt-1">DELHI NCR</span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = currentRoute === link.route || (link.route === 'properties' && currentRoute === 'property-detail');
              return (
                <button
                  key={link.route}
                  onClick={() => navigateTo(link.route)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    isActive 
                      ? 'text-orange-600 font-semibold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </button>
              );
            })}

            {/* AI Search Assistant Button */}
            {onOpenAiAssistant && (
              <button
                onClick={onOpenAiAssistant}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI Assistant
              </button>
            )}

            {/* Lease Agreement Quick Link */}
            <button
              onClick={() => navigateTo('lease-agreement')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                currentRoute === 'lease-agreement'
                  ? 'text-orange-600 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-4 h-4" />
              e-Agreement
            </button>

            {/* Role-Specific Links */}
            {currentUser && currentUser.role === 'renter' && (
              <button
                onClick={() => navigateTo('favorites')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  currentRoute === 'favorites' 
                    ? 'text-orange-600 font-semibold' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Heart className="w-4 h-4" />
                Favorites
              </button>
            )}

            {isCompletedProvider && (
              <button
                onClick={() => navigateTo('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  currentRoute === 'dashboard' 
                    ? 'text-orange-600 font-semibold' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                My Listings
              </button>
            )}

            {currentUser && currentUser.role === 'admin' && (
              <>
                <button
                  onClick={() => navigateTo('dashboard')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    currentRoute === 'dashboard' 
                      ? 'text-orange-600 font-semibold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" />
                  My Listings
                </button>
                <button
                  onClick={() => navigateTo('admin')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                    currentRoute === 'admin' 
                      ? 'text-orange-600 font-semibold' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </button>
              </>
            )}
          </nav>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Desktop User Auth Section */}
            <div className="hidden md:flex items-center gap-4">
              {currentUser ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 text-sm focus:outline-none cursor-pointer hover:text-orange-600 text-slate-700 hover:text-slate-900 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-sm">
                      {currentUser.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium max-w-[120px] truncate">{currentUser.name.split(' ')[0]}</span>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>

                  {userDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white text-slate-800 rounded-lg shadow-xl py-1 border border-slate-100 z-50">
                      <div className="px-4 py-2 border-b border-slate-100">
                        <p className="text-xs text-slate-400 font-medium">Logged in as</p>
                        <p className="text-sm font-semibold truncate text-slate-800">{currentUser.name}</p>
                        <p className="text-[10px] font-mono text-orange-600 font-semibold bg-orange-50 px-1.5 py-0.5 rounded inline-block mt-1">
                          {getRoleLabel(currentUser.role)}
                        </p>
                      </div>

                      {isCompletedProvider && (
                        <button
                          onClick={() => { navigateTo('post-property'); setUserDropdownOpen(false); }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 cursor-pointer"
                        >
                          Post a Property
                        </button>
                      )}

                      <button
                        onClick={() => { onSignOut(); setUserDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => navigateTo('auth')}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
                >
                  Sign In / Register
                </button>
              )}
            </div>

            {/* Mobile Navigation Header Action (Visible on < md screens) */}
            <div className="flex md:hidden items-center gap-2">
              {!currentUser && (
                <button
                  onClick={() => navigateTo('auth')}
                  className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                >
                  Sign In
                </button>
              )}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-4 space-y-1 bg-white border-b border-slate-200">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = currentRoute === link.route || (link.route === 'properties' && currentRoute === 'property-detail');
            return (
              <button
                key={link.route}
                onClick={() => { navigateTo(link.route); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-medium cursor-pointer ${
                  isActive 
                    ? 'bg-orange-50 text-orange-600 font-semibold' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </button>
            );
          })}

          <button
            onClick={() => { navigateTo('lease-agreement'); setMobileMenuOpen(false); }}
            className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-medium cursor-pointer ${
              currentRoute === 'lease-agreement'
                ? 'bg-orange-50 text-orange-600 font-semibold'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <FileText className="w-5 h-5" />
            e-Agreement
          </button>

          {currentUser && currentUser.role === 'renter' && (
            <button
              onClick={() => { navigateTo('favorites'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-medium cursor-pointer ${
                currentRoute === 'favorites' 
                  ? 'bg-orange-550/10 text-orange-600 font-semibold' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Heart className="w-5 h-5" />
              Favorites
            </button>
          )}

          {(isCompletedProvider || currentUser?.role === 'admin') && (
            <button
              onClick={() => { navigateTo('dashboard'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-medium cursor-pointer ${
                currentRoute === 'dashboard' 
                  ? 'bg-orange-550/10 text-orange-600 font-semibold' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              My Listings Dashboard
            </button>
          )}

          {currentUser && currentUser.role === 'admin' && (
            <button
              onClick={() => { navigateTo('admin'); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-base font-medium cursor-pointer ${
                currentRoute === 'admin' 
                  ? 'bg-orange-555/10 text-orange-600 font-semibold' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Shield className="w-5 h-5" />
              Admin Panel
            </button>
          )}

          <div className="pt-4 border-t border-slate-200 mt-4">
            {currentUser ? (
              <div className="space-y-2">
                <div className="px-3 py-1 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500">Signed in as</p>
                  <p className="font-semibold text-slate-800">{currentUser.name}</p>
                  <p className="text-[10px] text-orange-600 font-mono">{getRoleLabel(currentUser.role)}</p>
                </div>

                {isCompletedProvider && (
                  <button
                    onClick={() => { navigateTo('post-property'); setMobileMenuOpen(false); }}
                    className="w-full text-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg cursor-pointer"
                  >
                    Post a Property
                  </button>
                )}

                <button
                  onClick={() => { onSignOut(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => { navigateTo('auth'); setMobileMenuOpen(false); }}
                className="w-full text-center px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg text-sm cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
