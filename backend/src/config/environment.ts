import dotenv from 'dotenv';

// Load environment variables from .env if present
dotenv.config();

export interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  corsOrigin: string;
  databaseUrl?: string;
}

export const env: EnvironmentConfig = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL,
};

/**
 * Validates and retrieves the PostgreSQL connection string.
 * Throws an explicit error if DATABASE_URL is missing or empty when required.
 */
export function getDatabaseUrl(): string {
  const url = env.databaseUrl;
  if (!url || !url.trim()) {
    throw new Error(
      '[Startup Error] Missing required environment variable: DATABASE_URL. ' +
        'Please ensure DATABASE_URL is configured in your backend/.env file ' +
        '(e.g., postgresql://postgres:password@localhost:5432/service_requests_db).'
    );
  }
  return url.trim();
}
