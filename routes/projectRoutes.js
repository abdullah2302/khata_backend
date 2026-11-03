import { Router } from 'express';
import * as c from '../controllers/projectController.js';
import protect from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import * as schemas from '../validators/schemas.js';

const router = Router();

router.use(protect);
router.route('/').get(c.getProjects).post(validate(schemas.project), c.createProject);
router.route('/:id').get(c.getProject).put(validate(schemas.project), c.updateProject).delete(c.deleteProject);

export default router;
