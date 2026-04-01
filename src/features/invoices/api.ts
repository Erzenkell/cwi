export async function fetchInvoices() {
  const res = await fetch('/api/invoices');
  return res.json();
}

export async function createInvoice(data: any) {
  const res = await fetch('/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}