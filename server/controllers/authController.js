const bcrypt = require('bcryptjs');
const User = require('../models/User');
const config = require('../config');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/token');
const { generateOtp, hashOtp, verifyOtp } = require('../utils/otp');
const { sendOtpEmail } = require('../utils/mailer');
const { publicUser } = require('../utils/serializers');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;
// Hash ficticio para igualar tiempos de respuesta cuando el correo no existe
const DUMMY_HASH = bcrypt.hashSync('sirecom-dummy-password', config.bcryptRounds);

const normalizeEmail = (v) => String(v || '').trim().toLowerCase();

const assertInstitutional = (correo) => {
  if (!EMAIL_RE.test(correo)) throw new HttpError(400, 'Correo electrónico inválido');
  const dominio = correo.split('@')[1];
  if (!config.allowedEmailDomains.includes(dominio)) {
    throw new HttpError(400, `Solo se permiten correos institucionales (@${config.allowedEmailDomains.join(', @')})`);
  }
};

/** Genera un OTP, guarda su HMAC con vigencia y lo envía por correo */
const issueOtp = async (user) => {
  const code = generateOtp();
  await User.updateOne(
    { _id: user._id },
    { $set: { otpCode: hashOtp(code), otpExpires: new Date(Date.now() + config.otp.ttlMinutes * 60000), otpAttempts: 0 } }
  );
  await sendOtpEmail(user, code);
};

const otpResponse = (correo, message) => ({
  otpRequired: true,
  correo,
  expiresInMinutes: config.otp.ttlMinutes,
  message,
});

// RF-001: registro con correo institucional + validación OTP
exports.register = asyncHandler(async (req, res) => {
  const correo = normalizeEmail(req.body.correo);
  const nombre = String(req.body.nombre || '').trim();
  const carrera = String(req.body.carrera || '').trim();
  const password = String(req.body.password || '');

  if (nombre.length < 3) throw new HttpError(400, 'El nombre debe tener al menos 3 caracteres');
  assertInstitutional(correo);
  if (!PASSWORD_RE.test(password)) {
    throw new HttpError(400, 'La contraseña debe tener entre 8 y 72 caracteres, con al menos una letra y un número');
  }

  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  let user = await User.findOne({ correo });

  if (user && user.verificado) throw new HttpError(409, 'Ya existe una cuenta con ese correo');

  if (user) {
    // Registro previo sin verificar: se actualizan datos y se reenvía el OTP
    user.nombre = nombre;
    user.carrera = carrera;
    user.passwordHash = passwordHash;
    await user.save();
  } else {
    // El rol siempre es "estudiante"; cocina_central y admin se asignan solo por seed/administración
    user = await User.create({ nombre, correo, carrera, passwordHash, rol: 'estudiante' });
  }

  await issueOtp(user);
  res.status(201).json(otpResponse(correo, 'Cuenta creada. Enviamos un código OTP a tu correo institucional para verificarla.'));
});

// RF-002: login en dos pasos (credenciales -> OTP -> JWT)
exports.login = asyncHandler(async (req, res) => {
  const correo = normalizeEmail(req.body.correo);
  const password = String(req.body.password || '');
  const { otp } = req.body;
  if (!correo || !password) throw new HttpError(400, 'Correo y contraseña son obligatorios');

  const user = await User.findOne({ correo }).select('+passwordHash +otpCode +otpExpires +otpAttempts');
  const passwordOk = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !passwordOk) throw new HttpError(401, 'Credenciales inválidas');

  // Paso 1: credenciales correctas -> se genera y envía el OTP
  if (otp === undefined || otp === null || otp === '') {
    await issueOtp(user);
    return res.json(otpResponse(correo, 'Te enviamos un código OTP a tu correo institucional.'));
  }

  // Paso 2: validación del OTP
  if (!/^\d{6}$/.test(String(otp))) throw new HttpError(400, 'El código OTP debe tener 6 dígitos');
  if (!user.otpCode || !user.otpExpires || user.otpExpires < new Date()) {
    throw new HttpError(401, 'El código OTP expiró o no fue solicitado. Solicita un nuevo código.');
  }
  if ((user.otpAttempts || 0) >= config.otp.maxAttempts) {
    throw new HttpError(429, 'Demasiados intentos fallidos. Solicita un nuevo código.');
  }
  if (!verifyOtp(String(otp), user.otpCode)) {
    await User.updateOne({ _id: user._id }, { $inc: { otpAttempts: 1 } });
    throw new HttpError(401, 'Código OTP incorrecto');
  }

  await User.updateOne(
    { _id: user._id },
    { $set: { verificado: true, ultimoLogin: new Date(), otpAttempts: 0 }, $unset: { otpCode: '', otpExpires: '' } }
  );
  user.verificado = true;

  res.json({ token: signToken(user), tokenType: 'Bearer', expiresIn: config.jwtExpiresIn, user: publicUser(user) });
});

// RF-013 (lectura): sesión activa
exports.me = asyncHandler(async (req, res) => {
  res.json({ user: publicUser(req.user) });
});
