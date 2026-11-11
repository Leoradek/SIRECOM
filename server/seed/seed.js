/**
 * Semillas de SIRECOM.
 *   npm run seed          -> inserta/actualiza datos de demostración (idempotente)
 *   npm run seed:reset    -> borra TODAS las colecciones y vuelve a sembrar
 */
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const config = require('../config');
const connectDB = require('../config/db');
const User = require('../models/User');
const Menu = require('../models/Menu');
const ShiftConfig = require('../models/ShiftConfig');
const Reservation = require('../models/Reservation');
const { TURNOS, TURNO_INFO } = require('../utils/constants');
const { todayStr, addDays, weekDays, isWeekday, diaSemana } = require('../utils/dates');

const PASSWORD = 'Sirecom#2026';
const dominio = config.allowedEmailDomains[0];
const email = (local) => `${local}@${dominio}`;

const USUARIOS = [
  { nombre: 'Administrador SIRECOM', correo: email('admin'), rol: 'admin', carrera: 'Administración' },
  { nombre: 'María Delgado', correo: email('cocina'), rol: 'cocina_central', carrera: 'Cocina Central' },
  { nombre: 'Carlos Mendoza', correo: email('carlos.mendoza'), rol: 'estudiante', carrera: 'Ingeniería Civil' },
  { nombre: 'Lucía Fernández', correo: email('lucia.fernandez'), rol: 'estudiante', carrera: 'Ingeniería de Sistemas' },
  { nombre: 'Andrés Quispe', correo: email('andres.quispe'), rol: 'estudiante', carrera: 'Administración de Empresas' },
  { nombre: 'Valeria Rojas', correo: email('valeria.rojas'), rol: 'estudiante', carrera: 'Enfermería' },
  { nombre: 'Diego Vargas', correo: email('diego.vargas'), rol: 'estudiante', carrera: 'Contaduría Pública' },
];

const IMG_ALMUERZO = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=1200&q=80';

// Platos por día (índice 0 = lunes ... 4 = viernes)
const PLATOS = {
  desayuno: [
    ['Api con Pastel de Queso', 'Api morado caliente con pastel de queso y pan de la casa.', 420],
    ['Pan con Huevo y Té de Manzanilla', 'Pan fresco, huevo revuelto, mantequilla y té de manzanilla.', 400],
    ['Café con Leche y Sándwich de Jamón y Queso', 'Sándwich tostado, café con leche y fruta de estación.', 450],
    ['Yogur con Granola y Frutas', 'Yogur natural, granola casera, plátano y manzana.', 380],
    ['Mate de Coca con Salteña', 'Salteña de pollo horneada con mate de coca y jugo de naranja.', 460],
  ],
  almuerzo: [
    ['Pastel de Papa Tradicional con Carne', 'Sopa de maní, ensalada fresca, postre de gelatina y refresco de linaza.', 780],
    ['Guiso de Lentejas con Arroz y Filete de Pollo', 'Acompañado de ensalada mixta de la casa, sopa de verduras del día, postre (manzana de estación) y refresco natural de maracuyá.', 850],
    ['Arroz con Pollo a la Jardinera con Crema Huancaína', 'Sopa de quinua, ensalada de tomate y cebolla, postre de flan y refresco de durazno.', 820],
    ['Tallarines con Salsa Roja y Albóndigas Caseras', 'Sopa de fideo, ensalada de lechuga, fruta de estación y refresco de mocochinchi.', 790],
    ['Pescado Frito con Ensalada Rusa y Yuca', 'Sopa de verduras, ensalada rusa, postre de arroz con leche y refresco de tumbo.', 760],
  ],
  cena: [
    ['Sopa de Quinua con Tostadas', 'Sopa espesa de quinua y verduras con tostadas y té de anís.', 520],
    ['Tortilla de Verduras con Arroz', 'Tortilla de espinaca y zanahoria, arroz blanco y ensalada fresca.', 560],
    ['Chairo Paceño', 'Chairo tradicional con chuño, carne y verduras, acompañado de pan.', 600],
    ['Fideo con Pollo y Verduras', 'Fideo salteado con pollo desmenuzado, verduras y té de manzanilla.', 580],
    ['Sándwich de Milanesa con Ensalada', 'Milanesa de pollo en pan integral, ensalada de repollo y refresco.', 610],
  ],
};

// Cupos RESERVADOS por día de la semana (lun..vie). El almuerzo replica el gráfico del prototipo de Figma.
const RESERVADOS = {
  desayuno: [150, 170, 160, 175, 120],
  almuerzo: [240, 287, 310, 295, 180],
  cena: [180, 185, 190, 170, 100],
};
// Estado de "hoy" igual al de la pantalla del estudiante (desayuno 110/300, almuerzo 42/500, cena 215/400)
const DISPONIBLES_HOY = { desayuno: 110, almuerzo: 42, cena: 215 };

const reset = process.argv.includes('--reset');

