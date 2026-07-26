/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Link, useParams, useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Property, UserProfile } from '../../types';
import { seoPageService, SeoPage } from '../../lib/seoData';
import { dbService } from '../../lib/db';
import PropertyCard from '../PropertyCard';
import { 
  ChevronRight, 
  MapPin, 
  Info, 
  ShieldCheck, 
  ArrowRight, 
  Check, 
  X, 
  FileText, 
  ArrowLeftRight, 
  HelpCircle, 
  Sparkles, 
  AlertTriangle,
  UserCheck
} from 'lucide-react';

interface SeoTemplateViewProps {
  navigateTo: (route: string, params?: any) => void;
  currentUser: UserProfile | null;
  compareIds: string[];
  onCompareToggle: (id: string) => void;
}

export default function SeoTemplateView({
  navigateTo,
  currentUser,
  compareIds,
  onCompareToggle
}: SeoTemplateViewProps) {
  const { slug } = useParams();
  const location = useLocation();

  // Determine current active slug
  const activeSlug = slug || location.pathname.replace(/^\//, '');
  const page = seoPageService.getBySlug(activeSlug);

  const [stats, setStats] = useState<{
    minRent: number;
    maxRent: number;
    avgRent: number;
    totalCount: number;
    filteredProperties: Property[];
  } | null>(null);

  const [loading, setLoading] = useState(true);

  // Waitlist State for roommate or unlisted pages
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistContact, setWaitlistContact] = useState('');
  const [waitlistJoined, setWaitlistJoined] = useState(false);
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);

  useEffect(() => {
    if (!page) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setWaitlistJoined(false);

    // Fetch dynamic stats based on live properties
    seoPageService.getDynamicStats(page).then((computedStats) => {
      setStats(computedStats);
      setLoading(false);
    }).catch((err) => {
      console.error('Error computing dynamic SEO stats:', err);
      setLoading(false);
    });
  }, [activeSlug, page]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-mono">Loading custom SEO content directory...</p>
      </div>
    );
  }

  if (!page) {
    // If page is not configured in SEO data, show a helpful fallback rather than crashing
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-6">
        <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto" />
        <h1 className="text-2xl font-display font-bold text-slate-900">SEO Page Configuration Missing</h1>
        <p className="text-sm text-slate-600 max-w-lg mx-auto">
          The requested route <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-xs">{activeSlug}</code> does not have an active database metadata record. Please register it in the Admin SEO Management Control panel.
        </p>
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:underline">
          Go back home <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // Handle Waitlist Sign Up for Roommate or Coming Soon Pages
  const handleJoinWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistName || !waitlistContact) {
      alert('Please fill out both fields.');
      return;
    }

    setWaitlistSubmitting(true);
    try {
      await dbService.joinWaitlist({
        name: waitlistName,
        contact: waitlistContact,
        role: 'landlord' // fallback
      });
      setWaitlistJoined(true);
      setWaitlistName('');
      setWaitlistContact('');
    } catch (err) {
      console.error('Failed to submit waitlist registration:', err);
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  // Structured Data JSON-LD for Breadcrumbs & FAQ
  const breadcrumbListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://myangan.com/'
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: page.pageType === 'comparison' ? 'Alternatives' : page.pageType === 'guide' ? 'Guides' : 'Properties',
        item: `https://myangan.com/${page.pageType === 'comparison' ? 'alternatives' : page.pageType === 'guide' ? 'guides' : 'properties'}`
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: page.h1,
        item: page.canonicalUrl
      }
    ]
  };

  const faqPageJsonLd = page.faqContent.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: page.faqContent.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  } : null;

  // Render Competitor Fact Sheet Data
  const renderCompetitorComparison = () => {
    if (page.pageType !== 'comparison' || page.slug === 'alternatives') return null;

    // Factual attributes for comparison table
    const competitorName = page.slug.split('/').pop()?.toUpperCase() || 'Competitor';
    
    // Facts about competitors
    const competitorSpecs: Record<string, {
      coverage: string;
      listingSource: string;
      verification: string;
      pricing: string;
      strengths: string[];
      weaknesses: string[];
    }> = {
      'nobroker': {
        coverage: '9 major metro hubs (including partial Delhi NCR)',
        listingSource: 'Owners only (heavy filters against brokers)',
        verification: 'In-house voice verification & mobile audit',
        pricing: 'Free basic plan, subscription packs starting from ₹999 to ₹5,999 for assistants',
        strengths: [
          'Large directory of active direct owners',
          'Offers legal rental agreement generation directly inside portal',
          'Excellent filters for finding family-oriented apartments'
        ],
        weaknesses: [
          'High subscription fee for contacting multiple owners quickly',
          'Limited verified independent builder floors in outer sectors',
          'Slower customer support response during peak lease periods'
        ]
      },
      'magicbricks': {
        coverage: 'Pan-India (all major tier-1 and tier-2 towns)',
        listingSource: 'Massive mix of brokers, developers, and direct owners',
        verification: 'System generated algorithms and paid broker badges',
        pricing: 'Commission-based broker deals (15 days to 1 month rent), optional premium accounts',
        strengths: [
          'Unrivaled volume of total listing inventory',
          'Strong commercial real estate listings',
          'Extensive database of historical price trends and locality guides'
        ],
        weaknesses: [
          'Significant percentage of expired, duplicate, or stale posts',
          'High volume of spam calls from local marketing agents',
          'Complex user interface with excessive ads and popups'
        ]
      },
      '99acres': {
        coverage: 'Pan-India (major residential & industrial corridors)',
        listingSource: 'Primarily local brokers and developer agents',
        verification: 'Agent self-reported checklist tags',
        pricing: 'Standard regional brokerage rates, broker-to-renter communication charges',
        strengths: [
          'Highly active in new residential development projects',
          'In-depth local area property price calculations',
          'Excellent dashboard for professional brokers'
        ],
        weaknesses: [
          'High probability of matching with broker commission agents',
          'Manual user registration and discovery flows are outdated',
          'Lacks direct instant-messaging or chat setups inside portal'
        ]
      },
      'housing-com': {
        coverage: 'Pan-India',
        listingSource: 'Mix of brokers, co-living portals, and owners',
        verification: 'Housing Edge verified visits & online documentation audit',
        pricing: 'Standard broker commission packages or premium account charges',
        strengths: [
          'Beautiful interactive maps with transit distance calculators',
          'Clean mobile app with smooth visual graphics',
          'Integrated online rent payment & loan assistance services'
        ],
        weaknesses: [
          'Higher percentage of identical listings posted by multiple brokers',
          'Heavy push for extra service add-ons (insurance, movers, packers)',
          'Limited focus on independent local pg properties'
        ]
      }
    };

    const compSpec = competitorSpecs[page.slug.split('/').pop() || ''] || {
      coverage: 'Pan-India coverage',
      listingSource: 'Owners & brokers mixed',
      verification: 'Self-reported checkmarks',
      pricing: 'Variable brokerages and pricing plans',
      strengths: ['Large database', 'National scale footprint'],
      weaknesses: ['Varying verification rigor', 'Broker spam risk']
    };

    return (
      <div className="space-y-8 mt-10">
        <h2 className="text-xl font-display font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <ArrowLeftRight className="w-5 h-5 text-orange-500" />
          Factual Comparison Sheet: MyAngan vs {competitorName}
        </h2>

        {/* Factual Table */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-500">
                <th className="p-4">Feature Segment</th>
                <th className="p-4">MyAngan</th>
                <th className="p-4">{competitorName}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-slate-700">
              <tr>
                <td className="p-4 font-semibold text-slate-900 bg-slate-50/30">Target Footprint</td>
                <td className="p-4">100% Focused on Delhi NCR (Gurugram, South Delhi, Noida, Ghaziabad, Faridabad)</td>
                <td className="p-4">{compSpec.coverage}</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-900 bg-slate-50/30">Listing Source</td>
                <td className="p-4">Direct owner submissions &amp; vetted local brokers with zero proxy listings</td>
                <td className="p-4">{compSpec.listingSource}</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-900 bg-slate-50/30">Verification Protocol</td>
                <td className="p-4">Dual phone-verification &amp; actual coordinate mapping. Weekly active listing audits.</td>
                <td className="p-4">{compSpec.verification}</td>
              </tr>
              <tr>
                <td className="p-4 font-semibold text-slate-900 bg-slate-50/30">Platform Cost &amp; Brokerage</td>
                <td className="p-4">100% free for renters. No hidden subscription fees to unlock listings.</td>
                <td className="p-4">{compSpec.pricing}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Strengths and Weaknesses Side-By-Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 space-y-3">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Strengths &amp; When to Choose {competitorName}</h3>
            <ul className="space-y-2">
              {compSpec.strengths.map((str, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span>{str}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-50/50 rounded-xl p-5 border border-slate-100 space-y-3">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Limitations of {competitorName}</h3>
            <ul className="space-y-2">
              {compSpec.weaknesses.map((wk, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                  <X className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                  <span>{wk}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 flex gap-3 items-start">
          <Info className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <p className="text-xs text-orange-800 leading-relaxed">
            <strong>Disclaimer:</strong> MyAngan is an independent rental-property platform and is not affiliated with, endorsed by, or sponsored by the companies mentioned on this page. Product names and trademarks belong to their respective owners. Comparison statistics represent public portal data reviewed as of {page.lastReviewed}.
          </p>
        </div>
      </div>
    );
  };

  // Render Related Pages Crawlable Links
  const renderRelatedPagesLinks = () => {
    if (page.relatedPages.length === 0) return null;

    return (
      <div className="border-t border-slate-100 pt-8 mt-12">
        <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider font-mono mb-4">Related Search Intent Pages</h3>
        <div className="flex flex-wrap gap-2">
          {page.relatedPages.map((slug) => {
            const relPage = seoPageService.getBySlug(slug);
            if (!relPage) return null;
            return (
              <Link
                key={slug}
                to={`/${slug}`}
                className="text-xs bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-full font-medium transition-all"
              >
                {relPage.title.split('|')[0].trim()}
              </Link>
            );
          })}
        </div>
      </div>
    );
  };

  // Render Roommate waitlist or custom forms
  const renderRoommateWaitlist = () => {
    if (page.pageType !== 'roommate') return null;

    return (
      <div className="bg-slate-50 rounded-2xl border border-slate-100 p-6 md:p-8 space-y-6 mt-8 max-w-2xl mx-auto">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-orange-100 text-orange-600 rounded-2xl">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-display font-bold text-slate-900">Join the Flatmate Matching Closed Beta</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Our algorithmic roommate-matching system is currently under closed-circle development for Delhi NCR. Join our verified renter queue to be notified as soon as matches become available in your target sectors.
          </p>
        </div>

        {waitlistJoined ? (
          <div className="bg-green-50 border border-green-100 rounded-xl p-5 text-center space-y-2">
            <UserCheck className="w-8 h-8 text-green-600 mx-auto" />
            <h3 className="text-sm font-bold text-green-800">Registration Complete!</h3>
            <p className="text-xs text-green-600">
              Thank you for registering. You are now placed on our exclusive Delhi NCR Flatmate Beta queue. We will contact you once compatibility profiling commences.
            </p>
          </div>
        ) : (
          <form onSubmit={handleJoinWaitlist} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">Your Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Priyesh Sen"
                  value={waitlistName}
                  onChange={(e) => setWaitlistName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-500">WhatsApp or Email</label>
                <input
                  type="text"
                  placeholder="e.g. +91 98110 22334"
                  value={waitlistContact}
                  onChange={(e) => setWaitlistContact(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={waitlistSubmitting}
              className="w-full py-2.5 bg-[#0F1F3D] hover:bg-[#1b2f54] text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>{waitlistSubmitting ? 'Joining beta queue...' : 'Register for Roommate Beta Matchmaking'}</span>
              <ArrowRight className="w-4 h-4 text-orange-500" />
            </button>
          </form>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Dynamic SEO Tags */}
      <Helmet>
        <title>{page.title}</title>
        <meta name="description" content={page.description} />
        <link rel="canonical" href={page.canonicalUrl} />
        {!page.isIndexed && <meta name="robots" content="noindex, nofollow" />}
        
        {/* Open Graph */}
        <meta property="og:title" content={page.title} />
        <meta property="og:description" content={page.description} />
        <meta property="og:url" content={page.canonicalUrl} />
        <meta property="og:type" content="website" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={page.title} />
        <meta name="twitter:description" content={page.description} />

        {/* Schema Markup */}
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbListJsonLd)}
        </script>
        {faqPageJsonLd && (
          <script type="application/ld+json">
            {JSON.stringify(faqPageJsonLd)}
          </script>
        )}
      </Helmet>

      {/* SEO Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Link to="/" className="hover:text-orange-600 transition-colors">Home</Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        {page.pageType === 'comparison' ? (
          <>
            <Link to="/alternatives" className="hover:text-orange-600 transition-colors">Alternatives</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-800 font-semibold">{page.slug.split('/').pop() || 'Comparison'}</span>
          </>
        ) : page.pageType === 'guide' ? (
          <>
            <span className="text-slate-400">Guides</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-800 font-semibold">{page.title.split('|')[0]}</span>
          </>
        ) : (
          <>
            <Link to="/properties" className="hover:text-orange-600 transition-colors">Rentals</Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
            <span className="text-slate-800 font-semibold">{page.h1}</span>
          </>
        )}
      </nav>

      {/* Core Page Header */}
      <div className="border-b border-slate-100 pb-6 space-y-4">
        <div className="space-y-1.5">
          {page.isIndexed ? (
            <span className="text-[10px] font-mono font-bold tracking-widest text-orange-600 uppercase">
              {page.pageType.replace('-', ' ')} SEARCH ARCHIVE • VERIFIED
            </span>
          ) : (
            <span className="text-[10px] font-mono font-bold tracking-widest text-slate-400 uppercase">
              CLOSED BETA WAITLIST • INDEX EXEMPT
            </span>
          )}
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-slate-900 tracking-tight">
            {page.h1}
          </h1>
        </div>
        <p className="text-sm sm:text-base text-slate-600 max-w-4xl leading-relaxed">
          {page.introduction}
        </p>
      </div>

      {/* Dynamic Data / Real Active Stats Grid (Do not show if Comparison Hub page) */}
      {stats && page.slug !== 'alternatives' && page.pageType !== 'guide' && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-slate-50 border border-slate-100 rounded-2xl p-5">
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-mono">Location Scope</span>
            <p className="text-sm font-bold text-slate-800 flex items-center gap-1">
              <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
              {page.locationFilter || 'Delhi NCR Region'}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-mono">Real Active Inventory</span>
            <p className="text-sm font-bold text-slate-800">
              {stats.totalCount > 0 ? `${stats.totalCount} Vetted Listings` : 'Vetted Queue (Beta)'}
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-mono">Average Rent Value</span>
            <p className="text-sm font-bold text-slate-800">
              ₹{stats.avgRent.toLocaleString('en-IN')}/month
            </p>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-slate-400 font-mono">Standard Deposit Scope</span>
            <p className="text-sm font-bold text-slate-800">
              1-2 Months Rent
            </p>
          </div>
        </div>
      )}

      {/* Main Content Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Side: Main listings / detailed guides */}
        <div className="lg:col-span-2 space-y-8">
          {page.pageType === 'guide' ? (
            <div className="prose prose-slate max-w-none text-slate-600 space-y-4">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-orange-500" />
                  Guide Summary &amp; Key Takeaways
                </h3>
                <p className="text-xs leading-relaxed text-slate-500">
                  {page.uniqueGuidance}
                </p>
              </div>
              <div className="text-sm space-y-4 leading-relaxed pt-2">
                <p>
                  Finding rental spaces inside Delhi NCR (primarily Gurugram, South Delhi, and Noida) can be a challenging endeavor. High brokerage demands, unverified properties on legacy listing platforms, and outdated rent expectations often create unnecessary friction for renters.
                </p>
                <p>
                  To secure an ideal home, you must verify the land titles, check if security deposits are safely escrowed or subject to clear recovery terms, and draft a formal rent agreement registered under local sub-registrar offices.
                </p>
                <h3 className="font-display font-bold text-slate-900 text-base pt-4">Rental Agreements in Delhi NCR</h3>
                <p>
                  Most landlord-renter arrangements in Haryana and Uttar Pradesh are finalized via an 11-month rent agreement. This avoids complex tenancy registration regulations while granting both sides mutual flexibility. Insist on formal stamp duties (usually starting from ₹50 to ₹100 depending on the state).
                </p>
                <p>
                  If you are choosing co-living or shared flatmate configurations, make sure the society permits visitor entries and guest overnight stays, and verify the municipal power backups to protect against sudden summer electricity disruptions.
                </p>
              </div>
            </div>
          ) : page.pageType === 'roommate' ? (
            <div className="space-y-4 text-slate-600">
              <p className="text-sm leading-relaxed">
                Renting a multi-bedroom apartment with shared roommates or flatmates is an excellent strategy to lower monthly living costs while enjoying high-end high-rise society amenities in Gurugram, Delhi, and Noida.
              </p>
              {renderRoommateWaitlist()}
            </div>
          ) : page.slug === 'alternatives' ? (
            <div className="space-y-6">
              <h2 className="text-lg font-display font-bold text-slate-900 border-b border-slate-100 pb-2">
                Available Platform Alternatives &amp; Factual Reviews
              </h2>
              <p className="text-xs text-slate-500">
                Choose a specific platform alternative below to view an objective, fact-based comparison with MyAngan, including fee structures, coverage regions, and verification checks.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                {[
                  { name: 'NoBroker', slug: 'alternatives/nobroker', desc: 'Factual comparison on bypass-brokerage listings, pricing packs, and verification systems.' },
                  { name: 'Magicbricks', slug: 'alternatives/magicbricks', desc: 'Objective comparison on legacy databases, listing duplication rates, and broker agents.' },
                  { name: '99acres', slug: 'alternatives/99acres', desc: 'Analysis of commercial vs residential target focus and local agent contact protocols.' },
                  { name: 'Housing.com', slug: 'alternatives/housing-com', desc: 'Factual breakdown of interactive map-based property search interfaces and active counts.' }
                ].map((item) => (
                  <Link
                    key={item.slug}
                    to={`/${item.slug}`}
                    className="p-5 border border-slate-100 hover:border-orange-500 rounded-xl bg-slate-50/50 hover:bg-white transition-all space-y-2 group"
                  >
                    <h3 className="font-display font-bold text-slate-800 group-hover:text-orange-600 text-sm flex items-center gap-1.5">
                      MyAngan vs {item.name}
                      <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500 group-hover:translate-x-1 transition-all" />
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            // Listings Render Grid
            <div className="space-y-6">
              <h2 className="text-lg font-display font-bold text-slate-900 border-b border-slate-100 pb-2">
                {stats && stats.totalCount > 0 
                  ? `Active, Verified Listings matching "${page.title.split('|')[0].trim()}"`
                  : 'Popular Verified Listings in Delhi NCR'
                }
              </h2>

              {stats && stats.totalCount > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {stats.filteredProperties.map((prop) => (
                    <PropertyCard
                      key={prop.id}
                      property={prop}
                      onCardClick={() => navigateTo('property-detail', { id: prop.id })}
                      currentUserId={currentUser?.id}
                      onFavoriteToggle={() => {}}
                      isComparing={compareIds.includes(prop.id)}
                      onCompareToggle={() => onCompareToggle(prop.id)}
                    />
                  ))}
                </div>
              ) : (
                // Safe Fallback Callout
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 text-center space-y-4">
                  <div className="p-2 bg-orange-100 text-orange-600 rounded-full w-10 h-10 flex items-center justify-center mx-auto">
                    <Info className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-800">No matching active properties found in this specific tier</h3>
                    <p className="text-xs text-slate-500 max-w-lg mx-auto">
                      All properties matching this specific category have been rented out or are under review. To protect you against fake placeholders, we do not show stale listings.
                    </p>
                  </div>
                  <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
                    <Link
                      to="/properties"
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0F1F3D] text-white font-bold text-xs rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Browse All Verified Rentals <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      to="/waitlist"
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-xs rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Join Priority Renter Waitlist
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Competitor comparison charts rendered if appropriate */}
          {renderCompetitorComparison()}

          {/* Frequently Asked Questions Section */}
          {page.faqContent.length > 0 && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 md:p-8 space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
                <HelpCircle className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-display font-bold text-slate-900">Frequently Asked Questions</h2>
              </div>
              <div className="divide-y divide-slate-200">
                {page.faqContent.map((faq, index) => (
                  <div key={index} className="py-4 space-y-1.5 first:pt-0 last:pb-0">
                    <h3 className="text-sm font-bold text-slate-800">{faq.question}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Educational sidebar context & Local directory list */}
        <div className="space-y-6">
          {/* Quick Legal & Practical Guidance Card */}
          <div className="bg-[#0F1F3D] text-white rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
              <ShieldCheck className="w-5 h-5 text-orange-500" />
              Renter Safety &amp; Trust
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Every listing on MyAngan goes through a manual title verification check before active search deployment. 
            </p>
            <div className="space-y-2 text-xs">
              <div className="flex gap-2 items-start text-slate-200">
                <Check className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <span>Never pay any booking tokens or advance deposits online without visiting the property in person.</span>
              </div>
              <div className="flex gap-2 items-start text-slate-200">
                <Check className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <span>Check landlord utility registry clearances to avoid power backlog bills.</span>
              </div>
              <div className="flex gap-2 items-start text-slate-200">
                <Check className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <span>Vetted brokers charge standard fees strictly at final lease registrations.</span>
              </div>
            </div>
          </div>

          {/* Quick Browse Hub Links */}
          <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider font-mono">Popular City Rental Directories</h3>
            <div className="space-y-2.5 text-xs text-slate-600">
              <Link to="/rentals/gurugram" className="flex items-center justify-between hover:text-orange-600 font-medium">
                <span>Properties in Gurugram</span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </Link>
              <Link to="/rentals/delhi" className="flex items-center justify-between hover:text-orange-600 font-medium">
                <span>Properties in South Delhi</span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </Link>
              <Link to="/rentals/noida" className="flex items-center justify-between hover:text-orange-600 font-medium">
                <span>Properties in Noida</span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </Link>
              <Link to="/rentals/greater-noida" className="flex items-center justify-between hover:text-orange-600 font-medium">
                <span>Properties in Greater Noida</span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </Link>
              <Link to="/rentals/ghaziabad" className="flex items-center justify-between hover:text-orange-600 font-medium">
                <span>Properties in Ghaziabad</span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </Link>
              <Link to="/rentals/faridabad" className="flex items-center justify-between hover:text-orange-600 font-medium">
                <span>Properties in Faridabad</span>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </Link>
            </div>
          </div>

          {/* Fact sources card (if comparison page) */}
          {page.sources && page.sources.length > 0 && (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2.5">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Verification Sources</h4>
              <ul className="text-[11px] text-slate-500 space-y-1">
                {page.sources.map((src, idx) => (
                  <li key={idx} className="list-disc pl-3 ml-2 leading-relaxed">
                    {src}
                  </li>
                ))}
              </ul>
              <p className="text-[9px] text-slate-400 font-mono italic leading-normal">
                Fact checks are conducted periodically. To suggest factual corrections, contact service@myangan.com.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Crawlable Related Pages Links footer area */}
      {renderRelatedPagesLinks()}
    </div>
  );
}
