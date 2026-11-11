const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const c = require('../controllers/menuController');

router.get('/', auth, c.list);
router.post('/', auth, authorize('cocina_central', 'admin'), c.create);
router.put('/:id', auth, authorize('cocina_central', 'admin'), c.update);

module.exports = router;
