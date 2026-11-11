const User = require('../models/User');
const { verifyToken } = require('../utils/token');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');

/** Verifica el header "Authorization: Bearer <token>" y carga el usuario en req.user */
module.exports = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new HttpError(401, 'Token no proporcionado. Usa el header Authorization: Bearer <token>');
  }
  let payload;
  try {
    payload = verifyToken(token);
  } catch (err) {
    throw new HttpError(401, err.name === 'TokenExpiredError' ? 'La sesión expiró, inicia sesión nuevamente' : 'Token inválido');
  }
  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, 'El usuario del token ya no existe');
  req.user = user;
  next();
});
