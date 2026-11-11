import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { homePathFor, useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../api/client.js';
import { Alert, Logo } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [paso, setPaso] = useState('datos'); // 'datos' | 'otp'
  const [form, setForm] = useState({ nombre: '', correo: '', carrera: '', password: '', otp: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return undefined;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const passwordOk = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(form.password);

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    if (!passwordOk) { setError('La contraseña debe tener al menos 8 caracteres, con una letra y un número.'); return; }
    setBusy(true);
    try {
      await register({ nombre: form.nombre, correo: form.correo, carrera: form.carrera, password: form.password });
      setPaso('otp');
      setEspera(30);
      toast.success('Cuenta creada. Revisa tu correo institucional para obtener el código.');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const reenviar = async () => {
    setError('');
    setBusy(true);
    try {
      await login({ correo: form.correo, password: form.password });
      setEspera(30);
      toast.info('Enviamos un nuevo código');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const verificar = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await login({ correo: form.correo, password: form.password, otp: form.otp });
      navigate(homePathFor(res.user.rol), { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold">{paso === 'datos' ? 'Crea tu cuenta' : 'Verifica tu correo'}</h1>
          <p className="mt-1 text-sm text-muted">
            {paso === 'datos' ? 'Solo se aceptan correos institucionales de la universidad.' : `Ingresa el código de 6 dígitos enviado a ${form.correo}.`}
          </p>
          {error && <div className="mt-4"><Alert>{error}</Alert></div>}

          {paso === 'datos' ? (
            <form onSubmit={enviar} className="mt-5 space-y-4" noValidate>
              <div>
                <label htmlFor="nombre" className="label">Nombre completo</label>
                <input id="nombre" required minLength={3} autoComplete="name" className="input" value={form.nombre} onChange={set('nombre')} />
              </div>
              <div>
                <label htmlFor="correo" className="label">Correo institucional</label>
                <input id="correo" type="email" required autoComplete="email" className="input" placeholder="nombre.apellido@uab.edu.bo" value={form.correo} onChange={set('correo')} />
              </div>
              <div>
                <label htmlFor="carrera" className="label">Carrera</label>
                <input id="carrera" className="input" placeholder="Ej. Ingeniería de Sistemas" value={form.carrera} onChange={set('carrera')} />
              </div>
              <div>
                <label htmlFor="password" className="label">Contraseña</label>
                <input id="password" type="password" required autoComplete="new-password" className="input" value={form.password} onChange={set('password')} aria-describedby="pwd-hint" />
                <p id="pwd-hint" className={`field-hint ${form.password && !passwordOk ? 'font-semibold text-error' : ''}`}>Mínimo 8 caracteres, con al menos una letra y un número.</p>
              </div>
              <button type="submit" className="btn-accent w-full" disabled={busy || !form.nombre || !form.correo || !form.password}>
                {busy ? 'Creando cuenta...' : 'Crear cuenta'}
              </button>
            </form>
          ) : (
            <form onSubmit={verificar} className="mt-5 space-y-4" noValidate>
              <div>
                <label htmlFor="otp" className="label">Código OTP</label>
                <input id="otp" inputMode="numeric" autoComplete="one-time-code" maxLength={6} className="input text-center text-2xl font-bold tracking-[0.5em]" placeholder="000000" value={form.otp} onChange={(e) => setForm((f) => ({ ...f, otp: e.target.value.replace(/\D/g, '') }))} />
              </div>
              <button type="submit" className="btn-accent w-full" disabled={busy || form.otp.length !== 6}>
                {busy ? 'Verificando...' : 'Verificar e ingresar'}
              </button>
              <button type="button" className="w-full text-sm font-medium text-primary hover:underline disabled:text-muted disabled:no-underline" disabled={espera > 0 || busy} onClick={reenviar}>
                {espera > 0 ? `Reenviar código (${espera}s)` : 'Reenviar código'}
              </button>
            </form>
          )}
        </div>
        <p className="mt-5 text-center text-sm text-muted">
          ¿Ya tienes cuenta? <Link to="/login" className="font-semibold text-primary underline-offset-2 hover:underline">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
