import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/client.js';
import { Alert, Badge, EmptyState, Spinner } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { ESTADOS, TURNOS, TURNO_INFO, formatFecha, todayISO } from '../utils/format.js';

export default function ActiveReservations() {
  const toast = useToast();
  const hoy = todayISO();
  const [fecha, setFecha] = useState(hoy);
  const [turno, setTurno] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [marcando, setMarcando] = useState(null);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const params = { fecha };
      if (turno) params.turno = turno;
      const res = await api.get('/reservations', { params });
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [fecha, turno]);

  useEffect(() => { setData(null); cargar(); }, [cargar]);

  const marcar = async (id, estado) => {
    setMarcando(id);
    try {
      await api.patch(`/reservations/${id}/attendance`, { estado });
      toast.success(estado === 'asistio' ? 'Asistencia registrada' : 'Marcado como ausente');
      await cargar();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setMarcando(null);
    }
  };

  const conteo = (data?.data || []).reduce((a, r) => ({ ...a, [r.estado]: (a[r.estado] || 0) + 1 }), {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Reservas Activas</h1>
        <p className="text-sm text-muted">Consulta las reservas por turno y registra la asistencia de los comensales.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="fecha" className="label">Fecha</label>
          <input id="fecha" type="date" className="input" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} />
        </div>
        <div>
          <label htmlFor="turno" className="label">Turno</label>
          <select id="turno" className="input" value={turno} onChange={(e) => setTurno(e.target.value)}>
            <option value="">Todos</option>
            {TURNOS.map((t) => <option key={t} value={t}>{TURNO_INFO[t].corto}</option>)}
          </select>
        </div>
        {data && (
          <p className="pb-2.5 text-sm text-muted">
            {data.total} reservas · {conteo.activa || 0} activas · {conteo.asistio || 0} asistieron · {conteo.ausente || 0} ausentes · {conteo.cancelada || 0} canceladas
          </p>
        )}
      </div>

      {error && <Alert onRetry={cargar}>{error}</Alert>}
      {!data && !error && <Spinner />}
      {data && data.data.length === 0 && <EmptyState title="Sin reservas">No hay reservas para {formatFecha(fecha)}.</EmptyState>}

      {data && data.data.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Reservas del {fecha}</caption>
            <thead className="bg-primary text-white">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">Estudiante</th>
                <th scope="col" className="px-4 py-3 font-semibold">Carrera</th>
                <th scope="col" className="px-4 py-3 font-semibold">Turno</th>
                <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                <th scope="col" className="px-4 py-3 text-right font-semibold">Asistencia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {data.data.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3"><p className="font-medium">{r.usuario.nombre}</p><p className="text-xs text-muted">{r.usuario.correo}</p></td>
                  <td className="px-4 py-3 text-muted">{r.usuario.carrera || '-'}</td>
                  <td className="px-4 py-3">{TURNO_INFO[r.turno].corto}</td>
                  <td className="px-4 py-3"><Badge className={ESTADOS[r.estado].className}>{ESTADOS[r.estado].label}</Badge></td>
                  <td className="px-4 py-3">
                    {r.estado !== 'cancelada' && fecha <= hoy && (
                      <div className="flex justify-end gap-2">
                        <button type="button" className="btn-secondary px-3 py-1.5 text-xs" disabled={marcando === r.id || r.estado === 'asistio'} onClick={() => marcar(r.id, 'asistio')}>Asistió</button>
                        <button type="button" className="btn-danger px-3 py-1.5 text-xs" disabled={marcando === r.id || r.estado === 'ausente'} onClick={() => marcar(r.id, 'ausente')}>Ausente</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
