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

export interface SmtpConfigResult {
  isConfigured: boolean;
  details: string;
  missingVars: string[];
}

/**
 * Startup and runtime SMTP configuration validator.
 * Checks for mandatory SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, and EMAIL_FROM.
 */
export function validateSmtpConfig(): SmtpConfigResult {
  const host = process.env.SMTP_HOST || '';
  const portStr = process.env.SMTP_PORT || '';
  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';
  const from = process.env.EMAIL_FROM || '';

  const missingVars: string[] = [];
  if (!host || host.includes('placeholder')) missingVars.push('SMTP_HOST');
  if (!portStr || portStr.includes('placeholder')) missingVars.push('SMTP_PORT');
  if (!user || user.includes('placeholder')) missingVars.push('SMTP_USER');
  if (!pass || pass.includes('placeholder')) missingVars.push('SMTP_PASSWORD');
  if (!from || from.includes('placeholder')) missingVars.push('EMAIL_FROM');

  const isConfigured = missingVars.length === 0;

  return {
    isConfigured,
    details: isConfigured
      ? `SMTP Host: ${host}:${portStr}, Sender: ${from}`
      : `Missing required SMTP variables: ${missingVars.join(', ')}`,
    missingVars,
  };
}

let nodemailerTransporter: nodemailer.Transporter | null = null;

export function getTransporter(): nodemailer.Transporter | null {
  if (nodemailerTransporter) return nodemailerTransporter;

  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  
  // Requirement 5: Strict boolean parsing for SMTP_SECURE
  const rawSecure = process.env.SMTP_SECURE;
  let isSecure = false;
  if (typeof rawSecure === 'string') {
    isSecure = rawSecure.trim().toLowerCase() === 'true';
  } else {
    isSecure = port === 465;
  }

  const user = process.env.SMTP_USER || '';
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || '';

  if (!user || !pass || user.includes('placeholder')) {
    return null;
  }

  try {
    const transportOpts: any = {
      host,
      port,
      secure: isSecure,
      auth: { user, pass },
    };

    // For port 587 without direct SSL, require TLS upgrade
    if (port === 587 && !isSecure) {
      transportOpts.requireTLS = true;
    }

    nodemailerTransporter = nodemailer.createTransport(transportOpts);
    return nodemailerTransporter;
  } catch (err: any) {
    console.error('[Nodemailer Transporter Init Error] Message:', err?.message || err);
    return null;
  }
}

/**
 * Diagnostic helper to verify SMTP transporter connection and credentials.
 * NEVER exposes passwords or secrets.
 */
export async function verifySmtpConnection(): Promise<{ success: boolean; code?: string; message: string }> {
  const config = validateSmtpConfig();
  if (!config.isConfigured) {
    return {
      success: false,
      code: 'MISSING_SMTP_CONFIG',
      message: `SMTP unconfigured. Missing: ${config.missingVars.join(', ')}`,
    };
  }

  const transporter = getTransporter();
  if (!transporter) {
    return {
      success: false,
      code: 'TRANSPORTER_INIT_FAILED',
      message: 'Failed to initialize SMTP transporter instance.',
    };
  }

  try {
    await transporter.verify();
    return {
      success: true,
      message: 'SMTP transporter connection & authentication verified successfully.',
    };
  } catch (err: any) {
    const safeCode = err.code || 'VERIFY_FAILED';
    console.error(`[SMTP Diagnostic Error] Code: ${safeCode}, Command: ${err.command || 'N/A'}, ResponseCode: ${err.responseCode || 'N/A'}, Response: ${err.response || 'N/A'}, Message: ${err.message}`);
    return {
      success: false,
      code: safeCode,
      message: err.message || 'SMTP transporter connection verification failed.',
    };
  }
}

/**
 * Reusable email dispatch service with retry handling and audit logging.
 * NEVER logs passwords, OTPs, credentials, or secrets to stdout or audit logs.
 */
