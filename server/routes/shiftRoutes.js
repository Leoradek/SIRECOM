const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const c = require('../controllers/shiftController');

router.get('/', auth, c.list);
router.put('/config', auth, authorize('admin'), c.updateConfig);

module.exports = router;
