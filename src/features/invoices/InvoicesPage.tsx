import { useEffect, useState } from 'react';
import {
  fetchInvoices,
  createInvoice,
  validateInvoice,
  payInvoice,
  generateInvoicePdf,
} from './api';

type Invoice = {
  id: number;
  invoice_number: string;
  customer_name: string;
  status: string;
  total_ttc: string;
  issue_date: string;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [form, setForm] = useState({
    customer_name: '',
    customer_siret: '',
    issue_date: new Date().toISOString().slice(0, 10),
    due_date: '',
    notes: '',
  });

  async function load() {
    const data = await fetchInvoices();
    setInvoices(data);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createInvoice(form);
    setForm({
      customer_name: '',
      customer_siret: '',
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: '',
      notes: '',
    });
    await load();
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Factures</h1>

      <form onSubmit={handleCreate} style={{ marginBottom: 24, display: 'grid', gap: 8, maxWidth: 500 }}>
        <input
          placeholder="Client"
          value={form.customer_name}
          onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
          required
        />
        <input
          placeholder="SIRET"
          value={form.customer_siret}
          onChange={(e) => setForm({ ...form, customer_siret: e.target.value })}
        />
        <input
          type="date"
          value={form.issue_date}
          onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
          required
        />
        <input
          type="date"
          value={form.due_date}
          onChange={(e) => setForm({ ...form, due_date: e.target.value })}
        />
        <textarea
          placeholder="Notes"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <button type="submit">Créer la facture</button>
      </form>

      <table width="100%" cellPadding={10}>
        <thead>
          <tr>
            <th>Numéro</th>
            <th>Client</th>
            <th>Date</th>
            <th>Statut</th>
            <th>Total TTC</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr key={inv.id}>
              <td>{inv.invoice_number}</td>
              <td>{inv.customer_name}</td>
              <td>{inv.issue_date?.slice(0, 10)}</td>
              <td>{inv.status}</td>
              <td>{inv.total_ttc} €</td>
              <td style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={async () => {
                    await validateInvoice(inv.id);
                    await load();
                  }}
                  disabled={inv.status !== 'draft'}
                >
                  Valider
                </button>

                <button
                  onClick={async () => {
                    await generateInvoicePdf(inv.id);
                    await load();
                  }}
                >
                  PDF
                </button>

                <button
                  onClick={async () => {
                    await payInvoice(inv.id, `PAY-${Date.now()}`);
                    await load();
                  }}
                  disabled={inv.status === 'paid'}
                >
                  Marquer payé
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}