import { Router } from 'express';
import { applyProviderStatus } from './invoices.service.js';

const router = Router();

router.post('/provider/:invoiceId/status', async (req, res) => {
  try {
    const invoice = await applyProviderStatus(req.params.invoiceId, req.body);
    res.json(invoice);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;