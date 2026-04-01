import { useEffect, useState } from 'react';
import { fetchInvoice, addInvoiceLine } from './api';

export default function InvoiceDetails({ id }: { id: number }) {
  const [invoice, setInvoice] = useState<any>(null);
  const [line, setLine] = useState({
    label: '',
    description: '',
    quantity: 1,
    unit_price_ht: 0,
    vat_rate: 20,
  });

  async function load() {
    const data = await fetchInvoice(id);
    setInvoice(data);
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleAddLine(e: React.FormEvent) {
    e.preventDefault();
    await addInvoiceLine(id, line);
    setLine({
      label: '',
      description: '',
      quantity: 1,
      unit_price_ht: 0,
      vat_rate: 20,
    });
    await load();
  }

  if (!invoice) return <div>Chargement...</div>;

  return (
    <div style={{ padding: 24 }}>
      <h2>{invoice.invoice_number}</h2>
      <p>Client : {invoice.customer_name}</p>
      <p>Statut : {invoice.status}</p>
      <p>Sous-total HT : {invoice.subtotal_ht} €</p>
      <p>TVA : {invoice.total_vat} €</p>
      <p>Total TTC : {invoice.total_ttc} €</p>

      <h3>Ajouter une ligne</h3>
      <form onSubmit={handleAddLine} style={{ display: 'grid', gap: 8, maxWidth: 500 }}>
        <input
          value={line.label}
          onChange={(e) => setLine({ ...line, label: e.target.value })}
          placeholder="Libellé"
          required
        />
        <textarea
          value={line.description}
          onChange={(e) => setLine({ ...line, description: e.target.value })}
          placeholder="Description"
        />
        <input
          type="number"
          value={line.quantity}
          onChange={(e) => setLine({ ...line, quantity: Number(e.target.value) })}
          placeholder="Quantité"
          required
        />
        <input
          type="number"
          step="0.01"
          value={line.unit_price_ht}
          onChange={(e) => setLine({ ...line, unit_price_ht: Number(e.target.value) })}
          placeholder="Prix unitaire HT"
          required
        />
        <input
          type="number"
          step="0.01"
          value={line.vat_rate}
          onChange={(e) => setLine({ ...line, vat_rate: Number(e.target.value) })}
          placeholder="TVA"
          required
        />
        <button type="submit">Ajouter</button>
      </form>

      <h3>Lignes</h3>
      <ul>
        {invoice.lines.map((l: any) => (
          <li key={l.id}>
            {l.label} — {l.quantity} × {l.unit_price_ht} € — TVA {l.vat_rate}% — Total HT {l.total_ht} €
          </li>
        ))}
      </ul>

      <h3>Historique</h3>
      <ul>
        {invoice.events.map((evt: any) => (
          <li key={evt.id}>
            {evt.event_type} — {new Date(evt.created_at).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}