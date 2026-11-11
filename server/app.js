const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');
const swaggerSpec = require('./config/swagger');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: config.clientUrls,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['Content-Disposition', 'X-Response-Time'],
  })
);
// 1 MB: suficiente para la foto de perfil comprimida en base64
app.use(express.json({ limit: '1mb' }));
if (config.env !== 'test') app.use(morgan(config.env === 'production' ? 'combined' : 'dev'));

// Cabecera X-Response-Time para evidenciar el rendimiento (RNF: < 150 ms con índices)
app.use((req, res, next) => {
  const start = process.hrtime.bigint();
  const writeHead = res.writeHead;
  res.writeHead = function patched(...args) {
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${(Number(process.hrtime.bigint() - start) / 1e6).toFixed(2)}ms`);
    }
    return writeHead.apply(this, args);
  };
  next();
});

// Documentación interactiva (OpenAPI 3.0)
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'SIRECOM API Docs',
  swaggerOptions: { persistAuthorization: true, displayRequestDuration: true },
}));

app.get('/api/health', (req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/menus', require('./routes/menuRoutes'));
app.use('/api/shifts', require('./routes/shiftRoutes'));
app.use('/api/reservations', require('./routes/reservationRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

app.get('/', (req, res) => res.redirect('/api-docs'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
