import * as service from './invoices.service.js';

export async function create(req, res) {
  const invoice = await service.createInvoice(req.body);
  res.json(invoice);
}

export async function list(req, res) {
  const invoices = await service.getInvoices();
  res.json(invoices);
}

export async function getOne(req, res) {
  const invoice = await service.getInvoiceById(req.params.id);
  res.json(invoice);
}

export async function addLine(req, res) {
  await service.addLine(req.params.id, req.body);
  res.json({ success: true });
}