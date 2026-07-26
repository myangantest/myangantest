/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Sparkles, Send, X, Bot, MapPin, Search, ArrowRight, ShieldCheck } from 'lucide-react';
import { Property } from '../types';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: { city?: string; query?: string; maxRent?: number; bedrooms?: number }) => void;
  properties?: Property[];
  onSelectProperty?: (id: string) => void;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  suggestedFilters?: { city?: string; query?: string; maxRent?: number; bedrooms?: number };
  matchedProperties?: Property[];
}

export default function AiAssistantModal({
  isOpen,
  onClose,
  onApplyFilters,
  properties = [],
  onSelectProperty,
}: AiAssistantModalProps) {
  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Namaste! I am your MyAngan AI Rental Assistant. Ask me anything like:\n• "Show me 2BHK flats in Gurugram under ₹35,000"\n• "Verified 3BHK in South Delhi near metro"\n• "Affordable rentals in Noida Sector 62"',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  if (!isOpen) return null;

  const quickPrompts = [
    '2BHK in Gurugram under ₹35k',
    'Verified flats near Cyber City',
    '1BHK in Noida Expressway',
    '3BHK luxury in South Delhi',
  ];

  const parseUserIntent = (text: string) => {
    const lower = text.toLowerCase();
    let city: string | undefined = undefined;
    let maxRent: number | undefined = undefined;
    let bedrooms: number | undefined = undefined;

    // Detect City
    if (lower.includes('gurugram') || lower.includes('gurgaon') || lower.includes('cyber city') || lower.includes('golf course')) {
      city = 'Gurugram';
    } else if (lower.includes('delhi') || lower.includes('south delhi') || lower.includes('dwarka') || lower.includes('saket')) {
      city = 'South Delhi';
    } else if (lower.includes('noida') || lower.includes('expressway') || lower.includes('sector')) {
      city = 'Noida';
    }

    // Detect Bedrooms
    if (lower.includes('1bhk') || lower.includes('1 bhk') || lower.includes('1 bedroom')) bedrooms = 1;
    else if (lower.includes('2bhk') || lower.includes('2 bhk') || lower.includes('2 bedroom')) bedrooms = 2;
    else if (lower.includes('3bhk') || lower.includes('3 bhk') || lower.includes('3 bedroom')) bedrooms = 3;
    else if (lower.includes('4bhk') || lower.includes('4 bhk')) bedrooms = 4;

    // Detect Rent Amount
    const rentMatch = lower.match(/(?:under|below|max|budget)?\s*₹?\s*(\d{2,3})k\b/) || lower.match(/(?:under|below|max)?\s*₹?\s*(\d{4,6})\b/);
    if (rentMatch) {
      const val = parseInt(rentMatch[1], 10);
      maxRent = val < 1000 ? val * 1000 : val;
    }

    // Find matching properties from existing properties
    const matches = properties.filter((p) => {
      if (city && p.city.toLowerCase() !== city.toLowerCase()) return false;
      if (bedrooms && p.bedrooms !== bedrooms) return false;
      if (maxRent && p.rent_amount > maxRent) return false;
      return true;
    }).slice(0, 3);

    return { city, maxRent, bedrooms, query: text, matches };
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsProcessing(true);

    try {
      const res = await fetch('/api/ai/search-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: query }),
      });

      let aiFilters: any = {};
      let notice = 'AI recommendations are generated automatically and may misunderstand your request.';

      if (res.ok) {
        const json = await res.json();
        aiFilters = json.filters || {};
        notice = json.notice || notice;
      } else {
        const intent = parseUserIntent(query);
        aiFilters = intent;
      }

      // Find matching properties from existing property list
      const matches = properties.filter((p) => {
        if (aiFilters.city && p.city.toLowerCase() !== aiFilters.city.toLowerCase()) return false;
        if (aiFilters.bedrooms && p.bedrooms !== aiFilters.bedrooms) return false;
        if (aiFilters.maxRent && p.rent_amount > aiFilters.maxRent) return false;
        return true;
      }).slice(0, 3);

      const filterSummaryParts: string[] = [];
      if (aiFilters.city) filterSummaryParts.push(`City: ${aiFilters.city}`);
      if (aiFilters.locality) filterSummaryParts.push(`Locality: ${aiFilters.locality}`);
      if (aiFilters.bedrooms) filterSummaryParts.push(`${aiFilters.bedrooms} BHK`);
      if (aiFilters.maxRent) filterSummaryParts.push(`Max Rent: ₹${aiFilters.maxRent.toLocaleString('en-IN')}`);
      if (aiFilters.furnishing) filterSummaryParts.push(`Furnishing: ${aiFilters.furnishing}`);

      const summaryText = filterSummaryParts.length > 0
        ? `I interpreted your search as:\n• ${filterSummaryParts.join('\n• ')}\n\n${notice}`
        : `I could not extract specific filter parameters from your query. Try specifying a city, budget, or bedroom count.\n\n${notice}`;

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: summaryText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFilters: {
          city: aiFilters.city,
          maxRent: aiFilters.maxRent,
          bedrooms: aiFilters.bedrooms,
          query: query,
        },
        matchedProperties: matches,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const intent = parseUserIntent(query);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `Search query processed. View recommended property listings below.\n\nNotice: AI recommendations are generated automatically and may misunderstand your request.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggestedFilters: { city: intent.city, maxRent: intent.maxRent, bedrooms: intent.bedrooms },
        matchedProperties: intent.matches,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white text-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl h-[620px] flex flex-col overflow-hidden border border-slate-100">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 border border-orange-500/30 rounded-xl text-orange-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-lg">MyAngan AI Assistant</h3>
                <span className="text-[10px] font-mono bg-orange-500/20 text-orange-300 border border-orange-500/30 px-2 py-0.5 rounded-full">
                  LLM v1.0
                </span>
              </div>
              <p className="text-xs text-slate-400">AI-powered property search, rent pricing & flatmate matching</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-1">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl p-4 shadow-xs text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-slate-900 text-white rounded-tr-xs'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-tl-xs'
                }`}
              >
                <p className="whitespace-pre-line">{msg.text}</p>

                {/* Matched Property Cards inside Chat */}
                {msg.matchedProperties && msg.matchedProperties.length > 0 && (
                  <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Recommended Matches
                    </p>
                    {msg.matchedProperties.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          if (onSelectProperty) onSelectProperty(p.id);
                          onClose();
                        }}
                        className="flex items-center gap-3 p-2 bg-slate-50 hover:bg-orange-50/60 border border-slate-200/80 rounded-xl cursor-pointer transition-all group"
                      >
                        <img
                          src={p.image_urls[0]}
                          alt={p.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-bold text-slate-900 truncate group-hover:text-orange-600">
                              {p.title}
                            </p>
                            {p.is_verified && (
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {p.locality}, {p.city}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-extrabold text-slate-900">
                            ₹{p.rent_amount.toLocaleString('en-IN')}
                          </p>
                          <span className="text-[10px] text-orange-600 font-semibold group-hover:underline">
                            View →
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Trigger Button */}
                {msg.suggestedFilters && (
                  <button
                    onClick={() => {
                      onApplyFilters(msg.suggestedFilters || {});
                      onClose();
                    }}
                    className="mt-3 w-full py-2 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5" />
                    Apply Filter & View Listings
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <span className="text-[10px] text-slate-400 block mt-1 text-right">
                  {msg.timestamp}
                </span>
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex gap-3 items-center text-slate-400 text-xs py-2">
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <span>MyAngan AI is thinking...</span>
            </div>
          )}
        </div>

        {/* Quick Suggestions Pills */}
        <div className="px-4 py-2 bg-slate-100/60 border-t border-slate-200/60 flex items-center gap-2 overflow-x-auto text-xs">
          <span className="text-slate-400 shrink-0 font-medium text-[11px]">Suggestions:</span>
          {quickPrompts.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="px-2.5 py-1 bg-white hover:bg-orange-50 text-slate-600 hover:text-orange-600 border border-slate-200 rounded-full shrink-0 transition-colors cursor-pointer text-[11px]"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask AI: e.g. 2BHK flat in Gurugram under ₹30,000..."
            className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-800 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputQuery.trim() || isProcessing}
            className="p-2.5 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
