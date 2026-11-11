/** @type {import('tailwindcss').Config} */
// Tokens exactos del Sistema de Diseño de Figma (Primera Entrega)
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#1B2A4A', light: '#2A3D66' }, // Azul institucional: sidebar, navbar, barras normales
        accent: { DEFAULT: '#E8A93C', dark: '#D4952A' },    // Dorado/mostaza: botones principales, badges activos
        background: '#F5F6F8',                               // Fondo general
        surface: '#FFFFFF',                                  // Cards
        success: { DEFAULT: '#1E8E5A', dark: '#17724A' }, // Variaciones positivas (+12%); dark = variante de texto (WCAG AA)
        error: '#C0392B',                                    // Estado crítico (cupos < 10%)
        muted: '#5B6472',                                    // Texto secundario
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(27,42,74,0.06), 0 4px 12px rgba(27,42,74,0.05)',
      },
      spacing: { 4.5: '1.125rem' },
    },
  },
  plugins: [],
};
