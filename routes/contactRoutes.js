import { Router } from 'express';
import { sendMessage } from '../controllers/contactController.js';
import validate from '../middleware/validate.js';
import * as schemas from '../validators/schemas.js';

const router = Router();

router.post('/', validate(schemas.contact), sendMessage);

export default router;
