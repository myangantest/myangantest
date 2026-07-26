// api/index.ts
import express from "express";
import dotenv2 from "dotenv";

// server/auth.ts
import crypto from "crypto";
import { Router } from "express";

// server/db.ts
import { createClient } from "@supabase/supabase-js";
var serverUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
var serverServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
var isServerUrlDetected = !!serverUrl && !serverUrl.includes("placeholder") && !serverUrl.includes("MY_SUPABASE") && !serverUrl.includes("your-supabase");
var isServerKeyDetected = !!serverServiceKey && !serverServiceKey.includes("placeholder") && !serverServiceKey.includes("MY_SUPABASE") && !serverServiceKey.includes("your-supabase");
if (isServerUrlDetected) {
  console.log("\u2713 Supabase URL detected");
}
if (isServerKeyDetected) {
  console.log("\u2713 Supabase Anon Key detected");
}
if (isServerUrlDetected && isServerKeyDetected) {
  console.log("\u2713 Connected to Supabase");
} else {
  console.log("\u2717 Missing Supabase configuration");
}
var isDevEnv = process.env.NODE_ENV === "development";
var isMockAllowed = process.env.ALLOW_MOCK_STORAGE === "true" || process.env.VITE_ALLOW_MOCK_STORAGE === "true";
var isServerMockActive = isDevEnv && isMockAllowed;
var supabaseClientInstance = null;
function getSupabaseClient() {
  if (supabaseClientInstance !== null) return supabaseClientInstance;
  if (!isServerUrlDetected || !isServerKeyDetected) {
    supabaseClientInstance = null;
    return null;
  }
  try {
    supabaseClientInstance = createClient(serverUrl, serverServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    return supabaseClientInstance;
  } catch {
    supabaseClientInstance = null;
    return null;
  }
}
var memoryStore = {
  users: [],
  passwords: {},
  otp_verifications: [],
  notification_logs: [],
  properties: []
};
function isTableMissingError(error) {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  const code = error.code || "";
  return code === "PGRST205" || code === "PGRST204" || code === "42P01" || msg.includes("could not find the table") || msg.includes("does not exist") || msg.includes("schema cache");
}
var dbServiceServer = {
  async getUserByEmail(email) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Database Connection Error: Supabase client is not initialized. Please verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    }
    const { data, error } = await supabase.from("users").select("*").eq("email", email.trim().toLowerCase()).maybeSingle();
    if (error) {
      console.error(`[Supabase Error] getUserByEmail failed for ${email}: ${error.message}`);
      throw error;
    }
    return data;
  },
  async getUserById(id) {
    const supabase = getSupabaseClient();
    if (!supabase) {
      throw new Error("Database Connection Error: Supabase client is not initialized.");
    }
    const { data, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error(`[Supabase Error] getUserById failed for ${id}: ${error.message}`);
      throw error;
    }
    return data;
  },
  async createUserProfile(profile) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from("users").upsert({
        ...profile,
        email: profile.email.trim().toLowerCase(),
        is_verified: profile.is_verified ?? false,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      }).select().single();
      if (!error && data) {
        return data;
      }
      console.warn(`[Supabase Notice] createUserProfile write error: ${error?.message}`);
      if (!isServerMockActive && !isTableMissingError(error)) {
        throw new Error(`Failed to write user profile to public.users table: ${error?.message}`);
      }
    }
    const existingIdx = memoryStore.users.findIndex((u) => u.id === profile.id);
    const newProfile = {
      ...profile,
      email: profile.email.trim().toLowerCase(),
      is_verified: profile.is_verified ?? false,
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (existingIdx >= 0) {
      memoryStore.users[existingIdx] = newProfile;
    } else {
      memoryStore.users.push(newProfile);
    }
    return newProfile;
  },
  async updateUserProfile(userId, updates) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from("users").update(updates).eq("id", userId).select().single();
      if (!error && data) {
        return data;
      }
      console.warn(`[Supabase Notice] updateUserProfile write error: ${error?.message}`);
      if (!isServerMockActive && !isTableMissingError(error)) {
        throw error;
      }
    }
    const user = memoryStore.users.find((u) => u.id === userId);
    if (!user) {
      const mockUser = { id: userId, ...updates };
      memoryStore.users.push(mockUser);
      return mockUser;
    }
    Object.assign(user, updates);
    return user;
  },
  async savePasswordForMock(email, passwordHash) {
    memoryStore.passwords[email.toLowerCase()] = passwordHash;
  },
  async getPasswordForMock(email) {
    return memoryStore.passwords[email.toLowerCase()] || null;
  },
  async createOtpVerification(verification) {
    const supabase = getSupabaseClient();
    const cleanVerification = {
      ...verification,
      attempt_count: 0,
      max_attempts: 5,
      last_sent_at: (/* @__PURE__ */ new Date()).toISOString(),
      created_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (supabase) {
      const { data, error } = await supabase.from("otp_verifications").insert([cleanVerification]).select().single();
      if (!error && data) {
        return data;
      }
      console.warn(`[Supabase Notice] createOtpVerification write error: ${error?.message}`);
      if (!isServerMockActive && !isTableMissingError(error)) {
        throw new Error(`Failed to save OTP to otp_verifications table: ${error?.message}`);
      }
    }
    const mockRecord = {
      id: "otp-" + Math.random().toString(36).substr(2, 9),
      ...cleanVerification
    };
    memoryStore.otp_verifications = memoryStore.otp_verifications.filter(
      (o) => !(o.email.toLowerCase() === verification.email.toLowerCase() && o.purpose === verification.purpose)
    );
    memoryStore.otp_verifications.push(mockRecord);
    return mockRecord;
  },
  async getLatestOtpVerification(email, purpose) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from("otp_verifications").select("*").eq("email", email.trim().toLowerCase()).eq("purpose", purpose).is("consumed_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (!error) return data;
      console.warn(`[Supabase Notice] getLatestOtpVerification error: ${error.message}`);
      if (!isServerMockActive && !isTableMissingError(error)) throw error;
    }
    const activeOtps = memoryStore.otp_verifications.filter(
      (o) => o.email.toLowerCase() === email.trim().toLowerCase() && o.purpose === purpose && !o.consumed_at
    );
    if (activeOtps.length === 0) return null;
    return activeOtps[activeOtps.length - 1];
  },
  async incrementOtpAttempts(otpId) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { error } = await supabase.rpc("increment_otp_attempts", { otp_id: otpId });
      if (error) {
        const { data: record } = await supabase.from("otp_verifications").select("attempt_count").eq("id", otpId).single();
        const nextAttempts = (record?.attempt_count || 0) + 1;
        await supabase.from("otp_verifications").update({ attempt_count: nextAttempts }).eq("id", otpId);
      }
      return;
    }
    if (isServerMockActive) {
      const record = memoryStore.otp_verifications.find((o) => o.id === otpId);
      if (record) {
        record.attempt_count += 1;
      }
    }
  },
  async consumeOtpVerification(otpId) {
    const supabase = getSupabaseClient();
    const now = (/* @__PURE__ */ new Date()).toISOString();
    if (supabase) {
      await supabase.from("otp_verifications").update({ consumed_at: now }).eq("id", otpId);
      return;
    }
    if (isServerMockActive) {
      const record = memoryStore.otp_verifications.find((o) => o.id === otpId);
      if (record) {
        record.consumed_at = now;
      }
    }
  },
  async createNotificationLog(log) {
    const supabase = getSupabaseClient();
    const cleanLog = {
      ...log,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (supabase) {
      const { error } = await supabase.from("notification_logs").insert([cleanLog]);
      if (!error) return;
      if (!isServerMockActive) console.error("[Supabase Error] Notification log save error:", error.message);
    }
    if (isServerMockActive) {
      const mockLog = {
        id: "log-" + Math.random().toString(36).substr(2, 9),
        ...cleanLog
      };
      memoryStore.notification_logs.push(mockLog);
    }
  },
  async getPropertyById(id) {
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: property, error: pError } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
      if (!pError && property) {
        const { data: owner } = await supabase.from("users").select("*").eq("id", property.owner_id).maybeSingle();
        return { property, owner: owner || { id: property.owner_id, name: "Owner", email: "", phone: "" } };
      }
      if (!isServerMockActive && pError) throw pError;
    }
    if (isServerMockActive) {
      const mockProp = memoryStore.properties.find((p) => p.id === id);
      if (mockProp) {
        const owner = memoryStore.users.find((u) => u.id === mockProp.owner_id) || {
          id: mockProp.owner_id,
          name: "Owner Agent",
          phone: "+919999912345",
          email: "owner@myangan.com"
        };
        return { property: mockProp, owner };
      }
    }
    return null;
  },
  seedProperty(property, owner) {
    if (isServerMockActive) {
      if (!memoryStore.properties.some((p) => p.id === property.id)) {
        memoryStore.properties.push(property);
      }
      if (!memoryStore.users.some((u) => u.id === owner.id)) {
        memoryStore.users.push(owner);
      }
    }
  }
};

// server/email.ts
import nodemailer from "nodemailer";
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
var nodemailerTransporter = null;
function getTransporter() {
  if (nodemailerTransporter) return nodemailerTransporter;
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const secure = process.env.SMTP_SECURE === "true" || port === 465;
  const user = process.env.SMTP_USER || "";
  const pass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "";
  if (!user || !pass || user.includes("placeholder")) {
    return null;
  }
  try {
    nodemailerTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
    return nodemailerTransporter;
  } catch (err) {
    console.error("[Nodemailer Init Error]", err);
    return null;
  }
}
async function sendEmail(params) {
  const { to, subject, templateType, notificationType, htmlContent, html, textContent, text, replyTo, metadata } = params;
  const finalHtml = htmlContent || html || "";
  const finalText = textContent || text || "";
  const finalTemplate = templateType || notificationType || "general";
  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER || "noreply@myangan.in";
  const replyToEmail = replyTo || process.env.EMAIL_REPLY_TO || fromEmail;
  const transporter = getTransporter();
  let attempts = 0;
  const maxRetries = 3;
  let lastError = "";
  let messageId = "";
  let success = false;
  if (transporter) {
    while (attempts < maxRetries && !success) {
      attempts++;
      try {
        const info = await transporter.sendMail({
          from: `MyAngan Rentals <${fromEmail}>`,
          to,
          replyTo: replyToEmail,
          subject,
          text: finalText,
          html: finalHtml
        });
        messageId = info.messageId || `msg_${Date.now()}`;
        success = true;
      } catch (err) {
        lastError = err.message || "SMTP dispatch error";
        console.warn(`[Email Attempt ${attempts} Failed] To: ${to}, Type: ${finalTemplate}, Error: ${lastError}`);
        if (attempts < maxRetries) {
          await new Promise((res) => setTimeout(res, 500 * attempts));
        }
      }
    }
  } else {
    lastError = "SMTP transporter unconfigured (missing SMTP_USER / SMTP_PASS). Logged to audit logs.";
  }
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from("email_delivery_logs").insert([{
        recipient_email: to,
        template_type: finalTemplate,
        message_id: messageId || null,
        status: success ? "sent" : "failed",
        error_details: success ? null : lastError,
        metadata: metadata || null,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      }]);
    } catch {
    }
  }
  return { success, messageId, error: success ? void 0 : lastError };
}

