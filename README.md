# SIRECOM - Sistema de Reservas de Comedores Universitarios

> Proyecto Integrador · **Segunda Entrega: Producto Implementado y Repositorio GitHub**
> Asignatura: Tecnologías en Internet · Facultad de Ingeniería de Sistemas · Universidad Adventista de Bolivia
> Docente: Ing. Victor Hugo Sarzuri Flores

SIRECOM digitaliza la reserva de cupos en los comedores universitarios (desayuno, almuerzo y cena). El **estudiante** consulta el menú y reserva su turno con cupos en tiempo real; **Cocina Central** proyecta comensales, publica el menú semanal y monitorea la asistencia; el **administrador** configura la capacidad por turno. Es la implementación MERN del prototipo de Figma de la Primera Entrega.

**Integrantes:** Leonardo Radek Condori Yucra · Seyla Esther Coimbra Mita · Jose Diego Rivas Ayala · Esmeralda Alegre Mamani

---

## Stack tecnológico

| Capa | Tecnologías |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS 3, React Router 6, Axios |
| Backend | Node.js 18+, Express 4, Mongoose 8 (MongoDB), JWT, Bcryptjs, Helmet, CORS, express-rate-limit |
| Documentación | Swagger UI + OpenAPI 3.0 (`swagger-jsdoc`, `swagger-ui-express`) en `/api-docs` |
| Correo / reportes | Nodemailer (SMTP u OTP en consola), ExcelJS (XLSX), PDFKit (PDF) |

## Estructura del proyecto

```text
sirecom/
├── .gitignore
├── .env.example            # referencia global de variables
├── README.md
├── docs/
│   └── INFORME_TECNICO.md  # informe técnico (9 secciones)
├── server/                 # API REST
│   ├── server.js · app.js
│   ├── config/             # index (env), db, swagger (OpenAPI 3.0)
│   ├── models/             # User, Menu, ShiftConfig, Reservation
│   ├── middlewares/        # authMiddleware (JWT), roleMiddleware (RBAC), errorHandler
│   ├── controllers/        # auth, user, menu, shift, reservation, dashboard, report
│   ├── routes/
│   ├── utils/ · jobs/      # fechas, OTP, mailer, recordatorios
│   ├── seed/seed.js        # datos de demostración
│   └── .env.example
└── client/                 # SPA React
    ├── tailwind.config.js  # tokens del Sistema de Diseño de Figma
    ├── src/
    │   ├── api/ · context/AuthContext.jsx
    │   ├── components/     # layouts, ShiftCard, KpiCard, ProgressBar...
    │   └── pages/          # vistas del estudiante y del panel de cocina
    └── .env.example
```

## Manual de ejecución

### Requisitos previos
- **Node.js 18 o superior** y npm
- **MongoDB** local (puerto 27017) **o** un clúster gratuito de MongoDB Atlas

### 1. Clonar
```bash
git clone https://github.com/<USUARIO>/<REPOSITORIO>.git
cd <REPOSITORIO>
```

### 2. Backend
```bash
cd server
npm install
cp .env.example .env        # en Windows (PowerShell): copy .env.example .env
```
Edita `server/.env`: define `MONGODB_URI` y un `JWT_SECRET` propio (32+ caracteres). Genera uno con:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Carga los datos de demostración y arranca:
```bash
npm run seed          # (opcional: npm run seed:reset para vaciar y volver a sembrar)
npm run dev           # http://localhost:5000  ·  Swagger: http://localhost:5000/api-docs
```

### 3. Frontend (otra terminal)
```bash
cd client
npm install
cp .env.example .env
npm run dev           # http://localhost:5173
```

### Credenciales de demostración (tras `npm run seed`)
Contraseña de todas las cuentas: `Sirecom#2026`

| Rol | Correo |
|---|---|
| Estudiante | `carlos.mendoza@uab.edu.bo` |
| Cocina Central | `cocina@uab.edu.bo` |
| Administrador | `admin@uab.edu.bo` |

### El código OTP
El login es en dos pasos (contraseña + OTP). **Si no configuras SMTP, el OTP se imprime en la consola del servidor** con el prefijo `[MAIL:DEV]`. Cópialo de ahí. Con SMTP configurado llega por correo.

## Pruebas rápidas de los flujos críticos
1. **CU-02 Login con OTP:** ingresa con `carlos.mendoza@uab.edu.bo` → copia el código de la consola del servidor → entra al portal del estudiante.
2. **CU-01 Reservar cupo:** en *Inicio*, pulsa **Reservar Cupo** en un turno → el contador baja en 1; repite el intento y verás el aviso de duplicado.
3. **CU-03 Editar menú:** entra como `cocina@uab.edu.bo` → *Editar Menú de Hoy* → guarda → recarga el portal del estudiante.
4. **Swagger:** abre `/api-docs`, usa el login de dos pasos, pulsa **Authorize** y pega el JWT.

## Scripts

| Carpeta | Comando | Descripción |
|---|---|---|
| server | `npm run dev` | API con recarga (nodemon) |
| server | `npm start` | API en modo producción |
| server | `npm run seed` / `seed:reset` | Sembrar datos de demostración |
| client | `npm run dev` | SPA en modo desarrollo |
| client | `npm run build` | Build de producción en `client/dist` |

## Seguridad
- Contraseñas con **Bcryptjs** (salt ≥ 10); OTP guardado como HMAC-SHA256 con vigencia e intentos limitados.
- **JWT** firmado con `JWT_SECRET` y expiración configurable; **RBAC** en middleware (`estudiante`, `cocina_central`, `admin`).
- Helmet, CORS restringido, límite de tasa en autenticación. **Ninguna credencial real se versiona** (`.env` en `.gitignore`).

## Licencia
Proyecto académico - Universidad Adventista de Bolivia.
