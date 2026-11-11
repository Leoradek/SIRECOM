const HttpError = require('../utils/HttpError');

/**
 * RBAC: restringe la ruta a los roles indicados. Debe ir después de authMiddleware.
 * Uso: router.put('/config', auth, authorize('admin'), handler)
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new HttpError(401, 'No autenticado'));
  if (!roles.includes(req.user.rol)) {
    return next(new HttpError(403, `Acceso denegado: se requiere rol ${roles.join(' o ')}`));
  }
  return next();
};

module.exports = { authorize };
