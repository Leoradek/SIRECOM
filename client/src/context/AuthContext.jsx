import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { TOKEN_KEY } from '../api/client.js';

const AuthContext = createContext(null);

/** Ruta de inicio según el rol (redirección automática tras el login) */
export const homePathFor = (rol) => (rol === 'estudiante' ? '/' : '/cocina');

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  // Restaurar la sesión persistida (JWT en localStorage) al cargar la SPA
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return undefined;
    }
    let activo = true;
    api
      .get('/auth/me')
      .then((res) => activo && setUser(res.data.user))
      .catch(() => activo && logout())
      .finally(() => activo && setLoading(false));
    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cierre de sesión automático si la API responde 401 (token expirado o inválido)
  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener('sirecom:unauthorized', onUnauthorized);
    return () => window.removeEventListener('sirecom:unauthorized', onUnauthorized);
  }, [logout]);

  /**
   * Login en dos pasos.
   *  - login({correo, password})        -> { otpRequired: true }  (envía el OTP)
   *  - login({correo, password, otp})   -> { authenticated: true, user }
   */
  const login = useCallback(async ({ correo, password, otp }) => {
    const payload = { correo, password };
    if (otp) payload.otp = otp;
    const { data } = await api.post('/auth/login', payload);
    if (data.token) {
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return { authenticated: true, user: data.user };
    }
    return { otpRequired: true, ...data };
  }, []);

  const register = useCallback(async (datos) => {
    const { data } = await api.post('/auth/register', datos);
    return data;
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, isAuthenticated: Boolean(user), login, register, logout, setUser }),
    [user, token, loading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
};
