const ShiftConfig = require('../models/ShiftConfig');
const { TURNOS, TURNO_INFO, UMBRAL_CRITICO } = require('./constants');

/**
 * Garantiza que existan los 3 documentos de turno para una fecha, usando
 * los cupos por defecto (300 / 500 / 400). Es idempotente y seguro ante concurrencia.
 */
const ensureShifts = async (fecha) => {
  const ops = TURNOS.map((turno) => ({
    updateOne: {
      filter: { fecha, turno },
      update: {
        $setOnInsert: {
          fecha,
          turno,
          horaInicio: TURNO_INFO[turno].inicio,
          horaFin: TURNO_INFO[turno].fin,
          cuposTotales: TURNO_INFO[turno].cupos,
          cuposDisponibles: TURNO_INFO[turno].cupos,
        },
      },
      upsert: true,
    },
  }));
  try {
    await ShiftConfig.bulkWrite(ops, { ordered: false });
  } catch (err) {
    // E11000: otra petición creó el documento en paralelo; no es un error real
    const dup = err.code === 11000 || (err.writeErrors || []).every((w) => w.err && w.err.code === 11000);
    if (!dup) throw err;
  }
  const docs = await ShiftConfig.find({ fecha }).lean();
  return docs.sort((a, b) => TURNOS.indexOf(a.turno) - TURNOS.indexOf(b.turno));
};

const estadoCupos = (disponibles, totales) => {
  if (disponibles <= 0) return 'agotado';
  const pct = totales > 0 ? (disponibles / totales) * 100 : 0;
  return pct < UMBRAL_CRITICO ? 'critico' : 'normal';
};

const presentShift = (doc, reservaId = null) => ({
  id: String(doc._id),
  fecha: doc.fecha,
  turno: doc.turno,
  nombre: TURNO_INFO[doc.turno].nombre,
  horario: `${doc.horaInicio}h - ${doc.horaFin}h`,
  cuposTotales: doc.cuposTotales,
  cuposDisponibles: doc.cuposDisponibles,
  cuposReservados: doc.cuposTotales - doc.cuposDisponibles,
  porcentajeDisponible: doc.cuposTotales > 0 ? Math.round((doc.cuposDisponibles / doc.cuposTotales) * 1000) / 10 : 0,
  estado: estadoCupos(doc.cuposDisponibles, doc.cuposTotales),
  miReservaId: reservaId ? String(reservaId) : null,
});

module.exports = { ensureShifts, presentShift, estadoCupos };
