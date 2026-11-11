import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { homePathFor, useAuth } from '../context/AuthContext.jsx';
import { getErrorMessage } from '../api/client.js';
import { Alert, Logo } from '../components/ui.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [paso, setPaso] = useState('credenciales'); // 'credenciales' | 'otp'
  const [form, setForm] = useState({ correo: '', password: '', otp: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return undefined;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const pedirCodigo = async (e) => {
    e?.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login({ correo: form.correo, password: form.password });
      setPaso('otp');
      setEspera(30);
      toast.info('Te enviamos un código de 6 dígitos a tu correo institucional');
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
          <h1 className="text-xl font-bold">{paso === 'credenciales' ? 'Inicia sesión' : 'Verifica tu identidad'}</h1>
          <p className="mt-1 text-sm text-muted">
            {paso === 'credenciales'
              ? 'Usa tu correo institucional para reservar tu cupo en el comedor.'
              : `Ingresa el código de 6 dígitos enviado a ${form.correo}.`}
          </p>

          {error && <div className="mt-4"><Alert>{error}</Alert></div>}

          {paso === 'credenciales' ? (
            <form onSubmit={pedirCodigo} className="mt-5 space-y-4" noValidate>
              <div>
                <label htmlFor="correo" className="label">Correo institucional</label>
                <input id="correo" type="email" autoComplete="username" required className="input" placeholder="nombre.apellido@uab.edu.bo" value={form.correo} onChange={set('correo')} />
              </div>
              <div>
                <label htmlFor="password" className="label">Contraseña</label>
                <input id="password" type="password" autoComplete="current-password" required className="input" value={form.password} onChange={set('password')} />
              </div>
              <button type="submit" className="btn-accent w-full" disabled={busy || !form.correo || !form.password}>
                {busy ? 'Enviando código...' : 'Continuar'}
              </button>
            </form>
          ) : (
            <form onSubmit={verificar} className="mt-5 space-y-4" noValidate>
              <div>
                <label htmlFor="otp" className="label">Código OTP</label>
                <input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                  className="input text-center text-2xl font-bold tracking-[0.5em]"
                  placeholder="000000"
                  value={form.otp}
                  onChange={(e) => setForm((f) => ({ ...f, otp: e.target.value.replace(/\D/g, '') }))}
                />
                <p className="field-hint">El código vence en 5 minutos.</p>
              </div>
              <button type="submit" className="btn-accent w-full" disabled={busy || form.otp.length !== 6}>
                {busy ? 'Verificando...' : 'Verificar e ingresar'}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button type="button" className="font-medium text-primary underline-offset-2 hover:underline" onClick={() => { setPaso('credenciales'); setError(''); setForm((f) => ({ ...f, otp: '' })); }}>
                  Cambiar correo
                </button>
                <button type="button" className="font-medium text-primary underline-offset-2 hover:underline disabled:text-muted disabled:no-underline" disabled={espera > 0 || busy} onClick={pedirCodigo}>
                  {espera > 0 ? `Reenviar código (${espera}s)` : 'Reenviar código'}
                </button>
              </div>
            </form>
          )}
        </div>
        <p className="mt-5 text-center text-sm text-muted">
          ¿Aún no tienes cuenta? <Link to="/registro" className="font-semibold text-primary underline-offset-2 hover:underline">Regístrate</Link>
        </p>
      </div>
    </div>
  );
}
