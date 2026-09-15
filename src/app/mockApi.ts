const STORAGE_KEY = 'wordsinvest-crm-demo-state-v1';

export const DEMO_AUTH = {
  token: 'wordsinvest-demo-token',
  user: {
    id: 1,
    email: 'demo@wordsinvest.com',
    role: 'admin' as const,
    fullName: 'Démo Wordsinvest',
  },
};

type DemoRecord = Record<string, any>;

type DemoLog = {
  id: number;
  action: string;
  entity: string;
  entity_id: string | null;
  changed_fields: Record<string, { before: any; after: any }> | null;
  before_data: DemoRecord | null;
  after_data: DemoRecord | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
};

type DemoState = {
  records: Record<string, DemoRecord[]>;
  users: DemoRecord[];
  groups: DemoRecord[];
  logs: DemoLog[];
};

const SCHEMAS: Record<string, Array<{ column_name: string; data_type: string; is_nullable: 'YES' | 'NO' }>> = {
  accounts: [
    ['id', 'integer', 'NO'], ['name', 'character varying', 'NO'], ['category', 'character varying', 'YES'],
    ['email', 'character varying', 'YES'], ['phone', 'character varying', 'YES'], ['city', 'character varying', 'YES'],
    ['rating', 'integer', 'YES'], ['assigned_to', 'integer', 'YES'], ['created_at', 'timestamp without time zone', 'NO'],
    ['updated_at', 'timestamp without time zone', 'NO'],
  ].map(([column_name, data_type, is_nullable]) => ({ column_name, data_type, is_nullable: is_nullable as 'YES' | 'NO' })),
  contacts: [
    ['id', 'integer', 'NO'], ['first_name', 'character varying', 'NO'], ['last_name', 'character varying', 'NO'],
    ['company', 'character varying', 'YES'], ['email', 'character varying', 'YES'], ['phone', 'character varying', 'YES'],
    ['title', 'character varying', 'YES'], ['city', 'character varying', 'YES'], ['assigned_to', 'integer', 'YES'],
    ['created_at', 'timestamp without time zone', 'NO'], ['updated_at', 'timestamp without time zone', 'NO'],
  ].map(([column_name, data_type, is_nullable]) => ({ column_name, data_type, is_nullable: is_nullable as 'YES' | 'NO' })),
  opportunities: [
    ['id', 'integer', 'NO'], ['name', 'text', 'NO'], ['account_name', 'character varying', 'YES'],
    ['amount', 'numeric', 'YES'], ['stage', 'character varying', 'YES'], ['probability', 'integer', 'YES'],
    ['languages', 'character varying', 'YES'], ['service_type', 'character varying', 'YES'], ['assigned_to', 'integer', 'YES'],
    ['notes', 'text', 'YES'], ['created_at', 'timestamp without time zone', 'NO'], ['updated_at', 'timestamp without time zone', 'NO'],
  ].map(([column_name, data_type, is_nullable]) => ({ column_name, data_type, is_nullable: is_nullable as 'YES' | 'NO' })),
  suppliers: [
    ['id', 'integer', 'NO'], ['first_name', 'character varying', 'YES'], ['last_name', 'character varying', 'YES'],
    ['company', 'character varying', 'YES'], ['email', 'character varying', 'YES'], ['phone', 'character varying', 'YES'],
    ['city', 'character varying', 'YES'], ['specialty', 'character varying', 'YES'], ['created_at', 'timestamp without time zone', 'NO'],
    ['updated_at', 'timestamp without time zone', 'NO'],
  ].map(([column_name, data_type, is_nullable]) => ({ column_name, data_type, is_nullable: is_nullable as 'YES' | 'NO' })),
  abstract_invoices: [
    ['id', 'integer', 'NO'], ['invoice_year', 'integer', 'YES'], ['invoice_number', 'integer', 'YES'],
    ['client_name', 'character varying', 'YES'], ['amount', 'numeric', 'YES'], ['vat', 'numeric', 'YES'],
    ['status', 'character varying', 'YES'], ['sent_date', 'date', 'YES'], ['payment_date', 'date', 'YES'],
    ['paid', 'boolean', 'YES'], ['currency', 'character varying', 'NO'], ['notes', 'text', 'YES'],
    ['created_at', 'timestamp without time zone', 'NO'], ['updated_at', 'timestamp without time zone', 'NO'],
  ].map(([column_name, data_type, is_nullable]) => ({ column_name, data_type, is_nullable: is_nullable as 'YES' | 'NO' })),
};

