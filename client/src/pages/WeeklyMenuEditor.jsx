import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { getErrorMessage } from '../api/client.js';
import { Alert, Badge, Spinner } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';
import { TURNOS, TURNO_INFO, addDays, diaCorto, formatFecha, todayISO, weekDays } from '../utils/format.js';

const VACIO = { tituloPlato: '', descripcion: '', calorias: '', horario: '', imagenUrl: '' };

export default function WeeklyMenuEditor() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const hoy = todayISO();
  const fechaParam = params.get('fecha');
  const turnoParam = params.get('turno');

  const [semanaBase, setSemanaBase] = useState(fechaParam || hoy);
  const [turno, setTurno] = useState(TURNOS.includes(turnoParam) ? turnoParam : 'almuerzo');
  const [menus, setMenus] = useState(null);
  const [error, setError] = useState('');
  const [editando, setEditando] = useState(fechaParam || null); // fecha en edición
  const [form, setForm] = useState(VACIO);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  const dias = useMemo(() => weekDays(semanaBase), [semanaBase]);

  const cargar = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/menus', { params: { semana: semanaBase, turno } });
      setMenus(data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, [semanaBase, turno]);

  useEffect(() => { setMenus(null); cargar(); }, [cargar]);

  const menuDe = (fecha) => menus?.find((m) => m.fecha === fecha);

  // Al abrir una fecha, el formulario se rellena con el menú existente (o vacío)
  useEffect(() => {
    if (!editando || !menus) return;
    const m = menus.find((x) => x.fecha === editando);
    setForm(m
      ? { tituloPlato: m.tituloPlato, descripcion: m.descripcion, calorias: String(m.calorias), horario: m.horario || TURNO_INFO[turno].horario, imagenUrl: m.imagenUrl || '' }
      : { ...VACIO, horario: TURNO_INFO[turno].horario });
    setFormError('');
  }, [editando, menus, turno]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const esPasado = (fecha) => fecha < hoy;

  const cambiarSemana = (delta) => {
    setSemanaBase((s) => addDays(s, delta * 7));
    setEditando(null);
    setParams({});
  };

  const guardar = async (e) => {
    e.preventDefault();
    setFormError('');
    // Validación de campos obligatorios en el cliente (CU-03, flujo alternativo 4a)
    if (!form.tituloPlato.trim() || !form.descripcion.trim() || form.calorias === '') {
      setFormError('Completa el título del plato, la descripción y el valor calórico.');
      return;
    }
    const payload = {
      tituloPlato: form.tituloPlato.trim(),
      descripcion: form.descripcion.trim(),
      calorias: Number(form.calorias),
      horario: form.horario.trim() || undefined,
      imagenUrl: form.imagenUrl.trim(),
    };
    setBusy(true);
    try {
      const existente = menuDe(editando);
      if (existente) await api.put(`/menus/${existente._id}`, payload);
      else await api.post('/menus', { ...payload, fecha: editando, turno });
      toast.success('Menú guardado. Los estudiantes ya ven la versión actualizada.');
      setEditando(null);
      setParams({});
      await cargar();
    } catch (err) {
      setFormError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Menú Semanal</h1>
        <p className="text-sm text-muted">Edita los platos de lunes a viernes por turno.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="Turno" className="inline-flex rounded-lg bg-surface p-1 shadow-card">
          {TURNOS.map((t) => (
            <button key={t} role="tab" aria-selected={turno === t} type="button" onClick={() => { setTurno(t); setEditando(null); setParams({}); }}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition-colors ${turno === t ? 'bg-primary text-white' : 'text-muted hover:text-primary'}`}>
              {TURNO_INFO[t].corto}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className="btn-secondary px-3" onClick={() => cambiarSemana(-1)} aria-label="Semana anterior">‹</button>
          <span className="min-w-[200px] text-center text-sm font-semibold">{formatFecha(dias[0], { day: 'numeric', month: 'short' })} - {formatFecha(dias[4], { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          <button type="button" className="btn-secondary px-3" onClick={() => cambiarSemana(1)} aria-label="Semana siguiente">›</button>
        </div>
      </div>

      {error && <Alert onRetry={cargar}>{error}</Alert>}
      {!menus && !error && <Spinner />}

      {menus && (
        <div className="grid gap-6 lg:grid-cols-5">
          <ul className="space-y-2 lg:col-span-2">
            {dias.map((fecha) => {
              const m = menuDe(fecha);
              const activo = editando === fecha;
              return (
                <li key={fecha}>
                  <button type="button" onClick={() => { setEditando(fecha); setParams({ fecha, turno }); }}
                    className={`card w-full p-4 text-left transition-shadow hover:shadow-md ${activo ? 'ring-2 ring-accent' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold">{diaCorto(fecha)} {formatFecha(fecha, { day: 'numeric', month: 'short' })}</span>
                      {fecha === hoy && <Badge className="bg-accent/25 text-primary">Hoy</Badge>}
                      {esPasado(fecha) && <Badge className="bg-primary/10 text-muted">Pasado</Badge>}
                    </div>
                    <p className={`mt-1 text-sm ${m ? 'text-primary' : 'italic text-muted'}`}>{m ? m.tituloPlato : 'Sin menú publicado'}</p>
                    {m && <p className="text-xs text-muted">{m.calorias} kcal</p>}
                  </button>
                </li>
              );
            })}
          </ul>

          <section className="lg:col-span-3" aria-live="polite">
            {!editando ? (
              <div className="card flex h-full min-h-[240px] items-center justify-center p-8 text-center text-sm text-muted">
                Selecciona un día para ver o editar su menú.
              </div>
            ) : (
              <form onSubmit={guardar} className="card space-y-4 p-6" noValidate>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-bold">{menuDe(editando) ? 'Editar' : 'Crear'} {TURNO_INFO[turno].nombre}</h2>
                  <span className="text-sm text-muted">{formatFecha(editando)}</span>
                </div>
                {esPasado(editando) && <Alert type="info">Los menús de fechas pasadas no se pueden modificar.</Alert>}
                {formError && <Alert>{formError}</Alert>}
                <fieldset disabled={esPasado(editando) || busy} className="space-y-4">
                  <div>
                    <label htmlFor="tituloPlato" className="label">Título del plato *</label>
                    <input id="tituloPlato" className="input" maxLength={150} value={form.tituloPlato} onChange={set('tituloPlato')} placeholder="Ej. Guiso de Lentejas con Arroz y Filete de Pollo" />
                  </div>
                  <div>
                    <label htmlFor="descripcion" className="label">Descripción (sopa, acompañamientos, postre, refresco) *</label>
                    <textarea id="descripcion" rows={4} maxLength={600} className="input" value={form.descripcion} onChange={set('descripcion')} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="calorias" className="label">Valor calórico (kcal) *</label>
                      <input id="calorias" type="number" min="0" max="3000" className="input" value={form.calorias} onChange={set('calorias')} />
                    </div>
                    <div>
                      <label htmlFor="horario" className="label">Horario</label>
                      <input id="horario" className="input" value={form.horario} onChange={set('horario')} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="imagenUrl" className="label">URL de la imagen (opcional)</label>
                    <input id="imagenUrl" type="url" className="input" placeholder="https://..." value={form.imagenUrl} onChange={set('imagenUrl')} />
                  </div>
                </fieldset>
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn-secondary" onClick={() => { setEditando(null); setParams({}); }}>Cerrar</button>
                  <button type="submit" className="btn-accent" disabled={busy || esPasado(editando)}>{busy ? 'Guardando...' : 'Guardar menú'}</button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
