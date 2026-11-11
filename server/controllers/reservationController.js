const Reservation = require('../models/Reservation');
const ShiftConfig = require('../models/ShiftConfig');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config');
const { assertFecha, assertTurno, assertObjectId } = require('../utils/validators');
const { todayStr, nowMinutes, toMinutes, isWeekday, addDays } = require('../utils/dates');
const { ensureShifts, presentShift } = require('../utils/shifts');
const { notifyReservation } = require('../utils/mailer');
const { TURNO_INFO, ESTADOS_RESERVA } = require('../utils/constants');

const present = (r) => ({
  id: String(r._id),
  usuario: r.usuario && r.usuario._id
    ? { id: String(r.usuario._id), nombre: r.usuario.nombre, correo: r.usuario.correo, carrera: r.usuario.carrera }
    : String(r.usuario),
  fecha: r.fecha,
  turno: r.turno,
  nombreTurno: TURNO_INFO[r.turno].nombre,
  horario: TURNO_INFO[r.turno].horario,
  estado: r.estado,
  canceladaEn: r.canceladaEn || null,
  creadaEn: r.createdAt,
});

/** Devuelve el cupo al contador del turno sin superar el total configurado */
const releaseSlot = (fecha, turno) =>
  ShiftConfig.updateOne({ fecha, turno }, [
    { $set: { cuposDisponibles: { $min: [{ $add: ['$cuposDisponibles', 1] }, '$cuposTotales'] } } },
  ]);

// RF-006, RF-007, RF-010: reservar un cupo
exports.create = asyncHandler(async (req, res) => {
  const turno = assertTurno(req.body.turno);
  const hoy = todayStr();
  const fecha = req.body.fecha ? assertFecha(req.body.fecha) : hoy;

  if (!isWeekday(fecha)) throw new HttpError(400, 'El comedor atiende de lunes a viernes');
  if (fecha < hoy) throw new HttpError(409, 'No se puede reservar en una fecha pasada');
  if (fecha > addDays(hoy, config.maxAdvanceDays)) {
    throw new HttpError(400, `Solo se puede reservar con hasta ${config.maxAdvanceDays} días de anticipación`);
  }
  if (fecha === hoy && nowMinutes() >= toMinutes(TURNO_INFO[turno].fin)) {
    throw new HttpError(409, 'El turno seleccionado ya finalizó');
  }

  // Aviso temprano de duplicado (la garantía real es el índice único compuesto)
  const existente = await Reservation.findOne({ usuario: req.user._id, fecha, turno, estado: { $in: ['activa', 'asistio'] } })
    .select('_id')
    .lean();
  if (existente) throw new HttpError(409, 'Ya tienes una reserva activa para ese turno y fecha');

  await ensureShifts(fecha);

  // Descuento ATÓMICO del cupo: solo procede si cuposDisponibles > 0 (sin condiciones de carrera)
  const shift = await ShiftConfig.findOneAndUpdate(
    { fecha, turno, cuposDisponibles: { $gt: 0 } },
    { $inc: { cuposDisponibles: -1 } },
    { new: true }
  ).lean();
  if (!shift) throw new HttpError(409, 'Sin cupos disponibles para este turno. Prueba con otro turno.');

  let reserva;
  try {
    // Si el estudiante canceló antes, se reactiva su registro (el índice único impide duplicar la clave)
    reserva = await Reservation.findOneAndUpdate(
      { usuario: req.user._id, fecha, turno, estado: 'cancelada' },
      { $set: { estado: 'activa', recordatorioEnviado: false }, $unset: { canceladaEn: '' } },
      { new: true }
    );
    if (!reserva) reserva = await Reservation.create({ usuario: req.user._id, fecha, turno });
  } catch (err) {
    await releaseSlot(fecha, turno); // compensación: se devuelve el cupo descontado
    if (err.code === 11000) throw new HttpError(409, 'Ya tienes una reserva para ese turno y fecha');
    throw err;
  }

  notifyReservation('confirmacion', req.user, reserva); // no bloqueante
  res.status(201).json({
    message: 'Reserva confirmada',
    data: present(reserva),
    turno: presentShift(shift, reserva._id),
  });
});

