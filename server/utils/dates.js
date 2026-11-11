const config = require('../config');
const { DIAS, FECHA_REGEX } = require('./constants');

const dateFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: config.timezone, year: 'numeric', month: '2-digit', day: '2-digit',
});
const timeFmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: config.timezone, hour: '2-digit', minute: '2-digit', hour12: false,
});

/** Fecha local (YYYY-MM-DD) en la zona horaria configurada */
const todayStr = (d = new Date()) => dateFmt.format(d);

/** Minutos transcurridos desde la medianoche local */
const nowMinutes = (d = new Date()) => {
  const parts = timeFmt.formatToParts(d);
  const h = Number(parts.find((p) => p.type === 'hour').value) % 24;
  const m = Number(parts.find((p) => p.type === 'minute').value);
  return h * 60 + m;
};

const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const parseDate = (s) => new Date(`${s}T00:00:00Z`);

const isValidDateStr = (s) => {
  if (typeof s !== 'string' || !FECHA_REGEX.test(s)) return false;
  const d = parseDate(s);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
};

const addDays = (s, n) => {
  const d = parseDate(s);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

const weekdayIndex = (s) => parseDate(s).getUTCDay(); // 0 = domingo
const diaSemana = (s) => DIAS[weekdayIndex(s)];
const isWeekday = (s) => {
  const i = weekdayIndex(s);
  return i >= 1 && i <= 5;
};

/** Lunes a viernes de la semana que contiene la fecha dada */
const weekDays = (s) => {
  const monday = addDays(s, -((weekdayIndex(s) + 6) % 7));
  return [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
};

const diffDays = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);

module.exports = {
  todayStr, nowMinutes, toMinutes, parseDate, isValidDateStr, addDays,
  weekdayIndex, diaSemana, isWeekday, weekDays, diffDays,
};
