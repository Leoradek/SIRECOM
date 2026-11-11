const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const c = require('../controllers/dashboardController');

router.get('/metrics', auth, authorize('cocina_central', 'admin'), c.metrics);

module.exports = router;