function initialState(): DemoState {
  const now = new Date().toISOString();
  return {
    records: {
      accounts: [
        { id: 128, name: 'CHANEL', category: 'Client', email: 'comptabilite@chanel.com', phone: '+33 1 58 37 40 00', city: 'Neuilly-sur-Seine', rating: 5, assigned_to: 1, created_at: now, updated_at: now },
        { id: 242, name: 'PARTICULIER', category: 'Client', email: 'contact@example.com', phone: '—', city: 'Paris', rating: 3, assigned_to: 2, created_at: now, updated_at: now },
        { id: 293, name: 'LOMBARD ODIER Asset Management Suisse', category: 'Client', email: 'contact@lombardodier.com', phone: '+41 22 709 21 11', city: 'Genève', rating: 4, assigned_to: 1, created_at: now, updated_at: now },
        { id: 310, name: 'MIROVA', category: 'Client', email: 'contact@mirova.com', phone: '—', city: 'Paris', rating: 4, assigned_to: 2, created_at: now, updated_at: now },
      ],
      contacts: [
        { id: 7135, first_name: 'Clémence', last_name: 'GARAND-CLAVEL', company: 'CHANEL', email: 'clemence@example.com', phone: '+33 1 00 00 00 00', title: 'Comptabilité fournisseurs', city: 'Paris', assigned_to: 2, created_at: now, updated_at: now },
        { id: 7136, first_name: 'Sara', last_name: 'GONCALVES ALCANTARA', company: 'CHANEL', email: 'sara@example.com', phone: '—', title: 'Responsable', city: 'Neuilly-sur-Seine', assigned_to: 1, created_at: now, updated_at: now },
      ],
      opportunities: [
        { id: 74077, name: 'Weekly Investment Note (WIN) 01.06.2026', account_name: 'LOMBARD ODIER Asset Management Suisse', amount: 788.40, stage: 'lance_s_t', probability: 0, languages: 'EN > FR', service_type: 'traduction', assigned_to: 1, notes: '', created_at: now, updated_at: now },
        { id: 74078, name: 'Weekly Investment Note (WIN) 01.06.2026', account_name: 'LOMBARD ODIER Asset Management Suisse', amount: 543, stage: 'lance_s_t', probability: 0, languages: 'EN > DE', service_type: 'traduction', assigned_to: 2, notes: '', created_at: now, updated_at: now },
        { id: 74043, name: 'Traduction Acte de Naissance Filles Beaufils', account_name: 'PARTICULIER', amount: 120, stage: 'lance_s_t', probability: 0, languages: 'FR > EN', service_type: 'traduction', assigned_to: 1, notes: '', created_at: now, updated_at: now },
        { id: 73977, name: 'Insights page briefing form - GE May 2026 - Translations', account_name: 'BLUEBAY AM', amount: 167.90, stage: 'livre', probability: 0, languages: 'EN > FR', service_type: 'traduction', assigned_to: 2, notes: '', created_at: now, updated_at: now },
        { id: 73960, name: 'Festival de Cannes 2026 - ANGELE / SRT EN', account_name: 'CHANEL', amount: 822, stage: 'facture', probability: 0, languages: 'FR > EN', service_type: 'traduction', assigned_to: 1, notes: '', created_at: now, updated_at: now },
      ],
      suppliers: [
        { id: 501, first_name: 'Alice', last_name: 'Martin', company: 'AM Traductions', email: 'alice@example.com', phone: '0600000001', city: 'Lyon', specialty: 'Anglais / Français', created_at: now, updated_at: now },
        { id: 502, first_name: 'Marc', last_name: 'Dupont', company: 'MD Language', email: 'marc@example.com', phone: '0600000002', city: 'Paris', specialty: 'Allemand / Français', created_at: now, updated_at: now },
      ],
      abstract_invoices: [
        { id: 13761, invoice_year: 2026, invoice_number: 146, client_name: 'CHANEL', amount: 69766.80, vat: 20, status: 'En attente', sent_date: '2026-05-28', payment_date: null, paid: false, currency: 'EUR', notes: '', created_at: now, updated_at: now },
        { id: 13760, invoice_year: 2026, invoice_number: 145, client_name: 'CHANEL', amount: 504, vat: 20, status: 'En attente', sent_date: '2026-05-29', payment_date: null, paid: false, currency: 'EUR', notes: '', created_at: now, updated_at: now },
        { id: 13759, invoice_year: 2026, invoice_number: 144, client_name: 'MIROVA', amount: 2760.37, vat: 20, status: 'En attente', sent_date: '2026-05-29', payment_date: null, paid: false, currency: 'EUR', notes: '', created_at: now, updated_at: now },
        { id: 13758, invoice_year: 2026, invoice_number: 143, client_name: 'CHANEL', amount: 2004, vat: 20, status: 'En attente', sent_date: '2026-05-29', payment_date: null, paid: false, currency: 'EUR', notes: '', created_at: now, updated_at: now },
        { id: 13757, invoice_year: 2026, invoice_number: 142, client_name: 'OFI INVEST', amount: 72, vat: 20, status: 'En attente', sent_date: '2026-05-29', payment_date: null, paid: false, currency: 'EUR', notes: '', created_at: now, updated_at: now },
      ],
    },
    users: [
      { id: 1, email: 'demo@wordsinvest.com', role: 'admin', full_name: 'Démo Wordsinvest', created_at: now },
      { id: 2, email: 'employee@crm.local', role: 'employee', full_name: 'Employé CRM', created_at: now },
      { id: 3, email: 'admin@crm.local', role: 'admin', full_name: 'Administrateur CRM', created_at: now },
    ],
    groups: [],
    logs: [
      { id: 1, action: 'update', entity: 'opportunities', entity_id: '73960', changed_fields: { stage: { before: 'livre', after: 'facture' } }, before_data: null, after_data: null, created_at: now, user_name: 'Démo Wordsinvest', user_email: 'demo@wordsinvest.com' },
    ],
  };
}

