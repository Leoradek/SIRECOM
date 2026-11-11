const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const list = (value, fallback) =>
  (value || fallback)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

const bool = (value, fallback = false) =>
  value === undefined || value === '' ? fallback : String(value).toLowerCase() === 'true';

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sirecom',
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  // Bcrypt: se fuerza un salt factor mínimo de 10 (requisito de seguridad)
  bcryptRounds: Math.max(10, Number(process.env.BCRYPT_SALT_ROUNDS) || 10),
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  allowedEmailDomains: list(process.env.ALLOWED_EMAIL_DOMAINS, 'uab.edu.bo'),
  timezone: process.env.APP_TIMEZONE || 'America/La_Paz',
  otp: {
    ttlMinutes: Number(process.env.OTP_TTL_MINUTES) || 5,
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS) || 5,
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: bool(process.env.SMTP_SECURE),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'SIRECOM <no-reply@uab.edu.bo>',
  },
  enableReminders: bool(process.env.ENABLE_REMINDERS, true),
  walkInFactor: Number.isFinite(Number(process.env.PROJECTION_WALKIN_FACTOR))
    && process.env.PROJECTION_WALKIN_FACTOR !== undefined
    && process.env.PROJECTION_WALKIN_FACTOR !== ''
    ? Number(process.env.PROJECTION_WALKIN_FACTOR)
    : 0.19,
  maxAdvanceDays: Number(process.env.MAX_ADVANCE_DAYS) || 7,
};

if (!config.jwtSecret || config.jwtSecret.length < 16) {
  throw new Error(
    'JWT_SECRET no está definido o es demasiado corto (mínimo 16 caracteres, recomendado 32+). Revisa server/.env'
  );
}

module.exports = config;