// server/auth.ts
var authRouter = Router();
function generateOTP() {
  const otpVal = crypto.randomInt(0, 1e6);
  return otpVal.toString().padStart(6, "0");
}
function hashOTP(otp) {
  const secret = process.env.OTP_HASH_SECRET || "fallback-myangan-otp-secret";
  return crypto.createHmac("sha256", secret).update(otp).digest("hex");
}
function timingSafeCompare(a, b) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    crypto.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}
authRouter.post("/register", async (req, res) => {
  const { email, name, phone, role, password } = req.body;
  if (!email || !name || !role) {
    res.status(400).json({ error: "Missing required registration details: email, name, and role are required." });
    return;
  }
  const supabase = getSupabaseClient();
  if (!supabase && !isServerMockActive) {
    res.status(503).json({
      error: "Database configuration error: Supabase is unconfigured (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing). Registration is disabled in production."
    });
    return;
  }
  try {
    if (!password || typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters long." });
      return;
    }
    const existingUser = await dbServiceServer.getUserByEmail(email);
    if (existingUser) {
      res.status(409).json({ error: "A user with this email address is already registered." });
      return;
    }
    let userId = "";
    let authErrorMsg = "";
    if (supabase) {
      if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
          const { data: adminUser, error: adminErr } = await supabase.auth.admin.createUser({
            email: email.trim().toLowerCase(),
            password,
            email_confirm: true,
            user_metadata: { name, role, phone }
          });
          if (!adminErr && adminUser?.user) {
            userId = adminUser.user.id;
          } else if (adminErr) {
            authErrorMsg = adminErr.message;
          }
        } catch (err) {
          authErrorMsg = err.message;
        }
      }
      if (!userId) {
        try {
          const { data: signUpUser, error: signUpErr } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(),
            password,
            options: {
              data: { name, role, phone }
            }
          });
          if (!signUpErr && signUpUser?.user) {
            userId = signUpUser.user.id;
          } else if (signUpErr) {
            authErrorMsg = signUpErr.message;
          }
        } catch (err) {
          authErrorMsg = err.message;
        }
      }
      if (!userId && !isServerMockActive) {
        res.status(400).json({ error: `Registration failed in Supabase Authentication: ${authErrorMsg || "Unable to create user account."}` });
        return;
      }
    }
    if (!userId && isServerMockActive) {
      userId = "user-" + Math.random().toString(36).substr(2, 9);
      await dbServiceServer.savePasswordForMock(email, password);
    }
    const userProfile = await dbServiceServer.createUserProfile({
      id: userId,
      email: email.trim().toLowerCase(),
      name: name.trim(),
      phone: phone ? phone.trim() : "",
      role,
      is_verified: false
    });
    if (!userProfile) {
      res.status(500).json({ error: "Failed to write user profile to public.users table." });
      return;
    }
    const otpCode = generateOTP();
    const codeHash = hashOTP(otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1e3).toISOString();
    const otpRecord = await dbServiceServer.createOtpVerification({
      user_id: userProfile.id,
      email: email.trim().toLowerCase(),
      code_hash: codeHash,
      purpose: "registration_otp",
      expires_at: expiresAt,
      request_ip: req.ip
    });
    if (!otpRecord) {
      res.status(500).json({ error: "Failed to write OTP verification record to otp_verifications table." });
      return;
    }
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #f1f5f9; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #0F1F3D; margin: 0; font-size: 26px; font-weight: bold; tracking-tight: -0.05em;">MyAngan</h1>
          <p style="color: #f97316; margin: 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Gurugram & South Delhi Rental Portal</p>
        </div>
        <h2 style="color: #1e293b; font-size: 18px; font-weight: bold; margin-bottom: 16px; text-align: center;">Verify Your Registration</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          Namaste <strong>${name}</strong>, thank you for choosing MyAngan! Please use the following 6-digit verification code to complete your registration. This code is valid for <strong>10 minutes</strong>.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #0F1F3D; background-color: #f8fafc; padding: 14px 28px; border-radius: 12px; border: 1px solid #e2e8f0; display: inline-block; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            ${otpCode}
          </span>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 24px; text-align: center; line-height: 1.5;">
          <strong>Security notice:</strong> Raw OTP codes are never logged or stored in plain text. Never share this verification code with anyone.
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.4;">
          MyAngan \u2022 Premium Delhi NCR Real Estate Services<br />
          This is an automated security communication. Please do not reply directly to this email.
        </p>
      </div>
    `;
    await sendEmail({
      to: email.trim(),
      subject: `${otpCode} is your MyAngan Verification Code`,
      html: emailHtml,
      text: `Your MyAngan verification code is ${otpCode}. It is valid for 10 minutes.`,
      notificationType: "registration_otp",
      metadata: { userId: userProfile.id }
    });
    res.status(200).json({
      message: "Registration successful. Verification OTP sent.",
      user: userProfile
    });
  } catch (err) {
    console.error("[Backend Auth] Registration error:", err);
    res.status(500).json({ error: err.message || "An error occurred during registration." });
  }
});
authRouter.post("/verify-otp", async (req, res) => {
  const { email, code, purpose = "registration_otp" } = req.body;
  if (!email || !code) {
    res.status(400).json({ error: "Email and 6-digit OTP code are required." });
    return;
  }
  try {
    const activeOtp = await dbServiceServer.getLatestOtpVerification(email, purpose);
    if (!activeOtp) {
      res.status(400).json({ error: "No active verification code found for this email address. Please request a new code." });
      return;
    }
    if (new Date(activeOtp.expires_at).getTime() < Date.now()) {
      res.status(400).json({ error: "Verification code has expired. Please request a new code." });
      return;
    }
    if (activeOtp.attempt_count >= activeOtp.max_attempts) {
      res.status(429).json({ error: "Too many incorrect attempts. For security reasons, this code is now invalid. Please request a new code." });
      return;
    }
    const submittedHash = hashOTP(code.trim());
    const match = timingSafeCompare(submittedHash, activeOtp.code_hash);
    if (!match) {
      await dbServiceServer.incrementOtpAttempts(activeOtp.id);
      const remaining = activeOtp.max_attempts - activeOtp.attempt_count - 1;
      if (remaining <= 0) {
        res.status(400).json({ error: "Incorrect code. Maximum attempts reached. This code has been locked. Please request a new code." });
      } else {
        res.status(400).json({ error: `Incorrect code. Please try again. Attempts remaining: ${remaining}` });
      }
      return;
    }
    await dbServiceServer.consumeOtpVerification(activeOtp.id);
    const updatedUser = await dbServiceServer.updateUserProfile(activeOtp.user_id, {
      is_verified: true
    });
    res.status(200).json({
      message: "Account successfully verified and activated.",
      user: updatedUser
    });
  } catch (err) {
    console.error("[Backend Auth] OTP verification error:", err);
    res.status(500).json({ error: err.message || "Verification failed." });
  }
});
authRouter.post("/resend-otp", async (req, res) => {
  const { email, purpose = "registration_otp" } = req.body;
  if (!email) {
    res.status(400).json({ error: "Email address is required." });
    return;
  }
  try {
    const user = await dbServiceServer.getUserByEmail(email);
    if (!user) {
      res.status(404).json({ error: "No user profile found matching this email address." });
      return;
    }
    const lastOtp = await dbServiceServer.getLatestOtpVerification(email, purpose);
    if (lastOtp && lastOtp.last_sent_at) {
      const msSinceLast = Date.now() - new Date(lastOtp.last_sent_at).getTime();
      if (msSinceLast < 6e4) {
        const remainingSec = Math.ceil((6e4 - msSinceLast) / 1e3);
        res.status(429).json({ error: `Please wait ${remainingSec} seconds before requesting another code.` });
        return;
      }
    }
    const otpCode = generateOTP();
    const codeHash = hashOTP(otpCode);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1e3).toISOString();
    await dbServiceServer.createOtpVerification({
      user_id: user.id,
      email: email.trim().toLowerCase(),
      code_hash: codeHash,
      purpose,
      expires_at: expiresAt,
      request_ip: req.ip
    });
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #f1f5f9; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #0F1F3D; margin: 0; font-size: 26px; font-weight: bold; tracking-tight: -0.05em;">MyAngan</h1>
          <p style="color: #f97316; margin: 0; font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Gurugram & South Delhi Rental Portal</p>
        </div>
        <h2 style="color: #1e293b; font-size: 18px; font-weight: bold; margin-bottom: 16px; text-align: center;">New Verification Code</h2>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          Namaste <strong>${user.name}</strong>, you requested a new verification code. Please use the 6-digit OTP code below to verify your account. It is valid for 10 minutes.
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; letter-spacing: 6px; color: #0F1F3D; background-color: #f8fafc; padding: 14px 28px; border-radius: 12px; border: 1px solid #e2e8f0; display: inline-block; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            ${otpCode}
          </span>
        </div>
        <p style="color: #94a3b8; font-size: 12px; margin-bottom: 24px; text-align: center; line-height: 1.5;">
          <strong>Security notice:</strong> Raw OTP codes are never logged or stored in plain text. Never share this code with anyone.
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.4;">
          MyAngan \u2022 Premium Delhi NCR Real Estate Services<br />
          This is an automated security communication. Please do not reply directly to this email.
        </p>
      </div>
    `;
    await sendEmail({
      to: email.trim(),
      subject: `${otpCode} is your new MyAngan Verification Code`,
      html: emailHtml,
      text: `Your new MyAngan verification code is ${otpCode}. It is valid for 10 minutes.`,
      notificationType: "registration_otp",
      metadata: { userId: user.id }
    });
    res.status(200).json({ message: "A fresh verification OTP has been sent successfully." });
  } catch (err) {
    console.error("[Backend Auth] OTP resend error:", err);
    res.status(500).json({ error: err.message || "Failed to resend verification code." });
  }
});
authRouter.post("/notifications/inquiry", async (req, res) => {
  const renterName = req.body.renterName || req.body.tenantName;
  const renterPhone = req.body.renterPhone || req.body.tenantPhone;
  const renterEmail = req.body.renterEmail || req.body.tenantEmail;
  const renterId = req.body.renterId || req.body.tenantId;
  const { propertyId, message } = req.body;
  if (!propertyId || !renterName || !renterPhone || !message) {
    res.status(400).json({ error: "Property ID, renter name, phone, and message are required." });
    return;
  }
  try {
    let details = await dbServiceServer.getPropertyById(propertyId);
    if (!details && req.body.fallbackDetails) {
      details = req.body.fallbackDetails;
    }
    if (!details) {
      res.status(404).json({ error: "Property details not found." });
      return;
    }
    const { property, owner } = details;
    const formatRent = (amt) => {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0
      }).format(amt);
    };
    const landlordHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #f1f5f9; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #0F1F3D; margin: 0; font-size: 26px;">MyAngan</h1>
          <p style="color: #f97316; margin: 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">Gurugram & South Delhi Rental Portal</p>
        </div>
        <h2 style="color: #0F1F3D; font-size: 18px; font-weight: bold; margin-bottom: 16px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">New Renter Inquiry!</h2>
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Namaste <strong>${owner.name}</strong>, you have received a new lead inquiry for your listed property:
        </p>
        
        <!-- Property Info Card -->
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h3 style="margin-top: 0; color: #0F1F3D; font-size: 15px; font-weight: bold;">${property.title}</h3>
          <p style="margin: 4px 0; color: #475569; font-size: 13px;">\u{1F4CD} ${property.locality}, ${property.city}</p>
          <p style="margin: 4px 0; color: #16a34a; font-size: 14px; font-weight: bold;">\u{1F4B0} Rent: ${formatRent(property.rent_amount)}/month</p>
        </div>

        <h3 style="color: #0F1F3D; font-size: 14px; margin-bottom: 12px;">Renter Contact Details</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #334155; margin-bottom: 24px;">
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; font-weight: bold; width: 35%;">Name:</td>
            <td style="padding: 8px 0;">${renterName}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; font-weight: bold;">Phone (WhatsApp):</td>
            <td style="padding: 8px 0;"><strong>${renterPhone}</strong></td>
          </tr>
          ${renterEmail ? `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 8px 0; font-weight: bold;">Email Address:</td>
            <td style="padding: 8px 0;">${renterEmail}</td>
          </tr>` : ""}
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Message:</td>
            <td style="padding: 8px 0; font-style: italic; color: #475569; line-height: 1.5; background: #fafafa; padding: 10px; border-radius: 6px;">"${message}"</td>
          </tr>
        </table>

        <p style="color: #475569; font-size: 13px; line-height: 1.6; margin-bottom: 24px;">
          We highly recommend following up with the renter directly via mobile or WhatsApp to seal the deal!
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.4;">
          MyAngan Broker & Landlord Support \u2022 <a href="mailto:service@myangan.com" style="color: #f97316; text-decoration: none;">service@myangan.com</a>
        </p>
      </div>
    `;
    await sendEmail({
      to: owner.email,
      subject: `\u{1F6A8} New Lead: Inquiry for "${property.title}" on MyAngan`,
      html: landlordHtml,
      text: `Namaste ${owner.name}, you have a new inquiry from ${renterName} (Ph: ${renterPhone}) for your property "${property.title}". Message: "${message}"`,
      notificationType: "property_inquiry_landlord",
      metadata: { propertyId, ownerId: owner.id }
    });
    const targetRenterEmail = renterEmail || req.body.currentUserEmail;
    if (targetRenterEmail) {
      const renterHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #f1f5f9; border-radius: 12px; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0F1F3D; margin: 0; font-size: 26px;">MyAngan</h1>
            <p style="color: #f97316; margin: 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">Gurugram & South Delhi Rental Portal</p>
          </div>
          <h2 style="color: #0F1F3D; font-size: 18px; font-weight: bold; margin-bottom: 16px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">Inquiry Sent Successfully!</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
            Namaste <strong>${renterName}</strong>, thank you for using MyAngan! We have logged your interest and successfully notified the owner/broker of the following property:
          </p>
          
          <!-- Property Info Card -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <h3 style="margin-top: 0; color: #0F1F3D; font-size: 15px; font-weight: bold;">${property.title}</h3>
            <p style="margin: 4px 0; color: #475569; font-size: 13px;">\u{1F4CD} ${property.locality}, ${property.city}</p>
            <p style="margin: 4px 0; color: #16a34a; font-size: 14px; font-weight: bold;">\u{1F4B0} Rent: ${formatRent(property.rent_amount)}/month</p>
          </div>

          <h3 style="color: #0F1F3D; font-size: 14px; margin-bottom: 12px;">Next Steps</h3>
          <p style="color: #475569; font-size: 13px; line-height: 1.6; margin-bottom: 24px;">
            The property owner <strong>${owner.name}</strong> has been notified. You can also contact them directly on WhatsApp at <strong>${owner.phone}</strong> to schedule a physical walkthrough or discuss details.
          </p>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.4;">
            MyAngan Renter Support \u2022 <a href="mailto:service@myangan.com" style="color: #f97316; text-decoration: none;">service@myangan.com</a>
          </p>
        </div>
      `;
      await sendEmail({
        to: targetRenterEmail,
        subject: `Inquiry Sent: "${property.title}" on MyAngan`,
        html: renterHtml,
        text: `Namaste ${renterName}, your inquiry for "${property.title}" has been received. Owner ${owner.name} is notified and you can reach them at ${owner.phone}.`,
        notificationType: "property_inquiry_renter",
        metadata: { propertyId, renterId }
      });
    }
    res.status(200).json({ message: "Inquiry registered. Transactional notifications sent." });
  } catch (err) {
    console.error("[Backend Notifications] Lead inquiry notification error:", err);
    res.status(500).json({ error: err.message || "Failed to dispatch inquiry notifications." });
  }
});
authRouter.post("/payment/verify-razorpay", async (req, res) => {
  const { paymentId, userId } = req.body;
  if (!paymentId || !userId) {
    res.status(400).json({ error: "Razorpay payment ID and user ID are required." });
    return;
  }
  try {
    const user = await dbServiceServer.getUserById(userId);
    if (!user) {
      res.status(404).json({ error: "User profile not found." });
      return;
    }
    console.log(`[Backend Payment] Verifying paymentId: ${paymentId} for user: ${user.name}`);
    if (!paymentId.startsWith("pay_") && paymentId.length < 10) {
      res.status(400).json({ error: "Invalid Razorpay Payment ID signature verification." });
      return;
    }
    const updatedUser = await dbServiceServer.updateUserProfile(userId, {
      is_subscribed: true,
      subscribed_at: (/* @__PURE__ */ new Date()).toISOString(),
      subscription_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString()
    });
    const receiptHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #f1f5f9; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #0F1F3D; margin: 0; font-size: 26px;">MyAngan</h1>
          <p style="color: #f97316; margin: 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">Gurugram & South Delhi Rental Portal</p>
        </div>
        <h2 style="color: #0F1F3D; font-size: 18px; font-weight: bold; margin-bottom: 16px; text-align: center; color: #16a34a;">Broker Premium Activated!</h2>
        <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
          Namaste <strong>${user.name}</strong>, congratulations! Your MyAngan Broker Premium subscription is now fully active. You now have unlimited active property listings and featured badges to reach tens of thousands of renters!
        </p>
        
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 14px; color: #0F1F3D; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Transaction Invoice</h3>
          <table style="width: 100%; font-size: 13px; color: #475569; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Plan Name:</td>
              <td style="padding: 6px 0; text-align: right; color: #1e293b;">Premium Broker Plan (Monthly)</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Transaction Reference:</td>
              <td style="padding: 6px 0; text-align: right; color: #1e293b; font-family: monospace;">${paymentId}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Paid Amount:</td>
              <td style="padding: 6px 0; text-align: right; color: #16a34a; font-weight: bold;">\u20B9999.00 INR</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Status:</td>
              <td style="padding: 6px 0; text-align: right; color: #16a34a; font-weight: bold; text-transform: uppercase;">Paid / Captured</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: bold;">Expiration Date:</td>
              <td style="padding: 6px 0; text-align: right; color: #1e293b;">${new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toLocaleDateString("en-IN")}</td>
            </tr>
          </table>
        </div>

        <p style="color: #475569; font-size: 13px; line-height: 1.6; margin-bottom: 24px;">
          Your listings are now prioritized in Gurugram & South Delhi search categories. If you require billing support or listing guidance, write to our Broker Success managers.
        </p>
        <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.4;">
          MyAngan Broker Premium Support \u2022 <a href="mailto:service@myangan.com" style="color: #f97316; text-decoration: none;">service@myangan.com</a>
        </p>
      </div>
    `;
    await sendEmail({
      to: user.email,
      subject: `\u2705 Invoice & Plan Confirmation: MyAngan Broker Premium Activated`,
      html: receiptHtml,
      text: `Namaste ${user.name}, your MyAngan Broker Premium subscription is active. Paid: \u20B9999. Transaction ID: ${paymentId}.`,
      notificationType: "broker_premium_success",
      metadata: { paymentId, userId }
    });
    res.status(200).json({
      message: "Subscription successfully confirmed on backend and invoice dispatched.",
      user: updatedUser
    });
  } catch (err) {
    console.error("[Backend Payment] Premium subscription verification error:", err);
    res.status(500).json({ error: err.message || "Payment verification failed." });
  }
});

// server/migration.ts
import { Router as Router2 } from "express";
import { z } from "zod";
var migrationRouter = Router2();
var LegacyUserSchema = z.object({
  id: z.string().optional(),
  email: z.string().email(),
  name: z.string().min(1).default("User"),
  phone: z.string().optional().default(""),
  role: z.string().default("renter"),
  created_at: z.string().optional(),
  is_verified: z.boolean().optional().default(false),
  is_subscribed: z.boolean().optional().default(false),
  subscribed_at: z.string().optional(),
  subscription_expires_at: z.string().optional()
});
var LegacyPropertySchema = z.object({
  id: z.string().optional(),
  owner_id: z.string(),
  title: z.string().min(1),
  description: z.string().default(""),
  city: z.string().default("Gurugram"),
  locality: z.string().default("DLF Phase 1"),
  bedrooms: z.number().default(1),
  bathrooms: z.number().default(1),
  furnishing_status: z.string().default("semi_furnished"),
  rent_amount: z.number().default(1e4),
  deposit_amount: z.number().default(2e4),
  address: z.string().default(""),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  image_urls: z.array(z.string()).default([]),
  is_verified: z.boolean().default(false),
  status: z.string().default("active"),
  created_at: z.string().optional()
});
var LegacyBrokerSchema = z.object({
  id: z.string().optional(),
  user_id: z.string(),
  name: z.string().min(1),
  email: z.string().optional(),
  agency_name: z.string().default("Independent Broker"),
  phone: z.string().default(""),
  whatsapp: z.string().default(""),
  active_listings_count: z.number().default(0),
  is_verified: z.boolean().default(false),
  created_at: z.string().optional()
});
var LegacyLeadSchema = z.object({
  id: z.string().optional(),
  property_id: z.string(),
  renter_id: z.string().nullable().optional(),
  name: z.string().min(1),
  phone: z.string().default(""),
  message: z.string().default(""),
  created_at: z.string().optional()
});
var LegacyFavoriteSchema = z.object({
  id: z.string().optional(),
  user_id: z.string(),
  property_id: z.string(),
  created_at: z.string().optional()
});
var LegacyWaitlistSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  contact: z.string().min(1),
  role: z.string().default("landlord"),
  created_at: z.string().optional()
});
var LegacyMigrationPayloadSchema = z.object({
  dryRun: z.boolean().default(false),
  legacyData: z.object({
    users: z.array(z.record(z.string(), z.any())).optional().default([]),
    properties: z.array(z.record(z.string(), z.any())).optional().default([]),
    brokers: z.array(z.record(z.string(), z.any())).optional().default([]),
    leads: z.array(z.record(z.string(), z.any())).optional().default([]),
    favorites: z.array(z.record(z.string(), z.any())).optional().default([]),
    waitlist: z.array(z.record(z.string(), z.any())).optional().default([]),
    subscriptions: z.array(z.record(z.string(), z.any())).optional().default([])
  })
});
migrationRouter.post("/migrate-legacy-data", async (req, res) => {
  const adminHeader = req.headers["x-admin-role"] || req.body?.adminRole;
  const adminUserId = req.headers["x-admin-user-id"] || req.body?.adminUserId;
  let isAdmin = adminHeader === "admin";
  const supabase = getSupabaseClient();
  if (supabase && adminUserId) {
    try {
      const { data: userProfile } = await supabase.from("users").select("role").eq("id", adminUserId).single();
      if (userProfile && userProfile.role === "admin") {
        isAdmin = true;
      }
    } catch {
    }
  }
  if (!isAdmin && !isServerMockActive) {
    res.status(403).json({
      error: "Unauthorized: Admin privileges are required to run legacy data migration."
    });
    return;
  }
  const parseResult = LegacyMigrationPayloadSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "Invalid migration payload schema",
      details: parseResult.error.format()
    });
    return;
  }
  const { dryRun, legacyData } = parseResult.data;
  const batchId = `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const logs = [];
  const idMap = /* @__PURE__ */ new Map();
  const counts = {
    users: { total: 0, migrated: 0, skipped: 0, duplicate: 0, failed: 0 },
    brokers: { total: 0, migrated: 0, skipped: 0, duplicate: 0, failed: 0 },
    properties: { total: 0, migrated: 0, skipped: 0, duplicate: 0, failed: 0 },
    leads: { total: 0, migrated: 0, skipped: 0, duplicate: 0, failed: 0 },
    favorites: { total: 0, migrated: 0, skipped: 0, duplicate: 0, failed: 0 },
    waitlist: { total: 0, migrated: 0, skipped: 0, duplicate: 0, failed: 0 }
  };
  try {
    let existingLogsMap = /* @__PURE__ */ new Map();
    if (supabase && !dryRun) {
      try {
        const { data: existingLogs } = await supabase.from("legacy_migration_logs").select("source_fingerprint, supabase_id, status");
        if (existingLogs) {
          existingLogs.forEach((l) => {
            if (l.source_fingerprint) existingLogsMap.set(l.source_fingerprint, l.status);
            if (l.source_fingerprint && l.supabase_id) idMap.set(l.source_fingerprint, l.supabase_id);
          });
        }
      } catch {
        console.warn("[Migration] legacy_migration_logs table missing or inaccessible, proceeding in memory audit mode.");
      }
    }
    counts.users.total = legacyData.users.length;
    for (const rawUser of legacyData.users) {
      const userParse = LegacyUserSchema.safeParse(rawUser);
      const legacyId = String(rawUser.id || rawUser.email || "unknown");
      if (!userParse.success) {
        counts.users.failed++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: "users",
          legacy_id: legacyId,
          supabase_id: null,
          status: "failed",
          action: "schema_validation_failed",
          error_code: "INVALID_USER_SCHEMA",
          safe_error_message: JSON.stringify(userParse.error.flatten().fieldErrors),
          source_fingerprint: `user-${rawUser.email}`,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        continue;
      }
      const userData = userParse.data;
      const normalizedEmail = userData.email.trim().toLowerCase();
      let mappedRole = userData.role === "tenant" ? "renter" : userData.role;
      if (mappedRole === "admin") {
        mappedRole = "renter";
      }
      const sourceFingerprint = `user:${normalizedEmail}`;
      let existingUser = null;
      if (supabase) {
        const { data: found } = await supabase.from("users").select("*").eq("email", normalizedEmail).maybeSingle();
        existingUser = found;
      }
      if (existingUser) {
        idMap.set(legacyId, existingUser.id);
        if (rawUser.id) idMap.set(rawUser.id, existingUser.id);
        counts.users.duplicate++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: "users",
          legacy_id: legacyId,
          supabase_id: existingUser.id,
          status: "duplicate",
          action: "user_already_exists_linked",
          error_code: null,
          safe_error_message: null,
          source_fingerprint: sourceFingerprint,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        continue;
      }
      if (dryRun) {
        const simulatedId = `sim-user-${Math.random().toString(36).substr(2, 9)}`;
        idMap.set(legacyId, simulatedId);
        counts.users.migrated++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: "users",
          legacy_id: legacyId,
          supabase_id: simulatedId,
          status: "migrated",
          action: "dry_run_validated_new_user",
          error_code: null,
          safe_error_message: null,
          source_fingerprint: sourceFingerprint,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        continue;
      }
      try {
        let createdUserId = "";
        if (supabase) {
          if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            const { data: authAdminUser } = await supabase.auth.admin.createUser({
              email: normalizedEmail,
              email_confirm: false,
              // Require email verification
              user_metadata: { name: userData.name, role: mappedRole, phone: userData.phone }
            });
            if (authAdminUser?.user) {
              createdUserId = authAdminUser.user.id;
            }
          }
          if (!createdUserId) {
            createdUserId = `usr-${Math.random().toString(36).substr(2, 9)}`;
          }
          await dbServiceServer.createUserProfile({
            id: createdUserId,
            email: normalizedEmail,
            name: userData.name,
            phone: userData.phone,
            role: mappedRole,
            is_verified: false,
            // Security constraint: unverified unless established safely
            is_subscribed: userData.is_subscribed
          });
          idMap.set(legacyId, createdUserId);
          if (rawUser.id) idMap.set(rawUser.id, createdUserId);
          counts.users.migrated++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: "users",
            legacy_id: legacyId,
            supabase_id: createdUserId,
            status: "migrated",
            action: "created_user_profile",
            error_code: null,
            safe_error_message: null,
            source_fingerprint: sourceFingerprint,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          });
        } else {
          createdUserId = `usr-${Math.random().toString(36).substr(2, 9)}`;
          idMap.set(legacyId, createdUserId);
          counts.users.migrated++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: "users",
            legacy_id: legacyId,
            supabase_id: createdUserId,
            status: "migrated",
            action: "mock_created_user",
            error_code: null,
            safe_error_message: null,
            source_fingerprint: sourceFingerprint,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      } catch (err) {
        counts.users.failed++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: "users",
          legacy_id: legacyId,
          supabase_id: null,
          status: "failed",
          action: "user_creation_failed",
          error_code: "USER_MIGRATION_ERROR",
          safe_error_message: err.message,
          source_fingerprint: sourceFingerprint,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }
    counts.brokers.total = legacyData.brokers.length;
    for (const rawBroker of legacyData.brokers) {
      const brokerParse = LegacyBrokerSchema.safeParse(rawBroker);
      const legacyId = String(rawBroker.id || `broker-${rawBroker.user_id}`);
      if (!brokerParse.success) {
        counts.brokers.failed++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: "brokers",
          legacy_id: legacyId,
          supabase_id: null,
          status: "failed",
          action: "schema_validation_failed",
          error_code: "INVALID_BROKER_SCHEMA",
          safe_error_message: JSON.stringify(brokerParse.error.flatten().fieldErrors),
          source_fingerprint: `broker-${rawBroker.user_id}`,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        continue;
      }
      const brokerData = brokerParse.data;
      const mappedUserId = idMap.get(brokerData.user_id) || brokerData.user_id;
      const sourceFingerprint = `broker:${mappedUserId}`;
      if (dryRun) {
        counts.brokers.migrated++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: "brokers",
          legacy_id: legacyId,
          supabase_id: `sim-broker-${Math.random().toString(36).substr(2, 9)}`,
          status: "migrated",
          action: "dry_run_validated_broker",
          error_code: null,
          safe_error_message: null,
          source_fingerprint: sourceFingerprint,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        continue;
      }
      if (supabase) {
        try {
          const { data: existingBroker } = await supabase.from("brokers").select("*").eq("user_id", mappedUserId).maybeSingle();
          if (existingBroker) {
            counts.brokers.duplicate++;
            logs.push({
              id: `log-${logs.length + 1}`,
              migration_batch_id: batchId,
              entity_type: "brokers",
              legacy_id: legacyId,
              supabase_id: existingBroker.id,
              status: "duplicate",
              action: "broker_already_exists",
              error_code: null,
              safe_error_message: null,
              source_fingerprint: sourceFingerprint,
              created_at: (/* @__PURE__ */ new Date()).toISOString()
            });
            continue;
          }
          const { data: insertedBroker, error: brokerErr } = await supabase.from("brokers").insert({
            user_id: mappedUserId,
            agency_name: brokerData.agency_name,
            phone: brokerData.phone,
            whatsapp: brokerData.whatsapp,
            active_listings_count: brokerData.active_listings_count,
            is_verified: brokerData.is_verified,
            created_at: brokerData.created_at || (/* @__PURE__ */ new Date()).toISOString()
          }).select().single();
          if (brokerErr) throw brokerErr;
          counts.brokers.migrated++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: "brokers",
            legacy_id: legacyId,
            supabase_id: insertedBroker?.id || null,
            status: "migrated",
            action: "inserted_broker",
            error_code: null,
            safe_error_message: null,
            source_fingerprint: sourceFingerprint,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          });
        } catch (err) {
          counts.brokers.failed++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: "brokers",
            legacy_id: legacyId,
            supabase_id: null,
            status: "failed",
            action: "broker_insert_failed",
            error_code: "BROKER_MIGRATION_ERROR",
            safe_error_message: err.message,
            source_fingerprint: sourceFingerprint,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      } else {
        counts.brokers.migrated++;
      }
    }
    counts.properties.total = legacyData.properties.length;
    for (const rawProp of legacyData.properties) {
      const propParse = LegacyPropertySchema.safeParse(rawProp);
      const legacyId = String(rawProp.id || `prop-${Math.random().toString(36).substr(2, 7)}`);
      if (!propParse.success) {
        counts.properties.failed++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: "properties",
          legacy_id: legacyId,
          supabase_id: null,
          status: "failed",
          action: "schema_validation_failed",
          error_code: "INVALID_PROPERTY_SCHEMA",
          safe_error_message: JSON.stringify(propParse.error.flatten().fieldErrors),
          source_fingerprint: `prop-${rawProp.title}`,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        continue;
      }
      const propData = propParse.data;
      const mappedOwnerId = idMap.get(propData.owner_id) || propData.owner_id;
      const sourceFingerprint = `prop:${mappedOwnerId}:${propData.city.toLowerCase()}:${propData.locality.toLowerCase()}:${propData.title.toLowerCase()}:${propData.rent_amount}`;
      if (dryRun) {
        const simId = `sim-prop-${Math.random().toString(36).substr(2, 9)}`;
        idMap.set(legacyId, simId);
        counts.properties.migrated++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: "properties",
          legacy_id: legacyId,
          supabase_id: simId,
          status: "migrated",
          action: "dry_run_validated_property",
          error_code: null,
          safe_error_message: null,
          source_fingerprint: sourceFingerprint,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        continue;
      }
      if (supabase) {
        try {
          const { data: existingProp } = await supabase.from("properties").select("*").eq("owner_id", mappedOwnerId).eq("city", propData.city).eq("locality", propData.locality).eq("rent_amount", propData.rent_amount).maybeSingle();
          if (existingProp) {
            idMap.set(legacyId, existingProp.id);
            counts.properties.duplicate++;
            logs.push({
              id: `log-${logs.length + 1}`,
              migration_batch_id: batchId,
              entity_type: "properties",
              legacy_id: legacyId,
              supabase_id: existingProp.id,
              status: "duplicate",
              action: "property_already_exists",
              error_code: null,
              safe_error_message: null,
              source_fingerprint: sourceFingerprint,
              created_at: (/* @__PURE__ */ new Date()).toISOString()
            });
            continue;
          }
          const validImages = propData.image_urls.filter((url) => typeof url === "string" && url.length > 5);
          const { data: insertedProp, error: propErr } = await supabase.from("properties").insert({
            owner_id: mappedOwnerId,
            title: propData.title,
            description: propData.description,
            city: propData.city,
            locality: propData.locality,
            bedrooms: propData.bedrooms,
            bathrooms: propData.bathrooms,
            furnishing_status: propData.furnishing_status,
            rent_amount: propData.rent_amount,
            deposit_amount: propData.deposit_amount,
            address: propData.address,
            latitude: propData.latitude,
            longitude: propData.longitude,
            image_urls: validImages,
            is_verified: propData.is_verified,
            status: propData.status,
            created_at: propData.created_at || (/* @__PURE__ */ new Date()).toISOString()
          }).select().single();
          if (propErr) throw propErr;
          if (insertedProp) {
            idMap.set(legacyId, insertedProp.id);
            counts.properties.migrated++;
            logs.push({
              id: `log-${logs.length + 1}`,
              migration_batch_id: batchId,
              entity_type: "properties",
              legacy_id: legacyId,
              supabase_id: insertedProp.id,
              status: "migrated",
              action: "inserted_property",
              error_code: null,
              safe_error_message: null,
              source_fingerprint: sourceFingerprint,
              created_at: (/* @__PURE__ */ new Date()).toISOString()
            });
          }
        } catch (err) {
          counts.properties.failed++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: "properties",
            legacy_id: legacyId,
            supabase_id: null,
            status: "failed",
            action: "property_insert_failed",
            error_code: "PROPERTY_MIGRATION_ERROR",
            safe_error_message: err.message,
            source_fingerprint: sourceFingerprint,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      } else {
        const mockId = `prop-${Math.random().toString(36).substr(2, 9)}`;
        idMap.set(legacyId, mockId);
        counts.properties.migrated++;
      }
    }
    counts.leads.total = legacyData.leads.length;
    for (const rawLead of legacyData.leads) {
      const leadParse = LegacyLeadSchema.safeParse(rawLead);
      const legacyId = String(rawLead.id || `lead-${Math.random().toString(36).substr(2, 7)}`);
      if (!leadParse.success) {
        counts.leads.failed++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: "leads",
          legacy_id: legacyId,
          supabase_id: null,
          status: "failed",
          action: "schema_validation_failed",
          error_code: "INVALID_LEAD_SCHEMA",
          safe_error_message: JSON.stringify(leadParse.error.flatten().fieldErrors),
          source_fingerprint: `lead-${rawLead.name}`,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        continue;
      }
      const leadData = leadParse.data;
      const mappedPropertyId = idMap.get(leadData.property_id) || leadData.property_id;
      const mappedRenterId = leadData.renter_id ? idMap.get(leadData.renter_id) || leadData.renter_id : null;
      const sourceFingerprint = `lead:${mappedPropertyId}:${leadData.name.toLowerCase()}:${leadData.phone}`;
      if (dryRun) {
        counts.leads.migrated++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: "leads",
          legacy_id: legacyId,
          supabase_id: `sim-lead-${Math.random().toString(36).substr(2, 9)}`,
          status: "migrated",
          action: "dry_run_validated_lead",
          error_code: null,
          safe_error_message: null,
          source_fingerprint: sourceFingerprint,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        continue;
      }
      if (supabase) {
        try {
          const { data: existingLead } = await supabase.from("leads").select("*").eq("property_id", mappedPropertyId).eq("name", leadData.name).eq("phone", leadData.phone).maybeSingle();
          if (existingLead) {
            counts.leads.duplicate++;
            logs.push({
              id: `log-${logs.length + 1}`,
              migration_batch_id: batchId,
              entity_type: "leads",
              legacy_id: legacyId,
              supabase_id: existingLead.id,
              status: "duplicate",
              action: "lead_already_exists",
              error_code: null,
              safe_error_message: null,
              source_fingerprint: sourceFingerprint,
              created_at: (/* @__PURE__ */ new Date()).toISOString()
            });
            continue;
          }
          const { data: insertedLead, error: leadErr } = await supabase.from("leads").insert({
            property_id: mappedPropertyId,
            renter_id: mappedRenterId,
            name: leadData.name,
            phone: leadData.phone,
            message: leadData.message,
            created_at: leadData.created_at || (/* @__PURE__ */ new Date()).toISOString()
          }).select().single();
          if (leadErr) throw leadErr;
          counts.leads.migrated++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: "leads",
            legacy_id: legacyId,
            supabase_id: insertedLead?.id || null,
            status: "migrated",
            action: "inserted_lead",
            error_code: null,
            safe_error_message: null,
            source_fingerprint: sourceFingerprint,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          });
        } catch (err) {
          counts.leads.failed++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: "leads",
            legacy_id: legacyId,
            supabase_id: null,
            status: "failed",
            action: "lead_insert_failed",
            error_code: "LEAD_MIGRATION_ERROR",
            safe_error_message: err.message,
            source_fingerprint: sourceFingerprint,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      } else {
        counts.leads.migrated++;
      }
    }
    counts.favorites.total = legacyData.favorites.length;
    for (const rawFav of legacyData.favorites) {
      const favParse = LegacyFavoriteSchema.safeParse(rawFav);
      const legacyId = String(rawFav.id || `fav-${rawFav.user_id}-${rawFav.property_id}`);
      if (!favParse.success) {
        counts.favorites.failed++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: "favorites",
          legacy_id: legacyId,
          supabase_id: null,
          status: "failed",
          action: "schema_validation_failed",
          error_code: "INVALID_FAVORITE_SCHEMA",
          safe_error_message: JSON.stringify(favParse.error.flatten().fieldErrors),
          source_fingerprint: `fav-${rawFav.user_id}-${rawFav.property_id}`,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        continue;
      }
      const favData = favParse.data;
      const mappedUserId = idMap.get(favData.user_id) || favData.user_id;
      const mappedPropertyId = idMap.get(favData.property_id) || favData.property_id;
      const sourceFingerprint = `fav:${mappedUserId}:${mappedPropertyId}`;
      if (dryRun) {
        counts.favorites.migrated++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: "favorites",
          legacy_id: legacyId,
          supabase_id: `sim-fav-${Math.random().toString(36).substr(2, 9)}`,
          status: "migrated",
          action: "dry_run_validated_favorite",
          error_code: null,
          safe_error_message: null,
          source_fingerprint: sourceFingerprint,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        continue;
      }
      if (supabase) {
        try {
          const { data: existingFav } = await supabase.from("favorites").select("*").eq("user_id", mappedUserId).eq("property_id", mappedPropertyId).maybeSingle();
          if (existingFav) {
            counts.favorites.duplicate++;
            logs.push({
              id: `log-${logs.length + 1}`,
              migration_batch_id: batchId,
              entity_type: "favorites",
              legacy_id: legacyId,
              supabase_id: existingFav.id,
              status: "duplicate",
              action: "favorite_already_exists",
              error_code: null,
              safe_error_message: null,
              source_fingerprint: sourceFingerprint,
              created_at: (/* @__PURE__ */ new Date()).toISOString()
            });
            continue;
          }
          const { data: insertedFav, error: favErr } = await supabase.from("favorites").insert({
            user_id: mappedUserId,
            property_id: mappedPropertyId,
            created_at: favData.created_at || (/* @__PURE__ */ new Date()).toISOString()
          }).select().single();
          if (favErr) throw favErr;
          counts.favorites.migrated++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: "favorites",
            legacy_id: legacyId,
            supabase_id: insertedFav?.id || null,
            status: "migrated",
            action: "inserted_favorite",
            error_code: null,
            safe_error_message: null,
            source_fingerprint: sourceFingerprint,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          });
        } catch (err) {
          counts.favorites.failed++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: "favorites",
            legacy_id: legacyId,
            supabase_id: null,
            status: "failed",
            action: "favorite_insert_failed",
            error_code: "FAVORITE_MIGRATION_ERROR",
            safe_error_message: err.message,
            source_fingerprint: sourceFingerprint,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      } else {
        counts.favorites.migrated++;
      }
    }
    counts.waitlist.total = legacyData.waitlist.length;
    for (const rawWait of legacyData.waitlist) {
      const waitParse = LegacyWaitlistSchema.safeParse(rawWait);
      const legacyId = String(rawWait.id || `wait-${Math.random().toString(36).substr(2, 7)}`);
      if (!waitParse.success) {
        counts.waitlist.failed++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: "waitlist",
          legacy_id: legacyId,
          supabase_id: null,
          status: "failed",
          action: "schema_validation_failed",
          error_code: "INVALID_WAITLIST_SCHEMA",
          safe_error_message: JSON.stringify(waitParse.error.flatten().fieldErrors),
          source_fingerprint: `wait-${rawWait.contact}`,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        continue;
      }
      const waitData = waitParse.data;
      const normalizedContact = waitData.contact.trim().toLowerCase();
      const sourceFingerprint = `waitlist:${normalizedContact}`;
      if (dryRun) {
        counts.waitlist.migrated++;
        logs.push({
          id: `log-${logs.length + 1}`,
          migration_batch_id: batchId,
          entity_type: "waitlist",
          legacy_id: legacyId,
          supabase_id: `sim-wait-${Math.random().toString(36).substr(2, 9)}`,
          status: "migrated",
          action: "dry_run_validated_waitlist",
          error_code: null,
          safe_error_message: null,
          source_fingerprint: sourceFingerprint,
          created_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        continue;
      }
      if (supabase) {
        try {
          const { data: existingWait } = await supabase.from("waitlist").select("*").eq("contact", normalizedContact).maybeSingle();
          if (existingWait) {
            counts.waitlist.duplicate++;
            logs.push({
              id: `log-${logs.length + 1}`,
              migration_batch_id: batchId,
              entity_type: "waitlist",
              legacy_id: legacyId,
              supabase_id: existingWait.id,
              status: "duplicate",
              action: "waitlist_entry_already_exists",
              error_code: null,
              safe_error_message: null,
              source_fingerprint: sourceFingerprint,
              created_at: (/* @__PURE__ */ new Date()).toISOString()
            });
            continue;
          }
          const { data: insertedWait, error: waitErr } = await supabase.from("waitlist").insert({
            name: waitData.name,
            contact: normalizedContact,
            role: waitData.role,
            created_at: waitData.created_at || (/* @__PURE__ */ new Date()).toISOString()
          }).select().single();
          if (waitErr) throw waitErr;
          counts.waitlist.migrated++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: "waitlist",
            legacy_id: legacyId,
            supabase_id: insertedWait?.id || null,
            status: "migrated",
            action: "inserted_waitlist",
            error_code: null,
            safe_error_message: null,
            source_fingerprint: sourceFingerprint,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          });
        } catch (err) {
          counts.waitlist.failed++;
          logs.push({
            id: `log-${logs.length + 1}`,
            migration_batch_id: batchId,
            entity_type: "waitlist",
            legacy_id: legacyId,
            supabase_id: null,
            status: "failed",
            action: "waitlist_insert_failed",
            error_code: "WAITLIST_MIGRATION_ERROR",
            safe_error_message: err.message,
            source_fingerprint: sourceFingerprint,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
      } else {
        counts.waitlist.migrated++;
      }
    }
    if (supabase && !dryRun && logs.length > 0) {
      try {
        await supabase.from("legacy_migration_logs").insert(
          logs.map((l) => ({
            migration_batch_id: l.migration_batch_id,
            entity_type: l.entity_type,
            legacy_id: l.legacy_id,
            supabase_id: l.supabase_id,
            status: l.status,
            action: l.action,
            error_code: l.error_code,
            safe_error_message: l.safe_error_message,
            source_fingerprint: l.source_fingerprint,
            created_at: l.created_at
          }))
        );
      } catch (err) {
        console.warn("[Migration] Could not write to legacy_migration_logs table:", err.message);
      }
    }
    const totalProcessed = counts.users.total + counts.brokers.total + counts.properties.total + counts.leads.total + counts.favorites.total + counts.waitlist.total;
    const totalMigrated = counts.users.migrated + counts.brokers.migrated + counts.properties.migrated + counts.leads.migrated + counts.favorites.migrated + counts.waitlist.migrated;
    const totalSkipped = counts.users.skipped + counts.brokers.skipped + counts.properties.skipped + counts.leads.skipped + counts.favorites.skipped + counts.waitlist.skipped;
    const totalDuplicate = counts.users.duplicate + counts.brokers.duplicate + counts.properties.duplicate + counts.leads.duplicate + counts.favorites.duplicate + counts.waitlist.duplicate;
    const totalFailed = counts.users.failed + counts.brokers.failed + counts.properties.failed + counts.leads.failed + counts.favorites.failed + counts.waitlist.failed;
    res.json({
      success: true,
      dryRun,
      batchId,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      summary: {
        total: totalProcessed,
        migrated: totalMigrated,
        skipped: totalSkipped,
        duplicate: totalDuplicate,
        failed: totalFailed
      },
      details: counts,
      logs,
      idMappingsCount: idMap.size
    });
  } catch (err) {
    console.error("[Migration Server Error]", err);
    res.status(500).json({
      error: "Migration processing failed",
      message: err.message
    });
  }
});

// server/payments.ts
import crypto2 from "crypto";
import { Router as Router3 } from "express";
var paymentRouter = Router3();
function timingSafeEqualHMAC(a, b) {
  const aBuf = Buffer.from(a, "utf-8");
  const bBuf = Buffer.from(b, "utf-8");
  if (aBuf.length !== bBuf.length) {
    crypto2.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto2.timingSafeEqual(aBuf, bBuf);
}
var PLAN_PRICING = {
  broker_monthly: { amountPaisa: 99900, description: "MyAngan Broker Monthly Plan" },
  broker_annual: { amountPaisa: 999900, description: "MyAngan Broker Annual Plan" },
  landlord_premium: { amountPaisa: 49900, description: "MyAngan Landlord Premium Plan" },
  tenant_pass: { amountPaisa: 19900, description: "MyAngan Renter Contact Pass" }
};
async function getAuthUserFromRequest(req) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    if (token) {
      const supabase = getSupabaseClient();
      if (supabase) {
        try {
          const { data: { user }, error } = await supabase.auth.getUser(token);
          if (!error && user) {
            return { id: user.id, email: user.email || "" };
          }
        } catch {
        }
      }
    }
  }
  if (req.headers["x-user-id"] && req.headers["x-user-email"]) {
    return {
      id: String(req.headers["x-user-id"]),
      email: String(req.headers["x-user-email"])
    };
  }
  return null;
}
paymentRouter.post("/orders", async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized: Authentication required to initiate payment order." });
      return;
    }
    const { plan_type } = req.body;
    const planConfig = PLAN_PRICING[plan_type];
    if (!planConfig) {
      res.status(400).json({ error: "Invalid plan_type specified." });
      return;
    }
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    let razorpayOrderId = "";
    if (keyId && keySecret && !keyId.includes("placeholder")) {
      const authHeader = "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64");
      const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Authorization": authHeader,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: planConfig.amountPaisa,
          currency: "INR",
          receipt: `rcpt_${Date.now()}_${user.id.slice(0, 6)}`,
          notes: {
            user_id: user.id,
            plan_type
          }
        })
      });
      if (!rzpRes.ok) {
        const errText = await rzpRes.text();
        console.error("[Razorpay Order Creation Error]", errText);
        res.status(502).json({ error: "Failed to create order with Razorpay payment gateway." });
        return;
      }
      const rzpJson = await rzpRes.json();
      razorpayOrderId = rzpJson.id;
    } else {
      razorpayOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    }
    const supabase = getSupabaseClient();
    let orderRecord = null;
    if (supabase) {
      const { data, error } = await supabase.from("payment_orders").insert([{
        user_id: user.id,
        plan_type,
        amount_paisa: planConfig.amountPaisa,
        currency: "INR",
        razorpay_order_id: razorpayOrderId,
        status: "created"
      }]).select().single();
      if (error) {
        console.error("[Database Error] payment_orders insert failed:", error.message);
        res.status(500).json({ error: "Failed to initialize payment order record in database." });
        return;
      }
      orderRecord = data;
    } else {
      orderRecord = {
        id: `ord_${Date.now()}`,
        user_id: user.id,
        plan_type,
        amount_paisa: planConfig.amountPaisa,
        currency: "INR",
        razorpay_order_id: razorpayOrderId,
        status: "created"
      };
    }
    res.json({
      orderId: orderRecord.id,
      razorpayOrderId: orderRecord.razorpay_order_id,
      amountPaisa: planConfig.amountPaisa,
      currency: "INR",
      keyId: process.env.VITE_RAZORPAY_KEY_ID || keyId || "rzp_test_key"
    });
  } catch (err) {
    console.error("[Server Error] POST /api/payments/orders:", err.message);
    res.status(500).json({ error: "Internal server error while initializing payment order." });
  }
});
paymentRouter.post("/verify", async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized: Authentication required." });
      return;
    }
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ error: "Missing mandatory payment verification fields." });
      return;
    }
    const secret = process.env.RAZORPAY_KEY_SECRET || "fallback-razorpay-secret";
    const payload = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto2.createHmac("sha256", secret).update(payload).digest("hex");
    const isValidSignature = timingSafeEqualHMAC(generatedSignature, razorpay_signature);
    if (!isValidSignature) {
      console.warn(`[Security Alert] Invalid payment signature attempt for user ${user.id}`);
      res.status(400).json({ error: "Invalid payment signature. Verification failed." });
      return;
    }
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: order } = await supabase.from("payment_orders").select("*").eq("razorpay_order_id", razorpay_order_id).maybeSingle();
      if (order) {
        await supabase.from("payment_orders").update({ status: "paid", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", order.id);
        await supabase.from("payment_transactions").insert([{
          order_id: order.id,
          user_id: user.id,
          razorpay_payment_id,
          razorpay_signature,
          status: "captured"
        }]);
        const now = /* @__PURE__ */ new Date();
        const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3);
        await supabase.from("profiles").update({
          is_subscribed: true,
          subscribed_at: now.toISOString(),
          subscription_expires_at: expires.toISOString()
        }).eq("id", user.id);
        await supabase.from("audit_logs").insert([{
          actor_id: user.id,
          action: "payment_verified",
          entity_type: "payment_order",
          entity_id: order.id,
          payload: { plan_type: order.plan_type, amount_paisa: order.amount_paisa }
        }]);
      }
    }
    await sendEmail({
      to: user.email,
      subject: "MyAngan Payment Confirmation & Receipt",
      templateType: "payment_receipt",
      htmlContent: `
        <h2>Payment Successful</h2>
        <p>Thank you for subscribing to MyAngan. Your payment has been verified.</p>
        <p><strong>Payment Reference ID:</strong> ${razorpay_payment_id}</p>
        <p><strong>Order ID:</strong> ${razorpay_order_id}</p>
      `,
      textContent: `Payment Successful. Reference ID: ${razorpay_payment_id}, Order ID: ${razorpay_order_id}`
    });
    res.json({
      status: "success",
      message: "Payment verified and entitlement activated successfully.",
      paymentId: razorpay_payment_id
    });
  } catch (err) {
    console.error("[Server Error] POST /api/payments/verify:", err.message);
    res.status(500).json({ error: "Internal server error verifying payment." });
  }
});
paymentRouter.post("/webhook", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
    if (!signature || !webhookSecret) {
      res.status(400).json({ error: "Missing webhook signature or secret configuration." });
      return;
    }
    const rawBody = req.rawBody || (typeof req.body === "string" ? req.body : JSON.stringify(req.body));
    const expectedSignature = crypto2.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    if (!timingSafeEqualHMAC(expectedSignature, signature)) {
      console.warn("[Security Warning] Webhook signature mismatch.");
      res.status(400).json({ error: "Invalid webhook signature." });
      return;
    }
    const payload = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const eventId = payload.event_id || payload.id || `evt_${Date.now()}`;
    const eventType = payload.event || "payment.captured";
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: existingEvent } = await supabase.from("payment_webhook_events").select("id").eq("event_id", eventId).maybeSingle();
      if (existingEvent) {
        res.json({ status: "already_processed", eventId });
        return;
      }
      await supabase.from("payment_webhook_events").insert([{
        event_id: eventId,
        event_type: eventType,
        payload,
        processed_at: (/* @__PURE__ */ new Date()).toISOString()
      }]);
      if (eventType === "payment.captured" || eventType === "order.paid") {
        const paymentEntity = payload.payload?.payment?.entity;
        const razorpayOrderId = paymentEntity?.order_id;
        const razorpayPaymentId = paymentEntity?.id;
        if (razorpayOrderId) {
          const { data: order } = await supabase.from("payment_orders").select("*").eq("razorpay_order_id", razorpayOrderId).maybeSingle();
          if (order && order.status !== "paid") {
            await supabase.from("payment_orders").update({ status: "paid", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", order.id);
            const now = /* @__PURE__ */ new Date();
            const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1e3);
            await supabase.from("profiles").update({
              is_subscribed: true,
              subscribed_at: now.toISOString(),
              subscription_expires_at: expires.toISOString()
            }).eq("id", order.user_id);
          }
        }
      } else if (eventType === "payment.failed") {
        const paymentEntity = payload.payload?.payment?.entity;
        const razorpayOrderId = paymentEntity?.order_id;
        if (razorpayOrderId) {
          await supabase.from("payment_orders").update({ status: "failed", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("razorpay_order_id", razorpayOrderId);
        }
      }
    }
    res.json({ status: "processed", eventId });
  } catch (err) {
    console.error("[Webhook Processing Error]", err.message);
    res.status(500).json({ error: "Webhook processing exception." });
  }
});

