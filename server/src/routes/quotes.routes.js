import { Router } from 'express';
import { authenticate } from '../auth.js';
import { generateQuoteDocx } from '../services/quote-docx.service.js';

const router = Router();
router.use(authenticate);

function sanitizeFilename(value) {
  return String(value || 'devis')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

router.post('/generate', async (req, res) => {
  try {
    const payload = req.body || {};

    if (!payload.quote_number) {
      return res.status(400).json({ message: 'Le numéro de devis est obligatoire' });
    }

    if (!payload.customer_name) {
      return res.status(400).json({ message: 'Le nom du client est obligatoire' });
    }

    if (!payload.document_name) {
      return res.status(400).json({ message: 'Le nom du document est obligatoire' });
    }

    if (!payload.target_language) {
      return res.status(400).json({ message: 'La langue cible est obligatoire' });
    }

    const buffer = await generateQuoteDocx(payload);
    const filename = `${sanitizeFilename(payload.quote_number)}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur génération du devis' });
  }
});

export default router;
