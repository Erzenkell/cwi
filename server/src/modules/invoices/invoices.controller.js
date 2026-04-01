import * as service from './invoices.service.js';

export async function create(req, res) {
  try {
    const invoice = await service.createInvoice(req.body);
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function list(req, res) {
  try {
    const invoices = await service.getInvoices();
    res.json(invoices);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getOne(req, res) {
  try {
    const invoice = await service.getInvoiceById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function addLine(req, res) {
  try {
    const invoice = await service.addLine(req.params.id, req.body);
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function validateInvoice(req, res) {
  try {
    const invoice = await service.markAsValidated(req.params.id);
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function payInvoice(req, res) {
  try {
    const invoice = await service.markAsPaid(
      req.params.id,
      req.body?.payment_reference
    );
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function pdf(req, res) {
  try {
    const invoice = await service.generatePdf(req.params.id);
    res.json(invoice);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}