import { Router } from 'express';
import * as c from '../controllers/clientController.js';
import protect from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import * as schemas from '../validators/schemas.js';

const router = Router();

router.use(protect);
router.route('/').get(c.getClients).post(validate(schemas.client), c.createClient);
router.get('/:id/overview', c.getClientOverview);
router.route('/:id').get(c.getClient).put(validate(schemas.client), c.updateClient).delete(c.deleteClient);

export default router;
