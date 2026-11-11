const ShiftConfig = require('../models/ShiftConfig');
const Reservation = require('../models/Reservation');
const Menu = require('../models/Menu');
const config = require('../config');
const asyncHandler = require('../utils/asyncHandler');
const { assertFecha } = require('../utils/validators');
const HttpError = require('../utils/HttpError');
const { todayStr, weekDays, addDays, diaSemana } = require('../utils/dates');
const { TURNOS, TURNO_INFO } = require('../utils/constants');
const { ensureShifts, presentShift } = require('../utils/shifts');

const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

/** Tasa de asistencia (%) = asistio / (asistio + ausente) en el rango [desde, hasta] */
const attendanceRate = async (desde, hasta) => {
  const rows = await Reservation.aggregate([
    { $match: { fecha: { $gte: desde, $lte: hasta }, estado: { $in: ['asistio', 'ausente'] } } },
    { $group: { _id: '$estado', total: { $sum: 1 } } },
  ]);
  const asistio = (rows.find((r) => r._id === 'asistio') || {}).total || 0;
  const ausente = (rows.find((r) => r._id === 'ausente') || {}).total || 0;
  const base = asistio + ausente;
  return { asistio, ausente, base, tasa: base > 0 ? Math.round((asistio / base) * 100) : null };
};

const reservedFor = (docs, turno) =>
  docs
    .filter((d) => turno === 'todos' || d.turno === turno)
    .reduce((acc, d) => acc + (d.cuposTotales - d.cuposDisponibles), 0);

// RF-003: métricas del dashboard (Cocina Central / Admin)
exports.metrics = asyncHandler(async (req, res) => {
  const fecha = req.query.fecha ? assertFecha(req.query.fecha) : todayStr();
  const turno = req.query.turno || 'almuerzo';
  if (turno !== 'todos' && !TURNOS.includes(turno)) throw new HttpError(400, 'turno debe ser desayuno, almuerzo, cena o todos');

  const dias = weekDays(fecha);
  const [shiftsHoy, semanaDocs, previoDocs, menus, rate14, ratePrev14] = await Promise.all([
    ensureShifts(fecha),
    ShiftConfig.find({ fecha: { $gte: dias[0], $lte: dias[4] } }).lean(),
    ShiftConfig.find({ fecha: addDays(fecha, -7) }).lean(),
    Menu.find({ fecha: { $gte: dias[0], $lte: dias[4] }, turno: turno === 'todos' ? 'almuerzo' : turno }).lean(),
    attendanceRate(addDays(fecha, -14), addDays(fecha, -1)),
    attendanceRate(addDays(fecha, -28), addDays(fecha, -15)),
  ]);

  const objetivo = shiftsHoy.filter((s) => turno === 'todos' || s.turno === turno);
  const cuposTotales = objetivo.reduce((a, s) => a + s.cuposTotales, 0);
  const cuposReservados = objetivo.reduce((a, s) => a + (s.cuposTotales - s.cuposDisponibles), 0);
  const comensalesProyectados = Math.round(cuposReservados * (1 + config.walkInFactor));

  const reservadosPrevios = reservedFor(previoDocs, turno);
  const variacionProyectados = reservadosPrevios > 0
    ? Math.round(((cuposReservados - reservadosPrevios) / reservadosPrevios) * 100)
    : null;
  const variacionAsistencia = rate14.tasa !== null && ratePrev14.tasa !== null ? rate14.tasa - ratePrev14.tasa : null;

  const semanal = dias.map((d) => ({
    fecha: d,
    dia: diaSemana(d),
    reservas: reservedFor(semanaDocs.filter((x) => x.fecha === d), turno),
  }));

  const cronograma = dias.map((d) => {
    const m = menus.find((x) => x.fecha === d);
    return { fecha: d, dia: diaSemana(d), menuId: m ? String(m._id) : null, tituloPlato: m ? m.tituloPlato : null };
  });

  res.json({
    fecha,
    turno,
    kpis: {
      comensalesProyectados: {
        valor: comensalesProyectados,
        variacionPorcentual: variacionProyectados,
        referencia: 'vs. mismo día de la semana anterior',
      },
      cuposReservados: {
        valor: cuposReservados,
        capacidad: cuposTotales,
        ocupacionPorcentual: pct(cuposReservados, cuposTotales),
      },
      tasaAsistencia: {
        valor: rate14.tasa,
        variacionPuntos: variacionAsistencia,
        muestra: rate14.base,
        referencia: 'Promedio de los últimos 14 días',
      },
    },
    semanal,
    cronograma,
    turnos: shiftsHoy.map((s) => ({ ...presentShift(s), nombre: TURNO_INFO[s.turno].nombre })),
  });
});

module.exports.attendanceRate = attendanceRate;
