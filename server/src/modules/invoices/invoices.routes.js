import { Router } from 'express';
import { authenticate } from '../../auth.js';
import * as ctrl from './invoices.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.post('/:id/lines', ctrl.addLine);
router.post('/:id/validate', ctrl.validateInvoice);
router.post('/:id/pay', ctrl.payInvoice);
router.post('/:id/pdf', ctrl.pdf);

export default router;