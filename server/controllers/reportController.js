const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const Reservation = require('../models/Reservation');
const HttpError = require('../utils/HttpError');
const asyncHandler = require('../utils/asyncHandler');
const { assertFecha } = require('../utils/validators');
const { todayStr, addDays, diffDays } = require('../utils/dates');
const { TURNOS, TURNO_INFO } = require('../utils/constants');

const buildSummary = async (desde, hasta) => {
  const rows = await Reservation.aggregate([
    { $match: { fecha: { $gte: desde, $lte: hasta } } },
    { $group: { _id: { fecha: '$fecha', turno: '$turno', estado: '$estado' }, total: { $sum: 1 } } },
  ]);
  const map = new Map();
  rows.forEach(({ _id, total }) => {
    const key = `${_id.fecha}|${_id.turno}`;
    if (!map.has(key)) {
      map.set(key, { fecha: _id.fecha, turno: _id.turno, activas: 0, asistieron: 0, ausentes: 0, canceladas: 0 });
    }
    const row = map.get(key);
    if (_id.estado === 'activa') row.activas = total;
    if (_id.estado === 'asistio') row.asistieron = total;
    if (_id.estado === 'ausente') row.ausentes = total;
    if (_id.estado === 'cancelada') row.canceladas = total;
  });
  return [...map.values()]
    .map((r) => {
      const resueltas = r.asistieron + r.ausentes;
      return {
        ...r,
        turnoNombre: TURNO_INFO[r.turno].nombre,
        totalReservas: r.activas + r.asistieron + r.ausentes + r.canceladas,
        tasaAsistencia: resueltas > 0 ? Math.round((r.asistieron / resueltas) * 1000) / 10 : null,
      };
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || TURNOS.indexOf(a.turno) - TURNOS.indexOf(b.turno));
};

const buildDetail = async (desde, hasta) => {
  const rows = await Reservation.find({ fecha: { $gte: desde, $lte: hasta } })
    .populate('usuario', 'nombre correo carrera')
    .sort({ fecha: 1, turno: 1 })
    .limit(5000)
    .lean();
  return rows.map((r) => ({
    fecha: r.fecha,
    turno: TURNO_INFO[r.turno].nombre,
    nombre: r.usuario ? r.usuario.nombre : '(usuario eliminado)',
    correo: r.usuario ? r.usuario.correo : '',
    carrera: r.usuario ? r.usuario.carrera : '',
    estado: r.estado,
  }));
};

const csvCell = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

// RF-011: reporte de asistencia y reservas (json | csv | xlsx | pdf)
exports.exportReport = asyncHandler(async (req, res) => {
  const hoy = todayStr();
  const hasta = req.query.hasta ? assertFecha(req.query.hasta, 'hasta') : hoy;
  const desde = req.query.desde ? assertFecha(req.query.desde, 'desde') : addDays(hasta, -6);
  const formato = String(req.query.formato || 'json').toLowerCase();

  if (desde > hasta) throw new HttpError(400, '"desde" no puede ser posterior a "hasta"');
  if (diffDays(desde, hasta) > 366) throw new HttpError(400, 'El rango máximo del reporte es de 366 días');
  if (!['json', 'csv', 'xlsx', 'pdf'].includes(formato)) throw new HttpError(400, 'formato debe ser json, csv, xlsx o pdf');

  const resumen = await buildSummary(desde, hasta);
  const totales = resumen.reduce(
    (a, r) => ({
      reservas: a.reservas + r.totalReservas,
      asistieron: a.asistieron + r.asistieron,
      ausentes: a.ausentes + r.ausentes,
      canceladas: a.canceladas + r.canceladas,
    }),
    { reservas: 0, asistieron: 0, ausentes: 0, canceladas: 0 }
  );
  const resueltas = totales.asistieron + totales.ausentes;
  totales.tasaAsistencia = resueltas > 0 ? Math.round((totales.asistieron / resueltas) * 1000) / 10 : null;

  if (formato === 'json') return res.json({ desde, hasta, totales, resumen });

  const nombreArchivo = `reporte-sirecom_${desde}_${hasta}`;
  const cabecera = ['Fecha', 'Turno', 'Activas', 'Asistieron', 'Ausentes', 'Canceladas', 'Total', 'Asistencia %'];
  const filas = resumen.map((r) => [r.fecha, r.turnoNombre, r.activas, r.asistieron, r.ausentes, r.canceladas, r.totalReservas, r.tasaAsistencia ?? '']);

  if (formato === 'csv') {
    const lineas = [cabecera, ...filas].map((f) => f.map(csvCell).join(';'));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}.csv"`);
    return res.send(`\uFEFF${lineas.join('\n')}`);
  }

  if (formato === 'xlsx') {
    const detalle = await buildDetail(desde, hasta);
    const wb = new ExcelJS.Workbook();
    wb.creator = 'SIRECOM';
    wb.created = new Date();

    const ws = wb.addWorksheet('Resumen');
    ws.addRow([`SIRECOM - Reporte de asistencia y reservas (${desde} a ${hasta})`]).font = { bold: true, size: 13 };
    ws.addRow([]);
    const head = ws.addRow(cabecera);
    head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    head.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A4A' } }; });
    filas.forEach((f) => ws.addRow(f));
    ws.addRow([]);
    ws.addRow(['TOTAL', '', '', totales.asistieron, totales.ausentes, totales.canceladas, totales.reservas, totales.tasaAsistencia ?? '']).font = { bold: true };
    ws.columns = [{ width: 14 }, { width: 26 }, { width: 10 }, { width: 12 }, { width: 11 }, { width: 12 }, { width: 9 }, { width: 14 }];

    const wd = wb.addWorksheet('Detalle');
    const hd = wd.addRow(['Fecha', 'Turno', 'Estudiante', 'Correo', 'Carrera', 'Estado']);
    hd.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hd.eachCell((c) => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B2A4A' } }; });
    detalle.forEach((d) => wd.addRow([d.fecha, d.turno, d.nombre, d.correo, d.carrera, d.estado]));
    wd.columns = [{ width: 12 }, { width: 24 }, { width: 28 }, { width: 32 }, { width: 26 }, { width: 12 }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}.xlsx"`);
    await wb.xlsx.write(res);
    return res.end();
  }

  // PDF
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}.pdf"`);
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  doc.pipe(res);

  doc.fillColor('#1B2A4A').fontSize(18).text('SIRECOM', { continued: true }).fontSize(11).fillColor('#5B6472').text('  Reporte de asistencia y reservas');
  doc.moveDown(0.3).fontSize(10).fillColor('#5B6472').text(`Periodo: ${desde} a ${hasta}   |   Generado: ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`);
  doc.moveDown(0.8).fillColor('#1B2A4A').fontSize(12).text(
    `Reservas: ${totales.reservas}   Asistieron: ${totales.asistieron}   Ausentes: ${totales.ausentes}   Canceladas: ${totales.canceladas}   Asistencia: ${totales.tasaAsistencia ?? 's/d'}%`
  );
  doc.moveDown(0.8);

  const cols = [70, 120, 50, 60, 55, 60, 45, 55];
  const drawRow = (cells, bold) => {
    if (doc.y > 770) doc.addPage();
    const y = doc.y;
    let x = 40;
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(bold ? '#1B2A4A' : '#222222');
    cells.forEach((c, i) => {
      doc.text(String(c), x, y, { width: cols[i] - 4, lineBreak: false });
      x += cols[i];
    });
    doc.y = y + 16;
    doc.x = 40;
  };
  drawRow(cabecera, true);
  filas.forEach((f) => drawRow(f, false));
  if (filas.length === 0) doc.moveDown().font('Helvetica').fontSize(10).text('Sin reservas registradas en el periodo seleccionado.');
  doc.end();
});
