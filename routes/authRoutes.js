import { Router } from 'express';
import * as c from '../controllers/authController.js';
import protect from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import * as schemas from '../validators/schemas.js';

const router = Router();

router.post('/register', validate(schemas.register), c.register);
router.post('/login', validate(schemas.login), c.login);
router.get('/me', protect, c.me);
router.put('/profile', protect, validate(schemas.profile), c.updateProfile);
router.put('/password', protect, validate(schemas.password), c.changePassword);

export default router;
