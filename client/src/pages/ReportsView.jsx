import { useCallback, useEffect, useState } from 'react';
import api, { downloadFile, getErrorMessage } from '../api/client.js';
import { Alert, EmptyState, Spinner } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { addDays, formatCorta, todayISO } from '../utils/format.js';

export default function ReportsView() {
  const toast = useToast();
  const hoy = todayISO();
  const [rango, setRango] = useState({ desde: addDays(hoy, -6), hasta: hoy });
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [descargando, setDescargando] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    setData(null);
    try {
      const res = await api.get('/reports/export', { params: { ...rango, formato: 'json' } });
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [rango]);

  useEffect(() => { if (rango.desde && rango.hasta && rango.desde <= rango.hasta) cargar(); }, [cargar, rango]);

  const descargar = async (formato) => {
    setDescargando(formato);
    try {
      await downloadFile('/reports/export', { ...rango, formato }, `reporte-sirecom.${formato}`);
      toast.success(`Reporte ${formato.toUpperCase()} descargado`);
    } catch (err) {
      // Con responseType "blob" el error llega como Blob: se intenta leer el mensaje JSON
      let msg = getErrorMessage(err);
      if (err.response?.data instanceof Blob) {
        try { msg = JSON.parse(await err.response.data.text()).message || msg; } catch { /* se mantiene msg */ }
      }
      toast.error(msg);
    } finally {
      setDescargando('');
    }
  };

  const rangoInvalido = rango.desde > rango.hasta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Reportes</h1>
        <p className="text-sm text-muted">Reservas y asistencia por día y turno, exportables a Excel, PDF o CSV.</p>
      </div>

      <div className="card flex flex-wrap items-end gap-4 p-5">
        <div>
          <label htmlFor="desde" className="label">Desde</label>
          <input id="desde" type="date" className="input" value={rango.desde} max={rango.hasta} onChange={(e) => setRango((r) => ({ ...r, desde: e.target.value }))} />
        </div>
        <div>
          <label htmlFor="hasta" className="label">Hasta</label>
          <input id="hasta" type="date" className="input" value={rango.hasta} min={rango.desde} onChange={(e) => setRango((r) => ({ ...r, hasta: e.target.value }))} />
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <button type="button" className="btn-accent" disabled={rangoInvalido || Boolean(descargando)} onClick={() => descargar('xlsx')}>{descargando === 'xlsx' ? 'Generando...' : 'Descargar Excel'}</button>
          <button type="button" className="btn-primary" disabled={rangoInvalido || Boolean(descargando)} onClick={() => descargar('pdf')}>{descargando === 'pdf' ? 'Generando...' : 'Descargar PDF'}</button>
          <button type="button" className="btn-secondary" disabled={rangoInvalido || Boolean(descargando)} onClick={() => descargar('csv')}>{descargando === 'csv' ? 'Generando...' : 'CSV'}</button>
        </div>
      </div>

      {rangoInvalido && <Alert>La fecha inicial no puede ser posterior a la fecha final.</Alert>}
      {error && <Alert onRetry={cargar}>{error}</Alert>}
      {!data && !error && !rangoInvalido && <Spinner label="Generando vista previa..." />}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Reservas totales', data.totales.reservas],
              ['Asistieron', data.totales.asistieron],
              ['Ausentes', data.totales.ausentes],
              ['Tasa de asistencia', data.totales.tasaAsistencia === null ? 's/d' : `${data.totales.tasaAsistencia}%`],
            ].map(([t, v]) => (
              <div key={t} className="card p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{t}</p>
                <p className="mt-1 text-2xl font-extrabold">{v}</p>
              </div>
            ))}
          </div>

          {data.resumen.length === 0 ? (
            <EmptyState title="Sin datos en el periodo">Prueba con otro rango de fechas.</EmptyState>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <caption className="sr-only">Resumen de reservas y asistencia</caption>
                <thead className="bg-primary text-white">
                  <tr>
                    {['Fecha', 'Turno', 'Activas', 'Asistieron', 'Ausentes', 'Canceladas', 'Total', 'Asistencia'].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {data.resumen.map((r) => (
                    <tr key={`${r.fecha}-${r.turno}`}>
                      <td className="px-4 py-2.5">{formatCorta(r.fecha)}</td>
                      <td className="px-4 py-2.5 font-medium">{r.turnoNombre}</td>
                      <td className="px-4 py-2.5">{r.activas}</td>
                      <td className="px-4 py-2.5">{r.asistieron}</td>
                      <td className="px-4 py-2.5">{r.ausentes}</td>
                      <td className="px-4 py-2.5">{r.canceladas}</td>
                      <td className="px-4 py-2.5 font-semibold">{r.totalReservas}</td>
                      <td className="px-4 py-2.5">{r.tasaAsistencia === null ? '-' : `${r.tasaAsistencia}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
