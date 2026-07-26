/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, Router } from 'express';
import { getSupabaseClient } from './db.js';
import { escapeHtml } from './email.js';

export const aiRouter = Router();

// Strict Normalized Search Filter Schema Interface
export interface StrictSearchFilters {
  city?: string;
  locality?: string;
  minRent?: number;
  maxRent?: number;
  bedrooms?: number;
  furnishing?: 'furnished' | 'semi_furnished' | 'unfurnished';
  amenities?: string[];
}

// Mandatory Rent Estimation Disclaimer Notice
export const RENT_ESTIMATE_DISCLAIMER =
  'Estimated rent is informational only. Actual rent may differ based on property condition, exact location, market demand and negotiation.';

/**
 * Sanitizes user search prompt against prompt injection attacks
 */
export function sanitizeSearchPrompt(input: string): string {
  if (!input) return '';
  // Truncate to max 500 characters
  let clean = input.slice(0, 500);
  // Remove control characters, system prompt overrides, and SQL keywords
  clean = clean.replace(/[\x00-\x1F\x7F]/g, '');
  clean = clean.replace(/(ignore previous instructions|system prompt|drop table|select \* from|delete from)/gi, '[filtered]');
  return clean.trim();
}

/**
 * Normalizes and validates untrusted raw model output into strict filter schema
 */
export function validateAndNormalizeFilters(rawOutput: any): StrictSearchFilters {
  const normalized: StrictSearchFilters = {};

  if (!rawOutput || typeof rawOutput !== 'object') {
    return normalized;
  }

  // Validate City
  if (typeof rawOutput.city === 'string' && rawOutput.city.trim().length >= 2) {
    normalized.city = rawOutput.city.trim();
  }

  // Validate Locality
  if (typeof rawOutput.locality === 'string' && rawOutput.locality.trim().length >= 2) {
    normalized.locality = rawOutput.locality.trim();
  }

  // Validate Min/Max Rent
  if (typeof rawOutput.minRent === 'number' && rawOutput.minRent > 0 && rawOutput.minRent <= 1000000) {
    normalized.minRent = Math.floor(rawOutput.minRent);
  }
  if (typeof rawOutput.maxRent === 'number' && rawOutput.maxRent > 0 && rawOutput.maxRent <= 1000000) {
    normalized.maxRent = Math.floor(rawOutput.maxRent);
  }
  if (normalized.minRent && normalized.maxRent && normalized.minRent > normalized.maxRent) {
    // Swap if min > max
    const tmp = normalized.minRent;
    normalized.minRent = normalized.maxRent;
    normalized.maxRent = tmp;
  }

  // Validate Bedrooms
  if (typeof rawOutput.bedrooms === 'number' && rawOutput.bedrooms >= 1 && rawOutput.bedrooms <= 10) {
    normalized.bedrooms = Math.floor(rawOutput.bedrooms);
  }

  // Validate Furnishing
  const validFurnishing = ['furnished', 'semi_furnished', 'unfurnished'];
  if (typeof rawOutput.furnishing === 'string' && validFurnishing.includes(rawOutput.furnishing.toLowerCase())) {
    normalized.furnishing = rawOutput.furnishing.toLowerCase() as any;
  }

  // Validate Amenities
  if (Array.isArray(rawOutput.amenities)) {
    normalized.amenities = rawOutput.amenities
      .filter((a: any) => typeof a === 'string' && a.trim().length > 0)
      .map((a: string) => a.trim().toLowerCase())
      .slice(0, 10);
  }

  return normalized;
}

/**
 * Fallback heuristic parser when Gemini API key is unconfigured or unavailable
 */
export function parseUserIntentFallback(query: string): StrictSearchFilters {
  const q = query.toLowerCase();
  const filters: StrictSearchFilters = {};

  // Detect City
  if (q.includes('gurugram') || q.includes('gurgaon')) filters.city = 'Gurugram';
  else if (q.includes('noida')) filters.city = 'Noida';
  else if (q.includes('delhi')) filters.city = 'Delhi';
  else if (q.includes('bengaluru') || q.includes('bangalore')) filters.city = 'Bengaluru';

  // Detect Locality
  if (q.includes('dlf phase 5') || q.includes('dlf 5')) filters.locality = 'DLF Phase 5';
  else if (q.includes('sector 62')) filters.locality = 'Sector 62';
  else if (q.includes('golf course')) filters.locality = 'Golf Course Road';

  // Detect BHK / Bedrooms
  const bhkMatch = q.match(/(\d)\s*(bhk|bed|bedroom)/i);
  if (bhkMatch) {
    filters.bedrooms = parseInt(bhkMatch[1], 10);
  }

  // Detect Rent range
  const underMatch = q.match(/(under|below|less than|max)\s*(\d{2,6})/i);
  if (underMatch) {
    const val = parseInt(underMatch[2], 10);
    filters.maxRent = val < 1000 ? val * 1000 : val;
  }

  // Detect Furnishing
  if (q.includes('fully furnished') || q.includes('furnished')) filters.furnishing = 'furnished';
  else if (q.includes('semi furnished') || q.includes('semi-furnished')) filters.furnishing = 'semi_furnished';
  else if (q.includes('unfurnished')) filters.furnishing = 'unfurnished';

  return filters;
}

