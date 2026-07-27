import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, Info, X } from 'lucide-react';
import { UserProfile, UserRole, Property } from './types';
import { dbService, isMockModeActive, isRealSupabaseConfigured, supabase } from './lib/db';

// Views
import LandingView from './components/views/LandingView';
import ListingsView from './components/views/ListingsView';
import PropertyDetailView from './components/views/PropertyDetailView';
import PostPropertyView from './components/views/PostPropertyView';
import DashboardView from './components/views/DashboardView';
import AuthView from './components/views/AuthView';
import OnboardingView from './components/views/OnboardingView';
import FavoritesView from './components/views/FavoritesView';
import BrokersView from './components/views/BrokersView';
import AdminView from './components/views/AdminView';
import AdminLoginView from './components/views/AdminLoginView';
import ResetPasswordView from './components/views/ResetPasswordView';
import WaitlistView from './components/views/WaitlistView';
import CompareView from './components/views/CompareView';
import LeaseAgreementView from './components/views/LeaseAgreementView';
import { TermsView, PrivacyView, ContactView } from './components/views/StaticViews';
import SeoTemplateView from './components/views/SeoTemplateView';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CompareFloatingBar from './components/CompareFloatingBar';
import AiAssistantModal from './components/AiAssistantModal';
import PropertyPassportModal from './components/PropertyPassportModal';
import MaintenanceModal from './components/MaintenanceModal';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDemoNotice, setShowDemoNotice] = useState(true);

  // Compare State
  const [compareIds, setCompareIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('myangan_compare_ids');
      if (!saved || !saved.trim()) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  // OS Modal States
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [passportProperty, setPassportProperty] = useState<Property | null>(null);
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [propertiesList, setPropertiesList] = useState<Property[]>([]);

  useEffect(() => {
    dbService.getProperties().then(setPropertiesList).catch(console.error);
  }, []);

  // Derive currentRoute string from pathname to keep Navbar highlights working
  let currentRoute = 'landing';
  if (location.pathname === '/') currentRoute = 'landing';
  else if (location.pathname.startsWith('/properties/')) currentRoute = 'property-detail';
  else if (location.pathname === '/properties') currentRoute = 'properties';
  else if (location.pathname === '/brokers') currentRoute = 'brokers';
  else if (location.pathname === '/post-property') currentRoute = 'post-property';
  else if (location.pathname === '/dashboard') currentRoute = 'dashboard';
  else if (location.pathname === '/auth') currentRoute = 'auth';
  else if (location.pathname === '/favorites') currentRoute = 'favorites';
  else if (location.pathname === '/compare') currentRoute = 'compare';
  else if (location.pathname === '/admin') currentRoute = 'admin';
  else if (location.pathname === '/waitlist') currentRoute = 'waitlist';
  else if (location.pathname === '/lease-agreement') currentRoute = 'lease-agreement';
  else if (location.pathname === '/terms') currentRoute = 'terms';
  else if (location.pathname === '/privacy') currentRoute = 'privacy';
  else if (location.pathname === '/contact') currentRoute = 'contact';
  else if (location.pathname.startsWith('/rentals/')) currentRoute = 'properties';

  const handleToggleCompare = (id: string) => {
    setCompareIds((prev) => {
      let next;
      if (prev.includes(id)) {
        next = prev.filter((item) => item !== id);
      } else {
        if (prev.length >= 4) {
          alert('You can compare a maximum of 4 properties at a time.');
          return prev;
        }
        next = [...prev, id];
      }
      try {
        localStorage.setItem('myangan_compare_ids', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save comparison selection:', e);
      }
      return next;
    });
  };

  const handleRemoveFromCompare = (id: string) => {
    setCompareIds((prev) => {
      const next = prev.filter((item) => item !== id);
      try {
        localStorage.setItem('myangan_compare_ids', JSON.stringify(next));
      } catch (e) {
        console.error('Failed to save comparison selection:', e);
      }
      return next;
    });
  };

  const handleClearCompare = () => {
    setCompareIds([]);
    try {
      localStorage.removeItem('myangan_compare_ids');
    } catch (e) {
      console.error('Failed to clear comparison selection:', e);
    }
  };

  // Sync user on mount & handle Supabase auth events
  useEffect(() => {
    let subscription: any = null;

    const initApp = async () => {
      try {
        const hash = window.location.hash || '';
        const search = window.location.search || '';

        // Requirement 2: Detect recovery token in URL on mount
        if (hash.includes('type=recovery') || search.includes('type=recovery')) {
          console.log('[Supabase Auth] Password recovery URL detected on init');
          navigate('/reset-password', { replace: true });
          setLoading(false);
          return;
        }

        const user = await dbService.getCurrentUser();
        setCurrentUser(user);

        // Redirect admin users if accessing admin login while authenticated
        if (user && user.role === 'admin') {
          if (location.pathname === '/admin/login' || location.pathname === '/admin') {
            navigate('/admin/dashboard', { replace: true });
          }
        }
      } catch (err) {
        console.error('Error during App initialization:', err);
      } finally {
        setLoading(false);
      }
    };

    if (isRealSupabaseConfigured && supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`[Supabase Auth Listener] Event: ${event}`);

        if (event === 'PASSWORD_RECOVERY') {
          // Requirement 2: redirect ONLY to /reset-password, never to /dashboard or /admin/dashboard
          console.log('[Supabase Auth Listener] PASSWORD_RECOVERY triggered -> Redirecting to /reset-password');
          navigate('/reset-password', { replace: true });
        } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
          const hash = window.location.hash || '';
          if (hash.includes('type=recovery')) {
            navigate('/reset-password', { replace: true });
            return;
          }

          try {
            const user = await dbService.getCurrentUser();
            if (user) {
              setCurrentUser(user);

              // Admin routing protection
              if (user.role === 'admin') {
                if (window.location.pathname === '/admin/login' || window.location.pathname === '/admin') {
                  navigate('/admin/dashboard', { replace: true });
                }
              }
            }
          } catch (err) {
            console.error('Error syncing auth state user profile:', err);
          }
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        }
      });
      subscription = data?.subscription;
    }

    initApp();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  // Google Analytics setup
  useEffect(() => {
    const gaId = (import.meta as any).env.VITE_GA_MEASUREMENT_ID;
    if (gaId) {
      const script1 = document.createElement('script');
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
      document.head.appendChild(script1);

      const script2 = document.createElement('script');
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){window.dataLayer.push(arguments);}
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', '${gaId}', { page_path: window.location.pathname + window.location.hash });
      `;
      document.head.appendChild(script2);
    }
  }, []);

  // Track page view when path changes
  useEffect(() => {
    const gaId = (import.meta as any).env.VITE_GA_MEASUREMENT_ID;
    if (gaId && (window as any).gtag) {
      (window as any).gtag('config', gaId, {
        page_path: location.pathname + location.search,
        page_title: document.title,
      });
    }
  }, [location]);

  // Backwards compatible navigation function mapped to react-router-dom
  const navigateTo = (route: string, params: any = {}) => {
    if (route === 'landing') {
      navigate('/', { state: params });
    } else if (route === 'properties') {
      navigate('/properties', { state: params });
    } else if (route === 'property-detail') {
      navigate(`/properties/${params?.id}`, { state: params });
    } else if (route === 'auth') {
      navigate('/auth', { state: params });
    } else if (route === 'reset-password') {
      navigate('/reset-password', { state: params });
    } else if (route === 'favorites') {
      navigate('/favorites', { state: params });
    } else if (route === 'compare') {
      navigate('/compare', { state: params });
    } else if (route === 'brokers') {
      navigate('/brokers', { state: params });
    } else if (route === 'post-property') {
      navigate('/post-property', { state: params });
    } else if (route === 'dashboard') {
      navigate('/dashboard', { state: params });
    } else if (route === 'onboarding') {
      navigate('/onboarding', { state: params });
    } else if (route === 'admin' || route === 'admin-dashboard') {
      navigate('/admin/dashboard', { state: params });
    } else if (route === 'admin-login') {
      navigate('/admin/login', { state: params });
    } else if (route === 'waitlist') {
      navigate('/waitlist', { state: params });
    } else if (route === 'terms') {
      navigate('/terms', { state: params });
    } else if (route === 'privacy') {
      navigate('/privacy', { state: params });
    } else if (route === 'contact') {
      navigate('/contact', { state: params });
    } else {
      navigate('/', { state: params });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = async () => {
    try {
      await dbService.signOut();
      setCurrentUser(null);
      navigateTo('landing');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuthSuccess = (user: UserProfile) => {
    setCurrentUser(user);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center">
          <p className="font-display font-bold text-slate-800 text-lg">MyAngan Real Estate</p>
          <p className="text-xs text-slate-400 font-mono">Initializing Delhi NCR Rental Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Navigation header bar */}
      <Navbar
        currentRoute={currentRoute}
        navigateTo={navigateTo}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onOpenAiAssistant={() => setIsAiModalOpen(true)}
      />

      {/* Main Dynamic Viewport with React Router */}
      <main className="flex-grow min-h-[calc(100vh-18rem)] transition-all duration-300">
        <Routes>
          <Route
            path="/"
            element={
              <>
                <Helmet>
                  <title>MyAngan: Homes &amp; Flats for Rent in Delhi NCR</title>
                  <meta name="description" content="Find verified homes, flats and rental properties across Delhi NCR on MyAngan. Explore rentals in Gurugram, Delhi, Noida, Ghaziabad, Faridabad and nearby areas." />
                  <link rel="canonical" href="https://myangan.com/" />
                </Helmet>
                <LandingView
                  navigateTo={navigateTo}
                  currentUser={currentUser}
                  compareIds={compareIds}
                  onCompareToggle={handleToggleCompare}
                />
              </>
            }
          />
          <Route
            path="/properties"
            element={
              <ListingsRouteWrapper
                navigateTo={navigateTo}
                currentUser={currentUser}
                compareIds={compareIds}
                onCompareToggle={handleToggleCompare}
              />
            }
          />
          <Route
            path="/rentals/:city"
            element={
              <ListingsRouteWrapper
                navigateTo={navigateTo}
                currentUser={currentUser}
                compareIds={compareIds}
                onCompareToggle={handleToggleCompare}
              />
            }
          />
          <Route
            path="/properties/:propertyId"
            element={
              <PropertyDetailRouteWrapper
                navigateTo={navigateTo}
                currentUser={currentUser}
                onOpenPassport={(prop: Property) => setPassportProperty(prop)}
              />
            }
          />
          <Route
            path="/brokers"
            element={
              <>
                <Helmet>
                  <title>Verified Rental Brokers in Delhi NCR | MyAngan</title>
                  <meta name="description" content="Connect with verified, trusted real estate brokers and landlords in Delhi NCR. Get direct, hassle-free connections with zero hidden fees." />
                  <link rel="canonical" href="https://myangan.com/brokers" />
                </Helmet>
                <BrokersView navigateTo={navigateTo} />
              </>
            }
          />
          <Route
            path="/post-property"
            element={
              <>
                <Helmet>
                  <title>List Your Property for Rent | MyAngan</title>
                  <meta name="description" content="List your flat, apartment, or house for rent on MyAngan. Reach thousands of verified renters in Delhi NCR with zero upfront charges." />
                  <link rel="canonical" href="https://myangan.com/post-property" />
                </Helmet>
                <PostPropertyView navigateTo={navigateTo} currentUser={currentUser} />
              </>
            }
          />
          <Route
            path="/waitlist"
            element={
              <>
                <Helmet>
                  <title>Join the Landlord &amp; Renter Waitlist | MyAngan</title>
                  <meta name="description" content="Join the exclusive MyAngan waitlist for premium rental homes and verified renter leads in Delhi NCR." />
                  <link rel="canonical" href="https://myangan.com/waitlist" />
                </Helmet>
                <WaitlistView />
              </>
            }
          />
          <Route
            path="/terms"
            element={
              <>
                <Helmet>
                  <title>Terms of Service | MyAngan</title>
                  <meta name="description" content="Read the terms of service and user agreements for the MyAngan premium rental platform." />
                  <link rel="canonical" href="https://myangan.com/terms" />
                </Helmet>
                <TermsView />
              </>
            }
          />
          <Route
            path="/privacy"
            element={
              <>
                <Helmet>
                  <title>Privacy Policy | MyAngan</title>
                  <meta name="description" content="Learn how MyAngan protects your personal information and secures data on our rental portal." />
                  <link rel="canonical" href="https://myangan.com/privacy" />
                </Helmet>
                <PrivacyView />
              </>
            }
          />
          <Route
            path="/contact"
            element={
              <>
                <Helmet>
                  <title>Contact Us | MyAngan</title>
                  <meta name="description" content="Get in touch with the MyAngan team for inquiries, support, or feedback on renting properties in Delhi NCR." />
                  <link rel="canonical" href="https://myangan.com/contact" />
                </Helmet>
                <ContactView />
              </>
            }
          />
          <Route
            path="/auth"
            element={
              <>
                <Helmet>
                  <title>Sign In or Register | MyAngan</title>
                  <meta name="description" content="Access your MyAngan account to manage rental listings, track favorites, or contact landlords." />
                  <link rel="canonical" href="https://myangan.com/auth" />
                </Helmet>
                <AuthView
                  navigateTo={navigateTo}
                  onAuthSuccess={handleAuthSuccess}
                  initialRole={location.state?.targetRole || 'renter'}
                />
              </>
            }
          />
          <Route
            path="/reset-password"
            element={
              <>
                <Helmet>
                  <title>Reset Password | MyAngan</title>
                  <meta name="robots" content="noindex, nofollow" />
                </Helmet>
                <ResetPasswordView navigateTo={navigateTo} onAuthSuccess={handleAuthSuccess} />
              </>
            }
          />
          <Route
            path="/onboarding"
            element={
              <>
                <Helmet>
                  <title>Complete Profile Onboarding | MyAngan</title>
                  <meta name="description" content="Select your landlord or broker profile type on MyAngan." />
                  <link rel="canonical" href="https://myangan.com/onboarding" />
                </Helmet>
                <OnboardingView
                  currentUser={currentUser}
                  navigateTo={navigateTo}
                  onAuthSuccess={handleAuthSuccess}
                />
              </>
            }
          />
          <Route
            path="/dashboard"
            element={
              <>
                <Helmet>
                  <title>Landlord Dashboard | MyAngan</title>
                  <meta name="description" content="Manage your property listings, view leads, and interact with renters on the MyAngan landlord dashboard." />
                  <link rel="canonical" href="https://myangan.com/dashboard" />
                </Helmet>
                {currentUser?.role === 'admin' ? (
                  <AdminView navigateTo={navigateTo} currentUser={currentUser} />
                ) : (
                  <DashboardView navigateTo={navigateTo} currentUser={currentUser} onOpenMaintenance={() => setIsMaintenanceOpen(true)} />
                )}
              </>
            }
          />
          <Route
            path="/lease-agreement"
            element={
              <>
                <Helmet>
                  <title>Digital Lease Agreement &amp; e-Stamp | MyAngan</title>
                  <meta name="description" content="Generate Delhi NCR Model Tenancy Act compliant e-stamped digital lease agreements with e-sign." />
                  <link rel="canonical" href="https://myangan.com/lease-agreement" />
                </Helmet>
                <LeaseAgreementView onBack={() => navigateTo('properties')} />
              </>
            }
          />
          <Route
            path="/admin/login"
            element={
              <>
                <Helmet>
                  <title>Admin Login | MyAngan</title>
                  <meta name="robots" content="noindex, nofollow" />
                </Helmet>
                {currentUser?.role === 'admin' ? (
                  <AdminView navigateTo={navigateTo} currentUser={currentUser} />
                ) : (
                  <AdminLoginView navigateTo={navigateTo} onAdminLoginSuccess={handleAuthSuccess} />
                )}
              </>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <>
                <Helmet>
                  <title>Admin Dashboard | MyAngan</title>
                  <meta name="robots" content="noindex, nofollow" />
                </Helmet>
                {currentUser?.role === 'admin' ? (
                  <AdminView navigateTo={navigateTo} currentUser={currentUser} />
                ) : (
                  <AdminLoginView navigateTo={navigateTo} onAdminLoginSuccess={handleAuthSuccess} />
                )}
              </>
            }
          />
          <Route
            path="/admin"
            element={
              <>
                <Helmet>
                  <title>Admin Panel | MyAngan</title>
                  <meta name="robots" content="noindex, nofollow" />
                </Helmet>
                {currentUser?.role === 'admin' ? (
                  <AdminView navigateTo={navigateTo} currentUser={currentUser} />
                ) : (
                  <AdminLoginView navigateTo={navigateTo} onAdminLoginSuccess={handleAuthSuccess} />
                )}
              </>
            }
          />
          <Route
            path="/favorites"
            element={
              <>
                <Helmet>
                  <title>My Favorites | MyAngan</title>
                  <meta name="description" content="Manage your saved favorite properties and homes for rent on MyAngan." />
                  <link rel="canonical" href="https://myangan.com/favorites" />
                </Helmet>
                <FavoritesView
                  navigateTo={navigateTo}
                  currentUser={currentUser}
                  compareIds={compareIds}
                  onCompareToggle={handleToggleCompare}
                />
              </>
            }
          />
          <Route
            path="/compare"
            element={
              <>
                <Helmet>
                  <title>Compare Properties | MyAngan</title>
                  <meta name="description" content="Compare features, rent, amenities and locations of up to 4 homes for rent side-by-side on MyAngan." />
                  <link rel="canonical" href="https://myangan.com/compare" />
                </Helmet>
                <CompareView
                  navigateTo={navigateTo}
                  currentUser={currentUser}
                  compareIds={compareIds}
                  onRemoveFromCompare={handleRemoveFromCompare}
                  onClearCompare={handleClearCompare}
                />
              </>
            }
          />
          {/* SEO Custom Alternatives & Comparisons Routes */}
          <Route
            path="/alternatives"
            element={
              <SeoTemplateView
                navigateTo={navigateTo}
                currentUser={currentUser}
                compareIds={compareIds}
                onCompareToggle={handleToggleCompare}
              />
            }
          />
          <Route
            path="/alternatives/:slug"
            element={
              <SeoTemplateView
                navigateTo={navigateTo}
                currentUser={currentUser}
                compareIds={compareIds}
                onCompareToggle={handleToggleCompare}
              />
            }
          />

          {/* SEO Custom Guides Routes */}
          <Route
            path="/guides/:slug"
            element={
              <SeoTemplateView
                navigateTo={navigateTo}
                currentUser={currentUser}
                compareIds={compareIds}
                onCompareToggle={handleToggleCompare}
              />
            }
          />

          {/* Root Level Dynamic SEO Landing Pages Catch-All (e.g., /pg-for-rent, /owner-properties-for-rent) */}
          <Route
            path="/pg-for-rent"
            element={
              <SeoTemplateView
                navigateTo={navigateTo}
                currentUser={currentUser}
                compareIds={compareIds}
                onCompareToggle={handleToggleCompare}
              />
            }
          />
          <Route
            path="/flats-for-rent"
            element={
              <SeoTemplateView
                navigateTo={navigateTo}
                currentUser={currentUser}
                compareIds={compareIds}
                onCompareToggle={handleToggleCompare}
              />
            }
          />
          <Route
            path="/houses-for-rent"
            element={
              <SeoTemplateView
                navigateTo={navigateTo}
                currentUser={currentUser}
                compareIds={compareIds}
                onCompareToggle={handleToggleCompare}
              />
            }
          />
          <Route
            path="/rooms-for-rent"
            element={
              <SeoTemplateView
                navigateTo={navigateTo}
                currentUser={currentUser}
                compareIds={compareIds}
                onCompareToggle={handleToggleCompare}
              />
            }
          />
          <Route
            path="/owner-properties-for-rent"
            element={
              <SeoTemplateView
                navigateTo={navigateTo}
                currentUser={currentUser}
                compareIds={compareIds}
                onCompareToggle={handleToggleCompare}
              />
            }
          />
          <Route
            path="/flats-without-brokerage"
            element={
              <SeoTemplateView
                navigateTo={navigateTo}
                currentUser={currentUser}
                compareIds={compareIds}
                onCompareToggle={handleToggleCompare}
              />
            }
          />
          <Route
            path="/find-a-roommate"
            element={
              <SeoTemplateView
                navigateTo={navigateTo}
                currentUser={currentUser}
                compareIds={compareIds}
                onCompareToggle={handleToggleCompare}
              />
            }
          />

          {/* Target Specific Cities directly to SEO templates */}
          <Route
            path="/rentals/gurugram"
            element={
              <SeoTemplateView
                navigateTo={navigateTo}
                currentUser={currentUser}
                compareIds={compareIds}
                onCompareToggle={handleToggleCompare}
              />
            }
          />
          <Route
            path="/rentals/noida"
            element={
              <SeoTemplateView
                navigateTo={navigateTo}
                currentUser={currentUser}
                compareIds={compareIds}
                onCompareToggle={handleToggleCompare}
              />
            }
          />
          <Route
            path="/rentals/ghaziabad"
            element={
              <SeoTemplateView
                navigateTo={navigateTo}
                currentUser={currentUser}
                compareIds={compareIds}
                onCompareToggle={handleToggleCompare}
              />
            }
          />

          {/* Wildcard Fallback */}
          <Route
            path="*"
            element={
              <>
                <Helmet>
                  <title>MyAngan: Homes &amp; Flats for Rent in Delhi NCR</title>
                  <meta name="description" content="Find verified homes, flats and rental properties across Delhi NCR on MyAngan." />
                </Helmet>
                <LandingView
                  navigateTo={navigateTo}
                  currentUser={currentUser}
                  compareIds={compareIds}
                  onCompareToggle={handleToggleCompare}
                />
              </>
            }
          />
        </Routes>
      </main>

      {/* Floating comparison drawer */}
      <CompareFloatingBar
        compareIds={compareIds}
        onRemove={handleRemoveFromCompare}
        onClear={handleClearCompare}
        onCompareNow={() => navigateTo('compare')}
      />

      {/* Footer bar */}
      <Footer
        navigateTo={navigateTo}
        isSupabaseConnected={dbService.isSupabaseConnected()}
      />

      {/* Rental OS Infrastructure Modals */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        properties={propertiesList}
        onSelectProperty={(id) => navigateTo('property-detail', { id })}
        onApplyFilters={(filters) => {
          navigateTo('properties', filters);
        }}
      />

      <PropertyPassportModal
        isOpen={Boolean(passportProperty)}
        onClose={() => setPassportProperty(null)}
        property={passportProperty}
      />

      <MaintenanceModal
        isOpen={isMaintenanceOpen}
        onClose={() => setIsMaintenanceOpen(false)}
      />
    </div>
  );
}

// Wrapper for property detail routing
function PropertyDetailRouteWrapper({ navigateTo, currentUser, onOpenPassport }: any) {
  const { propertyId } = useParams();
  const location = useLocation();
  const id = propertyId || location.state?.id;
  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      setLoading(true);
      dbService.getProperties().then((all) => {
        const found = all.find((p) => p.id === id);
        setProperty(found || null);
        setLoading(false);
      }).catch(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }
  }, [id]);

  const title = property
    ? `${property.bedrooms} BHK ${property.bedrooms >= 4 ? 'Penthouse' : 'Flat'} for Rent in ${property.locality}, ${property.city} | MyAngan`
    : 'Property Details | MyAngan';
  const description = property
    ? `Rent this verified ${property.bedrooms} BHK home in ${property.locality}, ${property.city}. ${property.description.substring(0, 150)}...`
    : 'View verified rental properties in Delhi NCR on MyAngan.';
  const canonical = `https://myangan.com/properties/${id || ''}`;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="twitter:title" content={title} />
        <meta property="twitter:description" content={description} />
        <meta property="twitter:url" content={canonical} />
      </Helmet>
      <PropertyDetailView
        propertyId={id}
        navigateTo={navigateTo}
        currentUser={currentUser}
        onOpenPassport={onOpenPassport}
      />
    </>
  );
}