export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; messageId?: string; code?: string; error?: string }> {
  const { to, subject, templateType, notificationType, htmlContent, html, textContent, text, replyTo, metadata } = params;
  const finalHtml = htmlContent || html || '';
  const finalText = textContent || text || '';
  const finalTemplate = templateType || notificationType || 'general';

  // Requirement 4: Check SMTP Configuration presence
  const configCheck = validateSmtpConfig();
  if (!configCheck.isConfigured) {
    console.error(`[SMTP Config Error] Cannot send email. Missing variables: ${configCheck.missingVars.join(', ')}`);
    return {
      success: false,
      code: 'MISSING_SMTP_CONFIG',
      error: `SMTP transporter unconfigured. Missing required environment variables: ${configCheck.missingVars.join(', ')}`,
    };
  }

  // Requirement 6: Use EMAIL_FROM directly without re-wrapping if already formatted
  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'MyAngan <service@myangan.in>';
  
  // Extract pure email for replyTo fallback if needed
  let defaultReplyTo = fromAddress;
  if (fromAddress.includes('<') && fromAddress.includes('>')) {
    defaultReplyTo = fromAddress.split('<')[1].replace('>', '').trim();
  }
  const replyToEmail = replyTo || process.env.EMAIL_REPLY_TO || defaultReplyTo;

  const transporter = getTransporter();
  if (!transporter) {
    return {
      success: false,
      code: 'MISSING_SMTP_CONFIG',
      error: 'SMTP transporter instance could not be created.',
    };
  }

  let attempts = 0;
  const maxRetries = 3;
  let lastError = '';
  let lastErrorCode = '';
  let messageId = '';
  let success = false;

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

      // Requirement 8: Inspect sendMail result strictly
      const hasMessageId = Boolean(info && info.messageId);
      const isAcceptedRecipient = Boolean(
        info &&
        Array.isArray(info.accepted) &&
        info.accepted.length > 0 &&
        info.accepted.some((acc: any) => String(acc).toLowerCase().includes(to.toLowerCase().trim()))
      );
      const hasZeroRejections = Boolean(!info.rejected || info.rejected.length === 0);

      if (hasMessageId && isAcceptedRecipient && hasZeroRejections) {
        messageId = info.messageId;
        success = true;
        
        // Domain-safe structured log (no secrets)
        const recipientDomain = to.includes('@') ? to.split('@')[1] : 'unknown';
        console.log(`[SMTP Dispatch Success] MessageID: ${messageId}, Accepted: ${info.accepted.length} recipient(s) (@${recipientDomain}), Response: ${info.response || 'OK'}`);
      } else {
        lastErrorCode = 'SMTP_REJECTED';
        lastError = info?.rejected?.length
          ? `Recipient email address '${to}' was rejected by remote SMTP server.`
          : 'SMTP server did not confirm message acceptance.';
        console.warn(`[SMTP Dispatch Warning Attempt ${attempts}] To domain: ${to.split('@')[1]}, Accepted: ${info?.accepted?.length || 0}, Rejected: ${info?.rejected?.length || 0}`);
      }
    } catch (err: any) {
      lastErrorCode = err.code || 'SMTP_DISPATCH_ERROR';
      lastError = err.message || 'SMTP dispatch error';

      // Requirement 3: Structured safe error logging
      console.error(`[SMTP Dispatch Failure Attempt ${attempts}/${maxRetries}] Recipient Domain: ${to.split('@')[1] || 'unknown'}, Code: ${lastErrorCode}, Command: ${err.command || 'N/A'}, ResponseCode: ${err.responseCode || 'N/A'}, Response: ${err.response || 'N/A'}, Message: ${err.message}`);

      if (attempts < maxRetries) {
        await new Promise((res) => setTimeout(res, 500 * attempts));
      }
    }
  }

  // Requirement 11: Audit logging to email_delivery_logs WITHOUT sensitive OTPs or secrets
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('email_delivery_logs').insert([{
        recipient_email: to,
        template_type: finalTemplate,
        message_id: messageId || null,
        status: success ? 'sent' : 'failed',
        provider: 'smtp',
        error_code: success ? null : (lastErrorCode || 'SMTP_FAILED'),
        error_details: success ? null : lastError,
        metadata: metadata || null,
        created_at: new Date().toISOString(),
      }]);
    } catch {
      // Log table fallback
    }
  }

  return {
    success,
    messageId,
    code: success ? undefined : (lastErrorCode || 'SMTP_DELIVERY_FAILED'),
    error: success ? undefined : lastError,
  };
}

// ----------------------------------------------------
// Specialized Email Template Builders
// ----------------------------------------------------

export async function sendOtpEmail(to: string, otpCode: string): Promise<boolean> {
  const safeOtp = escapeHtml(otpCode);
  const result = await sendEmail({
    to,
    subject: `${otpCode} is your MyAngan Verification Code`,
    templateType: 'registration_otp',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #f1f5f9; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #0F1F3D; margin: 0; font-size: 26px; font-weight: bold; tracking-tight: -0.05em;">MyAngan</h1>
          <p style="color: #f97316; margin: 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Gurugram & South Delhi Rental Portal</p>
        </div>
        <h2 style="color: #1e293b; font-size: 18px; font-weight: bold; margin-bottom: 16px; text-align: center;">Verify Your Registration</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          Namaste, thank you for choosing MyAngan! Please use the following 6-digit verification code to complete your registration. This code is valid for <strong>10 minutes</strong>.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #0F1F3D; background-color: #f8fafc; padding: 14px 28px; border-radius: 12px; border: 1px solid #e2e8f0; display: inline-block; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            ${safeOtp}
          </span>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 24px; text-align: center; line-height: 1.5;">
          <strong>Security notice:</strong> Raw OTP codes are never logged or stored in plain text. Never share this verification code with anyone.
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.4;">
          MyAngan • Premium Delhi NCR Real Estate Services<br />
          This is an automated security communication. Please do not reply directly to this email.
        </p>
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
    subject: `${otpCode} is your MyAngan Password Reset Code`,
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
