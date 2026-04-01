import { useEffect, useState } from 'react';
import { fetchInvoices } from './api';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    fetchInvoices().then(setInvoices);
  }, []);

  return (
    <div>
      <h1>Factures</h1>

      <table>
        <thead>
          <tr>
            <th>Numéro</th>
            <th>Client</th>
            <th>Statut</th>
            <th>Total</th>
          </tr>
        </thead>

        <tbody>
          {invoices.map((inv: any) => (
            <tr key={inv.id}>
              <td>{inv.invoice_number}</td>
              <td>{inv.customer_name}</td>
              <td>{inv.status}</td>
              <td>{inv.total_ttc} €</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}