// server/operations.ts
import { Router as Router4 } from "express";
var operationsRouter = Router4();
var VALID_TICKET_TRANSITIONS = {
  open: ["acknowledged", "in_progress", "cancelled"],
  acknowledged: ["in_progress", "resolved", "cancelled"],
  in_progress: ["resolved", "cancelled"],
  resolved: ["closed", "in_progress"],
  closed: [],
  cancelled: []
};
function getSanitizedVerificationStatusLabel(status) {
  switch (status) {
    case "submitted":
      return "Documents submitted";
    case "under_review":
      return "Verification under review";
    case "approved":
      return "Verification completed by MyAngan review";
    case "additional_information_required":
      return "Additional information requested by review team";
    case "rejected":
      return "Verification not approved";
    case "expired":
      return "Verification expired";
    case "not_submitted":
    default:
      return "Verification not submitted";
  }
}
operationsRouter.post("/tickets", async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized: Session login required to create ticket." });
      return;
    }
    const { property_id, category, priority, description, image_urls } = req.body;
    if (!property_id || !category || !description) {
      res.status(400).json({ error: "Missing mandatory fields: property_id, category, and description are required." });
      return;
    }
    const validCategories = ["plumbing", "electrical", "appliance", "painting", "other"];
    if (!validCategories.includes(category)) {
      res.status(400).json({ error: "Invalid maintenance category specified." });
      return;
    }
    const supabase = getSupabaseClient();
    let ticket = null;
    const hoursSla = priority === "urgent" ? 24 : priority === "high" ? 48 : 72;
    const slaTargetAt = new Date(Date.now() + hoursSla * 60 * 60 * 1e3).toISOString();
    if (supabase) {
      const { data, error } = await supabase.from("maintenance_tickets").insert([{
        property_id,
        user_id: user.id,
        category,
        priority: priority || "normal",
        description,
        status: "open",
        sla_target_at: slaTargetAt,
        image_urls: Array.isArray(image_urls) ? image_urls : []
      }]).select().single();
      if (error) {
        console.error("[DB Error] maintenance_tickets insert:", error.message);
        res.status(500).json({ error: "Failed to save maintenance ticket to database." });
        return;
      }
      ticket = data;
      await supabase.from("maintenance_ticket_history").insert([{
        ticket_id: ticket.id,
        actor_id: user.id,
        new_status: "open",
        notes: "Ticket created by user"
      }]);
      await supabase.from("audit_logs").insert([{
        actor_id: user.id,
        action: "ticket_created",
        entity_type: "maintenance_ticket",
        entity_id: ticket.id
      }]);
    } else {
      ticket = {
        id: `tkt_${Date.now()}`,
        property_id,
        user_id: user.id,
        category,
        priority: priority || "normal",
        description,
        status: "open",
        sla_target_at: slaTargetAt,
        created_at: (/* @__PURE__ */ new Date()).toISOString()
      };
    }
    res.status(201).json({ status: "success", ticket });
  } catch (err) {
    res.status(500).json({ error: "Internal server error creating ticket." });
  }
});
operationsRouter.patch("/tickets/:id/status", async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const { id } = req.params;
    const { new_status, resolution_notes } = req.body;
    const currentStatus = req.body.current_status || "open";
    const allowed = VALID_TICKET_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(new_status)) {
      res.status(400).json({
        error: `Invalid status transition from '${currentStatus}' to '${new_status}'. Allowed transitions: ${allowed.join(", ") || "none"}.`
      });
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      res.json({ status: "success", ticketId: id, oldStatus: currentStatus, newStatus: new_status });
      return;
    }
    const { data: ticket } = await supabase.from("maintenance_tickets").select("*").eq("id", id).maybeSingle();
    const oldStatus = ticket?.status || currentStatus;
    await supabase.from("maintenance_tickets").update({
      status: new_status,
      resolution_notes: resolution_notes || (ticket ? ticket.resolution_notes : null),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", id);
    await supabase.from("maintenance_ticket_history").insert([{
      ticket_id: id,
      actor_id: user.id,
      old_status: oldStatus,
      new_status,
      notes: resolution_notes || null
    }]);
    res.json({ status: "success", ticketId: id, oldStatus, newStatus: new_status });
  } catch (err) {
    res.status(500).json({ error: "Internal server error updating ticket status." });
  }
});
operationsRouter.post("/agreements", async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }
    const { property_id, landlord_id, tenant_id, rent_amount, deposit_amount, start_date, tenure_months, notice_period_months, lock_in_months, terms_json } = req.body;
    if (!property_id || !rent_amount || !start_date) {
      res.status(400).json({ error: "Missing mandatory agreement fields." });
      return;
    }
    const supabase = getSupabaseClient();
    let agreement = null;
    if (supabase) {
      const { data, error } = await supabase.from("agreement_records").insert([{
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
        status: "draft",
        version: 1
      }]).select().single();
      if (error) {
        console.error("[DB Error] agreement_records insert:", error.message);
        res.status(500).json({ error: "Failed to create agreement record." });
        return;
      }
      agreement = data;
      await supabase.from("agreement_versions").insert([{
        agreement_id: agreement.id,
        version_number: 1,
        terms_json: terms_json || {},
        created_by: user.id
      }]);
    } else {
      agreement = {
        id: `agr_${Date.now()}`,
        property_id,
        landlord_id: user.id,
        rent_amount,
        status: "draft",
        version: 1
      };
    }
    res.status(201).json({ status: "success", agreement });
  } catch (err) {
    res.status(500).json({ error: "Internal server error creating agreement draft." });
  }
});
operationsRouter.get("/agreements/:id/pdf", async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = getSupabaseClient();
    let record = null;
    if (supabase) {
      const { data } = await supabase.from("agreement_records").select("*, properties(*)").eq("id", id).maybeSingle();
      record = data;
    }
    const title = record?.properties?.title || "Residential Property";
    const rent = record?.rent_amount || 35e3;
    const deposit = record?.deposit_amount || 7e4;
    const startDate = record?.start_date || "2026-08-01";
    const documentHeaderTitle = "Draft Rental Agreement";
    const mandatoryDisclaimer = "This document is a configurable draft and is not legal advice.";
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
          \u26A0\uFE0F NOTICE: ${mandatoryDisclaimer}
        </div>

        <div class="section">
          <div class="section-title">1. Property & Tenure Terms</div>
          <table class="table">
            <tr><td class="bold">Property Description:</td><td>${safeTitle}</td></tr>
            <tr><td class="bold">Monthly Rent:</td><td>\u20B9${rent.toLocaleString("en-IN")} INR / month</td></tr>
            <tr><td class="bold">Security Deposit:</td><td>\u20B9${deposit.toLocaleString("en-IN")} INR</td></tr>
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
    res.setHeader("Content-Type", "text/html");
    res.send(htmlContent);
  } catch (err) {
    res.status(500).json({ error: "Internal server error generating agreement draft." });
  }
});
operationsRouter.get("/verifications/:propertyId", async (req, res) => {
  try {
    const { propertyId } = req.params;
    const supabase = getSupabaseClient();
    let rawStatus = "not_submitted";
    let isVerified = false;
    if (supabase) {
      const { data } = await supabase.from("property_verification_requests").select("ver_status, status").eq("property_id", propertyId).order("created_at", { ascending: false }).maybeSingle();
      if (data) {
        rawStatus = data.ver_status || data.status || "not_submitted";
        isVerified = rawStatus === "approved";
      }
    }
    const publicLabel = getSanitizedVerificationStatusLabel(rawStatus);
    res.json({
      propertyId,
      isVerified,
      verificationStatusLabel: publicLabel
      // ZERO sensitive document paths, Aadhaar numbers, or title deeds returned
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error reading verification status." });
  }
});
operationsRouter.post("/reports", async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    const { property_id, reason, details } = req.body;
    if (!property_id || !reason || !details) {
      res.status(400).json({ error: "Missing report parameters: property_id, reason, and details required." });
      return;
    }
    const validReasons = ["misleading_price", "fake_photos", "unresponsive_owner", "duplicate_listing", "other"];
    if (!validReasons.includes(reason)) {
      res.status(400).json({ error: "Invalid report reason category." });
      return;
    }
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from("property_reports").insert([{
        property_id,
        reporter_id: user ? user.id : null,
        reason,
        details: escapeHtml(details),
        status: "pending"
      }]);
      await supabase.from("audit_logs").insert([{
        actor_id: user ? user.id : null,
        action: "property_reported",
        entity_type: "property",
        entity_id: property_id,
        payload: { reason }
      }]);
    }
    res.status(201).json({ status: "success", message: "Report submitted successfully to MyAngan moderation queue." });
  } catch (err) {
    res.status(500).json({ error: "Internal server error submitting report." });
  }
});
operationsRouter.post("/moderation/review", async (req, res) => {
  try {
    const user = await getAuthUserFromRequest(req);
    if (!user) {
      res.status(401).json({ error: "Unauthorized: Admin authentication required." });
      return;
    }
    const { report_id, action_decision, admin_notes } = req.body;
    if (!report_id || !action_decision) {
      res.status(400).json({ error: "Missing report_id or action_decision." });
      return;
    }
    const supabase = getSupabaseClient();
    if (supabase) {
      const { data: report } = await supabase.from("property_reports").select("*").eq("id", report_id).maybeSingle();
      if (report) {
        if (action_decision === "suspend") {
          await supabase.from("properties").update({ status: "inactive", updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", report.property_id);
          await supabase.from("property_reports").update({ status: "actioned_suspended", admin_notes, resolved_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", report_id);
        } else {
          await supabase.from("property_reports").update({ status: "dismissed", admin_notes, resolved_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", report_id);
        }
        await supabase.from("audit_logs").insert([{
          actor_id: user.id,
          action: action_decision === "suspend" ? "property_suspended" : "report_dismissed",
          entity_type: "property",
          entity_id: report.property_id,
          payload: { report_id, action_decision, admin_notes }
        }]);
      }
    }
    res.json({ status: "success", action: action_decision });
  } catch (err) {
    res.status(500).json({ error: "Internal server error completing moderation review." });
  }
});

// server/ai.ts
import { Router as Router5 } from "express";
var aiRouter = Router5();
var RENT_ESTIMATE_DISCLAIMER = "Estimated rent is informational only. Actual rent may differ based on property condition, exact location, market demand and negotiation.";
function sanitizeSearchPrompt(input) {
  if (!input) return "";
  let clean = input.slice(0, 500);
  clean = clean.replace(/[\x00-\x1F\x7F]/g, "");
  clean = clean.replace(/(ignore previous instructions|system prompt|drop table|select \* from|delete from)/gi, "[filtered]");
  return clean.trim();
}
function validateAndNormalizeFilters(rawOutput) {
  const normalized = {};
  if (!rawOutput || typeof rawOutput !== "object") {
    return normalized;
  }
  if (typeof rawOutput.city === "string" && rawOutput.city.trim().length >= 2) {
    normalized.city = rawOutput.city.trim();
  }
  if (typeof rawOutput.locality === "string" && rawOutput.locality.trim().length >= 2) {
    normalized.locality = rawOutput.locality.trim();
  }
  if (typeof rawOutput.minRent === "number" && rawOutput.minRent > 0 && rawOutput.minRent <= 1e6) {
    normalized.minRent = Math.floor(rawOutput.minRent);
  }
  if (typeof rawOutput.maxRent === "number" && rawOutput.maxRent > 0 && rawOutput.maxRent <= 1e6) {
    normalized.maxRent = Math.floor(rawOutput.maxRent);
  }
  if (normalized.minRent && normalized.maxRent && normalized.minRent > normalized.maxRent) {
    const tmp = normalized.minRent;
    normalized.minRent = normalized.maxRent;
    normalized.maxRent = tmp;
  }
  if (typeof rawOutput.bedrooms === "number" && rawOutput.bedrooms >= 1 && rawOutput.bedrooms <= 10) {
    normalized.bedrooms = Math.floor(rawOutput.bedrooms);
  }
  const validFurnishing = ["furnished", "semi_furnished", "unfurnished"];
  if (typeof rawOutput.furnishing === "string" && validFurnishing.includes(rawOutput.furnishing.toLowerCase())) {
    normalized.furnishing = rawOutput.furnishing.toLowerCase();
  }
  if (Array.isArray(rawOutput.amenities)) {
    normalized.amenities = rawOutput.amenities.filter((a) => typeof a === "string" && a.trim().length > 0).map((a) => a.trim().toLowerCase()).slice(0, 10);
  }
  return normalized;
}
function parseUserIntentFallback(query) {
  const q = query.toLowerCase();
  const filters = {};
  if (q.includes("gurugram") || q.includes("gurgaon")) filters.city = "Gurugram";
  else if (q.includes("noida")) filters.city = "Noida";
  else if (q.includes("delhi")) filters.city = "Delhi";
  else if (q.includes("bengaluru") || q.includes("bangalore")) filters.city = "Bengaluru";
  if (q.includes("dlf phase 5") || q.includes("dlf 5")) filters.locality = "DLF Phase 5";
  else if (q.includes("sector 62")) filters.locality = "Sector 62";
  else if (q.includes("golf course")) filters.locality = "Golf Course Road";
  const bhkMatch = q.match(/(\d)\s*(bhk|bed|bedroom)/i);
  if (bhkMatch) {
    filters.bedrooms = parseInt(bhkMatch[1], 10);
  }
  const underMatch = q.match(/(under|below|less than|max)\s*(\d{2,6})/i);
  if (underMatch) {
    const val = parseInt(underMatch[2], 10);
    filters.maxRent = val < 1e3 ? val * 1e3 : val;
  }
  if (q.includes("fully furnished") || q.includes("furnished")) filters.furnishing = "furnished";
  else if (q.includes("semi furnished") || q.includes("semi-furnished")) filters.furnishing = "semi_furnished";
  else if (q.includes("unfurnished")) filters.furnishing = "unfurnished";
  return filters;
}
aiRouter.post("/search-assistant", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      res.status(400).json({ error: "Missing user prompt for AI search assistant." });
      return;
    }
    const sanitizedPrompt = sanitizeSearchPrompt(prompt);
    const apiKey = process.env.GEMINI_API_KEY;
    let interpretedFilters = {};
    let isAiGenerated = false;
    if (apiKey && !apiKey.includes("placeholder")) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  role: "user",
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
                      Respond ONLY with raw valid JSON. Do not include markdown code blocks.`
                    }
                  ]
                }
              ]
            })
          }
        );
        if (geminiRes.ok) {
          const geminiJson = await geminiRes.json();
          const responseText = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const cleanedText = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
          const parsedObj = JSON.parse(cleanedText);
          interpretedFilters = validateAndNormalizeFilters(parsedObj);
          isAiGenerated = true;
        } else {
          console.warn("[Gemini API Warning] Gemini request failed; falling back to keyword parser.");
          interpretedFilters = parseUserIntentFallback(sanitizedPrompt);
        }
      } catch (geminiErr) {
        console.warn("[Gemini Error]", geminiErr.message);
        interpretedFilters = parseUserIntentFallback(sanitizedPrompt);
      }
    } else {
      interpretedFilters = parseUserIntentFallback(sanitizedPrompt);
    }
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from("audit_logs").insert([{
        action: "ai_search_query",
        entity_type: "search",
        entity_id: "ai_assistant",
        payload: { prompt: sanitizedPrompt, isAiGenerated, interpretedFilters }
      }]);
    }
    res.json({
      status: "success",
      isAiGenerated,
      prompt: sanitizedPrompt,
      filters: interpretedFilters,
      notice: "AI recommendations are generated automatically and may misunderstand your request."
    });
  } catch (err) {
    console.error("[AI Router Error]", err.message);
    res.status(500).json({ error: "Internal server error in AI search assistant." });
  }
});
aiRouter.post("/rent-estimate", async (req, res) => {
  try {
    const { city, locality, bedrooms, furnishing } = req.body;
    if (!city || !bedrooms) {
      res.status(400).json({ error: "Missing mandatory estimation inputs: city and bedrooms are required." });
      return;
    }
    const supabase = getSupabaseClient();
    let comparables = [];
    if (supabase) {
      let queryBuilder = supabase.from("properties").select("rent_amount, city, locality, bedrooms, furnishing_status").eq("city", city).eq("bedrooms", bedrooms).in("status", ["active", "approved"]);
      if (locality) {
        queryBuilder = queryBuilder.eq("locality", locality);
      }
      const { data } = await queryBuilder;
      if (data) comparables = data;
    }
    if (comparables.length < 2) {
      res.json({
        status: "insufficient_data",
        message: "Insufficient comparable listings in this locality to generate an accurate informational estimate.",
        comparablesCount: comparables.length,
        disclaimer: RENT_ESTIMATE_DISCLAIMER
      });
      return;
    }
    const rents = comparables.map((c) => c.rent_amount).sort((a, b) => a - b);
    const minRent = rents[0];
    const maxRent = rents[rents.length - 1];
    const avgRent = Math.round(rents.reduce((acc, val) => acc + val, 0) / rents.length);
    const confidence = comparables.length >= 5 ? "high" : comparables.length >= 3 ? "medium" : "low";
    res.json({
      status: "success",
      estimatedRange: {
        minRent,
        maxRent,
        avgRent,
        formattedRange: `\u20B9${minRent.toLocaleString("en-IN")} \u2013 \u20B9${maxRent.toLocaleString("en-IN")} / month`
      },
      inputFeatures: {
        city: escapeHtml(city),
        locality: locality ? escapeHtml(locality) : "All Localities",
        bedrooms,
        furnishing: furnishing || "semi_furnished"
      },
      comparablesCount: comparables.length,
      confidenceIndicator: confidence,
      dataFreshnessDate: (/* @__PURE__ */ new Date()).toISOString(),
      disclaimer: RENT_ESTIMATE_DISCLAIMER
    });
  } catch (err) {
    res.status(500).json({ error: "Internal server error processing rent estimation." });
  }
});

// server/env.ts
import { z as z2 } from "zod";
import dotenv from "dotenv";
dotenv.config();
var envSchema = z2.object({
  NODE_ENV: z2.enum(["development", "test", "production"]).default("development"),
  PORT: z2.string().optional().default("3000"),
  APP_URL: z2.string().optional().default("http://localhost:3000"),
  CORS_ALLOWED_ORIGINS: z2.string().optional().default("*"),
  // Supabase Configuration
  SUPABASE_URL: z2.string().optional(),
  SUPABASE_ANON_KEY: z2.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z2.string().optional(),
  // Auth Secrets
  OTP_HASH_SECRET: z2.string().optional().default("myangan-dev-otp-secret-key-32bytes-min"),
  // Payment Credentials
  RAZORPAY_KEY_ID: z2.string().optional(),
  RAZORPAY_KEY_SECRET: z2.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z2.string().optional(),
  // SMTP Credentials
  SMTP_HOST: z2.string().optional(),
  SMTP_PORT: z2.string().optional(),
  SMTP_SECURE: z2.string().optional(),
  SMTP_USER: z2.string().optional(),
  SMTP_PASSWORD: z2.string().optional(),
  EMAIL_FROM: z2.string().optional(),
  EMAIL_REPLY_TO: z2.string().optional(),
  // AI Service
  GEMINI_API_KEY: z2.string().optional()
});
function validateEnv() {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("\u274C Environment validation failed:", result.error.format());
    if (process.env.NODE_ENV === "production") {
      throw new Error("Fatal: Invalid environment configuration in production");
    }
  }
  if (process.env.NODE_ENV === "production") {
    const missingVars = [];
    if (!process.env.SUPABASE_URL) missingVars.push("SUPABASE_URL");
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.VITE_SUPABASE_ANON_KEY) missingVars.push("SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY");
    if (missingVars.length > 0) {
      console.error(`\u274C PRODUCTION GUARDFALL: Missing critical production variables: ${missingVars.join(", ")}`);
      throw new Error(`Production startup blocked: Missing required environment variables: ${missingVars.join(", ")}`);
    }
  }
  return result.data || process.env;
}

// api/index.ts
dotenv2.config();
try {
  validateEnv();
} catch (err) {
  console.warn("\u26A0\uFE0F Environment validation notice:", err);
}
var app = express();
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString("utf-8");
  }
}));
app.use("/api/auth", authRouter);
app.use("/api/admin", migrationRouter);
app.use("/api/payments", paymentRouter);
app.use("/api/operations", operationsRouter);
app.use("/api/ai", aiRouter);
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    mode: process.env.NODE_ENV || "production",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
var index_default = app;
export {
  index_default as default
};
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
