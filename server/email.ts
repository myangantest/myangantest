/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import nodemailer from 'nodemailer';
import { getSupabaseClient } from './db.js';

// HTML escaping helper to prevent XSS / HTML injection in user-provided content
export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export interface SendEmailParams {
  to: string;
  subject: string;
  templateType?: 'registration_otp' | 'inquiry_owner' | 'inquiry_renter' | 'payment_receipt' | 'general' | string;
  notificationType?: string;
  htmlContent?: string;
  html?: string;
  textContent?: string;
  text?: string;
  replyTo?: string;
  metadata?: Record<string, any>;
}

// Startup SMTP configuration validator
export function validateSmtpConfig(): { isConfigured: boolean; details: string } {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';

  const isConfigured = !!user && !!pass && !user.includes('placeholder');
  return {
    isConfigured,
    details: isConfigured ? `SMTP host: ${host}:${port}, sender: ${user}` : 'SMTP credentials missing or default placeholder',
  };
}

let nodemailerTransporter: nodemailer.Transporter | null = null;

export function getTransporter(): nodemailer.Transporter | null {
  if (nodemailerTransporter) return nodemailerTransporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';

  if (!user || !pass || user.includes('placeholder')) {
    return null;
  }

  try {
    nodemailerTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    return nodemailerTransporter;
  } catch (err) {
    console.error('[Nodemailer Init Error]', err);
    return null;
  }
}

