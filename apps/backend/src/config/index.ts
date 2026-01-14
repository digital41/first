import { config as dotenvConfig } from 'dotenv';
import { z } from 'zod';

// Charger .env
dotenvConfig();

// ============================================
// SCHEMA DE VALIDATION DES VARIABLES D'ENV
// ============================================
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('4000'),
  API_PREFIX: z.string().default('/api'),
  BASE_URL: z.string().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().url(),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),

  // Email (optionnel)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().transform(Number).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().email().optional(),

  // Gemini (optionnel)
  GEMINI_API_KEY: z.string().optional(),

  // Upload
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_FILE_SIZE_MB: z.string().transform(Number).default('10'),
});

// ============================================
// VALIDATION ET EXPORT
// ============================================
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Configuration invalide:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const config = {
  env: parsed.data.NODE_ENV,
  isProduction: parsed.data.NODE_ENV === 'production',
  isDevelopment: parsed.data.NODE_ENV === 'development',

  server: {
    port: parsed.data.PORT,
    apiPrefix: parsed.data.API_PREFIX,
    baseUrl: parsed.data.BASE_URL,
  },

  database: {
    url: parsed.data.DATABASE_URL,
  },

  jwt: {
    accessSecret: parsed.data.JWT_ACCESS_SECRET,
    refreshSecret: parsed.data.JWT_REFRESH_SECRET,
    accessExpiresIn: parsed.data.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: parsed.data.JWT_REFRESH_EXPIRES_IN,
  },

  cors: {
    origin: parsed.data.CORS_ORIGIN.split(',').map((o) => o.trim()),
  },

  rateLimit: {
    windowMs: parsed.data.RATE_LIMIT_WINDOW_MS,
    max: parsed.data.RATE_LIMIT_MAX_REQUESTS,
  },

  email: {
    host: parsed.data.SMTP_HOST,
    port: parsed.data.SMTP_PORT,
    user: parsed.data.SMTP_USER,
    pass: parsed.data.SMTP_PASS,
    from: parsed.data.EMAIL_FROM,
  },

  gemini: {
    apiKey: parsed.data.GEMINI_API_KEY,
  },

  upload: {
    dir: parsed.data.UPLOAD_DIR,
    maxFileSizeBytes: parsed.data.MAX_FILE_SIZE_MB * 1024 * 1024,
  },
} as const;

export type Config = typeof config;
