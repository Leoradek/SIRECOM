const Reservation = require('../models/Reservation');
const User = require('../models/User');
const { todayStr, nowMinutes, toMinutes } = require('../utils/dates');
const { TURNOS, TURNO_INFO } = require('../utils/constants');
const { notifyReservation } = require('../utils/mailer');

const MINUTES_BEFORE = 60;
const EVERY_MS = 5 * 60 * 1000;

/** RF-010: recordatorio por correo ~1 hora antes del inicio del turno */
const run = async () => {
  const ahora = nowMinutes();
  for (const turno of TURNOS) {
    const inicio = toMinutes(TURNO_INFO[turno].inicio);
    if (ahora < inicio - MINUTES_BEFORE || ahora >= inicio) continue;

    const pendientes = await Reservation.find({ fecha: todayStr(), turno, estado: 'activa', recordatorioEnviado: false })
      .select('_id')
      .lean();
    for (const p of pendientes) {
      // Marca atómica: si hay varias instancias, solo una envía el recordatorio
      const r = await Reservation.findOneAndUpdate(
        { _id: p._id, recordatorioEnviado: false, estado: 'activa' },
        { $set: { recordatorioEnviado: true } },
        { new: true }
      );
      if (!r) continue;
      const user = await User.findById(r.usuario);
      if (user) await notifyReservation('recordatorio', user, r);
    }
  }
};

const start = () => {
  const timer = setInterval(() => run().catch((e) => console.error('[REMINDERS]', e.message)), EVERY_MS);
  timer.unref();
  console.log('[JOBS] Recordatorios por correo activos (cada 5 min)');
  return timer;
};

module.exports = { start, run };
