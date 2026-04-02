import fs from 'fs';
import path from 'path';

export async function generateFacturXPlaceholder(invoice, xmlPath, pdfPath) {
  const dirPath = path.resolve('storage', 'invoices', 'facturx');
  fs.mkdirSync(dirPath, { recursive: true });

  const filePath = path.join(dirPath, `${invoice.invoice_number}.facturx.json`);

  const payload = {
    invoice_number: invoice.invoice_number,
    profile: 'FACTURX_MINIMUM',
    pdf_path: pdfPath || null,
    xml_path: xmlPath || null,
    generated_at: new Date().toISOString(),
    note: 'Placeholder technique avant intégration complète Factur-X PDF/A-3 + XML embarqué',
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
  return filePath;
}