/**
 * Reusable email dispatch service with retry handling and audit logging.
 * NEVER logs passwords, OTPs, credentials, or secrets to stdout or audit logs.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { to, subject, templateType, notificationType, htmlContent, html, textContent, text, replyTo, metadata } = params;
  const finalHtml = htmlContent || html || '';
  const finalText = textContent || text || '';
  const finalTemplate = templateType || notificationType || 'general';

  const rawFrom = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@myangan.in';
  const fromAddress = rawFrom.includes('<') ? rawFrom : `MyAngan Rentals <${rawFrom}>`;
  const replyToEmail = replyTo || process.env.EMAIL_REPLY_TO || (rawFrom.includes('<') ? rawFrom.split('<')[1].replace('>', '').trim() : rawFrom);

  const transporter = getTransporter();
  let attempts = 0;
  const maxRetries = 3;
  let lastError = '';
  let messageId = '';
  let success = false;

  if (transporter) {
    while (attempts < maxRetries && !success) {
      attempts++;
      try {
        const info = await transporter.sendMail({
          from: fromAddress,
          to,
          replyTo: replyToEmail,
          subject,
          text: finalText,
          html: finalHtml,
        });
        messageId = info.messageId || `msg_${Date.now()}`;
        success = true;
      } catch (err: any) {
        lastError = err.message || 'SMTP dispatch error';
        console.warn(`[Email Attempt ${attempts} Failed] To: ${to}, Type: ${finalTemplate}, Error: ${lastError}`);
        if (attempts < maxRetries) {
          await new Promise((res) => setTimeout(res, 500 * attempts));
        }
      }
    }
  } else {
    lastError = 'SMTP transporter unconfigured (missing SMTP_USER / SMTP_PASS). Logged to audit logs.';
  }

  // Audit log to email_delivery_logs WITHOUT storing sensitive OTPs or secrets
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('email_delivery_logs').insert([{
        recipient_email: to,
        template_type: finalTemplate,
        message_id: messageId || null,
        status: success ? 'sent' : 'failed',
        error_details: success ? null : lastError,
        metadata: metadata || null,
        created_at: new Date().toISOString(),
      }]);
    } catch {
      // Log table fallback
    }
  }

  return { success, messageId, error: success ? undefined : lastError };
}

// ----------------------------------------------------
// Specialized Email Template Builders
// ----------------------------------------------------

export async function sendOtpEmail(to: string, otpCode: string): Promise<boolean> {
  const safeOtp = escapeHtml(otpCode);
  const result = await sendEmail({
    to,
    subject: 'Your MyAngan Account Verification Code',
    templateType: 'registration_otp',
    htmlContent: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
        <h2 style="color: #ea580c;">MyAngan Verification</h2>
        <p>Your one-time account verification code is:</p>
        <div style="background: #fff7ed; border: 1px border-orange-200; font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #c2410c; padding: 12px; text-align: center; border-radius: 8px; margin: 16px 0;">
          ${safeOtp}
        </div>
        <p style="font-size: 12px; color: #64748b;">This code expires in 10 minutes. Never share this code with anyone.</p>
      </div>
    `,
    textContent: `Your MyAngan OTP code is: ${otpCode}. It expires in 10 minutes.`,
  });
  return result.success;
}

export async function sendPasswordResetOtpEmail(to: string, otpCode: string): Promise<boolean> {
  const safeOtp = escapeHtml(otpCode);
  const result = await sendEmail({
    to,
    subject: 'Your MyAngan Password Reset Code',
    templateType: 'password_reset',
    htmlContent: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #ea580c; margin-top: 0;">MyAngan Password Recovery</h2>
        <p style="color: #334155; font-size: 14px;">You requested a password reset for your MyAngan account. Your single-use recovery code is:</p>
        <div style="background: #fff7ed; border: 1px solid #fed7aa; font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #c2410c; padding: 16px; text-align: center; border-radius: 8px; margin: 20px 0;">
          ${safeOtp}
        </div>
        <p style="font-size: 13px; color: #64748b; margin-bottom: 4px;">This code is valid for <strong>10 minutes</strong>. Never share this code with anyone.</p>
        <p style="font-size: 12px; color: #94a3b8; margin-top: 16px; border-top: 1px solid #f1f5f9; padding-top: 12px;">If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>
      </div>
    `,
    textContent: `Your MyAngan password reset code is: ${otpCode}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
  });
  return result.success;
}

export async function sendPasswordChangedEmail(to: string): Promise<boolean> {
  const changeTime = new Date().toUTCString();
  const result = await sendEmail({
    to,
    subject: 'Your MyAngan Password Has Been Changed',
    templateType: 'password_changed',
    htmlContent: `
      <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="color: #0f172a; margin-top: 0;">Password Changed Successfully</h2>
        <p style="color: #334155; font-size: 14px;">The password for your MyAngan account was updated on <strong>${changeTime}</strong>.</p>
        <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px; margin: 16px 0; border-radius: 4px; font-size: 13px; color: #475569;">
          If you performed this action, no further steps are needed.
        </div>
        <p style="font-size: 12px; color: #dc2626; font-weight: 500; margin-top: 16px;">
          Security Warning: If you did not authorize this change, please contact support immediately at support@myangan.in.
        </p>
      </div>
    `,
    textContent: `Your MyAngan password was changed on ${changeTime}. If you did not make this change, please contact support immediately at support@myangan.in.`,
  });
  return result.success;
}

export async function sendOwnerInquiryNotification(params: {
  ownerEmail: string;
  ownerName: string;
  renterName: string;
  renterPhone: string;
  propertyTitle: string;
  message: string;
}): Promise<boolean> {
  const safeOwner = escapeHtml(params.ownerName);
  const safeRenter = escapeHtml(params.renterName);
  const safePhone = escapeHtml(params.renterPhone);
  const safeTitle = escapeHtml(params.propertyTitle);
  const safeMsg = escapeHtml(params.message);

  const result = await sendEmail({
    to: params.ownerEmail,
    subject: `New Renter Inquiry for "${params.propertyTitle}"`,
    templateType: 'inquiry_owner',
    htmlContent: `
      <div style="font-family: sans-serif; max-width: 550px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0;">
        <h2 style="color: #0f172a;">New Rental Inquiry</h2>
        <p>Hello ${safeOwner},</p>
        <p>You received a new inquiry for your listing: <strong>${safeTitle}</strong></p>
        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; font-size: 14px;">
          <p><strong>Renter Name:</strong> ${safeRenter}</p>
          <p><strong>Phone:</strong> ${safePhone}</p>
          <p><strong>Message:</strong> "${safeMsg}"</p>
        </div>
      </div>
    `,
    textContent: `New Inquiry for ${params.propertyTitle} from ${params.renterName} (${params.renterPhone}): ${params.message}`,
  });
  return result.success;
}
