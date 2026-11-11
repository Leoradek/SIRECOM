const mongoose = require('mongoose');
const config = require('../config');
const { ROLES } = require('../utils/constants');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: [true, 'El nombre es obligatorio'],
      trim: true,
      minlength: [3, 'El nombre debe tener al menos 3 caracteres'],
      maxlength: [100, 'El nombre no puede superar los 100 caracteres'],
    },
    correo: {
      type: String,
      required: [true, 'El correo institucional es obligatorio'],
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v) => EMAIL_RE.test(v) && config.allowedEmailDomains.includes(v.split('@')[1]),
        message: () => `El correo debe pertenecer al dominio institucional (@${config.allowedEmailDomains.join(', @')})`,
      },
    },
    passwordHash: { type: String, required: true, select: false },
    rol: { type: String, enum: { values: ROLES, message: 'Rol no válido' }, default: 'estudiante', index: true },
    carrera: { type: String, trim: true, maxlength: [120, 'La carrera no puede superar los 120 caracteres'], default: '' },
    fotoUrl: {
      type: String,
      default: '',
      maxlength: [400000, 'La imagen es demasiado grande'],
      validate: {
        validator: (v) => v === '' || /^https?:\/\//i.test(v) || /^data:image\/(png|jpe?g|webp);base64,/i.test(v),
        message: 'La fotografía debe ser una URL http(s) o una imagen PNG/JPEG/WEBP en base64',
      },
    },
    // OTP: se guarda únicamente el HMAC del código, nunca el código en claro
    otpCode: { type: String, select: false },
    otpExpires: { type: Date, select: false },
    otpAttempts: { type: Number, default: 0, select: false },
    verificado: { type: Boolean, default: false },
    ultimoLogin: { type: Date },
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
