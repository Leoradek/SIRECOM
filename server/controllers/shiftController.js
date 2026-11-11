const ShiftConfig = require('../models/ShiftConfig');
const Reservation = require('../models/Reservation');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { assertFecha, assertTurno } = require('../utils/validators');
const { todayStr, isWeekday, weekDays } = require('../utils/dates');
const { ensureShifts, presentShift } = require('../utils/shifts');

// RF-007: cupos en tiempo real por turno (incluye la reserva activa del usuario, si existe)
exports.list = asyncHandler(async (req, res) => {
  const fecha = req.query.fecha ? assertFecha(req.query.fecha) : todayStr();
  if (!isWeekday(fecha)) {
    return res.json({ fecha, abierto: false, message: 'El comedor atiende de lunes a viernes', turnos: [] });
  }
  const shifts = await ensureShifts(fecha);
  const reservas = await Reservation.find({ usuario: req.user._id, fecha, estado: { $in: ['activa', 'asistio'] } })
    .select('turno')
    .lean();
  const porTurno = Object.fromEntries(reservas.map((r) => [r.turno, r._id]));

  res.json({ fecha, abierto: true, turnos: shifts.map((s) => presentShift(s, porTurno[s.turno])) });
});

// RF-012: configurar capacidad máxima por turno y por día (solo admin)
exports.updateConfig = asyncHandler(async (req, res) => {
  const turno = assertTurno(req.body.turno);
  const cupos = Number(req.body.cuposTotales);
  if (!Number.isInteger(cupos) || cupos < 0 || cupos > 5000) {
    throw new HttpError(400, 'cuposTotales debe ser un entero entre 0 y 5000');
  }
  const hoy = todayStr();
  const base = req.body.fecha ? assertFecha(req.body.fecha) : hoy;
  const fechas = (req.body.aplicarSemana ? weekDays(base) : [base]).filter(isWeekday);

  if (fechas.length === 0) throw new HttpError(400, 'La configuración solo aplica a días de lunes a viernes');
  if (fechas.some((f) => f < hoy)) {
    // En modo semana se ignoran los días ya pasados; en modo día único se rechaza
    if (!req.body.aplicarSemana) throw new HttpError(409, 'No se puede configurar un día pasado');
  }
  const objetivo = fechas.filter((f) => f >= hoy);
  if (objetivo.length === 0) throw new HttpError(409, 'La semana indicada ya terminó');

  // Se validan primero todas las fechas: el nuevo total no puede ser menor a lo ya reservado
  const conflictos = [];
  for (const f of objetivo) {
    const shifts = await ensureShifts(f);
    const s = shifts.find((x) => x.turno === turno);
    const reservados = s.cuposTotales - s.cuposDisponibles;
    if (cupos < reservados) conflictos.push({ fecha: f, reservados });
  }
  if (conflictos.length) {
    throw new HttpError(409, 'El nuevo cupo máximo es menor a las reservas ya registradas', conflictos);
  }

  // Actualización atómica: recalcula disponibles = nuevoTotal - reservados, sin perder reservas concurrentes
  for (const f of objetivo) {
    await ShiftConfig.updateOne(
      {
        fecha: f,
        turno,
        $expr: { $lte: [{ $subtract: ['$cuposTotales', '$cuposDisponibles'] }, cupos] },
      },
      [
        {
          $set: {
            cuposDisponibles: { $subtract: [cupos, { $subtract: ['$cuposTotales', '$cuposDisponibles'] }] },
            cuposTotales: cupos,
          },
        },
      ]
    );
  }

  const docs = await ShiftConfig.find({ fecha: { $in: objetivo }, turno }).sort({ fecha: 1 }).lean();
  res.json({ message: 'Configuración de turno actualizada', data: docs.map((d) => presentShift(d)) });
});
