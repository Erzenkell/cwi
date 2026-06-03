import { apiFetch } from '../../app/lib/apiFetch';

const BASE = '/invoices';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function fetchInvoices() {
  const res = await apiFetch(BASE, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erreur chargement factures');
  return res.json();
}

export async function fetchInvoice(id: number | string) {
  const res = await apiFetch(`${BASE}/${id}`, {
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
  const res = await apiFetch(BASE, {
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
  const res = await apiFetch(`${BASE}/${invoiceId}/lines`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Erreur ajout ligne');
  return res.json();
}

export async function validateInvoice(id: number | string) {
  const res = await apiFetch(`${BASE}/${id}/validate`, {
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
  const res = await apiFetch(`${BASE}/${id}/pay`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ payment_reference }),
  });
  if (!res.ok) throw new Error('Erreur paiement facture');
  return res.json();
}

export async function generateInvoicePdf(id: number | string) {
  const res = await apiFetch(`${BASE}/${id}/pdf`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erreur génération PDF');
  return res.json();
}

export async function generateInvoiceXml(id: number | string) {
  const res = await apiFetch(`${BASE}/${id}/xml`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erreur génération XML');
  return res.json();
}

export async function generateInvoiceFacturX(id: number | string) {
  const res = await apiFetch(`${BASE}/${id}/facturx`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erreur génération Factur-X');
  return res.json();
}

export async function sendInvoiceToPlatform(id: number | string) {
  const res = await apiFetch(`${BASE}/${id}/send`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Erreur envoi plateforme');
  }
  return res.json();
}

export async function fetchRejectedInvoices() {
  const res = await apiFetch(`${BASE}/rejected/list`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Erreur chargement anomalies');
  return res.json();
}

export async function simulateProviderDelivered(id: number | string) {
  const res = await apiFetch(`${BASE}/${id}/provider-status`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      status: 'delivered',
      delivered_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new Error('Erreur simulation delivered');
  return res.json();
}

export async function simulateProviderRejected(id: number | string, reason: string) {
  const res = await apiFetch(`${BASE}/${id}/provider-status`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({
      status: 'rejected',
      reason,
      rejected_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new Error('Erreur simulation rejected');
  return res.json();
}