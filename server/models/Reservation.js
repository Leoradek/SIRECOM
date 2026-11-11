const mongoose = require('mongoose');
const { TURNOS, ESTADOS_RESERVA, FECHA_REGEX } = require('../utils/constants');
const { isValidDateStr } = require('../utils/dates');

const reservationSchema = new mongoose.Schema(
  {
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: [true, 'El usuario es obligatorio'] },
    fecha: {
      type: String,
      required: [true, 'La fecha es obligatoria'],
      match: [FECHA_REGEX, 'La fecha debe tener el formato YYYY-MM-DD'],
      validate: { validator: isValidDateStr, message: 'Fecha no válida' },
    },
    turno: { type: String, enum: { values: TURNOS, message: 'Turno no válido' }, required: [true, 'El turno es obligatorio'] },
    estado: { type: String, enum: { values: ESTADOS_RESERVA, message: 'Estado no válido' }, default: 'activa' },
    canceladaEn: { type: Date },
    recordatorioEnviado: { type: Boolean, default: false },
    marcadaPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Impide reservas duplicadas del mismo usuario en el mismo día y turno
reservationSchema.index({ usuario: 1, fecha: 1, turno: 1 }, { unique: true });
// Dashboard, reportes y listados del personal
reservationSchema.index({ fecha: 1, turno: 1, estado: 1 });
// Historial del estudiante ordenado por fecha
reservationSchema.index({ usuario: 1, fecha: -1 });

module.exports = mongoose.model('Reservation', reservationSchema);
