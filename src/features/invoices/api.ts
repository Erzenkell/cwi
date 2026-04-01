const BASE = '/api/invoices';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchInvoices() {
  const res = await fetch(BASE, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erreur chargement factures');
  return res.json();
}

export async function fetchInvoice(id: number | string) {
  const res = await fetch(`${BASE}/${id}`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erreur chargement facture');
  return res.json();
}

export async function createInvoice(data: {
  customer_name: string;
  customer_siret?: string;
  issue_date: string;
  due_date?: string;
  notes?: string;
}) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erreur création facture');
  return res.json();
}

export async function addInvoiceLine(
  invoiceId: number | string,
  data: {
    label: string;
    description?: string;
    quantity: number;
    unit_price_ht: number;
    vat_rate: number;
  }
) {
  const res = await fetch(`${BASE}/${invoiceId}/lines`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erreur ajout ligne');
  return res.json();
}

export async function validateInvoice(id: number | string) {
  const res = await fetch(`${BASE}/${id}/validate`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erreur validation facture');
  return res.json();
}

export async function payInvoice(
  id: number | string,
  payment_reference?: string
) {
  const res = await fetch(`${BASE}/${id}/pay`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ payment_reference }),
  });
  if (!res.ok) throw new Error('Erreur paiement facture');
  return res.json();
}

export async function generateInvoicePdf(id: number | string) {
  const res = await fetch(`${BASE}/${id}/pdf`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erreur génération PDF');
  return res.json();
}