export function validateInvoiceForEInvoicing(invoice) {
  const errors = [];

  if (!invoice) {
    errors.push('Facture introuvable');
    return errors;
  }

  if (!invoice.invoice_number) errors.push('Numéro de facture manquant');
  if (!invoice.issue_date) errors.push("Date d'émission manquante");
  if (!invoice.customer_name) errors.push('Nom client manquant');

  if (invoice.business_flow === 'b2b_fr') {
    if (!invoice.customer_siret) errors.push('SIRET client obligatoire pour flux B2B France');
    if (!invoice.supplier_siret) errors.push('SIRET fournisseur obligatoire');
  }

  if (!invoice.lines || invoice.lines.length === 0) {
    errors.push('Au moins une ligne de facture est obligatoire');
  }

  for (const line of invoice.lines || []) {
    if (!line.label) errors.push(`Ligne ${line.id || '?'}: libellé manquant`);
    if (Number(line.quantity) <= 0) errors.push(`Ligne ${line.id || '?'}: quantité invalide`);
    if (Number(line.unit_price_ht) < 0) errors.push(`Ligne ${line.id || '?'}: prix unitaire invalide`);
    if (Number(line.vat_rate) < 0) errors.push(`Ligne ${line.id || '?'}: taux de TVA invalide`);
  }

  if (Number(invoice.total_ttc) <= 0) {
    errors.push('Montant total TTC invalide');
  }

  return errors;
}