import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import KpiCard from '../components/KpiCard.jsx';
import { Alert, Spinner } from '../components/ui.jsx';
import { diaCorto, formatFecha, todayISO } from '../utils/format.js';

const OPCIONES = [
  { value: 'almuerzo', label: 'Almuerzo' },
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'cena', label: 'Cena' },
  { value: 'todos', label: 'Todos los turnos' },
];

function WeeklyChart({ semanal, hoy }) {
  const max = Math.max(1, ...semanal.map((d) => d.reservas));
  return (
    <div className="flex h-56 items-end gap-3 pt-6" role="img" aria-label={`Reservas semanales: ${semanal.map((d) => `${d.dia} ${d.reservas}`).join(', ')}`}>
      {semanal.map((d) => (
        <div key={d.fecha} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span className="rounded bg-primary px-1.5 py-0.5 text-[11px] font-bold text-white">{d.reservas}</span>
          <div
            className={`w-full max-w-[56px] rounded-t-md transition-all duration-500 ${d.fecha === hoy ? 'bg-accent' : 'bg-accent/70'}`}
            style={{ height: `${Math.max(4, (d.reservas / max) * 100)}%` }}
          />
          <span className={`text-xs ${d.fecha === hoy ? 'font-bold text-primary' : 'text-muted'}`}>{diaCorto(d.fecha)}</span>
        </div>
      ))}
    </div>
  );
}

export default function KitchenDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [turno, setTurno] = useState('almuerzo');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const hoy = todayISO();

  const cargar = useCallback(async () => {
    setError('');
    try {
      const res = await api.get('/dashboard/metrics', { params: { turno, fecha: hoy } });
      setData(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [turno, hoy]);

  useEffect(() => {
    cargar();
    const id = setInterval(cargar, 30000);
    return () => clearInterval(id);
  }, [cargar]);

  const k = data?.kpis;
  const etiquetaTurno = OPCIONES.find((o) => o.value === turno).label.toLowerCase();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold md:text-3xl">¡Hola, {user.rol === 'admin' ? 'Administrador' : 'Cocina Central'}!</h1>
          <p className="text-sm text-muted">Panel de control del servicio de comedores universitarios. {formatFecha(hoy)}.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="turno" className="label">Turno</label>
            <select id="turno" className="input" value={turno} onChange={(e) => { setData(null); setTurno(e.target.value); }}>
              {OPCIONES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button type="button" className="btn-accent" onClick={() => navigate(`/cocina/menu?fecha=${hoy}&turno=${turno === 'todos' ? 'almuerzo' : turno}`)}>
            Editar Menú de Hoy
          </button>
        </div>
      </div>

      {error && <Alert onRetry={cargar}>{error}</Alert>}
      {!data && !error && <Spinner label="Calculando métricas..." />}

      {data && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              titulo="Comensales proyectados"
              valor={k.comensalesProyectados.valor}
              variacion={k.comensalesProyectados.variacionPorcentual ?? undefined}
              pie={`Para el ${etiquetaTurno} de hoy`}
            />
            <KpiCard
              titulo="Cupos reservados"
              valor={k.cuposReservados.valor}
              badgeNeutro={`${Math.round(k.cuposReservados.ocupacionPorcentual)}% ocupado`}
              pie={`De ${k.cuposReservados.capacidad} plazas disponibles`}
            />
            <KpiCard
              titulo="Tasa de asistencia"
              valor={k.tasaAsistencia.valor === null ? 's/d' : `${k.tasaAsistencia.valor}%`}
              variacion={k.tasaAsistencia.variacionPuntos ?? undefined}
              sufijoVariacion=" pp"
              pie={`${k.tasaAsistencia.referencia} (${k.tasaAsistencia.muestra} reservas evaluadas)`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-5">
            <section className="card p-5 lg:col-span-3" aria-labelledby="chart-title">
              <h2 id="chart-title" className="font-bold">Reservas Semanales ({OPCIONES.find((o) => o.value === turno).label})</h2>
              <WeeklyChart semanal={data.semanal} hoy={hoy} />
            </section>

            <section className="card p-5 lg:col-span-2" aria-labelledby="crono-title">
              <div className="flex items-center justify-between">
                <h2 id="crono-title" className="font-bold">Cronograma de Menús</h2>
                <Link to="/cocina/menu" className="text-xs font-semibold text-primary underline-offset-2 hover:underline">Ver Plan Semanal</Link>
              </div>
              <ul className="mt-4 space-y-2">
                {data.cronograma.map((c) => (
                  <li key={c.fecha}>
                    <Link to={`/cocina/menu?fecha=${c.fecha}&turno=${turno === 'todos' ? 'almuerzo' : turno}`} className="flex items-center gap-3 rounded-lg bg-background px-3 py-2.5 text-sm hover:bg-primary/5">
                      <span className="w-20 shrink-0 font-bold">{c.dia}</span>
                      <span className={`min-w-0 flex-1 truncate ${c.tituloPlato ? 'text-primary' : 'text-muted italic'}`}>{c.tituloPlato || 'Sin menú publicado'}</span>
                      <span aria-hidden="true" className="text-muted">›</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section aria-labelledby="ocup-title">
            <h2 id="ocup-title" className="mb-3 font-bold">Ocupación de hoy por turno</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {data.turnos.map((t) => (
                <div key={t.turno} className="card flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-semibold">{t.nombre}</p>
                    <p className="text-xs text-muted">{t.horario}</p>
                  </div>
                  <p className={`text-lg font-extrabold ${t.estado !== 'normal' ? 'text-error' : ''}`}>{t.cuposDisponibles}<span className="text-sm font-medium text-muted"> / {t.cuposTotales}</span></p>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
