import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.string().optional().default('3000'),
  APP_URL: z.string().optional().default('http://localhost:3000'),
  CORS_ALLOWED_ORIGINS: z.string().optional().default('*'),
  
  // Supabase Configuration
  SUPABASE_URL: z.string().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // Auth Secrets
  OTP_HASH_SECRET: z.string().optional().default('myangan-dev-otp-secret-key-32bytes-min'),
  
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
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Environment validation failed:', result.error.format());
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Fatal: Invalid environment configuration in production');
    }
  }

  // Production Guard: Prevent startup if critical Supabase variables are missing in production mode
  if (process.env.NODE_ENV === 'production') {
    const missingVars: string[] = [];
    if (!process.env.SUPABASE_URL) missingVars.push('SUPABASE_URL');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.VITE_SUPABASE_ANON_KEY) missingVars.push('SUPABASE_SERVICE_ROLE_KEY / VITE_SUPABASE_ANON_KEY');
    
    if (missingVars.length > 0) {
      console.error(`❌ PRODUCTION GUARDFALL: Missing critical production variables: ${missingVars.join(', ')}`);
      // Fail-fast in production mode
      throw new Error(`Production startup blocked: Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }

  return result.data || (process.env as any);
}
