const mongoose = require('mongoose');
const { DIAS_HABILES, TURNOS, TURNO_INFO, FECHA_REGEX } = require('../utils/constants');
const { diaSemana, isValidDateStr } = require('../utils/dates');

const menuSchema = new mongoose.Schema(
  {
    diaSemana: { type: String, enum: { values: DIAS_HABILES, message: 'El menú solo aplica de lunes a viernes' }, required: true },
    fecha: {
      type: String,
      required: [true, 'La fecha es obligatoria'],
      match: [FECHA_REGEX, 'La fecha debe tener el formato YYYY-MM-DD'],
      validate: { validator: isValidDateStr, message: 'Fecha no válida' },
    },
    turno: { type: String, enum: { values: TURNOS, message: 'Turno no válido' }, required: [true, 'El turno es obligatorio'] },
    tituloPlato: { type: String, required: [true, 'El título del plato es obligatorio'], trim: true, maxlength: 150 },
    descripcion: { type: String, required: [true, 'La descripción es obligatoria'], trim: true, maxlength: 600 },
    calorias: { type: Number, required: [true, 'Las calorías son obligatorias'], min: [0, 'Las calorías no pueden ser negativas'], max: [3000, 'Valor calórico fuera de rango'] },
    horario: { type: String, trim: true, maxlength: 30 },
    imagenUrl: {
      type: String,
      default: '',
      validate: { validator: (v) => v === '' || /^https?:\/\//i.test(v), message: 'La imagen debe ser una URL http(s)' },
    },
    actualizadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Derivar día de la semana y horario por defecto antes de validar
menuSchema.pre('validate', function derive(next) {
  if (this.fecha && isValidDateStr(this.fecha)) {
    this.diaSemana = diaSemana(this.fecha);
  }
  if (!this.horario && this.turno && TURNO_INFO[this.turno]) {
    this.horario = TURNO_INFO[this.turno].horario;
  }
  next();
});

// Un solo menú por fecha y turno; también sirve para consultas por fecha/turno (< 150 ms)
menuSchema.index({ fecha: 1, turno: 1 }, { unique: true });

module.exports = mongoose.model('Menu', menuSchema);
