import { Badge } from './ui.jsx';

/** Tarjeta de métrica: título, valor destacado, etiqueta de variación (positiva/negativa) y pie */
export default function KpiCard({ titulo, valor, pie, variacion, sufijoVariacion = '%', badgeNeutro }) {
  let badge = null;
  if (typeof variacion === 'number') {
    const positivo = variacion >= 0;
    badge = (
      <Badge className={positivo ? 'bg-success/10 text-success-dark' : 'bg-error/10 text-error'}>
        {positivo ? '+' : ''}{variacion}{sufijoVariacion}
      </Badge>
    );
  } else if (badgeNeutro) {
    badge = <Badge className="bg-primary/10 text-primary">{badgeNeutro}</Badge>;
  }
  return (
    <section className="card p-5" aria-label={titulo}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{titulo}</h3>
      <div className="mt-2 flex items-center justify-between gap-2">
        <p className="text-3xl font-extrabold text-primary">{valor}</p>
        {badge}
      </div>
      <p className="mt-2 text-xs text-muted">{pie}</p>
    </section>
  );
}
