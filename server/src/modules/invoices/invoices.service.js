import { query } from '../../db.js';

export async function createInvoice(data) {
  const result = await query(
    `INSERT INTO invoices 
    (invoice_number, customer_name, issue_date, due_date, status)
    VALUES ($1, $2, $3, $4, 'draft')
    RETURNING *`,
    [
      data.invoice_number,
      data.customer_name,
      data.issue_date,
      data.due_date,
    ]
  );

  return result.rows[0];
}

export async function getInvoices() {
  const result = await query(
    `SELECT * FROM invoices ORDER BY id DESC`
  );
  return result.rows;
}

export async function getInvoiceById(id) {
  const invoice = await query(
    `SELECT * FROM invoices WHERE id = $1`,
    [id]
  );

  const lines = await query(
    `SELECT * FROM invoice_lines WHERE invoice_id = $1`,
    [id]
  );

  return {
    ...invoice.rows[0],
    lines: lines.rows,
  };
}

export async function addLine(invoiceId, line) {
  await query(
    `INSERT INTO invoice_lines
    (invoice_id, label, quantity, unit_price_ht, vat_rate, total_ht)
    VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      invoiceId,
      line.label,
      line.quantity,
      line.unit_price_ht,
      line.vat_rate,
      line.quantity * line.unit_price_ht
    ]
  );
}