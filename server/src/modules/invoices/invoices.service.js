import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { pool, query } from '../../db.js';
import { nextInvoiceNumber } from './invoice-number.service.js';
import { generateInvoiceXml } from './invoice-xml.service.js';
import { generateFacturXPlaceholder } from './facturx.service.js';
import { validateInvoiceForEInvoicing } from './invoice-validation.service.js';
import { MockEInvoiceProvider } from './mock.provider.js';

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

async function addEvent(client, invoiceId, eventType, payload = {}) {
  await client.query(
    `
    INSERT INTO invoice_events (invoice_id, event_type, payload)
    VALUES ($1, $2, $3)
    `,
    [invoiceId, eventType, JSON.stringify(payload)]
  );
}

async function recomputeTotalsWithClient(client, invoiceId) {
  const linesResult = await client.query(
    `
    SELECT quantity, unit_price_ht, vat_rate
    FROM invoice_lines
    WHERE invoice_id = $1
    `,
    [invoiceId]
  );

  let subtotal = 0;
  let vat = 0;

  for (const line of linesResult.rows) {
    const lineHt = round2(Number(line.quantity) * Number(line.unit_price_ht));
    const lineVat = round2(lineHt * (Number(line.vat_rate) / 100));
    subtotal += lineHt;
    vat += lineVat;
  }

  subtotal = round2(subtotal);
  vat = round2(vat);
  const total = round2(subtotal + vat);

  const update = await client.query(
    `
    UPDATE invoices
    SET subtotal_ht = $2,
        total_vat = $3,
        total_ttc = $4,
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [invoiceId, subtotal, vat, total]
  );

  return update.rows[0];
}

export async function createInvoice(data) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const invoiceNumber = await nextInvoiceNumber(client);

    const result = await client.query(
      `
      INSERT INTO invoices (
        invoice_number,
        customer_name,
        customer_siret,
        issue_date,
        due_date,
        status,
        technical_status,
        currency,
        notes,
        supplier_name,
        supplier_siret,
        supplier_vat_number,
        customer_vat_number,
        customer_address,
        customer_country,
        document_type,
        business_flow
      )
      VALUES (
        $1, $2, $3, $4, $5,
        'draft', 'pending', 'EUR', $6,
        $7, $8, $9, $10, $11, $12, 'invoice', $13
      )
      RETURNING *
      `,
      [
        invoiceNumber,
        data.customer_name,
        data.customer_siret || null,
        data.issue_date,
        data.due_date || null,
        data.notes || null,
        data.supplier_name || 'Wordsinvest',
        data.supplier_siret || '12345678900011',
        data.supplier_vat_number || 'FR00123456789',
        data.customer_vat_number || null,
        data.customer_address || null,
        data.customer_country || 'FR',
        data.business_flow || 'b2b_fr',
      ]
    );

    const invoice = result.rows[0];

    await addEvent(client, invoice.id, 'invoice_created', {
      invoice_number: invoice.invoice_number,
    });

    await client.query('COMMIT');
    return invoice;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getInvoices() {
  const result = await query(
    `
    SELECT *
    FROM invoices
    ORDER BY id DESC
    `
  );
  return result.rows;
}

export async function getInvoiceById(id) {
  const invoice = await query(
    `SELECT * FROM invoices WHERE id = $1`,
    [id]
  );

  if (!invoice.rows.length) {
    return null;
  }

  const lines = await query(
    `
    SELECT *
    FROM invoice_lines
    WHERE invoice_id = $1
    ORDER BY id ASC
    `,
    [id]
  );

  const events = await query(
    `
    SELECT *
    FROM invoice_events
    WHERE invoice_id = $1
    ORDER BY created_at DESC
    `,
    [id]
  );

  return {
    ...invoice.rows[0],
    lines: lines.rows,
    events: events.rows,
  };
}

export async function addLine(invoiceId, line) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const totalHt = round2(Number(line.quantity) * Number(line.unit_price_ht));

    await client.query(
      `
      INSERT INTO invoice_lines (
        invoice_id,
        label,
        description,
        quantity,
        unit_price_ht,
        vat_rate,
        total_ht
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        invoiceId,
        line.label,
        line.description || null,
        Number(line.quantity),
        Number(line.unit_price_ht),
        Number(line.vat_rate),
        totalHt,
      ]
    );

    const updatedInvoice = await recomputeTotalsWithClient(client, invoiceId);

    await addEvent(client, invoiceId, 'line_added', {
      label: line.label,
      quantity: Number(line.quantity),
      unit_price_ht: Number(line.unit_price_ht),
      vat_rate: Number(line.vat_rate),
    });

    await client.query('COMMIT');
    return updatedInvoice;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function markAsValidated(invoiceId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const invoiceResult = await client.query(
      `
      UPDATE invoices
      SET status = 'validated',
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [invoiceId]
    );

    if (!invoiceResult.rows.length) {
      throw new Error('Invoice not found');
    }

    await addEvent(client, invoiceId, 'invoice_validated');

    await client.query('COMMIT');
    return invoiceResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function markAsPaid(invoiceId, paymentReference) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const invoiceResult = await client.query(
      `
      UPDATE invoices
      SET status = 'paid',
          paid_at = NOW(),
          payment_reference = $2,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [invoiceId, paymentReference || null]
    );

    if (!invoiceResult.rows.length) {
      throw new Error('Invoice not found');
    }

    await addEvent(client, invoiceId, 'invoice_paid', {
      payment_reference: paymentReference || null,
    });

    await client.query('COMMIT');
    return invoiceResult.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function generatePdf(invoiceId) {
  const invoice = await getInvoiceById(invoiceId);

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const dirPath = path.resolve('storage', 'invoices');
  fs.mkdirSync(dirPath, { recursive: true });

  const fileName = `${invoice.invoice_number}.pdf`;
  const filePath = path.join(dirPath, fileName);

  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(filePath);

  doc.pipe(stream);

  doc.fontSize(20).text(`Facture ${invoice.invoice_number}`);
  doc.moveDown();

  doc.fontSize(12).text(`Client : ${invoice.customer_name}`);
  doc.text(`SIRET : ${invoice.customer_siret || '-'}`);
  doc.text(`Date d'émission : ${invoice.issue_date}`);
  doc.text(`Échéance : ${invoice.due_date || '-'}`);
  doc.text(`Statut : ${invoice.status}`);
  doc.moveDown();

  doc.fontSize(14).text('Lignes');
  doc.moveDown(0.5);

  invoice.lines.forEach((line, index) => {
    doc
      .fontSize(11)
      .text(
        `${index + 1}. ${line.label} | Qté: ${line.quantity} | PU HT: ${line.unit_price_ht} € | TVA: ${line.vat_rate}% | Total HT: ${line.total_ht} €`
      );

    if (line.description) {
      doc.fontSize(10).text(`   ${line.description}`);
    }
  });

  doc.moveDown();
  doc.fontSize(12).text(`Sous-total HT : ${invoice.subtotal_ht} €`);
  doc.text(`TVA : ${invoice.total_vat} €`);
  doc.text(`Total TTC : ${invoice.total_ttc} €`);

  if (invoice.notes) {
    doc.moveDown();
    doc.text(`Notes : ${invoice.notes}`);
  }

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const updated = await query(
    `
    UPDATE invoices
    SET pdf_path = $2,
        technical_status = 'pdf_generated',
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [invoiceId, filePath]
  );

  await query(
    `
    INSERT INTO invoice_events (invoice_id, event_type, payload)
    VALUES ($1, 'pdf_generated', $2)
    `,
    [invoiceId, JSON.stringify({ pdf_path: filePath })]
  );

  return updated.rows[0];
}

async function updateValidationErrors(invoiceId, errors) {
  await query(
    `
    UPDATE invoices
    SET validation_errors = $2,
        updated_at = NOW()
    WHERE id = $1
    `,
    [invoiceId, JSON.stringify(errors)]
  );
}

export async function generateXml(invoiceId) {
  const invoice = await getInvoiceById(invoiceId);

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const errors = validateInvoiceForEInvoicing(invoice);

  await updateValidationErrors(invoiceId, errors);

  if (errors.length) {
    throw new Error(`Validation e-facture échouée: ${errors.join(' | ')}`);
  }

  const xmlPath = await generateInvoiceXml(invoice);

  const updated = await query(
    `
    UPDATE invoices
    SET xml_path = $2,
        technical_status = 'xml_generated',
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [invoiceId, xmlPath]
  );

  await query(
    `
    INSERT INTO invoice_events (invoice_id, event_type, payload)
    VALUES ($1, 'xml_generated', $2)
    `,
    [invoiceId, JSON.stringify({ xml_path: xmlPath })]
  );

  return updated.rows[0];
}

export async function generateFacturX(invoiceId) {
  const invoice = await getInvoiceById(invoiceId);

  if (!invoice) {
    throw new Error('Invoice not found');
  }

  const facturXPath = await generateFacturXPlaceholder(
    invoice,
    invoice.xml_path,
    invoice.pdf_path
  );

  const updated = await query(
    `
    UPDATE invoices
    SET facturx_path = $2,
        technical_status = 'facturx_generated',
        updated_at = NOW()
    WHERE id = $1
    RETURNING *
    `,
    [invoiceId, facturXPath]
  );

  await query(
    `
    INSERT INTO invoice_events (invoice_id, event_type, payload)
    VALUES ($1, 'facturx_generated', $2)
    `,
    [invoiceId, JSON.stringify({ facturx_path: facturXPath })]
  );

  return updated.rows[0];
}

export async function sendToPlatform(invoiceId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const invoice = await getInvoiceById(invoiceId);

    if (!invoice) {
      throw new Error('Invoice not found');
    }

    const errors = validateInvoiceForEInvoicing(invoice);
    await updateValidationErrors(invoiceId, errors);

    if (errors.length) {
      throw new Error(`Validation e-facture échouée: ${errors.join(' | ')}`);
    }

    const provider = new MockEInvoiceProvider();
    const result = await provider.sendInvoice(invoice);

    const transmission = await client.query(
      `
      INSERT INTO invoice_transmissions (
        invoice_id,
        provider,
        external_id,
        request_payload,
        response_payload,
        status,
        http_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        invoiceId,
        result.provider,
        result.external_id,
        JSON.stringify({
          invoice_number: invoice.invoice_number,
          xml_path: invoice.xml_path,
          pdf_path: invoice.pdf_path,
          facturx_path: invoice.facturx_path,
        }),
        JSON.stringify(result.response_payload),
        result.status,
        200,
      ]
    );

    const updated = await client.query(
      `
      UPDATE invoices
      SET status = 'sent_to_platform',
          technical_status = 'platform_acknowledged',
          platform_name = $2,
          platform_external_id = $3,
          provider_status = $4,
          provider_payload = $5,
          sent_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [
        invoiceId,
        result.provider,
        result.external_id,
        result.status,
        JSON.stringify(result.response_payload),
      ]
    );

    await addEvent(client, invoiceId, 'sent_to_platform', {
      provider: result.provider,
      external_id: result.external_id,
      status: result.status,
    });

    await client.query('COMMIT');
    return {
      invoice: updated.rows[0],
      transmission: transmission.rows[0],
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function applyProviderStatus(invoiceId, providerStatusPayload) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let status = 'sent_to_platform';
    let technicalStatus = 'platform_acknowledged';

    if (providerStatusPayload.status === 'delivered') {
      status = 'delivered';
      technicalStatus = 'customer_routed';
    }

    if (providerStatusPayload.status === 'rejected') {
      status = 'rejected';
      technicalStatus = 'platform_rejected';
    }

    const updated = await client.query(
      `
      UPDATE invoices
      SET status = $2,
          technical_status = $3,
          provider_status = $4,
          provider_payload = $5,
          delivered_at = CASE WHEN $2 = 'delivered' THEN NOW() ELSE delivered_at END,
          rejected_at = CASE WHEN $2 = 'rejected' THEN NOW() ELSE rejected_at END,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
      `,
      [
        invoiceId,
        status,
        technicalStatus,
        providerStatusPayload.status,
        JSON.stringify(providerStatusPayload),
      ]
    );

    if (!updated.rows.length) {
      throw new Error('Invoice not found');
    }

    await addEvent(client, invoiceId, `provider_status_${providerStatusPayload.status}`, providerStatusPayload);

    await client.query('COMMIT');
    return updated.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getRejectedInvoices() {
  const result = await query(
    `
    SELECT *
    FROM invoices
    WHERE status = 'rejected'
       OR technical_status = 'platform_rejected'
       OR (validation_errors IS NOT NULL AND validation_errors <> '[]'::jsonb)
    ORDER BY updated_at DESC
    `
  );

  return result.rows;
}