// -------------------------------------------------------------------
// ENDPOINTS
// -------------------------------------------------------------------

/**
 * POST /api/ai/search-assistant
 * Server-side AI search assistant using GEMINI_API_KEY with schema validation
 */
aiRouter.post('/search-assistant', async (req: Request, res: Response): Promise<void> => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({ error: 'Missing user prompt for AI search assistant.' });
      return;
    }

    const sanitizedPrompt = sanitizeSearchPrompt(prompt);
    const apiKey = process.env.GEMINI_API_KEY;

    let interpretedFilters: StrictSearchFilters = {};
    let isAiGenerated = false;

    if (apiKey && !apiKey.includes('placeholder')) {
      try {
        // Execute server-side call to Google Gemini REST API
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `You are a real estate search filter parser for MyAngan. Convert the user query into a JSON object matching this schema:
                      {
                        "city": string (e.g. "Gurugram", "Noida", "Delhi"),
                        "locality": string (e.g. "DLF Phase 5", "Sector 62"),
                        "minRent": number,
                        "maxRent": number,
                        "bedrooms": number (1-10),
                        "furnishing": "furnished" | "semi_furnished" | "unfurnished",
                        "amenities": array of strings
                      }
                      User Query: "${sanitizedPrompt}"
                      Respond ONLY with raw valid JSON. Do not include markdown code blocks.`,
                    },
                  ],
                },
              ],
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiJson: any = await geminiRes.json();
          const responseText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsedObj = JSON.parse(cleanedText);
          interpretedFilters = validateAndNormalizeFilters(parsedObj);
          isAiGenerated = true;
        } else {
          console.warn('[Gemini API Warning] Gemini request failed; falling back to keyword parser.');
          interpretedFilters = parseUserIntentFallback(sanitizedPrompt);
        }
      } catch (geminiErr: any) {
        console.warn('[Gemini Error]', geminiErr.message);
        interpretedFilters = parseUserIntentFallback(sanitizedPrompt);
      }
    } else {
      // Fallback when API key is missing or unconfigured
      interpretedFilters = parseUserIntentFallback(sanitizedPrompt);
    }

    // Log usage to audit logs
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('audit_logs').insert([{
        action: 'ai_search_query',
        entity_type: 'search',
        entity_id: 'ai_assistant',
        payload: { prompt: sanitizedPrompt, isAiGenerated, interpretedFilters },
      }]);
    }

    res.json({
      status: 'success',
      isAiGenerated,
      prompt: sanitizedPrompt,
      filters: interpretedFilters,
      notice: 'AI recommendations are generated automatically and may misunderstand your request.',
    });
  } catch (err: any) {
    console.error('[AI Router Error]', err.message);
    res.status(500).json({ error: 'Internal server error in AI search assistant.' });
  }
});

/**
 * POST /api/ai/rent-estimate
 * Informational Rent Estimation based on database comparable listings
 */
aiRouter.post('/rent-estimate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { city, locality, bedrooms, furnishing } = req.body;
    if (!city || !bedrooms) {
      res.status(400).json({ error: 'Missing mandatory estimation inputs: city and bedrooms are required.' });
      return;
    }

    const supabase = getSupabaseClient();
    let comparables: any[] = [];

    if (supabase) {
      let queryBuilder = supabase
        .from('properties')
        .select('rent_amount, city, locality, bedrooms, furnishing_status')
        .eq('city', city)
        .eq('bedrooms', bedrooms)
        .in('status', ['active', 'approved']);

      if (locality) {
        queryBuilder = queryBuilder.eq('locality', locality);
      }

      const { data } = await queryBuilder;
      if (data) comparables = data;
    }

    // Insufficient data fallback (< 2 comparables)
    if (comparables.length < 2) {
      res.json({
        status: 'insufficient_data',
        message: 'Insufficient comparable listings in this locality to generate an accurate informational estimate.',
        comparablesCount: comparables.length,
        disclaimer: RENT_ESTIMATE_DISCLAIMER,
      });
      return;
    }

    const rents = comparables.map((c) => c.rent_amount).sort((a, b) => a - b);
    const minRent = rents[0];
    const maxRent = rents[rents.length - 1];
    const avgRent = Math.round(rents.reduce((acc, val) => acc + val, 0) / rents.length);

    // Confidence indicator: High if >= 5 comparables, Medium if 3-4, Low if 2
    const confidence = comparables.length >= 5 ? 'high' : comparables.length >= 3 ? 'medium' : 'low';

    res.json({
      status: 'success',
      estimatedRange: {
        minRent,
        maxRent,
        avgRent,
        formattedRange: `₹${minRent.toLocaleString('en-IN')} – ₹${maxRent.toLocaleString('en-IN')} / month`,
      },
      inputFeatures: {
        city: escapeHtml(city),
        locality: locality ? escapeHtml(locality) : 'All Localities',
        bedrooms,
        furnishing: furnishing || 'semi_furnished',
      },
      comparablesCount: comparables.length,
      confidenceIndicator: confidence,
      dataFreshnessDate: new Date().toISOString(),
      disclaimer: RENT_ESTIMATE_DISCLAIMER,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error processing rent estimation.' });
  }
});
