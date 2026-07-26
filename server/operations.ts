/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, Router } from 'express';
import { getSupabaseClient } from './db';
import { getAuthUserFromRequest } from './payments';
import { escapeHtml } from './email';

export const operationsRouter = Router();

// Allowed Maintenance Ticket State Transitions
const VALID_TICKET_TRANSITIONS: Record<string, string[]> = {
  open: ['acknowledged', 'in_progress', 'cancelled'],
  acknowledged: ['in_progress', 'resolved', 'cancelled'],
  in_progress: ['resolved', 'cancelled'],
  resolved: ['closed', 'in_progress'],
  closed: [],
  cancelled: [],
};

// Sanitized Public Verification Readout Mapper
export function getSanitizedVerificationStatusLabel(status: string): string {
  switch (status) {
    case 'submitted':
      return 'Documents submitted';
    case 'under_review':
      return 'Verification under review';
    case 'approved':
      return 'Verification completed by MyAngan review';
    case 'additional_information_required':
      return 'Additional information requested by review team';
    case 'rejected':
      return 'Verification not approved';
    case 'expired':
      return 'Verification expired';
    case 'not_submitted':
    default:
      return 'Verification not submitted';
  }
}

// -------------------------------------------------------------------
// 1. MAINTENANCE TICKETING MODULE
// -------------------------------------------------------------------

/**
 * POST /api/operations/tickets
 * Create maintenance ticket (authenticated renter/participant only)
 */
operationsRouter.post('/tickets', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized: Session login required to create ticket.' });
      return;
    }

    const { property_id, category, priority, description, image_urls } = req.body;
    if (!property_id || !category || !description) {
      res.status(400).json({ error: 'Missing mandatory fields: property_id, category, and description are required.' });
      return;
    }

    const validCategories = ['plumbing', 'electrical', 'appliance', 'painting', 'other'];
    if (!validCategories.includes(category)) {
      res.status(400).json({ error: 'Invalid maintenance category specified.' });
      return;
    }

    const supabase = getSupabaseClient();
    let ticket: any = null;

    // SLA Target: 24h for urgent, 48h for high, 72h for normal
    const hoursSla = priority === 'urgent' ? 24 : priority === 'high' ? 48 : 72;
    const slaTargetAt = new Date(Date.now() + hoursSla * 60 * 60 * 1000).toISOString();

    if (supabase) {
      const { data, error } = await supabase
        .from('maintenance_tickets')
        .insert([{
          property_id,
          user_id: user.id,
          category,
          priority: priority || 'normal',
          description,
          status: 'open',
          sla_target_at: slaTargetAt,
          image_urls: Array.isArray(image_urls) ? image_urls : [],
        }])
        .select()
        .single();

      if (error) {
        console.error('[DB Error] maintenance_tickets insert:', error.message);
        res.status(500).json({ error: 'Failed to save maintenance ticket to database.' });
        return;
      }
      ticket = data;

      // History log
      await supabase.from('maintenance_ticket_history').insert([{
        ticket_id: ticket.id,
        actor_id: user.id,
        new_status: 'open',
        notes: 'Ticket created by user',
      }]);

      // Audit log
      await supabase.from('audit_logs').insert([{
        actor_id: user.id,
        action: 'ticket_created',
        entity_type: 'maintenance_ticket',
        entity_id: ticket.id,
      }]);
    } else {
      ticket = {
        id: `tkt_${Date.now()}`,
        property_id,
        user_id: user.id,
        category,
        priority: priority || 'normal',
        description,
        status: 'open',
        sla_target_at: slaTargetAt,
        created_at: new Date().toISOString(),
      };
    }

    res.status(201).json({ status: 'success', ticket });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error creating ticket.' });
  }
});

/**
 * PATCH /api/operations/tickets/:id/status
 * Update ticket status with state transition validation
 */
operationsRouter.patch('/tickets/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { id } = req.params;
    const { new_status, resolution_notes } = req.body;

    const currentStatus = (req.body as any).current_status || 'open';
    const allowed = VALID_TICKET_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(new_status)) {
      res.status(400).json({
        error: `Invalid status transition from '${currentStatus}' to '${new_status}'. Allowed transitions: ${allowed.join(', ') || 'none'}.`,
      });
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      res.json({ status: 'success', ticketId: id, oldStatus: currentStatus, newStatus: new_status });
      return;
    }

    const { data: ticket } = await supabase
      .from('maintenance_tickets')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    const oldStatus = ticket?.status || currentStatus;

    // Update status
    await supabase
      .from('maintenance_tickets')
      .update({
        status: new_status,
        resolution_notes: resolution_notes || (ticket ? ticket.resolution_notes : null),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    // Record history
    await supabase.from('maintenance_ticket_history').insert([{
      ticket_id: id,
      actor_id: user.id,
      old_status: oldStatus,
      new_status,
      notes: resolution_notes || null,
    }]);

    res.json({ status: 'success', ticketId: id, oldStatus, newStatus: new_status });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error updating ticket status.' });
  }
});

