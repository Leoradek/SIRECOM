const HttpError = require('./HttpError');
const { TURNOS } = require('./constants');
const { isValidDateStr } = require('./dates');

const assertFecha = (value, name = 'fecha') => {
  if (!isValidDateStr(value)) {
    throw new HttpError(400, `El campo "${name}" debe tener el formato YYYY-MM-DD y ser una fecha válida`);
  }
  return value;
};

const assertTurno = (value) => {
  if (!TURNOS.includes(value)) {
    throw new HttpError(400, `El campo "turno" debe ser uno de: ${TURNOS.join(', ')}`);
  }
  return value;
};

const assertObjectId = (value, name = 'id') => {
  if (!/^[a-f\d]{24}$/i.test(String(value))) {
    throw new HttpError(400, `El parámetro "${name}" no es un identificador válido`);
  }
  return value;
};

module.exports = { assertFecha, assertTurno, assertObjectId };
