const Menu = require('../models/Menu');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { assertFecha, assertTurno, assertObjectId } = require('../utils/validators');
const { todayStr, weekDays, isWeekday } = require('../utils/dates');
const { TURNOS } = require('../utils/constants');

const EDITABLE = ['tituloPlato', 'descripcion', 'calorias', 'horario', 'imagenUrl'];

// RF-005 y RF-004 (lectura): consulta por fecha, semana y/o turno
exports.list = asyncHandler(async (req, res) => {
  const { fecha, semana, turno } = req.query;
  const filter = {};
  if (turno) filter.turno = assertTurno(turno);

  if (fecha) {
    filter.fecha = assertFecha(fecha);
  } else {
    const base = semana ? assertFecha(semana, 'semana') : todayStr();
    const dias = weekDays(base);
    filter.fecha = { $gte: dias[0], $lte: dias[4] };
  }

  const menus = await Menu.find(filter).lean();
  menus.sort((a, b) => a.fecha.localeCompare(b.fecha) || TURNOS.indexOf(a.turno) - TURNOS.indexOf(b.turno));
  res.json({ total: menus.length, data: menus });
});

// RF-004: crear el menú de un día/turno
exports.create = asyncHandler(async (req, res) => {
  const { fecha, turno } = req.body;
  assertFecha(fecha);
  assertTurno(turno);
  if (!isWeekday(fecha)) throw new HttpError(400, 'Los menús solo se registran de lunes a viernes');
  if (fecha < todayStr()) throw new HttpError(409, 'No se pueden registrar menús para fechas pasadas');

  const body = { fecha, turno, actualizadoPor: req.user._id };
  EDITABLE.forEach((k) => { if (req.body[k] !== undefined) body[k] = req.body[k]; });

  try {
    const menu = await Menu.create(body);
    res.status(201).json({ message: 'Menú creado', data: menu });
  } catch (err) {
    if (err.code === 11000) throw new HttpError(409, 'Ya existe un menú para esa fecha y turno. Usa PUT /api/menus/:id para editarlo');
    throw err;
  }
});

// RF-004: editar un menú existente
exports.update = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const menu = await Menu.findById(req.params.id);
  if (!menu) throw new HttpError(404, 'Menú no encontrado');
  if (menu.fecha < todayStr()) throw new HttpError(409, 'No se pueden modificar menús de fechas pasadas');

  let tocado = false;
  EDITABLE.forEach((k) => {
    if (req.body[k] !== undefined) { menu[k] = req.body[k]; tocado = true; }
  });
  if (!tocado) throw new HttpError(400, `Envía al menos uno de los campos: ${EDITABLE.join(', ')}`);

  menu.actualizadoPor = req.user._id;
  await menu.save();
  res.json({ message: 'Menú actualizado', data: menu });
});
