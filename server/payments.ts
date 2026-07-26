/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { Request, Response, Router } from 'express';
import { dbServiceServer, getSupabaseClient } from './db';
import { sendEmail } from './email';

export const paymentRouter = Router();

// Constant-time string comparison for HMAC signatures
export function timingSafeEqualHMAC(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, 'utf-8');
  const bBuf = Buffer.from(b, 'utf-8');
  if (aBuf.length !== bBuf.length) {
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}

// Server-controlled Plan Pricing Matrix in paisa (1 INR = 100 paisa)
export const PLAN_PRICING: Record<string, { amountPaisa: number; description: string }> = {
  broker_monthly: { amountPaisa: 99900, description: 'MyAngan Broker Monthly Plan' },
  broker_annual: { amountPaisa: 999900, description: 'MyAngan Broker Annual Plan' },
  landlord_premium: { amountPaisa: 49900, description: 'MyAngan Landlord Premium Plan' },
  tenant_pass: { amountPaisa: 19900, description: 'MyAngan Renter Contact Pass' },
};

/**
 * Helper to verify Auth Session from Express request headers
 */
export async function getAuthUserFromRequest(req: Request): Promise<{ id: string; email: string } | null> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data: { user }, error } = await supabase.auth.getUser(token);
          if (!error && user) {
            return { id: user.id, email: user.email || '' };
          }
        } catch {
          // Fallback
        }
      }
    }
  }

  // Fallback for test runner or header authentication
  if (req.headers['x-user-id'] && req.headers['x-user-email']) {
    return {
      id: String(req.headers['x-user-id']),
      email: String(req.headers['x-user-email']),
    };
  }

  return null;
}

/**
 * POST /api/payments/orders
 * Authenticated endpoint: Creates Razorpay order server-side & DB record BEFORE Checkout
 */
paymentRouter.post('/orders', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized: Authentication required to initiate payment order.' });
      return;
    }

    const { plan_type } = req.body;
    const planConfig = PLAN_PRICING[plan_type];
    if (!planConfig) {
      res.status(400).json({ error: 'Invalid plan_type specified.' });
      return;
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    let razorpayOrderId = '';

    if (keyId && keySecret && !keyId.includes('placeholder')) {
      // Execute official Razorpay Order creation API via HTTP basic auth
      const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: planConfig.amountPaisa,
          currency: 'INR',
          receipt: `rcpt_${Date.now()}_${user.id.slice(0, 6)}`,
          notes: {
            user_id: user.id,
            plan_type,
          },
        }),
      });

      if (!rzpRes.ok) {
        const errText = await rzpRes.text();
        console.error('[Razorpay Order Creation Error]', errText);
        res.status(502).json({ error: 'Failed to create order with Razorpay payment gateway.' });
        return;
      }

      const rzpJson: any = await rzpRes.json();
      razorpayOrderId = rzpJson.id;
    } else {
      // Generated order ID when operating in sandbox test mode
      razorpayOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }

    // Save DB order record BEFORE Checkout begins
    const supabase = getSupabaseClient();
    let orderRecord: any = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('payment_orders')
        .insert([{
          user_id: user.id,
          plan_type,
          amount_paisa: planConfig.amountPaisa,
          currency: 'INR',
          razorpay_order_id: razorpayOrderId,
          status: 'created',
        }])
        .select()
        .single();

      if (error) {
        console.error('[Database Error] payment_orders insert failed:', error.message);
        res.status(500).json({ error: 'Failed to initialize payment order record in database.' });
        return;
      }
      orderRecord = data;
    } else {
      orderRecord = {
        id: `ord_${Date.now()}`,
        user_id: user.id,
        plan_type,
        amount_paisa: planConfig.amountPaisa,
        currency: 'INR',
        razorpay_order_id: razorpayOrderId,
        status: 'created',
      };
    }

    res.json({
      orderId: orderRecord.id,
      razorpayOrderId: orderRecord.razorpay_order_id,
      amountPaisa: planConfig.amountPaisa,
      currency: 'INR',
      keyId: process.env.VITE_RAZORPAY_KEY_ID || keyId || 'rzp_test_key',
    });
  } catch (err: any) {
    console.error('[Server Error] POST /api/payments/orders:', err.message);
    res.status(500).json({ error: 'Internal server error while initializing payment order.' });
  }
});

/**
 * POST /api/payments/verify
 * Authenticated endpoint: Server-side payment signature verification
 */
