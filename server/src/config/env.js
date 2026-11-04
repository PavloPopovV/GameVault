import 'dotenv/config';

const required = ['DATABASE_URL', 'JWT_SECRET'];
for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  port: Number(process.env.PORT) || 4000,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  isProduction: process.env.NODE_ENV === 'production',
};
