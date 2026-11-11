import { useState } from 'react';
import api, { getErrorMessage } from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Avatar } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';

/** Redimensiona la imagen elegida a 256 px y la convierte a JPEG en base64 (ligera para la API) */
const comprimirImagen = (file) =>
  new Promise((resolve, reject) => {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return reject(new Error('Selecciona una imagen PNG, JPG o WEBP'));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('La imagen no es válida'));
      img.onload = () => {
        const lado = Math.min(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        canvas.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 256, 256);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

export default function UserProfile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ nombre: user.nombre, carrera: user.carrera || '', fotoUrl: user.fotoUrl || '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const elegirFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setForm((f) => ({ ...f, fotoUrl: '' }));
      const dataUrl = await comprimirImagen(file);
      setForm((f) => ({ ...f, fotoUrl: dataUrl }));
    } catch (err) {
      setError(err.message);
    }
  };

  const guardar = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const { data } = await api.put('/users/profile', form);
      setUser(data.user);
      toast.success('Perfil actualizado');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold">Mi Perfil</h1>
        <p className="text-sm text-muted">Actualiza tu nombre, carrera y fotografía.</p>
      </div>
      {error && <Alert>{error}</Alert>}
      <form onSubmit={guardar} className="card space-y-5 p-6" noValidate>
        <div className="flex items-center gap-4">
          <Avatar user={{ ...user, nombre: form.nombre, fotoUrl: form.fotoUrl }} size={72} />
          <div className="space-y-2">
            <label htmlFor="foto" className="btn-secondary cursor-pointer">Cambiar fotografía</label>
            <input id="foto" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={elegirFoto} />
            {form.fotoUrl && (
              <button type="button" className="ml-2 text-sm font-medium text-error hover:underline" onClick={() => setForm((f) => ({ ...f, fotoUrl: '' }))}>Quitar</button>
            )}
          </div>
        </div>
        <div>
          <label htmlFor="correo" className="label">Correo institucional</label>
          <input id="correo" className="input bg-background" value={user.correo} readOnly aria-readonly="true" />
          <p className="field-hint">El correo no se puede modificar.</p>
        </div>
        <div>
          <label htmlFor="nombre" className="label">Nombre completo</label>
          <input id="nombre" className="input" required minLength={3} value={form.nombre} onChange={set('nombre')} />
        </div>
        <div>
          <label htmlFor="carrera" className="label">Carrera</label>
          <input id="carrera" className="input" value={form.carrera} onChange={set('carrera')} placeholder="Ej. Ingeniería de Sistemas" />
        </div>
        <button type="submit" className="btn-accent" disabled={busy || form.nombre.trim().length < 3}>
          {busy ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </div>
  );
}