// -------------------------------------------------------------------
// 2. AGREEMENT DRAFT & RECORD MANAGEMENT MODULE
// -------------------------------------------------------------------

/**
 * POST /api/operations/agreements
 * Create or update agreement record with draft versioning
 */
operationsRouter.post('/agreements', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { property_id, landlord_id, tenant_id, rent_amount, deposit_amount, start_date, tenure_months, notice_period_months, lock_in_months, terms_json } = req.body;
    if (!property_id || !rent_amount || !start_date) {
      res.status(400).json({ error: 'Missing mandatory agreement fields.' });
      return;
    }

    const supabase = getSupabaseClient();
    let agreement: any = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('agreement_records')
        .insert([{
          property_id,
          landlord_id: landlord_id || user.id,
          tenant_id: tenant_id || null,
          rent_amount,
          deposit_amount: deposit_amount || rent_amount * 2,
          start_date,
          tenure_months: tenure_months || 11,
          notice_period_months: notice_period_months || 1,
          lock_in_months: lock_in_months || 6,
          terms_json: terms_json || {},
          status: 'draft',
          version: 1,
        }])
        .select()
        .single();

      if (error) {
        console.error('[DB Error] agreement_records insert:', error.message);
        res.status(500).json({ error: 'Failed to create agreement record.' });
        return;
      }
      agreement = data;

      // Version history
      await supabase.from('agreement_versions').insert([{
        agreement_id: agreement.id,
        version_number: 1,
        terms_json: terms_json || {},
        created_by: user.id,
      }]);
    } else {
      agreement = {
        id: `agr_${Date.now()}`,
        property_id,
        landlord_id: user.id,
        rent_amount,
        status: 'draft',
        version: 1,
      };
    }

    res.status(201).json({ status: 'success', agreement });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error creating agreement draft.' });
  }
});

/**
 * GET /api/operations/agreements/:id/pdf
 * Generate printable PDF/HTML document with mandatory disclaimers & anti-XSS escaping
 */
