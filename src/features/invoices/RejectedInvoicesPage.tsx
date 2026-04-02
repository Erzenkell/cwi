import { useEffect, useState } from 'react';
import { fetchRejectedInvoices } from './api';

export default function RejectedInvoicesPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetchRejectedInvoices().then(setItems);
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1>Rejets / anomalies e-facture</h1>

      <table width="100%" cellPadding={10}>
        <thead>
          <tr>
            <th>Numéro</th>
            <th>Client</th>
            <th>Statut</th>
            <th>Statut technique</th>
            <th>Erreurs</th>
          </tr>
        </thead>
        <tbody>
          {items.map((inv) => (
            <tr key={inv.id}>
              <td>{inv.invoice_number}</td>
              <td>{inv.customer_name}</td>
              <td>{inv.status}</td>
              <td>{inv.technical_status}</td>
              <td>
                {Array.isArray(inv.validation_errors)
                  ? inv.validation_errors.join(' | ')
                  : inv.provider_payload?.reason || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}