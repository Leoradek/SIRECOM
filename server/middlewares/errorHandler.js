const config = require('../config');

const notFound = (req, res) => {
  res.status(404).json({ status: 404, message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let status = err.status || 500;
  let message = err.message || 'Error interno del servidor';
  let details = err.details;

  if (err.name === 'ValidationError' && err.errors) {
    status = 400;
    message = 'Error de validación';
    details = Object.values(err.errors).map((e) => ({ campo: e.path, mensaje: e.message }));
  } else if (err.name === 'CastError') {
    status = 400;
    message = `Valor no válido para "${err.path}"`;
  } else if (err.code === 11000) {
    status = 409;
    message = 'Registro duplicado';
    details = err.keyValue;
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'El cuerpo de la petición no es un JSON válido';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    message = 'La petición es demasiado grande';
  }

  if (status >= 500) console.error('[ERROR]', err);

  res.status(status).json({
    status,
    message: status >= 500 && config.env === 'production' ? 'Error interno del servidor' : message,
    ...(details ? { details } : {}),
  });
};

module.exports = { notFound, errorHandler };
