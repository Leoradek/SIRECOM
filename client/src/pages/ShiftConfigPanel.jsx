import { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api/client.js';
import ProgressBar from '../components/ProgressBar.jsx';
import { Alert, Spinner } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { TURNO_INFO, formatFecha, isWeekday, todayISO } from '../utils/format.js';

export default function ShiftConfigPanel() {
  const toast = useToast();
  const hoy = todayISO();
  const [fecha, setFecha] = useState(hoy);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [valores, setValores] = useState({});
  const [semana, setSemana] = useState(false);
  const [guardando, setGuardando] = useState('');

  const cargar = useCallback(async () => {
    setError('');
    setData(null);
    try {
      const res = await api.get('/shifts', { params: { fecha } });
      setData(res.data);
      setValores(Object.fromEntries(res.data.turnos.map((t) => [t.turno, String(t.cuposTotales)])));
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [fecha]);

  useEffect(() => { cargar(); }, [cargar]);

  const guardar = async (t) => {
    const cupos = Number(valores[t.turno]);
    if (!Number.isInteger(cupos) || cupos < 0 || cupos > 5000) {
      toast.error('Ingresa un número entero de cupos entre 0 y 5000.');
      return;
    }
    setGuardando(t.turno);
    try {
      await api.put('/shifts/config', { turno: t.turno, cuposTotales: cupos, fecha, aplicarSemana: semana });
      toast.success(`Capacidad de ${TURNO_INFO[t.turno].corto} actualizada a ${cupos} cupos${semana ? ' (semana completa)' : ''}.`);
      await cargar();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGuardando('');
    }
  };

  const pasado = fecha < hoy;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Configuración de Turnos</h1>
        <p className="text-sm text-muted">Define la cantidad máxima de cupos por turno y por día.</p>
      </div>

      <div className="card flex flex-wrap items-end gap-6 p-5">
        <div>
          <label htmlFor="fecha" className="label">Fecha a configurar</label>
          <input id="fecha" type="date" className="input" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 pb-2.5 text-sm font-medium">
          <input type="checkbox" className="h-4 w-4 accent-primary" checked={semana} onChange={(e) => setSemana(e.target.checked)} />
          Aplicar de lunes a viernes de esa semana
        </label>
      </div>

      {pasado && <Alert type="info">Los días pasados no se pueden configurar. {semana ? 'Se aplicará solo a los días restantes de la semana.' : ''}</Alert>}
      {error && <Alert onRetry={cargar}>{error}</Alert>}
      {!data && !error && <Spinner />}
      {data && !data.abierto && <Alert type="info">{formatFecha(fecha)}: {data.message}</Alert>}

      {data?.abierto && isWeekday(fecha) && (
        <div className="grid gap-4 md:grid-cols-3">
          {data.turnos.map((t) => (
            <section key={t.turno} className="card space-y-4 p-5" aria-label={TURNO_INFO[t.turno].nombre}>
              <header>
                <h2 className="font-bold">{TURNO_INFO[t.turno].nombre}</h2>
                <p className="text-xs text-muted">{t.horario}</p>
              </header>
              <div>
                <div className="mb-1.5 flex justify-between text-xs text-muted">
                  <span>Reservados: <b className="text-primary">{t.cuposReservados}</b></span>
                  <span>Disponibles: <b className={t.estado !== 'normal' ? 'text-error' : 'text-primary'}>{t.cuposDisponibles}</b></span>
                </div>
                <ProgressBar disponibles={t.cuposDisponibles} total={t.cuposTotales} label={`Cupos de ${TURNO_INFO[t.turno].corto}`} />
              </div>
              <div>
                <label htmlFor={`cupos-${t.turno}`} className="label">Cupos máximos</label>
                <input id={`cupos-${t.turno}`} type="number" min={t.cuposReservados} max="5000" step="1" className="input" value={valores[t.turno] ?? ''} onChange={(e) => setValores((v) => ({ ...v, [t.turno]: e.target.value }))} />
                <p className="field-hint">No puede ser menor a los {t.cuposReservados} cupos ya reservados.</p>
              </div>
              <button type="button" className="btn-accent w-full" disabled={guardando === t.turno || (pasado && !semana)} onClick={() => guardar(t)}>
                {guardando === t.turno ? 'Guardando...' : 'Guardar capacidad'}
              </button>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