function loadState(): DemoState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  const state = initialState();
  saveState(state);
  return state;
}

function saveState(state: DemoState) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function nextId(rows: DemoRecord[]) {
  return rows.reduce((max, row) => Math.max(max, Number(row.id) || 0), 0) + 1;
}

function logChange(state: DemoState, action: string, entity: string, entityId: any, before: DemoRecord | null, after: DemoRecord | null) {
  const changed: Record<string, { before: any; after: any }> = {};
  if (before && after) {
    for (const key of Object.keys(after)) {
      if (JSON.stringify(before[key] ?? null) !== JSON.stringify(after[key] ?? null)) {
        changed[key] = { before: before[key] ?? null, after: after[key] ?? null };
      }
    }
  }
  state.logs.unshift({
    id: nextId(state.logs as any), action, entity, entity_id: entityId == null ? null : String(entityId),
    changed_fields: Object.keys(changed).length ? changed : null, before_data: before, after_data: after,
    created_at: new Date().toISOString(), user_name: DEMO_AUTH.user.fullName, user_email: DEMO_AUTH.user.email,
  });
}

function money(value: any) { return `${Number(value || 0).toFixed(2)} EUR`; }
function pct(value: any) { return `${Number(value || 0)}%`; }

function buildEntities(state: DemoState) {
  return {
    accounts: (state.records.accounts || []).map((r) => ({ _id: r.id, _entity: 'accounts', nom: r.name ?? '—', categorie: r.category ?? '—', email: r.email ?? '—', telephone: r.phone ?? '—', localisation: r.city ?? '—', note: r.rating ?? 0 })),
    contacts: (state.records.contacts || []).map((r) => ({ _id: r.id, _entity: 'contacts', nom: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || '—', compte: r.company ?? '—', email: r.email ?? '—', telephone: r.phone ?? '—', fonction: r.title ?? '—', localisation: r.city ?? '—' })),
    opportunities: (state.records.opportunities || []).map((r) => ({ _id: r.id, _entity: 'opportunities', _stage_column: 'stage', opportunite: r.name ?? '—', compte: r.account_name ?? '—', montant: money(r.amount), etape: r.stage ?? '—', probabilite: pct(r.probability), langues: r.languages ?? '—', prestation: r.service_type ?? '—' })),
    subcontractors: (state.records.suppliers || []).map((r) => ({ _id: r.id, _entity: 'suppliers', nom: `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim() || r.company || '—', societe: r.company ?? '—', email: r.email ?? '—', telephone: r.phone ?? '—', localisation: r.city ?? '—', specialite: r.specialty ?? '—' })),
    leads: [],
    invoices: (state.records.abstract_invoices || []).map((r) => ({ _id: r.id, _entity: 'abstract_invoices', _status_column: 'status', _date_envoi_column: 'sent_date', _date_paiement_column: 'payment_date', _paid_column: 'paid', reference: `${r.invoice_year ?? new Date().getFullYear()}-${r.invoice_number ?? r.id}`, client: r.client_name ?? '—', montant: money(r.amount), tva: pct(r.vat), statut: r.paid ? 'Payée' : (r.status ?? 'En attente'), date_envoi: r.sent_date ?? null, date_paiement: r.payment_date ?? null })),
  };
}

function buildSummary(state: DemoState) {
  const invoices = state.records.abstract_invoices || [];
  const revenue = invoices.reduce((sum, r) => sum + Number(r.amount || 0), 0);
  return {
    summary: [
      { label: 'Comptes', value: String((state.records.accounts || []).length) },
      { label: 'Contacts', value: String((state.records.contacts || []).length) },
      { label: 'Opportunités', value: String((state.records.opportunities || []).length) },
      { label: 'Factures', value: String(invoices.length) },
    ],
    summaryCards: [
      { label: 'CA facturé', value: `${new Intl.NumberFormat('fr-FR').format(revenue)} €` },
      { label: 'Opportunités', value: String((state.records.opportunities || []).length) },
      { label: 'Clients', value: String((state.records.accounts || []).length) },
      { label: 'Factures', value: String(invoices.length) },
    ],
  };
}

function buildTopClients(state: DemoState) {
  const map = new Map<string, { total: number; count: number }>();
  for (const inv of state.records.abstract_invoices || []) {
    const name = inv.client_name || 'Client';
    const current = map.get(name) || { total: 0, count: 0 };
    current.total += Number(inv.amount || 0); current.count += 1; map.set(name, current);
  }
  return Array.from(map.entries()).sort((a, b) => b[1].total - a[1].total).map(([nom, x]) => ({ nom, ca_facture: `${x.total.toFixed(2)} EUR`, factures: x.count, sante: x.total > 10000 ? 'Excellent' : 'Bon' }));
}

function bodyOf(options: RequestInit = {}) {
  if (!options.body || typeof options.body !== 'string') return {};
  try { return JSON.parse(options.body); } catch { return {}; }
}

function normalizePath(path: string) {
  return path.replace(/^https?:\/\/[^/]+\/api/, '').replace(/^\/api/, '') || '/';
}

export async function demoApi<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const p = normalizePath(path);
  const method = (options.method || 'GET').toUpperCase();
  const state = loadState();
  const body = bodyOf(options);

  if (p === '/auth/login') return DEMO_AUTH as T;
  if (p === '/entities') return buildEntities(state) as T;
  if (p === '/dashboard/summary') return buildSummary(state) as T;
  if (p === '/dashboard/top-clients') return { topClients: buildTopClients(state) } as T;
  if (p === '/admin/users') return { users: state.users } as T;
  if (p === '/admin/groups') return { groups: state.groups } as T;
  if (p === '/audit-logs') return { logs: state.logs } as T;

  if (p === '/app-users' && method === 'GET') return { users: state.users } as T;
  if (p === '/app-users' && method === 'POST') {
    const user = { id: nextId(state.users), email: body.email, role: body.role || 'employee', full_name: body.full_name || body.email, created_at: new Date().toISOString() };
    state.users.push(user); logChange(state, 'create', 'crm_app_users', user.id, null, user); saveState(state);
    return { user } as T;
  }
  const appUserMatch = p.match(/^\/app-users\/(\d+)$/);
  if (appUserMatch) {
    const id = Number(appUserMatch[1]); const idx = state.users.findIndex((u) => Number(u.id) === id);
    if (idx < 0) throw new Error('Utilisateur introuvable');
    if (method === 'PATCH') {
      const before = { ...state.users[idx] }; state.users[idx] = { ...state.users[idx], ...body }; delete state.users[idx].password;
      logChange(state, 'update', 'crm_app_users', id, before, state.users[idx]); saveState(state); return { user: state.users[idx] } as T;
    }
    if (method === 'DELETE') {
      const [before] = state.users.splice(idx, 1); logChange(state, 'delete', 'crm_app_users', id, before, null); saveState(state); return { success: true } as T;
    }
  }

  if (p === '/records/options/users') return { users: getDemoUserOptions() } as T;

  const schemaMatch = p.match(/^\/records\/([^/]+)\/schema$/);
  if (schemaMatch && method === 'GET') {
    const entity = schemaMatch[1]; return { table: entity, columns: SCHEMAS[entity] || [], record: {} } as T;
  }

  const recordMatch = p.match(/^\/records\/([^/]+)\/(\d+)$/);
  if (recordMatch) {
    const entity = recordMatch[1]; const id = Number(recordMatch[2]); const rows = state.records[entity] || [];
    const idx = rows.findIndex((r) => Number(r.id) === id);
    if (idx < 0) throw new Error('Enregistrement introuvable');
    if (method === 'GET') return { table: entity, columns: SCHEMAS[entity] || [], record: rows[idx] } as T;
    if (method === 'PATCH') {
      const before = { ...rows[idx] }; rows[idx] = { ...rows[idx], ...body, updated_at: new Date().toISOString() };
      logChange(state, 'update', entity, id, before, rows[idx]); saveState(state);
      return { table: entity, columns: SCHEMAS[entity] || [], record: rows[idx] } as T;
    }
  }

  const createMatch = p.match(/^\/records\/([^/]+)$/);
  if (createMatch && method === 'POST') {
    const entity = createMatch[1]; const rows = state.records[entity] || (state.records[entity] = []); const now = new Date().toISOString();
    const record = { id: nextId(rows), ...body, created_at: now, updated_at: now };
    if (entity === 'abstract_invoices') { record.currency ??= 'EUR'; record.status ??= 'En attente'; record.invoice_year ??= new Date().getFullYear(); }
    rows.unshift(record); logChange(state, 'create', entity, record.id, null, record); saveState(state);
    return { table: entity, columns: SCHEMAS[entity] || [], record } as T;
  }

  // Fallback for feature modules that are not shown in the main demo UI.
  if (p.startsWith('/invoices')) return [] as T;
  throw new Error(`Route de démo non implémentée : ${method} ${p}`);
}

export function getDemoUserOptions() {
  return loadState().users.map((u) => ({ id: Number(u.id), label: u.full_name || u.email || `Utilisateur ${u.id}` }));
}

export function resetDemoData() {
  const state = initialState(); saveState(state); return state;
}

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
}

export function downloadDemoQuote(data: any) {
  const rows = (data.lines || []).map((l: any) => `<tr><td>${l.description || ''}</td><td>${l.quantity || 0}</td><td>${l.unit_price_ht || 0} €</td><td>${l.vat_rate || 0}%</td></tr>`).join('');
  const html = `<!doctype html><meta charset="utf-8"><title>${data.quote_number}</title><style>body{font-family:Arial;padding:40px;color:#2f2f2f}h1{color:#8B0E3F}table{width:100%;border-collapse:collapse}td,th{border-bottom:1px solid #ddd;padding:8px;text-align:left}</style><h1>WORDSINVEST — Devis ${data.quote_number}</h1><p>${data.quote_date}</p><h2>${data.customer_name}</h2><p>${data.customer_address}<br>${data.customer_postal_city}<br>${data.customer_email}</p><p>Document : ${data.document_name || '—'} — Langue : ${data.target_language || '—'}</p><table><thead><tr><th>Prestation</th><th>Qté</th><th>PU HT</th><th>TVA</th></tr></thead><tbody>${rows}</tbody></table><p><em>Document généré en mode démonstration sans backend.</em></p>`;
  downloadBlob(html, `${data.quote_number || 'devis'}-demo.html`, 'text/html;charset=utf-8');
}

export function downloadDemoInvoice(invoice: any, form: any, lines: any[]) {
  const rows = lines.map((l) => `<tr><td>${l.service_date || ''}</td><td>${l.purchase_order || ''}</td><td>${l.prestation || ''}</td><td>${l.document_name || ''}</td><td>${l.requester_name || ''}</td><td>${l.language_pair || ''}</td><td>${Number(l.price_ht || 0).toFixed(2)} €</td></tr>`).join('');
  const html = `<!doctype html><meta charset="utf-8"><title>${form.invoice_number}</title><style>body{font-family:Arial;padding:40px;color:#2f4f73}h1{color:#8B0E3F}table{width:100%;border-collapse:collapse;margin-top:24px}td,th{border-bottom:1px solid #9db2c9;padding:8px;font-size:12px}</style><h1>WORDSINVEST</h1><h2>Facture n° ${form.invoice_number}</h2><p>${form.client_name}<br>${form.client_address || ''}<br>${form.invoice_date}</p><table><thead><tr><th>Date</th><th>Commande</th><th>Prestation</th><th>Document</th><th>Demandeur</th><th>Langues</th><th>Prix HT</th></tr></thead><tbody>${rows}</tbody></table><p><em>Aperçu HTML généré en mode démonstration sans backend.</em></p>`;
  downloadBlob(html, `${String(form.invoice_number || invoice.reference || 'facture').replaceAll(' ', '_')}-demo.html`, 'text/html;charset=utf-8');
}
