const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const { authorize } = require('../middlewares/roleMiddleware');
const c = require('../controllers/reservationController');

router.post('/', auth, authorize('estudiante'), c.create);
router.get('/my-history', auth, authorize('estudiante'), c.myHistory);
router.get('/', auth, authorize('cocina_central', 'admin'), c.listAll);
router.patch('/:id/cancel', auth, authorize('estudiante', 'admin'), c.cancel);
router.patch('/:id/attendance', auth, authorize('cocina_central', 'admin'), c.markAttendance);

module.exports = router;
