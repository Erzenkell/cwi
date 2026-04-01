import { Router } from 'express';
import * as ctrl from './invoices.controller.js';
import { authenticate } from '../../auth.js';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.post('/:id/lines', ctrl.addLine);

export default router;