import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().optional().default('3000'),
  APP_URL: z.string().optional(),
  CORS_ALLOWED_ORIGINS: z.string().optional().default('*'),
  
  // Supabase Configuration
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // Auth Secrets
  OTP_HASH_SECRET: z.string().optional(),
  
  // Payment Credentials
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),
  
  // SMTP Credentials
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional(),
  SMTP_SECURE: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_REPLY_TO: z.string().optional(),
  
  // AI Service
  GEMINI_API_KEY: z.string().optional()
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(): EnvConfig {
  const isDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test' || !process.env.NODE_ENV;

  // Compute dynamic APP_URL fallback (supporting Vercel preview/production deployments)
  const computedAppUrl = process.env.APP_URL || (
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
    process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` :
    (isDevOrTest ? 'http://localhost:3000' : '')
  );

  const envData = {
    ...process.env,
    APP_URL: computedAppUrl || process.env.APP_URL,
    OTP_HASH_SECRET: process.env.OTP_HASH_SECRET || (isDevOrTest ? 'myangan-dev-otp-secret-key-32bytes-min' : '')
  };

  const result = envSchema.safeParse(envData);
  
  if (!result.success) {
    console.error('❌ Environment validation failed:', result.error.format());
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Fatal: Invalid environment configuration in production');
    }
  }

  // Production/Preview Guard: Require exact server credentials for privileged operations
  if (process.env.NODE_ENV === 'production') {
    const missingVars: string[] = [];
    if (!process.env.SUPABASE_URL && !process.env.VITE_SUPABASE_URL) missingVars.push('SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
    if (!computedAppUrl || computedAppUrl.includes('localhost') || computedAppUrl.includes('127.0.0.1')) {
      missingVars.push('APP_URL (must not default to localhost or 127.0.0.1 in production)');
    }
    if (!process.env.OTP_HASH_SECRET) missingVars.push('OTP_HASH_SECRET');
    
    if (missingVars.length > 0) {
      console.error(`❌ PRODUCTION GUARDFALL: Missing critical production variables: ${missingVars.join(', ')}`);
      throw new Error(`Production startup blocked: Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }

  return result.data || (process.env as any);
}
