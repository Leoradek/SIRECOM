import ProgressBar from './ProgressBar.jsx';
import { TURNO_INFO } from '../utils/format.js';

export default function ShiftCard({ turno, onReserve, reserving }) {
  const info = TURNO_INFO[turno.turno];
  const critico = turno.estado === 'critico';
  const agotado = turno.estado === 'agotado';
  const reservado = Boolean(turno.miReservaId);

  let boton;
  if (reservado) {
    boton = <button type="button" disabled className="btn w-full border border-success/40 bg-success/10 text-success-dark">Reserva confirmada</button>;
  } else if (agotado) {
    boton = <button type="button" disabled className="btn-accent w-full">Sin cupos disponibles</button>;
  } else {
    boton = (
      <button type="button" className="btn-accent w-full" onClick={() => onReserve(turno)} disabled={reserving} aria-label={`Reservar cupo para ${info.nombre}`}>
        {reserving ? 'Reservando...' : 'Reservar Cupo'}
      </button>
    );
  }

  return (
    <article className="card flex flex-col gap-3 p-5">
      <header>
        <h3 className="text-base font-bold">{info.nombre}</h3>
        <p className="text-xs text-muted">{turno.horario}</p>
      </header>
      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-xs">
          <span className="text-muted">Cupos disponibles</span>
          <span className={`text-sm font-bold ${critico || agotado ? 'text-error' : 'text-primary'}`}>
            {turno.cuposDisponibles} / {turno.cuposTotales}
          </span>
        </div>
        <ProgressBar disponibles={turno.cuposDisponibles} total={turno.cuposTotales} label={`Cupos de ${info.corto}`} />
        {critico && <p className="mt-1.5 text-xs font-semibold text-error">Quedan pocos cupos</p>}
        {agotado && <p className="mt-1.5 text-xs font-semibold text-error">Sin cupos disponibles. Prueba con otro turno.</p>}
      </div>
      {boton}
    </article>
  );
}
