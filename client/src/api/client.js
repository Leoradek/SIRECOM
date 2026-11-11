import axios from 'axios';

export const TOKEN_KEY = 'sirecom_token';
const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({ baseURL, timeout: 15000 });

// Envía el JWT en el header Authorization: Bearer <token>
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Sesión expirada / token inválido: se notifica al AuthContext (excepto en las rutas de login/registro)
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || '';
    const esAuth = url.includes('/auth/login') || url.includes('/auth/register');
    if (error.response?.status === 401 && !esAuth) {
      window.dispatchEvent(new CustomEvent('sirecom:unauthorized'));
    }
    return Promise.reject(error);
  }
);

/** Mensaje legible para el usuario a partir de un error de Axios */
export const getErrorMessage = (error) => {
  if (error.response) {
    const data = error.response.data;
    if (data?.details && Array.isArray(data.details) && data.details[0]?.mensaje) {
      return `${data.message}: ${data.details.map((d) => d.mensaje).join('; ')}`;
    }
    return data?.message || `Error ${error.response.status}`;
  }
  if (error.code === 'ECONNABORTED') return 'La solicitud tardó demasiado. Revisa tu conexión e inténtalo de nuevo.';
  if (error.request) return 'No se pudo conectar con el servidor. Verifica tu conexión o que la API esté en ejecución.';
  return error.message || 'Ocurrió un error inesperado';
};

/** Descarga un archivo autenticado (reportes) como Blob y dispara la descarga en el navegador */
export const downloadFile = async (url, params, fallbackName) => {
  const res = await api.get(url, { params, responseType: 'blob' });
  const disposition = res.headers['content-disposition'] || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const name = match ? match[1] : fallbackName;
  const href = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
};

export default api;
