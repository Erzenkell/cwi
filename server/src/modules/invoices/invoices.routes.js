import { Router } from 'express';
import { authenticate } from '../../auth.js';
import * as ctrl from './invoices.controller.js';

const router = Router();

router.use(authenticate);

router.get('/rejected/list', ctrl.rejected);

router.get('/', ctrl.list);
router.post('/', ctrl.create);
router.get('/:id', ctrl.getOne);
router.post('/:id/lines', ctrl.addLine);
router.post('/:id/validate', ctrl.validateInvoice);
router.post('/:id/pay', ctrl.payInvoice);
router.post('/:id/pdf', ctrl.pdf);
router.post('/:id/xml', ctrl.generateXml);
router.post('/:id/facturx', ctrl.generateFacturX);
router.post('/:id/send', ctrl.sendPlatform);
router.post('/:id/provider-status', ctrl.webhookStatus);

export default router;