// RF-009: historial (y reservas activas con ?estado=activa)
exports.myHistory = asyncHandler(async (req, res) => {
  const { estado, desde, hasta, orden } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));

  const filter = { usuario: req.user._id };
  if (estado) {
    if (!ESTADOS_RESERVA.includes(estado)) throw new HttpError(400, `estado debe ser uno de: ${ESTADOS_RESERVA.join(', ')}`);
    filter.estado = estado;
  }
  if (desde || hasta) {
    filter.fecha = {};
    if (desde) filter.fecha.$gte = assertFecha(desde, 'desde');
    if (hasta) filter.fecha.$lte = assertFecha(hasta, 'hasta');
  }
  const dir = orden === 'asc' ? 1 : -1;

  const [total, rows] = await Promise.all([
    Reservation.countDocuments(filter),
    Reservation.find(filter).sort({ fecha: dir, turno: dir }).skip((page - 1) * limit).limit(limit).lean(),
  ]);
  res.json({ page, limit, total, pages: Math.max(1, Math.ceil(total / limit)), data: rows.map(present) });
});

// RF-008: cancelar una reserva activa antes del inicio del turno
exports.cancel = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const reserva = await Reservation.findById(req.params.id);
  if (!reserva) throw new HttpError(404, 'Reserva no encontrada');

  const esDueno = String(reserva.usuario) === String(req.user._id);
  if (!esDueno && req.user.rol !== 'admin') throw new HttpError(403, 'No puedes cancelar la reserva de otro usuario');
  if (reserva.estado !== 'activa') throw new HttpError(409, `La reserva ya está en estado "${reserva.estado}" y no puede cancelarse`);

  const hoy = todayStr();
  if (reserva.fecha < hoy || (reserva.fecha === hoy && nowMinutes() >= toMinutes(TURNO_INFO[reserva.turno].inicio))) {
    throw new HttpError(409, 'Solo se puede cancelar antes del inicio del turno');
  }

  // Cambio de estado condicionado: evita cancelar dos veces y devolver el cupo dos veces
  const cancelada = await Reservation.findOneAndUpdate(
    { _id: reserva._id, estado: 'activa' },
    { $set: { estado: 'cancelada', canceladaEn: new Date() } },
    { new: true }
  );
  if (!cancelada) throw new HttpError(409, 'La reserva ya fue cancelada');

  await releaseSlot(reserva.fecha, reserva.turno);
  const usuario = esDueno ? req.user : await require('../models/User').findById(reserva.usuario);
  if (usuario) notifyReservation('cancelacion', usuario, cancelada);

  res.json({ message: 'Reserva cancelada y cupo liberado', data: present(cancelada) });
});

// Gestión de reservas por el personal (CU "Gestionar reservas activas")
exports.listAll = asyncHandler(async (req, res) => {
  const { turno, estado } = req.query;
  const fecha = req.query.fecha ? assertFecha(req.query.fecha) : todayStr();
  const filter = { fecha };
  if (turno) filter.turno = assertTurno(turno);
  if (estado) {
    if (!ESTADOS_RESERVA.includes(estado)) throw new HttpError(400, `estado debe ser uno de: ${ESTADOS_RESERVA.join(', ')}`);
    filter.estado = estado;
  }
  const rows = await Reservation.find(filter)
    .populate('usuario', 'nombre correo carrera')
    .sort({ turno: 1, createdAt: 1 })
    .limit(1000)
    .lean();
  res.json({ fecha, total: rows.length, data: rows.map(present) });
});

// Registro de asistencia (insumo de la tasa de asistencia, RF-003)
exports.markAttendance = asyncHandler(async (req, res) => {
  assertObjectId(req.params.id);
  const { estado } = req.body;
  if (!['asistio', 'ausente'].includes(estado)) throw new HttpError(400, 'estado debe ser "asistio" o "ausente"');

  const reserva = await Reservation.findById(req.params.id);
  if (!reserva) throw new HttpError(404, 'Reserva no encontrada');
  if (reserva.estado === 'cancelada') throw new HttpError(409, 'No se puede marcar asistencia de una reserva cancelada');
  if (reserva.fecha > todayStr()) throw new HttpError(409, 'No se puede marcar asistencia de una fecha futura');

  reserva.estado = estado;
  reserva.marcadaPor = req.user._id;
  await reserva.save();
  await reserva.populate('usuario', 'nombre correo carrera');
  res.json({ message: 'Asistencia registrada', data: present(reserva) });
});
