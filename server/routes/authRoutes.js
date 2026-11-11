const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const auth = require('../middlewares/authMiddleware');
const c = require('../controllers/authController');

// Limita fuerza bruta sobre registro/login/OTP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 429, message: 'Demasiadas solicitudes de autenticación. Intenta nuevamente en unos minutos.' },
});

router.post('/register', authLimiter, c.register);
router.post('/login', authLimiter, c.login);
router.get('/me', auth, c.me);

module.exports = router;
