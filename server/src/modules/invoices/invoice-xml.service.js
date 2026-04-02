import fs from 'fs';
import path from 'path';

function esc(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

export async function generateInvoiceXml(invoice) {
  const dirPath = path.resolve('storage', 'invoices', 'xml');
  fs.mkdirSync(dirPath, { recursive: true });

  const filePath = path.join(dirPath, `${invoice.invoice_number}.xml`);

  const linesXml = (invoice.lines || [])
    .map((line, index) => {
      return `
    <Line>
      <LineNumber>${index + 1}</LineNumber>
      <Label>${esc(line.label)}</Label>
      <Description>${esc(line.description || '')}</Description>
      <Quantity>${esc(line.quantity)}</Quantity>
      <UnitPriceHT>${esc(line.unit_price_ht)}</UnitPriceHT>
      <VatRate>${esc(line.vat_rate)}</VatRate>
      <TotalHT>${esc(line.total_ht)}</TotalHT>
    </Line>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice>
  <Header>
    <InvoiceNumber>${esc(invoice.invoice_number)}</InvoiceNumber>
    <DocumentType>${esc(invoice.document_type)}</DocumentType>
    <IssueDate>${esc(invoice.issue_date)}</IssueDate>
    <DueDate>${esc(invoice.due_date || '')}</DueDate>
    <Currency>${esc(invoice.currency)}</Currency>
    <BusinessFlow>${esc(invoice.business_flow)}</BusinessFlow>
  </Header>

  <Supplier>
    <Name>${esc(invoice.supplier_name || '')}</Name>
    <SIRET>${esc(invoice.supplier_siret || '')}</SIRET>
    <VATNumber>${esc(invoice.supplier_vat_number || '')}</VATNumber>
  </Supplier>

  <Customer>
    <Name>${esc(invoice.customer_name)}</Name>
    <SIRET>${esc(invoice.customer_siret || '')}</SIRET>
    <VATNumber>${esc(invoice.customer_vat_number || '')}</VATNumber>
    <Address>${esc(invoice.customer_address || '')}</Address>
    <Country>${esc(invoice.customer_country || 'FR')}</Country>
  </Customer>

  <Totals>
    <SubtotalHT>${esc(invoice.subtotal_ht)}</SubtotalHT>
    <TotalVAT>${esc(invoice.total_vat)}</TotalVAT>
    <TotalTTC>${esc(invoice.total_ttc)}</TotalTTC>
  </Totals>

  <Lines>
${linesXml}
  </Lines>
</Invoice>`;

  fs.writeFileSync(filePath, xml, 'utf8');
  return filePath;
}