import { Router } from 'express';
import * as c from '../controllers/invoiceController.js';
import protect from '../middleware/auth.js';
import validate from '../middleware/validate.js';
import * as schemas from '../validators/schemas.js';

const router = Router();

router.use(protect);
router.route('/').get(c.getInvoices).post(validate(schemas.invoice), c.createInvoice);
router.patch('/:id/paid', c.markInvoicePaid);
router.post('/:id/duplicate', c.duplicateInvoice);
router.route('/:id').get(c.getInvoice).put(validate(schemas.invoice), c.updateInvoice).delete(c.deleteInvoice);

export default router;
