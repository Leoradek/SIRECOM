const swaggerJsdoc = require('swagger-jsdoc');

/* ---------- Helpers para mantener la especificación legible ---------- */
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema, example) => ({ content: { 'application/json': { schema, ...(example ? { example } : {}) } } });
const errorRes = (description) => ({ description, ...json(ref('Error')) });
const R = {
  400: errorRes('Solicitud inválida (validación)'),
  401: errorRes('No autenticado o token inválido/expirado'),
  403: errorRes('Rol sin permisos para este recurso'),
  404: errorRes('Recurso no encontrado'),
  409: errorRes('Conflicto de negocio (cupos agotados, duplicado, fuera de horario)'),
  429: errorRes('Demasiadas solicitudes / intentos'),
};
const secured = [{ bearerAuth: [] }];
const q = (name, description, schema = { type: 'string' }, required = false) => ({ name, in: 'query', required, description, schema });
const idParam = { name: 'id', in: 'path', required: true, description: 'ObjectId de MongoDB', schema: { type: 'string', example: '66f1a2b3c4d5e6f708192a3b' } };
const body = (schema, example) => ({ required: true, ...json(schema, example) });

const definition = {
  openapi: '3.0.3',
  info: {
    title: 'SIRECOM API',
    version: '1.0.0',
    description:
      'API REST de **SIRECOM - Sistema de Reservas de Comedores Universitarios** (Universidad Adventista de Bolivia).\n\n' +
      '**Autenticación:** login en dos pasos (credenciales + OTP por correo) que devuelve un JWT. ' +
      'Pulsa **Authorize** y pega el token (sin el prefijo `Bearer`).\n\n' +
      '**Roles (RBAC):** `estudiante`, `cocina_central`, `admin`.',
    contact: { name: 'Equipo SIRECOM - Tecnologías en Internet' },
  },
  servers: [{ url: '/', description: 'Servidor actual' }],
  tags: [
    { name: 'Auth', description: 'Registro, login con OTP y sesión' },
    { name: 'Usuarios', description: 'Perfil del usuario' },
    { name: 'Menús', description: 'Menú diario y semanal' },
    { name: 'Turnos', description: 'Cupos en tiempo real y configuración' },
    { name: 'Reservas', description: 'Reserva, cancelación, historial y asistencia' },
    { name: 'Dashboard', description: 'Métricas para Cocina Central' },
    { name: 'Reportes', description: 'Exportación de reportes' },
    { name: 'Sistema', description: 'Salud del servicio' },
  ],
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          status: { type: 'integer', example: 400 },
          message: { type: 'string', example: 'Error de validación' },
          details: { type: 'array', items: { type: 'object' } },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '66f1a2b3c4d5e6f708192a3b' },
          nombre: { type: 'string', example: 'Carlos Mendoza' },
          correo: { type: 'string', format: 'email', example: 'carlos.mendoza@uab.edu.bo' },
          rol: { type: 'string', enum: ['estudiante', 'cocina_central', 'admin'] },
          carrera: { type: 'string', example: 'Ingeniería Civil' },
          fotoUrl: { type: 'string', example: '' },
          verificado: { type: 'boolean' },
        },
      },
      OtpRequired: {
        type: 'object',
        properties: {
          otpRequired: { type: 'boolean', example: true },
          correo: { type: 'string' },
          expiresInMinutes: { type: 'integer', example: 5 },
          message: { type: 'string' },
        },
      },
      LoginSuccess: {
        type: 'object',
        properties: {
          token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
          tokenType: { type: 'string', example: 'Bearer' },
          expiresIn: { type: 'string', example: '1d' },
          user: ref('User'),
        },
      },
      Menu: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          diaSemana: { type: 'string', enum: ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] },
          fecha: { type: 'string', example: '2026-11-10' },
          turno: { type: 'string', enum: ['desayuno', 'almuerzo', 'cena'] },
          tituloPlato: { type: 'string', example: 'Guiso de Lentejas con Arroz y Filete de Pollo' },
          descripcion: { type: 'string', example: 'Acompañado de ensalada mixta, sopa de verduras, postre y refresco natural.' },
          calorias: { type: 'number', example: 850 },
          horario: { type: 'string', example: '12:00h - 14:00h' },
          imagenUrl: { type: 'string' },
        },
      },
      MenuInput: {
        type: 'object',
        required: ['fecha', 'turno', 'tituloPlato', 'descripcion', 'calorias'],
        properties: {
          fecha: { type: 'string', example: '2026-11-10' },
          turno: { type: 'string', enum: ['desayuno', 'almuerzo', 'cena'] },
          tituloPlato: { type: 'string' },
          descripcion: { type: 'string' },
          calorias: { type: 'number', example: 850 },
          horario: { type: 'string', example: '12:00h - 14:00h' },
          imagenUrl: { type: 'string' },
        },
      },
      Shift: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          fecha: { type: 'string' },
          turno: { type: 'string', enum: ['desayuno', 'almuerzo', 'cena'] },
          nombre: { type: 'string', example: 'Almuerzo del Día' },
          horario: { type: 'string', example: '12:00h - 14:00h' },
          cuposTotales: { type: 'integer', example: 500 },
          cuposDisponibles: { type: 'integer', example: 42 },
          cuposReservados: { type: 'integer', example: 458 },
          porcentajeDisponible: { type: 'number', example: 8.4 },
          estado: { type: 'string', enum: ['normal', 'critico', 'agotado'] },
          miReservaId: { type: 'string', nullable: true },
        },
      },
      Reservation: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          usuario: { oneOf: [{ type: 'string' }, { type: 'object' }] },
          fecha: { type: 'string', example: '2026-11-10' },
          turno: { type: 'string', enum: ['desayuno', 'almuerzo', 'cena'] },
          nombreTurno: { type: 'string' },
          horario: { type: 'string' },
          estado: { type: 'string', enum: ['activa', 'cancelada', 'asistio', 'ausente'] },
          canceladaEn: { type: 'string', format: 'date-time', nullable: true },
          creadaEn: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  paths: {
    '/api/health': {
      get: { tags: ['Sistema'], summary: 'Estado del servicio', responses: { 200: { description: 'Servicio operativo', ...json({ type: 'object', properties: { status: { type: 'string', example: 'ok' }, uptime: { type: 'number' } } }) } } },
    },
    '/api/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Registrar estudiante con correo institucional (RF-001)',
        description: 'Crea la cuenta y envía un OTP al correo. Para activarla, completa el paso 2 de `POST /api/auth/login` con ese código. El rol siempre es `estudiante`.',
        requestBody: body(
          { type: 'object', required: ['nombre', 'correo', 'password'], properties: { nombre: { type: 'string' }, correo: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password', minLength: 8 }, carrera: { type: 'string' } } },
          { nombre: 'Carlos Mendoza', correo: 'carlos.mendoza@uab.edu.bo', password: 'Sirecom#2026', carrera: 'Ingeniería Civil' }
        ),
        responses: { 201: { description: 'Cuenta creada; OTP enviado', ...json(ref('OtpRequired')) }, 400: R[400], 409: R[409], 429: R[429] },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Iniciar sesión con OTP (RF-002)',
        description: '**Paso 1:** envía `correo` + `password` → responde `otpRequired` y envía el código.\n**Paso 2:** reenvía `correo` + `password` + `otp` → devuelve el JWT.',
        requestBody: body(
          { type: 'object', required: ['correo', 'password'], properties: { correo: { type: 'string', format: 'email' }, password: { type: 'string', format: 'password' }, otp: { type: 'string', pattern: '^\\d{6}$', description: 'Código de 6 dígitos (solo en el paso 2)' } } },
          { correo: 'carlos.mendoza@uab.edu.bo', password: 'Sirecom#2026', otp: '123456' }
        ),
        responses: {
          200: { description: 'Paso 1: OTP enviado. Paso 2: sesión iniciada', ...json({ oneOf: [ref('OtpRequired'), ref('LoginSuccess')] }) },
          400: R[400], 401: R[401], 429: R[429],
        },
      },
    },
    '/api/auth/me': {
      get: { tags: ['Auth'], summary: 'Usuario de la sesión activa', security: secured, responses: { 200: { description: 'Usuario autenticado', ...json({ type: 'object', properties: { user: ref('User') } }) }, 401: R[401] } },
    },
    '/api/users/profile': {
      put: {
        tags: ['Usuarios'],
        summary: 'Editar perfil: nombre, carrera y fotografía (RF-013)',
        security: secured,
        requestBody: body({ type: 'object', properties: { nombre: { type: 'string' }, carrera: { type: 'string' }, fotoUrl: { type: 'string', description: 'URL http(s) o imagen en base64 (data URI)' } } }, { nombre: 'Carlos Mendoza', carrera: 'Ingeniería Civil' }),
        responses: { 200: { description: 'Perfil actualizado', ...json({ type: 'object', properties: { message: { type: 'string' }, user: ref('User') } }) }, 400: R[400], 401: R[401] },
      },
    },
    '/api/menus': {
      get: {
        tags: ['Menús'],
        summary: 'Consultar menús del día o de la semana (RF-005, RF-004)',
        security: secured,
        parameters: [q('fecha', 'Día exacto (YYYY-MM-DD)'), q('semana', 'Cualquier fecha de la semana a consultar (lunes a viernes)'), q('turno', 'Filtra por turno', { type: 'string', enum: ['desayuno', 'almuerzo', 'cena'] })],
        responses: { 200: { description: 'Lista de menús', ...json({ type: 'object', properties: { total: { type: 'integer' }, data: { type: 'array', items: ref('Menu') } } }) }, 400: R[400], 401: R[401] },
      },
      post: {
        tags: ['Menús'],
        summary: 'Registrar menú (Cocina Central / Admin) (RF-004)',
        security: secured,
        requestBody: body(ref('MenuInput')),
        responses: { 201: { description: 'Menú creado', ...json({ type: 'object', properties: { message: { type: 'string' }, data: ref('Menu') } }) }, 400: R[400], 401: R[401], 403: R[403], 409: R[409] },
      },
    },
    '/api/menus/{id}': {
      put: {
        tags: ['Menús'],
        summary: 'Editar menú existente (Cocina Central / Admin) (RF-004)',
        security: secured,
        parameters: [idParam],
        requestBody: body({ type: 'object', properties: { tituloPlato: { type: 'string' }, descripcion: { type: 'string' }, calorias: { type: 'number' }, horario: { type: 'string' }, imagenUrl: { type: 'string' } } }),
        responses: { 200: { description: 'Menú actualizado', ...json({ type: 'object', properties: { message: { type: 'string' }, data: ref('Menu') } }) }, 400: R[400], 401: R[401], 403: R[403], 404: R[404], 409: R[409] },
      },
    },
    '/api/shifts': {
      get: {
        tags: ['Turnos'],
        summary: 'Cupos disponibles por turno en tiempo real (RF-007)',
        security: secured,
        parameters: [q('fecha', 'YYYY-MM-DD (por defecto, hoy)')],
        responses: { 200: { description: 'Turnos con contador de cupos', ...json({ type: 'object', properties: { fecha: { type: 'string' }, abierto: { type: 'boolean' }, turnos: { type: 'array', items: ref('Shift') } } }) }, 400: R[400], 401: R[401] },
      },
    },
    '/api/shifts/config': {
      put: {
        tags: ['Turnos'],
        summary: 'Configurar cupos máximos por turno y día (solo Admin) (RF-012)',
        security: secured,
        requestBody: body(
          { type: 'object', required: ['turno', 'cuposTotales'], properties: { turno: { type: 'string', enum: ['desayuno', 'almuerzo', 'cena'] }, cuposTotales: { type: 'integer', minimum: 0, maximum: 5000 }, fecha: { type: 'string', description: 'Por defecto, hoy' }, aplicarSemana: { type: 'boolean', description: 'Aplica de lunes a viernes de la semana de `fecha`' } } },
          { turno: 'almuerzo', cuposTotales: 520, aplicarSemana: true }
        ),
        responses: { 200: { description: 'Configuración aplicada', ...json({ type: 'object', properties: { message: { type: 'string' }, data: { type: 'array', items: ref('Shift') } } }) }, 400: R[400], 401: R[401], 403: R[403], 409: R[409] },
      },
    },
    '/api/reservations': {
      post: {
        tags: ['Reservas'],
        summary: 'Reservar un cupo (estudiante) (RF-006, RF-007, RF-010)',
        description: 'Valida cupos > 0 y ausencia de duplicados, descuenta el cupo de forma atómica y envía la confirmación por correo.',
        security: secured,
        requestBody: body({ type: 'object', required: ['turno'], properties: { turno: { type: 'string', enum: ['desayuno', 'almuerzo', 'cena'] }, fecha: { type: 'string', description: 'Por defecto, hoy' } } }, { turno: 'almuerzo' }),
        responses: { 201: { description: 'Reserva confirmada', ...json({ type: 'object', properties: { message: { type: 'string' }, data: ref('Reservation'), turno: ref('Shift') } }) }, 400: R[400], 401: R[401], 403: R[403], 409: R[409] },
      },
      get: {
        tags: ['Reservas'],
        summary: 'Listar reservas de un día (Cocina Central / Admin)',
        security: secured,
        parameters: [q('fecha', 'YYYY-MM-DD (por defecto, hoy)'), q('turno', 'Filtra por turno', { type: 'string', enum: ['desayuno', 'almuerzo', 'cena'] }), q('estado', 'Filtra por estado', { type: 'string', enum: ['activa', 'cancelada', 'asistio', 'ausente'] })],
        responses: { 200: { description: 'Reservas del día', ...json({ type: 'object', properties: { fecha: { type: 'string' }, total: { type: 'integer' }, data: { type: 'array', items: ref('Reservation') } } }) }, 400: R[400], 401: R[401], 403: R[403] },
      },
    },
    '/api/reservations/my-history': {
      get: {
        tags: ['Reservas'],
        summary: 'Historial de reservas del estudiante (RF-009)',
        description: 'Con `estado=activa&orden=asc` devuelve las reservas vigentes.',
        security: secured,
        parameters: [q('estado', 'activa | cancelada | asistio | ausente', { type: 'string', enum: ['activa', 'cancelada', 'asistio', 'ausente'] }), q('desde', 'YYYY-MM-DD'), q('hasta', 'YYYY-MM-DD'), q('orden', 'asc | desc (por defecto desc)', { type: 'string', enum: ['asc', 'desc'] }), q('page', 'Página (1..n)', { type: 'integer', default: 1 }), q('limit', 'Tamaño de página (1..100)', { type: 'integer', default: 20 })],
        responses: { 200: { description: 'Historial paginado', ...json({ type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, pages: { type: 'integer' }, data: { type: 'array', items: ref('Reservation') } } }) }, 400: R[400], 401: R[401], 403: R[403] },
      },
    },
    '/api/reservations/{id}/cancel': {
      patch: {
        tags: ['Reservas'],
        summary: 'Cancelar una reserva activa antes del turno (RF-008)',
        description: 'Cambia el estado a `cancelada` y devuelve el cupo al contador. Notifica por correo.',
        security: secured,
        parameters: [idParam],
        responses: { 200: { description: 'Reserva cancelada', ...json({ type: 'object', properties: { message: { type: 'string' }, data: ref('Reservation') } }) }, 400: R[400], 401: R[401], 403: R[403], 404: R[404], 409: R[409] },
      },
    },
    '/api/reservations/{id}/attendance': {
      patch: {
        tags: ['Reservas'],
        summary: 'Registrar asistencia o ausencia (Cocina Central / Admin)',
        security: secured,
        parameters: [idParam],
        requestBody: body({ type: 'object', required: ['estado'], properties: { estado: { type: 'string', enum: ['asistio', 'ausente'] } } }, { estado: 'asistio' }),
        responses: { 200: { description: 'Asistencia registrada', ...json({ type: 'object', properties: { message: { type: 'string' }, data: ref('Reservation') } }) }, 400: R[400], 401: R[401], 403: R[403], 404: R[404], 409: R[409] },
      },
    },
    '/api/dashboard/metrics': {
      get: {
        tags: ['Dashboard'],
        summary: 'Métricas del dashboard de Cocina Central (RF-003)',
        description: 'Comensales proyectados, cupos reservados, tasa de asistencia, reservas semanales (lunes a viernes) y cronograma de menús.',
        security: secured,
        parameters: [q('fecha', 'YYYY-MM-DD (por defecto, hoy)'), q('turno', 'desayuno | almuerzo | cena | todos (por defecto, almuerzo)', { type: 'string', enum: ['desayuno', 'almuerzo', 'cena', 'todos'] })],
        responses: { 200: { description: 'Métricas calculadas', ...json({ type: 'object' }) }, 400: R[400], 401: R[401], 403: R[403] },
      },
    },
    '/api/reports/export': {
      get: {
        tags: ['Reportes'],
        summary: 'Exportar reporte de asistencia y reservas (RF-011)',
        security: secured,
        parameters: [q('desde', 'YYYY-MM-DD (por defecto, hasta - 6 días)'), q('hasta', 'YYYY-MM-DD (por defecto, hoy)'), q('formato', 'json | csv | xlsx | pdf (por defecto, json)', { type: 'string', enum: ['json', 'csv', 'xlsx', 'pdf'] })],
        responses: {
          200: {
            description: 'Reporte generado',
            content: {
              'application/json': { schema: { type: 'object' } },
              'text/csv': { schema: { type: 'string' } },
              'application/pdf': { schema: { type: 'string', format: 'binary' } },
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { schema: { type: 'string', format: 'binary' } },
            },
          },
          400: R[400], 401: R[401], 403: R[403],
        },
      },
    },
  },
};

module.exports = swaggerJsdoc({ definition, apis: [] });
