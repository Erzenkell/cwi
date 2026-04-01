import { useEffect, useState } from 'react';

export default function InvoiceDetails({ id }: { id: number }) {
  const [invoice, setInvoice] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/invoices/${id}`)
      .then(res => res.json())
      .then(setInvoice);
  }, [id]);

  if (!invoice) return <div>Loading...</div>;

  return (
    <div>
      <h2>{invoice.invoice_number}</h2>

      <p>Client: {invoice.customer_name}</p>
      <p>Status: {invoice.status}</p>

      <h3>Lignes</h3>
      <ul>
        {invoice.lines.map((l: any) => (
          <li key={l.id}>
            {l.label} - {l.quantity} x {l.unit_price_ht}€
          </li>
        ))}
      </ul>
    </div>
  );
}