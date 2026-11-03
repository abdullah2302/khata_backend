import { Router } from 'express';
import * as s from '../controllers/statsController.js';
import protect from '../middleware/auth.js';

const router = Router();

router.use(protect);
router.get('/summary', s.summary);
router.get('/monthly-earnings', s.monthlyEarnings);
router.get('/pending-by-client', s.pendingByClient);
router.get('/top-clients', s.topClients);
router.get('/projects-by-status', s.projectsByStatus);
router.get('/upcoming', s.upcoming);
router.get('/billed-vs-paid', s.billedVsPaid);

export default router;