const semanas = (hoy) => {
  const lunesActual = weekDays(hoy)[0];
  return [-7, 0, 7].map((offset) => weekDays(addDays(lunesActual, offset)));
};

const run = async () => {
  await connectDB();
  const hoy = todayStr();

  if (reset) {
    await Promise.all([User.deleteMany({}), Menu.deleteMany({}), ShiftConfig.deleteMany({}), Reservation.deleteMany({})]);
    console.log('[SEED] Colecciones vaciadas');
  }
  await Promise.all([User.init(), Menu.init(), ShiftConfig.init(), Reservation.init()]);

  // ---------- Usuarios ----------
  const passwordHash = await bcrypt.hash(PASSWORD, config.bcryptRounds);
  const usuarios = {};
  for (const u of USUARIOS) {
    let doc = await User.findOne({ correo: u.correo });
    if (!doc) doc = await User.create({ ...u, passwordHash, verificado: true });
    usuarios[u.correo] = doc;
  }
  console.log(`[SEED] Usuarios listos: ${USUARIOS.length}`);

  const [semAnterior, semActual, semSiguiente] = semanas(hoy);

  // ---------- Menús (semana actual y siguiente) ----------
  const menuOps = [];
  [...semActual, ...semSiguiente].forEach((fecha) => {
    const i = weekDays(fecha).indexOf(fecha);
    TURNOS.forEach((turno) => {
      const [tituloPlato, descripcion, calorias] = PLATOS[turno][i];
      menuOps.push({
        updateOne: {
          filter: { fecha, turno },
          update: {
            $set: {
              fecha, turno, diaSemana: diaSemana(fecha), tituloPlato, descripcion, calorias,
              horario: TURNO_INFO[turno].horario,
              imagenUrl: turno === 'almuerzo' && i === 1 ? IMG_ALMUERZO : '',
            },
          },
          upsert: true,
        },
      });
    });
  });
  await Menu.bulkWrite(menuOps);
  console.log(`[SEED] Menús listos: ${menuOps.length}`);

  // ---------- Turnos / cupos (semana anterior, actual y siguiente) ----------
  const shiftOps = [];
  const push = (fecha, turno, reservados) => {
    const total = TURNO_INFO[turno].cupos;
    shiftOps.push({
      updateOne: {
        filter: { fecha, turno },
        update: {
          $set: {
            fecha, turno, horaInicio: TURNO_INFO[turno].inicio, horaFin: TURNO_INFO[turno].fin,
            cuposTotales: total, cuposDisponibles: total - reservados,
          },
        },
        upsert: true,
      },
    });
  };
  semAnterior.forEach((fecha, i) => TURNOS.forEach((t) => push(fecha, t, Math.round(RESERVADOS[t][i] / 1.12))));
  semActual.forEach((fecha, i) => TURNOS.forEach((t) => {
    const reservados = fecha === hoy ? TURNO_INFO[t].cupos - DISPONIBLES_HOY[t] : RESERVADOS[t][i];
    push(fecha, t, reservados);
  }));
  semSiguiente.forEach((fecha, i) => TURNOS.forEach((t) => push(fecha, t, Math.round(RESERVADOS[t][i] * 0.35))));
  await ShiftConfig.bulkWrite(shiftOps);
  console.log(`[SEED] Turnos listos: ${shiftOps.length}`);

  // ---------- Historial: 10 días hábiles previos x 5 estudiantes x 3 turnos = 150 reservas ----------
  // Patrón determinista: 24 de 150 quedan como "ausente" -> tasa de asistencia exacta del 84 %
  const estudiantes = USUARIOS.filter((u) => u.rol === 'estudiante').map((u) => usuarios[u.correo]);
  const pasados = [];
  for (let d = addDays(hoy, -1); pasados.length < 10; d = addDays(d, -1)) if (isWeekday(d)) pasados.push(d);

  const historial = [];
  let idx = 0;
  pasados.forEach((fecha) => {
    estudiantes.forEach((u) => {
      TURNOS.forEach((turno) => {
        const ausente = (idx * 7) % 25 < 4;
        historial.push({ usuario: u._id, fecha, turno, estado: ausente ? 'ausente' : 'asistio', recordatorioEnviado: true });
        idx += 1;
      });
    });
  });
  try {
    await Reservation.insertMany(historial, { ordered: false });
  } catch (err) {
    if (!(err.writeErrors || []).every((w) => w.err && w.err.code === 11000) && err.code !== 11000) throw err;
  }
  console.log(`[SEED] Historial de reservas listo: ${historial.length}`);

  console.log('\n[SEED] Completado. Credenciales de demostración (contraseña: ' + PASSWORD + '):');
  USUARIOS.slice(0, 3).forEach((u) => console.log(`       - ${u.rol.padEnd(15)} ${u.correo}`));
  console.log('       - (otros estudiantes: lucia.fernandez, andres.quispe, valeria.rojas, diego.vargas)\n');
  await mongoose.connection.close();
};

run().catch(async (err) => {
  console.error('[SEED] Error:', err);
  await mongoose.connection.close();
  process.exit(1);
});
