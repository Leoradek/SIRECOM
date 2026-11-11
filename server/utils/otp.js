const crypto = require('crypto');
const config = require('../config');

/** Código numérico de 6 dígitos generado con CSPRNG */
const generateOtp = () => String(crypto.randomInt(100000, 1000000));

/** El OTP nunca se guarda en claro: se almacena su HMAC-SHA256 */
const hashOtp = (code) => crypto.createHmac('sha256', config.jwtSecret).update(String(code)).digest('hex');

const verifyOtp = (code, storedHash) => {
  const a = Buffer.from(hashOtp(code), 'hex');
  const b = Buffer.from(String(storedHash || ''), 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

module.exports = { generateOtp, hashOtp, verifyOtp };