// Wrapper for listings search and city specific routes
function ListingsRouteWrapper({ navigateTo, currentUser, compareIds, onCompareToggle }: any) {
  const location = useLocation();
  const { city } = useParams();

  const cityMap: Record<string, string> = {
    'gurugram': 'Gurugram',
    'delhi': 'South Delhi',
    'noida': 'Noida',
    'greater-noida': 'Greater Noida',
    'ghaziabad': 'Ghaziabad',
    'faridabad': 'Faridabad',
  };

  const mappedCity = city ? cityMap[city.toLowerCase()] : undefined;
  const initialFilters = location.state || (mappedCity ? { city: mappedCity } : {});

  // Custom SEO metadata based on city parameter
  let title = 'Properties for Rent in Delhi NCR | MyAngan';
  let description = 'Browse and search verified flats, apartments, and houses for rent in Delhi NCR. Zero fake listings, direct connections, and direct owner/broker listings.';
  let canonical = 'https://myangan.com/properties';

  if (city) {
    const formattedCityName = city.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    if (city.toLowerCase() === 'delhi') {
      title = 'Flats for Rent in South Delhi | MyAngan';
      description = 'Explore verified flats and builder floors for rent in South Delhi. Discover rental homes in Vasant Kunj, Saket, Greater Kailash, Hauz Khas and nearby areas.';
    } else {
      title = `Flats for Rent in ${formattedCityName} | MyAngan`;
      description = `Find verified apartments and flats for rent in ${formattedCityName}. Explore premium rentals and top societies with zero fake listings.`;
    }
    canonical = `https://myangan.com/rentals/${city.toLowerCase()}`;
  }

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="twitter:title" content={title} />
        <meta property="twitter:description" content={description} />
        <meta property="twitter:url" content={canonical} />
      </Helmet>
      <ListingsView
        navigateTo={navigateTo}
        currentUser={currentUser}
        initialFilters={initialFilters}
        compareIds={compareIds}
        onCompareToggle={onCompareToggle}
      />
    </>
  );
}
