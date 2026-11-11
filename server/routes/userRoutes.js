const router = require('express').Router();
const auth = require('../middlewares/authMiddleware');
const c = require('../controllers/userController');

router.put('/profile', auth, c.updateProfile);

module.exports = router;
