import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/client.js';
import { Alert, Badge, ConfirmDialog, EmptyState, Spinner } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { ESTADOS, formatFecha, puedeCancelar } from '../utils/format.js';

export default function MyReservations() {
  const toast = useToast();
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');
  const [aCancelar, setACancelar] = useState(null);
  const [busy, setBusy] = useState(false);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/reservations/my-history', { params: { estado: 'activa', orden: 'asc', limit: 50 } });
      setItems(data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const cancelar = async () => {
    setBusy(true);
    try {
      await api.patch(`/reservations/${aCancelar.id}/cancel`);
      toast.success('Reserva cancelada. El cupo fue liberado.');
      setACancelar(null);
      await cargar();
    } catch (err) {
      toast.error(getErrorMessage(err));
      setACancelar(null);
      await cargar();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Mis Reservas</h1>
        <p className="text-sm text-muted">Reservas activas. Puedes cancelar hasta antes del inicio del turno.</p>
      </div>

      {error && <Alert onRetry={cargar}>{error}</Alert>}
      {!items && !error && <Spinner />}
      {items && items.length === 0 && (
        <EmptyState title="No tienes reservas activas">Reserva un cupo desde la pantalla de Inicio.</EmptyState>
      )}

      <ul className="grid gap-4 md:grid-cols-2">
        {items?.map((r) => (
          <li key={r.id} className="card flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-bold">{r.nombreTurno}</h2>
                <p className="text-sm text-muted">{formatFecha(r.fecha)}</p>
                <p className="text-sm text-muted">{r.horario}</p>
              </div>
              <Badge className={ESTADOS[r.estado].className}>{ESTADOS[r.estado].label}</Badge>
            </div>
            <button type="button" className="btn-danger" disabled={!puedeCancelar(r)} onClick={() => setACancelar(r)} aria-label={`Cancelar reserva de ${r.nombreTurno} del ${r.fecha}`}>
              {puedeCancelar(r) ? 'Cancelar reserva' : 'El turno ya inició'}
            </button>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={Boolean(aCancelar)}
        danger
        busy={busy}
        title="¿Cancelar esta reserva?"
        message={aCancelar ? `${aCancelar.nombreTurno} - ${formatFecha(aCancelar.fecha)}. El cupo volverá a estar disponible para otros estudiantes.` : ''}
        confirmLabel="Sí, cancelar"
        onConfirm={cancelar}
        onCancel={() => setACancelar(null)}
      />
    </div>
  );
}