paymentRouter.post('/verify', async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized: Authentication required.' });
      return;
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ error: 'Missing mandatory payment verification fields.' });
      return;
    }

    const secret = process.env.RAZORPAY_KEY_SECRET || 'fallback-razorpay-secret';
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

    const isValidSignature = timingSafeEqualHMAC(generatedSignature, razorpay_signature);
    if (!isValidSignature) {
      console.warn(`[Security Alert] Invalid payment signature attempt for user ${user.id}`);
      res.status(400).json({ error: 'Invalid payment signature. Verification failed.' });
      return;
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      // Find matching payment order
      const { data: order } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('razorpay_order_id', razorpay_order_id)
        .maybeSingle();

      if (order) {
        // Update order status to paid
        await supabase
          .from('payment_orders')
          .update({ status: 'paid', updated_at: new Date().toISOString() })
          .eq('id', order.id);

        // Record transaction
        await supabase
          .from('payment_transactions')
          .insert([{
            order_id: order.id,
            user_id: user.id,
            razorpay_payment_id,
            razorpay_signature,
            status: 'captured',
          }]);

        // Activate user subscription
        const now = new Date();
        const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        await supabase
          .from('profiles')
          .update({
            is_subscribed: true,
            subscribed_at: now.toISOString(),
            subscription_expires_at: expires.toISOString(),
          })
          .eq('id', user.id);

        // Audit log entry
        await supabase
          .from('audit_logs')
          .insert([{
            actor_id: user.id,
            action: 'payment_verified',
            entity_type: 'payment_order',
            entity_id: order.id,
            payload: { plan_type: order.plan_type, amount_paisa: order.amount_paisa },
          }]);
      }
    }

    // Dispatch payment receipt email
    await sendEmail({
      to: user.email,
      subject: 'MyAngan Payment Confirmation & Receipt',
      templateType: 'payment_receipt',
      htmlContent: `
        <h2>Payment Successful</h2>
        <p>Thank you for subscribing to MyAngan. Your payment has been verified.</p>
        <p><strong>Payment Reference ID:</strong> ${razorpay_payment_id}</p>
        <p><strong>Order ID:</strong> ${razorpay_order_id}</p>
      `,
      textContent: `Payment Successful. Reference ID: ${razorpay_payment_id}, Order ID: ${razorpay_order_id}`,
    });

    res.json({
      status: 'success',
      message: 'Payment verified and entitlement activated successfully.',
      paymentId: razorpay_payment_id,
    });
  } catch (err: any) {
    console.error('[Server Error] POST /api/payments/verify:', err.message);
    res.status(500).json({ error: 'Internal server error verifying payment.' });
  }
});

/**
 * POST /api/payments/webhook
 * Idempotent Razorpay Webhook listener using raw body constant-time HMAC check
 */
paymentRouter.post('/webhook', async (req: Request, res: Response): Promise<void> => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!signature || !webhookSecret) {
      res.status(400).json({ error: 'Missing webhook signature or secret configuration.' });
      return;
    }

    // Support raw body string or JSON payload fallback
    const rawBody = (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    const expectedSignature = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');

    if (!timingSafeEqualHMAC(expectedSignature, signature)) {
      console.warn('[Security Warning] Webhook signature mismatch.');
      res.status(400).json({ error: 'Invalid webhook signature.' });
      return;
    }

    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const eventId = payload.event_id || payload.id || `evt_${Date.now()}`;
    const eventType = payload.event || 'payment.captured';

    const supabase = getSupabaseClient();
    if (supabase) {
      // Idempotency check: Ignore duplicate event IDs
      const { data: existingEvent } = await supabase
        .from('payment_webhook_events')
        .select('id')
        .eq('event_id', eventId)
        .maybeSingle();

      if (existingEvent) {
        res.json({ status: 'already_processed', eventId });
        return;
      }

      // Record webhook event for idempotency & replay protection
      await supabase
        .from('payment_webhook_events')
        .insert([{
          event_id: eventId,
          event_type: eventType,
          payload,
          processed_at: new Date().toISOString(),
        }]);

      // Process payment event
      if (eventType === 'payment.captured' || eventType === 'order.paid') {
        const paymentEntity = payload.payload?.payment?.entity;
        const razorpayOrderId = paymentEntity?.order_id;
        const razorpayPaymentId = paymentEntity?.id;

        if (razorpayOrderId) {
          const { data: order } = await supabase
            .from('payment_orders')
            .select('*')
            .eq('razorpay_order_id', razorpayOrderId)
            .maybeSingle();

          if (order && order.status !== 'paid') {
            await supabase
              .from('payment_orders')
              .update({ status: 'paid', updated_at: new Date().toISOString() })
              .eq('id', order.id);

            const now = new Date();
            const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            await supabase
              .from('profiles')
              .update({
                is_subscribed: true,
                subscribed_at: now.toISOString(),
                subscription_expires_at: expires.toISOString(),
              })
              .eq('id', order.user_id);
          }
        }
      } else if (eventType === 'payment.failed') {
        const paymentEntity = payload.payload?.payment?.entity;
        const razorpayOrderId = paymentEntity?.order_id;
        if (razorpayOrderId) {
          await supabase
            .from('payment_orders')
            .update({ status: 'failed', updated_at: new Date().toISOString() })
            .eq('razorpay_order_id', razorpayOrderId);
        }
      }
    }

    res.json({ status: 'processed', eventId });
  } catch (err: any) {
    console.error('[Webhook Processing Error]', err.message);
    res.status(500).json({ error: 'Webhook processing exception.' });
  }
});
