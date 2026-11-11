const mongoose = require('mongoose');
const { TURNOS, FECHA_REGEX } = require('../utils/constants');
const { isValidDateStr } = require('../utils/dates');

const shiftConfigSchema = new mongoose.Schema(
  {
    fecha: {
      type: String,
      required: true,
      match: [FECHA_REGEX, 'La fecha debe tener el formato YYYY-MM-DD'],
      validate: { validator: isValidDateStr, message: 'Fecha no válida' },
    },
    turno: { type: String, enum: { values: TURNOS, message: 'Turno no válido' }, required: true },
    horaInicio: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    horaFin: { type: String, required: true, match: /^\d{2}:\d{2}$/ },
    cuposTotales: {
      type: Number,
      required: true,
      min: [0, 'Los cupos totales no pueden ser negativos'],
      max: [5000, 'Los cupos totales no pueden superar 5000'],
      validate: { validator: Number.isInteger, message: 'Los cupos totales deben ser un entero' },
    },
    cuposDisponibles: {
      type: Number,
      required: true,
      min: [0, 'Los cupos disponibles no pueden ser negativos'],
      validate: {
        validator(v) {
          return Number.isInteger(v) && (this.cuposTotales === undefined || v <= this.cuposTotales);
        },
        message: 'Los cupos disponibles deben ser un entero menor o igual a los cupos totales',
      },
    },
  },
  { timestamps: true }
);

// Un documento de configuración por día y turno. Cubre GET /shifts, reservas y dashboard.
shiftConfigSchema.index({ fecha: 1, turno: 1 }, { unique: true });

module.exports = mongoose.model('ShiftConfig', shiftConfigSchema);
