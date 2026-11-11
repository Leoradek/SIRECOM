export const TZ = 'America/La_Paz';

const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const timeFmt = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });

export const todayISO = () => dateFmt.format(new Date());

export const nowMinutes = () => {
  const parts = timeFmt.formatToParts(new Date());
  return (Number(parts.find((p) => p.type === 'hour').value) % 24) * 60 + Number(parts.find((p) => p.type === 'minute').value);
};

export const TURNOS = ['desayuno', 'almuerzo', 'cena'];

export const TURNO_INFO = {
  desayuno: { nombre: 'Desayuno Universitario', corto: 'Desayuno', inicio: '07:00', fin: '09:00', horario: '07:00h - 09:00h' },
  almuerzo: { nombre: 'Almuerzo del Día', corto: 'Almuerzo', inicio: '12:00', fin: '14:00', horario: '12:00h - 14:00h' },
  cena: { nombre: 'Cena Institucional', corto: 'Cena', inicio: '18:00', fin: '20:00', horario: '18:00h - 20:00h' },
};

const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export const parseISO = (iso) => new Date(`${iso}T12:00:00Z`);

export const addDays = (iso, n) => {
  const d = parseISO(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

export const weekdayIndex = (iso) => parseISO(iso).getUTCDay();

export const weekDays = (iso) => {
  const monday = addDays(iso, -((weekdayIndex(iso) + 6) % 7));
  return [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
};

export const isWeekday = (iso) => weekdayIndex(iso) >= 1 && weekdayIndex(iso) <= 5;

export const formatFecha = (iso, options = { weekday: 'long', day: 'numeric', month: 'long' }) => {
  const s = parseISO(iso).toLocaleDateString('es-BO', { ...options, timeZone: 'UTC' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

export const formatCorta = (iso) => parseISO(iso).toLocaleDateString('es-BO', { day: '2-digit', month: 'short', timeZone: 'UTC' });

export const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const diaCorto = (iso) => DIAS_CORTOS[weekdayIndex(iso)];

/** ¿Se puede cancelar? Solo antes del inicio del turno (misma regla que el backend) */
export const puedeCancelar = (reserva) => {
  const hoy = todayISO();
  if (reserva.estado !== 'activa') return false;
  if (reserva.fecha > hoy) return true;
  if (reserva.fecha < hoy) return false;
  return nowMinutes() < toMin(TURNO_INFO[reserva.turno].inicio);
};

export const ESTADOS = {
  activa: { label: 'Activa', className: 'bg-accent/20 text-primary' },
  asistio: { label: 'Asistió', className: 'bg-success/10 text-success-dark' },
  ausente: { label: 'Ausente', className: 'bg-error/10 text-error' },
  cancelada: { label: 'Cancelada', className: 'bg-primary/10 text-muted' },
};

export const iniciales = (nombre = '') =>
  nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