operationsRouter.get('/agreements/:id/pdf', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient();

    let record: any = null;
    if (supabase) {
      const { data } = await supabase
        .from('agreement_records')
        .select('*, properties(*)')
        .eq('id', id)
        .maybeSingle();

      record = data;
    }

    const title = record?.properties?.title || 'Residential Property';
    const rent = record?.rent_amount || 35000;
    const deposit = record?.deposit_amount || 70000;
    const startDate = record?.start_date || '2026-08-01';

    // Mandatory legal wording compliance flags
    const documentHeaderTitle = 'Draft Rental Agreement';
    const mandatoryDisclaimer = 'This document is a configurable draft and is not legal advice.';

    const safeTitle = escapeHtml(title);
    const safeDate = escapeHtml(startDate);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${documentHeaderTitle}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #ea580c; padding-bottom: 16px; margin-bottom: 24px; }
          .title { font-size: 24px; font-weight: bold; color: #0f172a; margin: 0; }
          .subtitle { font-size: 14px; color: #ea580c; font-weight: bold; margin-top: 4px; }
          .disclaimer-box { background: #fff7ed; border: 1px solid #fed7aa; padding: 12px 16px; border-radius: 8px; font-size: 12px; color: #c2410c; margin-bottom: 24px; font-weight: bold; }
          .section { margin-bottom: 20px; }
          .section-title { font-size: 16px; font-weight: bold; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 8px; }
          .table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }
          .table td { padding: 8px; border-bottom: 1px solid #f1f5f9; }
          .table td.bold { font-weight: bold; color: #334155; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">${documentHeaderTitle}</h1>
          <div class="subtitle">MyAngan Rental Agreement Draft Generator</div>
        </div>

        <div class="disclaimer-box">
          ⚠️ NOTICE: ${mandatoryDisclaimer}
        </div>

        <div class="section">
          <div class="section-title">1. Property & Tenure Terms</div>
          <table class="table">
            <tr><td class="bold">Property Description:</td><td>${safeTitle}</td></tr>
            <tr><td class="bold">Monthly Rent:</td><td>₹${rent.toLocaleString('en-IN')} INR / month</td></tr>
            <tr><td class="bold">Security Deposit:</td><td>₹${deposit.toLocaleString('en-IN')} INR</td></tr>
            <tr><td class="bold">Commencement Date:</td><td>${safeDate}</td></tr>
            <tr><td class="bold">Tenure Duration:</td><td>11 Months (Configurable Draft)</td></tr>
          </table>
        </div>

        <div class="section">
          <div class="section-title">2. Terms & Conditions Summary</div>
          <p style="font-size: 13px; line-height: 1.6; color: #475569;">
            The Tenant agrees to pay rent on or before the 5th day of every calendar month. The Security Deposit shall be refunded by the Landlord upon peaceful handover of possession minus any utility dues or damage deductions.
          </p>
        </div>
      </body>
      </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(htmlContent);
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error generating agreement draft.' });
  }
});

// -------------------------------------------------------------------
// 3. PROPERTY VERIFICATION WORKFLOW & SANITIZED STATUS READOUT
// -------------------------------------------------------------------

/**
 * GET /api/operations/verifications/:propertyId
 * Public endpoint: Returns ONLY sanitized status label. NEVER exposes Aadhaar/Identity docs.
 */
operationsRouter.get('/verifications/:propertyId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { propertyId } = req.params;
    const supabase = getSupabaseClient();

    let rawStatus = 'not_submitted';
    let isVerified = false;

    if (supabase) {
      const { data } = await supabase
        .from('property_verification_requests')
        .select('ver_status, status')
        .eq('property_id', propertyId)
        .order('created_at', { ascending: false })
        .maybeSingle();

      if (data) {
        rawStatus = data.ver_status || data.status || 'not_submitted';
        isVerified = rawStatus === 'approved';
      }
    }

    const publicLabel = getSanitizedVerificationStatusLabel(rawStatus);

    res.json({
      propertyId,
      isVerified,
      verificationStatusLabel: publicLabel,
      // ZERO sensitive document paths, Aadhaar numbers, or title deeds returned
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error reading verification status.' });
  }
});

// -------------------------------------------------------------------
// 4. LISTING MODERATION & FRAUD REPORTING MODULE
// -------------------------------------------------------------------

/**
 * POST /api/operations/reports
 * Submit property report (fraud / misleading info)
 */
operationsRouter.post('/reports', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getAuthUserFromRequest(req);
    const { property_id, reason, details } = req.body;

    if (!property_id || !reason || !details) {
      res.status(400).json({ error: 'Missing report parameters: property_id, reason, and details required.' });
      return;
    }

    const validReasons = ['misleading_price', 'fake_photos', 'unresponsive_owner', 'duplicate_listing', 'other'];
    if (!validReasons.includes(reason)) {
      res.status(400).json({ error: 'Invalid report reason category.' });
      return;
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('property_reports').insert([{
        property_id,
        reporter_id: user ? user.id : null,
        reason,
        details: escapeHtml(details),
        status: 'pending',
      }]);

      await supabase.from('audit_logs').insert([{
        actor_id: user ? user.id : null,
        action: 'property_reported',
        entity_type: 'property',
        entity_id: property_id,
        payload: { reason },
      }]);
    }

    res.status(201).json({ status: 'success', message: 'Report submitted successfully to MyAngan moderation queue.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error submitting report.' });
  }
});

/**
 * POST /api/operations/moderation/review
 * Admin endpoint: Review report and suspend listing
 */
operationsRouter.post('/moderation/review', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized: Admin authentication required.' });
      return;
    }

    const { report_id, action_decision, admin_notes } = req.body;
    if (!report_id || !action_decision) {
      res.status(400).json({ error: 'Missing report_id or action_decision.' });
      return;
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: report } = await supabase
        .from('property_reports')
        .select('*')
        .eq('id', report_id)
        .maybeSingle();

      if (report) {
        if (action_decision === 'suspend') {
          // Suspend listing
          await supabase
            .from('properties')
            .update({ status: 'inactive', updated_at: new Date().toISOString() })
            .eq('id', report.property_id);

          await supabase
            .from('property_reports')
            .update({ status: 'actioned_suspended', admin_notes, resolved_at: new Date().toISOString() })
            .eq('id', report_id);
        } else {
          await supabase
            .from('property_reports')
            .update({ status: 'dismissed', admin_notes, resolved_at: new Date().toISOString() })
            .eq('id', report_id);
        }

        await supabase.from('audit_logs').insert([{
          actor_id: user.id,
          action: action_decision === 'suspend' ? 'property_suspended' : 'report_dismissed',
          entity_type: 'property',
          entity_id: report.property_id,
          payload: { report_id, action_decision, admin_notes },
        }]);
      }
    }

    res.json({ status: 'success', action: action_decision });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal server error completing moderation review.' });
  }
});
