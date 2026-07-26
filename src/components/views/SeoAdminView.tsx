/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { seoPageService, SeoPage } from '../../lib/seoData';
import { dbService } from '../../lib/db';
import { 
  FileText, 
  Settings, 
  Plus, 
  Trash2, 
  Check, 
  AlertTriangle, 
  RefreshCw, 
  Search, 
  Eye, 
  Globe, 
  Link as LinkIcon, 
  Calendar,
  Layers,
  HelpCircle
} from 'lucide-react';

export default function SeoAdminView() {
  const [pages, setPages] = useState<SeoPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<SeoPage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Stats and checks cache
  const [inventoryCounts, setInventoryCounts] = useState<Record<string, number>>({});
  
  // Edited Page form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [h1, setH1] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [uniqueGuidance, setUniqueGuidance] = useState('');
  const [isIndexed, setIsIndexed] = useState(true);
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [lastReviewed, setLastReviewed] = useState('');
  
  // FAQs and Sources editing lists
  const [faqs, setFaqs] = useState<Array<{ question: string; answer: string }>>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  
  const [sources, setSources] = useState<string[]>([]);
  const [newSource, setNewSource] = useState('');

  const [relatedPageSlugs, setRelatedPageSlugs] = useState<string[]>([]);

  useEffect(() => {
    loadPages();
  }, []);

  const loadPages = () => {
    const allPages = seoPageService.getAll();
    setPages(allPages);
    
    // Calculate live inventories for audit checks
    allPages.forEach(async (p) => {
      const stats = await seoPageService.getDynamicStats(p);
      setInventoryCounts(prev => ({
        ...prev,
        [p.slug]: stats.totalCount
      }));
    });

    if (allPages.length > 0 && !selectedPage) {
      handleSelectPage(allPages[0]);
    }
  };

  const handleSelectPage = (p: SeoPage) => {
    setSelectedPage(p);
    setTitle(p.title);
    setDescription(p.description);
    setH1(p.h1);
    setIntroduction(p.introduction);
    setUniqueGuidance(p.uniqueGuidance);
    setIsIndexed(p.isIndexed);
    setStatus(p.status);
    setLastReviewed(p.lastReviewed);
    setFaqs(p.faqContent || []);
    setSources(p.sources || []);
    setRelatedPageSlugs(p.relatedPages || []);
  };

  const handleSave = () => {
    if (!selectedPage) return;

    const updated = seoPageService.savePage(selectedPage.slug, {
      title,
      description,
      h1,
      introduction,
      uniqueGuidance,
      isIndexed,
      status,
      lastReviewed,
      faqContent: faqs,
      sources,
      relatedPages: relatedPageSlugs
    });

    alert(`SEO settings saved successfully for /${selectedPage.slug}!`);
    loadPages();
    setSelectedPage(updated);
  };

  const handleResetToDefault = () => {
    if (confirm('Are you sure you want to reset all SEO pages to system default templates? All custom admin modifications will be lost.')) {
      seoPageService.resetToDefault();
      loadPages();
      alert('SEO pages reset successfully!');
    }
  };

  // FAQ Handlers
  const handleAddFaq = () => {
    if (!newQuestion || !newAnswer) {
      alert('Please fill out both the FAQ Question and Answer.');
      return;
    }
    setFaqs([...faqs, { question: newQuestion, answer: newAnswer }]);
    setNewQuestion('');
    setNewAnswer('');
  };

  const handleRemoveFaq = (index: number) => {
    setFaqs(faqs.filter((_, idx) => idx !== index));
  };

  // Sources Handlers
  const handleAddSource = () => {
    if (!newSource) return;
    setSources([...sources, newSource]);
    setNewSource('');
  };

  const handleRemoveSource = (index: number) => {
    setSources(sources.filter((_, idx) => idx !== index));
  };

  // Related Pages checkbox handler
  const handleToggleRelatedPage = (slug: string) => {
    if (relatedPageSlugs.includes(slug)) {
      setRelatedPageSlugs(relatedPageSlugs.filter(s => s !== slug));
    } else {
      setRelatedPageSlugs([...relatedPageSlugs, slug]);
    }
  };

  // SEO Health Checks Audit
  const checkMissingFields = (p: SeoPage) => {
    const issues: string[] = [];
    if (!p.title) issues.push('Title is empty');
    else if (p.title.length < 30) issues.push('Title too short (<30 chars)');
    else if (p.title.length > 60) issues.push('Title too long (>60 chars)');

    if (!p.description) issues.push('Description is empty');
    else if (p.description.length < 100) issues.push('Meta description too short (<100 chars)');
    else if (p.description.length > 160) issues.push('Meta description too long (>160 chars)');

    if (!p.h1) issues.push('H1 heading is empty');
    if (!p.introduction || p.introduction.length < 100) issues.push('Introduction is too thin');
    if (!p.faqContent || p.faqContent.length === 0) issues.push('No FAQs added');

    const liveCount = inventoryCounts[p.slug] || 0;
    if (p.isIndexed && liveCount === 0 && p.pageType !== 'roommate' && p.pageType !== 'guide' && p.slug !== 'alternatives') {
      issues.push('NO ACTIVE DATABASE LISTINGS (Should be set to noindex or review filters)');
    }

    return issues;
  };

  const filteredPages = pages.filter(p => 
    p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.pageType.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Overview stats header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-orange-500" />
            Meta Data-Driven Pages &amp; SEO Crawler Audits
          </h2>
          <p className="text-xs text-slate-500">
            Customize search parameters, index toggles, unique headers, canonical structures, and related page listings.
          </p>
        </div>
        <button
          onClick={handleResetToDefault}
          className="px-3 py-1.5 bg-white hover:bg-orange-50 border border-slate-200 hover:border-orange-200 text-slate-600 hover:text-orange-700 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Reset to Defaults</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 4 Cols: SEO pages index sidebar with status list */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3 shadow-sm">
            <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Configure Landing Pages</h3>
            
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search slug, page type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1 max-h-[550px] overflow-y-auto divide-y divide-slate-50 pr-1">
              {filteredPages.map((p) => {
                const issues = checkMissingFields(p);
                const isSelected = selectedPage?.slug === p.slug;
                return (
                  <button
                    key={p.slug}
                    onClick={() => handleSelectPage(p)}
                    className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer block ${
                      isSelected 
                        ? 'bg-orange-50/50 border border-orange-200 text-orange-950' 
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 max-w-[200px] truncate">
                        /{p.slug}
                      </span>
                      <span className={`text-[9px] px-1.5 rounded font-mono font-bold uppercase shrink-0 ${
                        p.status === 'published' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {p.status}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-slate-800 truncate mt-1.5">
                      {p.title || '(No Title Declared)'}
                    </p>

                    <div className="flex justify-between items-center mt-2.5 text-[10px] text-slate-400 font-mono">
                      <span>Live listings: <strong className="text-slate-700">{inventoryCounts[p.slug] !== undefined ? inventoryCounts[p.slug] : '...'}</strong></span>
                      {issues.length > 0 ? (
                        <span className="text-amber-600 font-bold flex items-center gap-0.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          {issues.length} check alerts
                        </span>
                      ) : (
                        <span className="text-green-600 font-bold flex items-center gap-0.5">
                          <Check className="w-3.5 h-3.5 shrink-0" />
                          Perfect
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 8 Cols: Page Metadata Editor form panel */}
        <div className="lg:col-span-8">
          {selectedPage ? (
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6">
              
              {/* Dynamic Header */}
              <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                    <Settings className="w-5 h-5 text-orange-500" />
                    Modify Metadata: /{selectedPage.slug}
                  </h3>
                  <a 
                    href={`/${selectedPage.slug}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-[10px] text-orange-600 font-mono hover:underline inline-flex items-center gap-0.5 mt-0.5"
                  >
                    <Eye className="w-3 h-3" /> Preview live page route
                  </a>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-[#0F1F3D] hover:bg-slate-800 text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>

              {/* Crawl Status and Index Flags */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Workflow State</label>
                  <select
                    value={status}
                    onChange={(e: any) => setStatus(e.target.value)}
                    className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none"
                  >
                    <option value="draft">Draft (Work in progress)</option>
                    <option value="published">Published (Live on site)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Search Crawl Directives</label>
                  <select
                    value={isIndexed ? 'index' : 'noindex'}
                    onChange={(e) => setIsIndexed(e.target.value === 'index')}
                    className="bg-white border border-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none"
                  >
                    <option value="index">Index (Search engines can show)</option>
                    <option value="noindex">Noindex (Exempt from search results)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-600 block">Last Reviewed Date</label>
                  <input
                    type="date"
                    value={lastReviewed}
                    onChange={(e) => setLastReviewed(e.target.value)}
                    className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs focus:outline-none w-full"
                  />
                </div>
              </div>

              {/* Title & Description Fields */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-slate-700">SEO Tag Header Title</label>
                    <span className={`font-mono text-[10px] ${title.length >= 30 && title.length <= 60 ? 'text-green-600' : 'text-amber-600'}`}>
                      {title.length} / 60 characters (recom: 30-60)
                    </span>
                  </div>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                    placeholder="Search Title Tag Content..."
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs">
                    <label className="font-bold text-slate-700">Meta Search Description</label>
                    <span className={`font-mono text-[10px] ${description.length >= 100 && description.length <= 160 ? 'text-green-600' : 'text-amber-600'}`}>
                      {description.length} / 160 characters (recom: 100-160)
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500 resize-none"
                    placeholder="Short summary displayed in search snippets..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Primary Page H1 Headline</label>
                  <input
                    type="text"
                    value={h1}
                    onChange={(e) => setH1(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                    placeholder="H1 visual title displayed at top of content..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Introduction Copy (HTML or Text)</label>
                  <textarea
                    rows={3}
                    value={introduction}
                    onChange={(e) => setIntroduction(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500 resize-none"
                    placeholder="Intro text giving deep regional or competitor context..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block">Unique Practical Guidance (Trust, safety, area metrics)</label>
                  <textarea
                    rows={3}
                    value={uniqueGuidance}
                    onChange={(e) => setUniqueGuidance(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500 resize-none"
                    placeholder="Unique insights concerning deposit refund guidelines, rent values..."
                  />
                </div>
              </div>

              {/* FAQs Setup */}
              <div className="space-y-3 border-t border-slate-100 pt-5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                  <HelpCircle className="w-4 h-4 text-orange-500" />
                  Frequently Asked Questions (FAQPage Schema Integration)
                </h4>
                
                {faqs.length > 0 ? (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {faqs.map((faq, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-start gap-4">
                        <div className="space-y-1 text-xs">
                          <p className="font-bold text-slate-800">Q: {faq.question}</p>
                          <p className="text-slate-600">A: {faq.answer}</p>
                        </div>
                        <button
                          onClick={() => handleRemoveFaq(idx)}
                          className="p-1 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded transition-all shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 font-mono italic">No FAQ items defined. Add at least 1 FAQ to satisfy Rich Schema Crawler guidelines.</p>
                )}

                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 space-y-3">
                  <p className="text-xs font-bold text-slate-700">Add New FAQ Element</p>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Question..."
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                    />
                    <textarea
                      placeholder="Answer..."
                      rows={2}
                      value={newAnswer}
                      onChange={(e) => setNewAnswer(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500 resize-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddFaq}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0F1F3D] text-white font-bold text-xs rounded-lg hover:bg-slate-800 cursor-pointer transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-orange-500" /> Add FAQ Item
                    </button>
                  </div>
                </div>
              </div>

              {/* Related Search intent internal linking checklists */}
              <div className="space-y-3 border-t border-slate-100 pt-5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-4 h-4 text-orange-500" />
                  Inter-Linking Structure (Select Related SEO Pages)
                </h4>
                <p className="text-[10px] text-slate-400 font-mono">Select which slugs to automatically interlink inside the footer area of this page:</p>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[150px] overflow-y-auto border border-slate-100 p-3 rounded-lg bg-slate-50/30">
                  {pages.map((p) => {
                    if (p.slug === selectedPage.slug) return null;
                    const isLinked = relatedPageSlugs.includes(p.slug);
                    return (
                      <label key={p.slug} className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isLinked}
                          onChange={() => handleToggleRelatedPage(p.slug)}
                          className="rounded border-slate-300 text-orange-600 focus:ring-orange-500 w-3.5 h-3.5"
                        />
                        <span className="truncate">/{p.slug}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Factual Sources (for comparisons) */}
              <div className="space-y-3 border-t border-slate-100 pt-5">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                  <FileText className="w-4 h-4 text-orange-500" />
                  Factual Sources Bibliography (Transparency Guarantee)
                </h4>
                
                {sources.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {sources.map((src, idx) => (
                      <span key={idx} className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-full text-[10px] font-mono text-slate-600">
                        {src}
                        <button
                          onClick={() => handleRemoveSource(idx)}
                          className="text-slate-400 hover:text-red-500 cursor-pointer font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 font-mono italic">No external sources added yet.</p>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add verified public document, corporate review, or survey..."
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-orange-500"
                  />
                  <button
                    onClick={handleAddSource}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg cursor-pointer transition-colors"
                  >
                    Add Source
                  </button>
                </div>
              </div>

              {/* Audit Warnings Callout block if alerts exist */}
              {checkMissingFields(selectedPage).length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    Page SEO Audit Alert Log ({checkMissingFields(selectedPage).length} issues)
                  </h4>
                  <ul className="text-[11px] text-amber-700 space-y-1 list-disc pl-4 font-mono">
                    {checkMissingFields(selectedPage).map((issue, idx) => (
                      <li key={idx}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-12 text-center text-slate-400 italic">
              Select an SEO landing page from the sidebar index to modify tags and parameters.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
