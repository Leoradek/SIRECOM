import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/client.js';
import { Alert, Badge, EmptyState, Spinner } from '../components/ui.jsx';
import { ESTADOS, formatFecha } from '../utils/format.js';

export default function ReservationHistory() {
  const [estado, setEstado] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    setData(null);
    try {
      const params = { page, limit: 10 };
      if (estado) params.estado = estado;
      const res = await api.get('/reservations/my-history', { params });
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [estado, page]);

  useEffect(() => { cargar(); }, [cargar]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Historial de Reservas</h1>
          <p className="text-sm text-muted">Todas tus reservas y su estado de asistencia.</p>
        </div>
        <div>
          <label htmlFor="filtro-estado" className="label">Estado</label>
          <select id="filtro-estado" className="input" value={estado} onChange={(e) => { setPage(1); setEstado(e.target.value); }}>
            <option value="">Todos</option>
            {Object.entries(ESTADOS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {error && <Alert onRetry={cargar}>{error}</Alert>}
      {!data && !error && <Spinner />}
      {data && data.data.length === 0 && <EmptyState title="Sin reservas para mostrar">Cuando reserves un cupo aparecerá aquí.</EmptyState>}

      {data && data.data.length > 0 && (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <caption className="sr-only">Historial de reservas</caption>
              <thead className="bg-primary text-white">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">Fecha</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Turno</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Horario</th>
                  <th scope="col" className="px-4 py-3 font-semibold">Asistencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {data.data.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3">{formatFecha(r.fecha, { weekday: 'short', day: 'numeric', month: 'short' })}</td>
                    <td className="px-4 py-3 font-medium">{r.nombreTurno}</td>
                    <td className="px-4 py-3 text-muted">{r.horario}</td>
                    <td className="px-4 py-3"><Badge className={ESTADOS[r.estado].className}>{ESTADOS[r.estado].label}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="flex items-center justify-between text-sm" aria-label="Paginación">
            <span className="text-muted">Página {data.page} de {data.pages} ({data.total} reservas)</span>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary px-3 py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Anterior</button>
              <button type="button" className="btn-secondary px-3 py-1.5" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Siguiente</button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
