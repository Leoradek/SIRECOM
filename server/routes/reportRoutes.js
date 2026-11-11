const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const c = require('../controllers/reportController');

router.get('/export', auth, authorize('cocina_central', 'admin'), c.exportReport);

module.exports = router;
