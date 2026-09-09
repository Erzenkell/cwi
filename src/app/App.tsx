import { useEffect, useMemo, useState, type ComponentType, type ReactNode, type FormEvent } from 'react';
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesCombined,
  FileText,
  Handshake,
  History,
  LayoutDashboard,
  LogOut,
  Search,
  Shield,
  Target,
  TrendingUp,
  Users,
  UserCog,
  Layers3,
  RefreshCw,
} from 'lucide-react';
import { refreshSession, logout } from './lib/auth';
import wordsinvestLogo from '../assets/wordsinvest-logo.png';

type Role = 'employee' | 'admin';
type EmployeeTab = 'COMPTES' | 'CONTACTS' | 'OPPORTUNITÉS' | 'SOUS-TRAITANT';
type AdminTab =
  'COMPTES' 
  | 'CONTACTS' 
  | 'OPPORTUNITÉS' 
  | 'SOUS-TRAITANT'
  // | 'PISTES'
  | 'FACTURES'
  | 'SYNTHÈSE'
  | 'MEILLEURS CLIENTS'
  // | 'GROUPES'
  | 'ADMINISTRATION'
  | 'LOGS';
type Tab = EmployeeTab | AdminTab;

type AuthResponse = {
  token: string;
  user: {
    id: number;
    email: string;
    role: Role;
    fullName: string;
  };
};

type DashboardStats = { label: string; value: string }[];
type EntityRow = Record<string, string | number | boolean | null>;
type EntityPayload = Record<string, EntityRow[]>;

type AuditLog = {
  id: number;
  action: string;
  entity: string;
  entity_id: string | null;
  changed_fields: Record<string, { before: any; after: any }> | null;
  before_data: Record<string, any> | null;
  after_data: Record<string, any> | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
};

type OpportunityRow = EntityRow & {
  _id: number;
  _entity: string;
  _stage_column?: string | null;
  opportunite: string;
  compte: string;
  montant: string;
  etape: string;
  probabilite: string;
  langues: string;
  prestation: string;
};

async function fetchAuditLogs(
  token: string,
  onTokenRefresh?: (data: AuthResponse) => void
) {
  return api<{ logs: AuditLog[] }>(
    '/audit-logs',
    {},
    token,
    onTokenRefresh
  );
}

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api';

const employeeTabs: { label: EmployeeTab; icon: ComponentType<any> }[] = [
  { label: 'COMPTES', icon: Building2 },
  { label: 'CONTACTS', icon: Users },
  { label: 'OPPORTUNITÉS', icon: Target },
  { label: 'SOUS-TRAITANT', icon: Handshake },
];

const adminTabs: { label: AdminTab; icon: ComponentType<any> }[] = [
  { label: 'COMPTES', icon: Building2 },
  { label: 'CONTACTS', icon: Users },
  { label: 'OPPORTUNITÉS', icon: Target },
  { label: 'SOUS-TRAITANT', icon: Handshake },
  // { label: 'PISTES', icon: BriefcaseBusiness },
  { label: 'FACTURES', icon: FileText },
  { label: 'SYNTHÈSE', icon: ChartNoAxesCombined },
  { label: 'MEILLEURS CLIENTS', icon: TrendingUp },
  // { label: 'GROUPES', icon: Layers3 },
  { label: 'ADMINISTRATION', icon: UserCog },
  { label: 'LOGS', icon: History },
];

const tabToKey: Record<Tab, string> = {
  COMPTES: 'accounts',
  CONTACTS: 'contacts',
  OPPORTUNITÉS: 'opportunities',
  'SOUS-TRAITANT': 'subcontractors',
  // PISTES: 'leads',
  FACTURES: 'invoices',
  SYNTHÈSE: 'summary',
  'MEILLEURS CLIENTS': 'topClients',
  // GROUPES: 'groups',
  ADMINISTRATION: 'administration',
  LOGS: 'logs',
};

const tabToEntity: Record<Tab, string | null> = {
  COMPTES: 'accounts',
  CONTACTS: 'contacts',
  OPPORTUNITÉS: 'opportunities',
  'SOUS-TRAITANT': 'suppliers',
  // PISTES: 'leads',
  FACTURES: 'abstract_invoices',
  SYNTHÈSE: null,
  'MEILLEURS CLIENTS': null,
  // GROUPES: 'groups',
  ADMINISTRATION: null,
  LOGS: 'logs',
};

const tabMeta: Record<Tab, { title: string; subtitle: string; columns: string[] }> = {
  COMPTES: {
    title: 'Comptes',
    subtitle: 'Comptes issus de la table accounts.',
    columns: ['Nom', 'Catégorie', 'Email', 'Téléphone', 'Localisation', 'Note'],
  },
  CONTACTS: {
    title: 'Contacts',
    subtitle: 'Contacts rattachés aux comptes via account_contacts.',
    columns: ['Nom', 'Compte', 'Email', 'Téléphone', 'Fonction', 'Localisation'],
  },
  OPPORTUNITÉS: {
    title: 'Opportunités',
    subtitle: 'Pipeline issu des opportunités.',
    columns: ['Opportunité', 'Compte', 'Montant', 'Étape', 'Probabilité', 'Langues', 'Prestation'],
  },
  'SOUS-TRAITANT': {
    title: 'Sous-traitants',
    subtitle: 'Sous-traitants issus de la table suppliers/subcontractors.',
    columns: ['Nom', 'Société', 'Email', 'Téléphone', 'Localisation', 'Spécialité'],
  },
  // PISTES: {
  //   title: 'Pistes',
  //   subtitle: 'Pistes commerciales issues de la table leads.',
  //   columns: ['Nom', 'Société', 'Statut', 'Source', 'Email', 'Téléphone', 'Note'],
  // },
  FACTURES: {
    title: 'Factures',
    subtitle: 'Factures issues de la base PostgreSQL.',
    columns: ['Référence', 'Client', 'Montant', 'TVA', 'Statut', 'Date envoi', 'Date paiement'],
  },
  SYNTHÈSE: {
    title: 'Synthèse',
    subtitle: 'Vue consolidée des indicateurs utiles au pilotage.',
    columns: ['Indicateur', 'Valeur'],
  },
  'MEILLEURS CLIENTS': {
    title: 'Meilleurs clients',
    subtitle: 'Classement calculé depuis les montants des factures.',
    columns: ['Nom', 'CA facturé', 'Factures', 'Santé'],
  },
  // GROUPES: {
  //   title: 'Groupes',
  //   subtitle: 'Segmentation interne pour pilotage et permissions.',
  //   columns: ['Nom', 'Membres', 'Créé le'],
  // },
  ADMINISTRATION: {
    title: 'Administration',
    subtitle: 'Gestion des utilisateurs de l’application CRM.',
    columns: [],
  },
  LOGS: {
    title: 'Logs',
    subtitle: 'Journal des créations, modifications et changements effectués dans le CRM.',
    columns: [],
  },
};

const TECHNICAL_FIELDS = new Set([
  'id',
  'created_at',
  'updated_at',
  'deleted_at',
  'old_uniqueid',
  'lock_version',
  'password',
  'password_hash',
  'encrypted_password',
  'reset_password_token',
  'remember_token',
  'confirmation_token',
]);

const CREATE_HIDDEN_FIELDS = new Set([
  'id',
  'user_id',
  'created_at',
  'updated_at',
  'deleted_at',
  'old_uniqueid',
  'status',
  'state',
  'access',
  'currency',
  'invoice_year',
  'lock_version',
]);

const CREATE_VISIBLE_FIELDS: Record<string, string[]> = {
  leads: [
    'first_name',
    'last_name',
    'company',
    'title',
    'source',
    'email',
    'alt_email',
    'phone',
    'mobile',
    'linkedin',
    'website',
    'description',
    'notes',
    'assigned_to',
  ],

  contacts: [
    'first_name',
    'last_name',
    'company',
    'title',
    'department',
    'email',
    'alt_email',
    'phone',
    'mobile',
    'linkedin',
    'address',
    'city',
    'country',
    'assigned_to',
  ],

  accounts: [
    'name',
    'email',
    'phone',
    'toll_free_phone',
    'website',
    'address',
    'city',
    'country',
    'rating',
    'assigned_to',
  ],

  opportunities: [
    'name',
    'subject',
    'amount',
    'budget',
    'stage',
    'probability',
    'source_language',
    'target_language',
    'task_type',
    'service_type',
    'description',
    'notes',
    'assigned_to',
  ],

  suppliers: [
    'first_name',
    'last_name',
    'name',
    'company',
    'email',
    'phone',
    'mobile',
    'specialty',
    'speciality',
    'skills',
    'address',
    'city',
    'country',
  ],

  subcontractors: [
    'first_name',
    'last_name',
    'name',
    'company',
    'email',
    'phone',
    'mobile',
    'specialty',
    'speciality',
    'skills',
    'address',
    'city',
    'country',
  ],

  abstract_invoices: [
    'account_id',
    'invoice_number',
    'amount',
    'vat',
    'due_date',
    'sent_date',
    'payment_date',
    'paid',
    'description',
    'notes',
  ],

  invoices: [
    'customer_name',
    'customer_siret',
    'customer_address',
    'issue_date',
    'due_date',
    'total_ttc',
    'notes',
  ],
};

const OPPORTUNITY_STAGE_OPTIONS = [
  'lance_s_t',
  'facture',
  'livre',
  'converted',
  'En attente',
  'Annulée',
];

function shouldShowColumnInModal(payload: RecordModalPayload, columnName: string) {
  if (isReadOnlyColumn(columnName)) return false;

  if (payload.mode !== 'create') {
    return true;
  }

  if (CREATE_HIDDEN_FIELDS.has(columnName)) {
    return false;
  }

  const allowedFields = CREATE_VISIBLE_FIELDS[payload.table];

  if (!allowedFields) {
    return !columnName.endsWith('_id');
  }

  return allowedFields.includes(columnName);
}

function buildCreateInitialRecord(
  table: string,
  columns: DbColumn[],
  user: AuthResponse['user']
) {
  const initialRecord: Record<string, any> = {};
  const columnNames = new Set(columns.map((column) => column.column_name));
  const today = new Date().toISOString().slice(0, 10);

  if (columnNames.has('user_id')) {
    initialRecord.user_id = user.id;
  }

  if (columnNames.has('assigned_to')) {
    initialRecord.assigned_to = user.id;
  }

  if (columnNames.has('status')) {
    initialRecord.status = 'En attente';
  }

  if (columnNames.has('state')) {
    initialRecord.state = 'En attente';
  }

  if (columnNames.has('access')) {
    initialRecord.access = 'Public';
  }

  if (columnNames.has('currency')) {
    initialRecord.currency = 'EUR';
  }

  if (columnNames.has('invoice_year')) {
    initialRecord.invoice_year = new Date().getFullYear();
  }

  if (columnNames.has('issue_date')) {
    initialRecord.issue_date = today;
  }

  if (columnNames.has('date')) {
    initialRecord.date = today;
  }

  const visibleFields = CREATE_VISIBLE_FIELDS[table];

  for (const column of columns) {
    const name = column.column_name;

    if (!shouldShowColumnInModal({ mode: 'create', table, columns, record: initialRecord }, name)) {
      continue;
    }

    if (visibleFields && !visibleFields.includes(name)) {
      continue;
    }

    if (!(name in initialRecord)) {
      initialRecord[name] = '';
    }
  }

  return initialRecord;
}

async function api<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
  onTokenRefresh?: (data: AuthResponse) => void,
): Promise<T> {
  async function doRequest(currentToken?: string) {
    return fetch(`${API_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
        ...(options.headers || {}),
      },
    });
  }

  let response = await doRequest(token);

  if (response.status === 401 && token) {
    const refreshed = await refreshSession();

    if (refreshed?.token) {
      onTokenRefresh?.(refreshed);
      response = await doRequest(refreshed.token);
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erreur réseau' }));
    throw new Error(error.message || 'Erreur réseau');
  }

  return response.json() as Promise<T>;
}

type AppUser = {
  id: number;
  email: string;
  role: Role;
  full_name: string;
  created_at: string;
};

async function fetchAppUsers(token: string, onTokenRefresh?: (data: AuthResponse) => void) {
  return api<{ users: AppUser[] }>('/app-users', {}, token, onTokenRefresh);
}

async function createAppUser(
  token: string,
  data: {
    email: string;
    password: string;
    role: Role;
    full_name: string;
  },
  onTokenRefresh?: (data: AuthResponse) => void,
) {
  return api<{ user: AppUser }>(
    '/app-users',
    {
      method: 'POST',
      body: JSON.stringify(data),
    },
    token,
    onTokenRefresh,
  );
}

async function updateAppUser(
  token: string,
  id: number,
  data: Partial<{
    email: string;
    password: string;
    role: Role;
    full_name: string;
  }>,
  onTokenRefresh?: (data: AuthResponse) => void,
) {
  return api<{ user: AppUser }>(
    `/app-users/${id}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    },
    token,
    onTokenRefresh,
  );
}

async function deleteAppUser(
  token: string,
  id: number,
  onTokenRefresh?: (data: AuthResponse) => void,
) {
  return api<{ success: boolean }>(
    `/app-users/${id}`,
    {
      method: 'DELETE',
    },
    token,
    onTokenRefresh,
  );
}


type QuoteLine = {
  description: string;
  quantity: number;
  unit_price_ht: number;
  vat_rate: number;
};

type QuoteForm = {
  quote_date: string;
  quote_number: string;
  customer_name: string;
  customer_address: string;
  customer_postal_city: string;
  customer_phone: string;
  customer_email: string;
  document_name: string;
  target_language: string;
  notes: string;
  lines: QuoteLine[];
};

type InvoiceRow = EntityRow & {
  _id: number;
  _entity: string;
  _status_column?: string | null;
  _date_envoi_column?: string | null;
  _date_paiement_column?: string | null;
  _paid_column?: string | null;
  reference: string;
  client: string;
  montant: string;
  tva: string;
  statut: string;
  date_envoi: string | null;
  date_paiement: string | null;
};

const INVOICE_STATUS_OPTIONS = [
  'En attente',
  'Payée',
  'Annulée',
  'Brouillon',
  'Relancée',
];

function formatDateForInput(value: string | number | null | undefined) {
  if (!value || value === '—') return '';
  return String(value).slice(0, 10);
}

function buildDefaultQuoteForm(): QuoteForm {
  const today = new Date().toISOString().slice(0, 10);
  const stamp = String(Date.now()).slice(-6);

  return {
    quote_date: today,
    quote_number: `DEVIS-${today.slice(0, 4)}-${stamp}`,
    customer_name: '',
    customer_address: '',
    customer_postal_city: '',
    customer_phone: '',
    customer_email: '',
    document_name: '',
    target_language: '',
    notes: '',
    lines: [
      {
        description: 'Traduction',
        quantity: 1,
        unit_price_ht: 0,
        vat_rate: 20,
      },
    ],
  };
}

function lineTotalHt(line: QuoteLine) {
  return Number(line.quantity || 0) * Number(line.unit_price_ht || 0);
}

function quoteSubtotal(lines: QuoteLine[]) {
  return lines.reduce((sum, line) => sum + lineTotalHt(line), 0);
}

function quoteVat(lines: QuoteLine[]) {
  return lines.reduce(
    (sum, line) => sum + lineTotalHt(line) * (Number(line.vat_rate || 0) / 100),
    0,
  );
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(value || 0);
}

async function generateQuoteDocx(
  token: string,
  data: QuoteForm,
  onTokenRefresh?: (data: AuthResponse) => void,
) {
  async function request(currentToken: string) {
    return fetch(`${API_URL}/quotes/generate`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${currentToken}`,
      },
      body: JSON.stringify(data),
    });
  }

  let response = await request(token);

  if (response.status === 401) {
    const refreshed = await refreshSession();

    if (refreshed?.token) {
      onTokenRefresh?.(refreshed);
      response = await request(refreshed.token);
    }
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erreur génération devis' }));
    throw new Error(error.message || 'Erreur génération devis');
  }

  const blob = await response.blob();
  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] || `${data.quote_number || 'devis'}.docx`;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

function formatValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(value);
  return value;
}


function LoginCard({
  onLogin,
  loading,
  error,
}: {
  onLogin: (email: string, password: string) => void;
  loading: boolean;
  error: string | null;
}) {
  const [email, setEmail] = useState('employee@crm.local');
  const [password, setPassword] = useState('password123');

  return (
    <div className="w-full max-w-6xl overflow-hidden rounded-[34px] border border-[#E8E3DF] bg-[#FFFDFB] shadow-2xl shadow-[#2F2F2F]/10 md:grid md:grid-cols-[1.15fr_0.85fr]">
      <div className="relative overflow-hidden bg-[#F8F7F6] p-8 text-[#2F2F2F] md:p-10">
        <div className="absolute -right-16 -top-20 h-72 w-72 rounded-full bg-[#8B0E3F]/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-[#4E4E4E]/10 blur-3xl" />

        <div className="relative">
          <img
            src={wordsinvestLogo}
            alt="Wordsinvest"
            className="h-auto w-72 max-w-full object-contain"
          />

          <div className="mt-10 h-px w-24 bg-[#8B0E3F]" />

          <h1 className="mt-8 max-w-2xl font-serif text-5xl font-semibold leading-tight tracking-[-0.04em] text-[#2F2F2F] md:text-6xl">
            Un CRM élégant pour piloter vos relations et opportunités.
          </h1>

          <p className="mt-5 max-w-xl text-base leading-7 text-[#6B6764]">
            Interface alignée avec l’identité Wordsinvest : bordeaux profond,
            gris chauds, contraste anthracite et espaces respirants pour une
            expérience professionnelle et haut de gamme.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              ['CRM', 'relation client'],
              ['Postgres', 'données métier'],
              ['Node', 'API sécurisée'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-3xl border border-[#E8E3DF] bg-white/70 p-5 shadow-sm backdrop-blur">
                <div className="font-serif text-3xl font-semibold text-[#8B0E3F]">{value}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.22em] text-[#8A8582]">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between bg-[#2F2F2F] p-8 text-white md:p-10">
        <div>
          <div className="text-xs uppercase tracking-[0.28em] text-[#D8C5CE]">Accès sécurisé</div>
          <h2 className="mt-3 font-serif text-3xl font-semibold tracking-[-0.03em]">Connexion</h2>
          <p className="mt-3 text-sm leading-6 text-white/65">
            Connecte-toi pour accéder aux vues, aux données PostgreSQL et aux
            outils d’administration du CRM.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-white/65">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#C05A83] focus:bg-white/[0.09]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-white/65">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[#C05A83] focus:bg-white/[0.09]"
            />
          </div>

          <button
            disabled={loading}
            onClick={() => onLogin(email, password)}
            className="w-full rounded-2xl bg-[#8B0E3F] px-5 py-4 font-medium text-white shadow-lg shadow-[#8B0E3F]/20 transition hover:bg-[#A0124D] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          {error ? (
            <div className="rounded-2xl border border-[#C05A83]/40 bg-[#8B0E3F]/20 px-4 py-3 text-sm text-[#F6DCE7]">
              {error}
            </div>
          ) : null}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm text-white/70">
          Démo : employee@crm.local / admin@crm.local — mot de passe : password123
        </div>
      </div>
    </div>
  );
}


function KpiCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-[24px] border border-[#E8E3DF] bg-[#FFFDFB] p-5 shadow-sm shadow-[#2F2F2F]/5">
      <div className="flex items-center justify-between text-[#8A8582]">
        <span className="text-xs uppercase tracking-[0.18em]">{label}</span>
        <span className="text-[#8B0E3F]">{icon}</span>
      </div>
      <div className="mt-4 font-serif text-3xl font-semibold tracking-[-0.03em] text-[#2F2F2F]">{value}</div>
    </div>
  );
}

function getDisplayRow(row: EntityRow) {
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => !key.startsWith('_'))
  );
}

function normalizeRows(rows: EntityRow[], columns: string[]) {
  return rows.map((row) => {
    const displayRow = getDisplayRow(row);
    const values = Object.values(displayRow);

    const normalized: EntityRow = {};

    columns.forEach((column, index) => {
      normalized[column] = values[index] ?? '—';
    });

    return normalized;
  });
}

function DataTable({
  columns,
  rows,
  onRowClick,
}: {
  columns: string[];
  rows: EntityRow[];
  onRowClick?: (row: EntityRow) => void;
}) {
  const safeRows = normalizeRows(rows, columns);

  return (
    <div className="overflow-hidden rounded-[24px] border border-[#E8E3DF] bg-[#FFFDFB] shadow-sm shadow-[#2F2F2F]/5">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#F8F7F6] text-[#6B6764]">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {safeRows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-[#8A8582]" colSpan={columns.length}>
                  Aucune donnée disponible.
                </td>
              </tr>
            ) : (
              safeRows.map((displayRow, index) => (
                <tr
                  key={index}
                  onClick={() => onRowClick?.(rows[index])}
                  className="cursor-pointer border-t border-[#EFEAE6] text-[#4E4E4E] transition hover:bg-[#8B0E3F]/[0.05]"
                >
                  {columns.map((column) => (
                    <td key={column} className="px-4 py-3">
                      {formatValue(displayRow[column])}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Panel({
  activeTab,
  payload,
  onRowClick,
  authToken,
  onRefresh,
  onGenerateInvoice,
}: {
  activeTab: Tab;
  payload: EntityPayload & { summaryCards?: DashboardStats };
  onRowClick: (row: EntityRow) => void;
  authToken: string;
  onRefresh: () => Promise<void>;
  onGenerateInvoice: (row: InvoiceRow) => void;
}) {
  if (activeTab === 'SYNTHÈSE') {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {(payload.summaryCards || []).map((item) => (
            <KpiCard
              key={item.label}
              label={item.label}
              value={item.value}
              icon={<ChartNoAxesCombined className="size-4" />}
            />
          ))}
        </div>

        <DataTable
          columns={tabMeta[activeTab].columns}
          rows={(payload.summary || []).map((item) => ({
            indicateur: item.label,
            valeur: item.value,
          }))}
        />
      </div>
    );
  }

  if (activeTab === 'FACTURES') {
    return (
      <InvoicesQuickTable
        rows={(payload.invoices || []) as InvoiceRow[]}
        token={authToken}
        onSaved={onRefresh}
        onGenerateInvoice={onGenerateInvoice}
      />
    );
  }

  if (activeTab === 'OPPORTUNITÉS') {
    return (
      <OpportunitiesQuickTable
        rows={(payload.opportunities || []) as OpportunityRow[]}
        token={authToken}
        onSaved={onRefresh}
        onRowClick={onRowClick}
      />
    );
  }

  const rows = payload[tabToKey[activeTab]] || [];

  return (
    <DataTable
      columns={tabMeta[activeTab].columns}
      rows={rows}
      onRowClick={onRowClick}
    />
  );
}


function QuoteModal({
  initialValue,
  generating,
  error,
  onClose,
  onGenerate,
}: {
  initialValue: QuoteForm;
  generating: boolean;
  error: string | null;
  onClose: () => void;
  onGenerate: (values: QuoteForm) => void;
}) {
  const [form, setForm] = useState<QuoteForm>(initialValue);

  useEffect(() => {
    setForm(initialValue);
  }, [initialValue]);

  function updateLine(index: number, patch: Partial<QuoteLine>) {
    setForm((current) => ({
      ...current,
      lines: current.lines.map((line, lineIndex) =>
        lineIndex === index ? { ...line, ...patch } : line,
      ),
    }));
  }

  function addLine() {
    setForm((current) => ({
      ...current,
      lines: [
        ...current.lines,
        {
          description: '',
          quantity: 1,
          unit_price_ht: 0,
          vat_rate: 20,
        },
      ],
    }));
  }

  function removeLine(index: number) {
    setForm((current) => ({
      ...current,
      lines: current.lines.filter((_, lineIndex) => lineIndex !== index),
    }));
  }

  const subtotal = quoteSubtotal(form.lines);
  const vat = quoteVat(form.lines);
  const total = subtotal + vat;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2F2F2F]/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[28px] bg-[#FFFDFB] shadow-2xl shadow-[#2F2F2F]/20">
        <div className="flex items-center justify-between border-b border-[#E8E3DF] px-6 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#8A8582]">
              Modèle Wordsinvest 2026
            </div>
            <h2 className="mt-1 font-serif text-3xl font-semibold tracking-[-0.04em] text-[#2F2F2F]">
              Générer un devis
            </h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-[#E8E3DF] px-4 py-2 text-sm text-[#4E4E4E] hover:bg-[#F8F7F6]"
          >
            Fermer
          </button>
        </div>

        <div className="max-h-[68vh] overflow-y-auto p-6">
          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div className="rounded-3xl border border-[#E8E3DF] bg-white p-5">
                <h3 className="font-serif text-xl font-semibold text-[#2F2F2F]">Informations du devis</h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#4E4E4E]">Date</label>
                    <input
                      type="date"
                      value={form.quote_date}
                      onChange={(e) => setForm({ ...form, quote_date: e.target.value })}
                      className="w-full rounded-2xl border border-[#E8E3DF] px-4 py-3 outline-none focus:border-[#8B0E3F]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#4E4E4E]">Numéro de devis</label>
                    <input
                      value={form.quote_number}
                      onChange={(e) => setForm({ ...form, quote_number: e.target.value })}
                      className="w-full rounded-2xl border border-[#E8E3DF] px-4 py-3 outline-none focus:border-[#8B0E3F]"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#4E4E4E]">Nom du document</label>
                    <input
                      value={form.document_name}
                      onChange={(e) => setForm({ ...form, document_name: e.target.value })}
                      placeholder="Ex : Rapport annuel 2026"
                      className="w-full rounded-2xl border border-[#E8E3DF] px-4 py-3 outline-none focus:border-[#8B0E3F]"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#4E4E4E]">Langue cible</label>
                    <input
                      value={form.target_language}
                      onChange={(e) => setForm({ ...form, target_language: e.target.value })}
                      placeholder="Ex : anglais"
                      className="w-full rounded-2xl border border-[#E8E3DF] px-4 py-3 outline-none focus:border-[#8B0E3F]"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-[#E8E3DF] bg-white p-5">
                <h3 className="font-serif text-xl font-semibold text-[#2F2F2F]">Client</h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-[#4E4E4E]">Nom du client</label>
                    <input
                      value={form.customer_name}
                      onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                      className="w-full rounded-2xl border border-[#E8E3DF] px-4 py-3 outline-none focus:border-[#8B0E3F]"
                      required
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-[#4E4E4E]">Adresse</label>
                    <input
                      value={form.customer_address}
                      onChange={(e) => setForm({ ...form, customer_address: e.target.value })}
                      className="w-full rounded-2xl border border-[#E8E3DF] px-4 py-3 outline-none focus:border-[#8B0E3F]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#4E4E4E]">Code postal et ville</label>
                    <input
                      value={form.customer_postal_city}
                      onChange={(e) => setForm({ ...form, customer_postal_city: e.target.value })}
                      className="w-full rounded-2xl border border-[#E8E3DF] px-4 py-3 outline-none focus:border-[#8B0E3F]"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-[#4E4E4E]">Téléphone</label>
                    <input
                      value={form.customer_phone}
                      onChange={(e) => setForm({ ...form, customer_phone: e.target.value })}
                      className="w-full rounded-2xl border border-[#E8E3DF] px-4 py-3 outline-none focus:border-[#8B0E3F]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-[#4E4E4E]">Email</label>
                    <input
                      type="email"
                      value={form.customer_email}
                      onChange={(e) => setForm({ ...form, customer_email: e.target.value })}
                      className="w-full rounded-2xl border border-[#E8E3DF] px-4 py-3 outline-none focus:border-[#8B0E3F]"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-3xl border border-[#E8E3DF] bg-white p-5">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-serif text-xl font-semibold text-[#2F2F2F]">Prestations</h3>
                  <button
                    type="button"
                    onClick={addLine}
                    className="rounded-2xl border border-[#8B0E3F]/25 px-4 py-2 text-sm font-medium text-[#8B0E3F] hover:bg-[#8B0E3F]/5"
                  >
                    Ajouter une ligne
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {form.lines.map((line, index) => (
                    <div key={index} className="rounded-2xl border border-[#EFEAE6] bg-[#F8F7F6] p-4">
                      <div className="flex justify-between gap-3">
                        <label className="text-sm font-medium text-[#4E4E4E]">Ligne {index + 1}</label>
                        {form.lines.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="text-xs font-medium text-rose-600 hover:text-rose-700"
                          >
                            Supprimer
                          </button>
                        ) : null}
                      </div>

                      <div className="mt-3 space-y-3">
                        <input
                          value={line.description}
                          onChange={(e) => updateLine(index, { description: e.target.value })}
                          placeholder="Description"
                          className="w-full rounded-2xl border border-[#E8E3DF] bg-white px-4 py-3 outline-none focus:border-[#8B0E3F]"
                        />

                        <div className="grid grid-cols-3 gap-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.quantity}
                            onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                            className="w-full rounded-2xl border border-[#E8E3DF] bg-white px-4 py-3 outline-none focus:border-[#8B0E3F]"
                            placeholder="Qté"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.unit_price_ht}
                            onChange={(e) => updateLine(index, { unit_price_ht: Number(e.target.value) })}
                            className="w-full rounded-2xl border border-[#E8E3DF] bg-white px-4 py-3 outline-none focus:border-[#8B0E3F]"
                            placeholder="PU HT"
                          />
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={line.vat_rate}
                            onChange={(e) => updateLine(index, { vat_rate: Number(e.target.value) })}
                            className="w-full rounded-2xl border border-[#E8E3DF] bg-white px-4 py-3 outline-none focus:border-[#8B0E3F]"
                            placeholder="TVA %"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-[#E8E3DF] bg-[#2F2F2F] p-5 text-white">
                <div className="text-xs uppercase tracking-[0.2em] text-white/45">Résumé</div>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-white/60">Total HT</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">TVA</span>
                    <span>{formatCurrency(vat)}</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-3 font-serif text-2xl font-semibold">
                    <span>Total TTC</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-[#4E4E4E]">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="min-h-24 w-full rounded-2xl border border-[#E8E3DF] px-4 py-3 outline-none focus:border-[#8B0E3F]"
                  placeholder="Informations complémentaires à ajouter au devis"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#E8E3DF] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-2xl border border-[#E8E3DF] px-5 py-3 text-sm text-[#4E4E4E] hover:bg-[#F8F7F6]"
          >
            Annuler
          </button>

          <button
            disabled={generating}
            onClick={() => onGenerate(form)}
            className="rounded-2xl bg-[#8B0E3F] px-5 py-3 text-sm font-medium text-white hover:bg-[#A0124D] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {generating ? 'Génération...' : 'Générer le devis Word'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LogsPanel({
  auth,
  onTokenRefresh,
}: {
  auth: AuthResponse;
  onTokenRefresh: (data: AuthResponse) => void;
}) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadLogs() {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchAuditLogs(auth.token, onTokenRefresh);
      setLogs(data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement des logs impossible');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [auth.token]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">
            Journal des changements
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Toutes les créations et modifications effectuées dans le CRM.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Utilisateur</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Table</th>
                <th className="px-4 py-3 font-medium">Élément</th>
                <th className="px-4 py-3 font-medium">Champs modifiés</th>
              </tr>
            </thead>

            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  onClick={() => setSelectedLog(log)}
                  className="cursor-pointer border-t border-slate-100 text-slate-700 transition hover:bg-indigo-50/60"
                >
                  <td className="px-4 py-3">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    {log.user_name || log.user_email || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">{log.entity}</td>
                  <td className="px-4 py-3">{log.entity_id || '—'}</td>
                  <td className="px-4 py-3">
                    {log.changed_fields
                      ? Object.keys(log.changed_fields).join(', ')
                      : '—'}
                  </td>
                </tr>
              ))}

              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-slate-400">
                    Aucun log disponible.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {selectedLog ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                  {selectedLog.entity} #{selectedLog.entity_id}
                </div>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                  Détail du changement
                </h2>
              </div>

              <button
                onClick={() => setSelectedLog(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
              >
                Fermer
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-700">
                    Informations
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-slate-600">
                    <div>Action : {selectedLog.action}</div>
                    <div>Table : {selectedLog.entity}</div>
                    <div>Élément : {selectedLog.entity_id || '—'}</div>
                    <div>
                      Utilisateur : {selectedLog.user_name || selectedLog.user_email || '—'}
                    </div>
                    <div>
                      Date : {new Date(selectedLog.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="text-sm font-semibold text-slate-700">
                    Champs modifiés
                  </div>

                  <div className="mt-3 space-y-3 text-sm">
                    {selectedLog.changed_fields ? (
                      Object.entries(selectedLog.changed_fields).map(([field, change]) => (
                        <div key={field} className="rounded-xl bg-slate-50 p-3">
                          <div className="font-medium text-slate-800">{field}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            Avant : {formatValue(change.before)}
                          </div>
                          <div className="text-xs text-slate-500">
                            Après : {formatValue(change.after)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400">Aucun détail.</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">
                    Avant
                  </h3>
                  <pre className="max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
                    {JSON.stringify(selectedLog.before_data, null, 2)}
                  </pre>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-700">
                    Après
                  </h3>
                  <pre className="max-h-80 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-slate-100">
                    {JSON.stringify(selectedLog.after_data, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function InvoicesQuickTable({
  rows,
  token,
  onSaved,
  onGenerateInvoice,
}: {
  rows: InvoiceRow[];
  token: string;
  onSaved: () => Promise<void> | void;
  onGenerateInvoice: (row: InvoiceRow) => void;
}) {
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function quickUpdateInvoice(
    row: InvoiceRow,
    changes: Partial<{
      statut: string;
      date_envoi: string | null;
      date_paiement: string | null;
    }>
  ) {
    const payload: Record<string, any> = {};

    if (changes.statut !== undefined && row._status_column) {
      payload[row._status_column] = changes.statut;
    }

    if (changes.date_envoi !== undefined && row._date_envoi_column) {
      payload[row._date_envoi_column] = changes.date_envoi || null;
    }

    if (changes.date_paiement !== undefined && row._date_paiement_column) {
      payload[row._date_paiement_column] = changes.date_paiement || null;

      if (row._paid_column) {
        payload[row._paid_column] = Boolean(changes.date_paiement);
      }

      if (row._status_column && changes.date_paiement) {
        payload[row._status_column] = 'Payée';
      }
    }

    if (Object.keys(payload).length === 0) return;

    setSavingRowId(row._id);
    setError(null);

    try {
      await api(
        `/records/${row._entity}/${row._id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
        token
      );

      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Mise à jour impossible');
    } finally {
      setSavingRowId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Référence</th>
                <th className="px-4 py-3 font-medium">Client</th>
                <th className="px-4 py-3 font-medium">Montant</th>
                <th className="px-4 py-3 font-medium">TVA</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Date envoi</th>
                <th className="px-4 py-3 font-medium">Date paiement</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-400" colSpan={7}>
                    Aucune facture.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const saving = savingRowId === row._id;

                  return (
                    <tr key={row._id} className="border-t border-slate-100 text-slate-700">
                      <td className="px-4 py-3">{formatValue(row.reference)}</td>
                      <td className="px-4 py-3">{formatValue(row.client)}</td>
                      <td className="px-4 py-3">{formatValue(row.montant)}</td>
                      <td className="px-4 py-3">{formatValue(row.tva)}</td>

                      <td className="px-4 py-3">
                        <select
                          value={row.statut || 'En attente'}
                          disabled={saving}
                          onChange={(e) =>
                            quickUpdateInvoice(row, { statut: e.target.value })
                          }
                          className="w-full min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400"
                        >
                          {INVOICE_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="date"
                          defaultValue={formatDateForInput(row.date_envoi)}
                          disabled={saving}
                          onChange={(e) =>
                            quickUpdateInvoice(row, {
                              date_envoi: e.target.value || null,
                            })
                          }
                          className="w-full min-w-[150px] rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <input
                          type="date"
                          defaultValue={formatDateForInput(row.date_paiement)}
                          disabled={saving}
                          onChange={(e) =>
                            quickUpdateInvoice(row, {
                              date_paiement: e.target.value || null,
                            })
                          }
                          className="w-full min-w-[150px] rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-400"
                        />
                      </td>

                      <td className="px-4 py-3">
                        <button
                          onClick={() => onGenerateInvoice(row)}
                          className="rounded-xl bg-[#8B0E3F] px-3 py-2 text-xs font-medium text-white hover:bg-[#6f0b32]"
                        >
                          Générer facture
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type InvoiceGenerationLine = {
  service_date: string;
  purchase_order: string;
  prestation: string;
  document_name: string;
  requester_name: string;
  language_pair: string;
  price_ht: number;
};

function InvoiceGenerationModal({
  invoice,
  token,
  onClose,
  onGenerated,
}: {
  invoice: InvoiceRow;
  token: string;
  onClose: () => void;
  onGenerated: () => Promise<void> | void;
}) {
  const [saving, setSaving] = useState(false);
  const [einvoiceSaving, setEinvoiceSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    invoice_number: invoice.reference?.startsWith('FA')
      ? invoice.reference
      : `FA ${invoice.reference}`,
    invoice_date: formatDateForInput(invoice.date_envoi) || new Date().toISOString().slice(0, 10),
    client_name: invoice.client || '',
    client_address: '',
    vat_rate: Number(String(invoice.tva || '20').replace('%', '')) || 20,
    greeting: 'Madame,',
  });

  const [lines, setLines] = useState<InvoiceGenerationLine[]>([
    {
      service_date: '',
      purchase_order: '',
      prestation: 'Traduction',
      document_name: '',
      requester_name: '',
      language_pair: '',
      price_ht: Number(String(invoice.montant || '0').replace(/[^\d.,-]/g, '').replace(',', '.')) || 0,
    },
  ]);

  function updateLine(index: number, patch: Partial<InvoiceGenerationLine>) {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...patch } : line))
    );
  }

  function addLine() {
    setLines((current) => [
      ...current,
      {
        service_date: '',
        purchase_order: '',
        prestation: 'Traduction',
        document_name: '',
        requester_name: '',
        language_pair: '',
        price_ht: 0,
      },
    ]);
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, i) => i !== index));
  }

  async function generatePdf() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/invoice-documents/${invoice._id}/generate-pdf`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          lines,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Génération impossible');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${form.invoice_number.replaceAll(' ', '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);

      await onGenerated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Génération impossible');
    } finally {
      setSaving(false);
    }
  }

  async function sendEInvoice() {
    setEinvoiceSaving(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/invoice-documents/${invoice._id}/send-einvoice`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Préparation e-facture impossible');
      }

      await onGenerated();
      alert("Facture marquée comme prête pour l'envoi électronique. L'intégration réelle sera ajoutée plus tard.");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Préparation e-facture impossible');
    } finally {
      setEinvoiceSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Facture
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">
              Générer une facture Wordsinvest
            </h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Fermer
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6">
          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Numéro de facture
              </label>
              <input
                value={form.invoice_number}
                onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Date de facture
              </label>
              <input
                type="date"
                value={form.invoice_date}
                onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Client
              </label>
              <input
                value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                TVA %
              </label>
              <input
                type="number"
                value={form.vat_rate}
                onChange={(e) => setForm({ ...form, vat_rate: Number(e.target.value) })}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Adresse client
              </label>
              <textarea
                value={form.client_address}
                onChange={(e) => setForm({ ...form, client_address: e.target.value })}
                className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900">
              Prestations
            </h3>

            <button
              type="button"
              onClick={addLine}
              className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Ajouter une ligne
            </button>
          </div>

          <div className="mt-4 space-y-4">
            {lines.map((line, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 p-4">
                <div className="grid gap-3 md:grid-cols-7">
                  <input
                    type="date"
                    value={line.service_date}
                    onChange={(e) => updateLine(index, { service_date: e.target.value })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Date prestation"
                  />

                  <input
                    value={line.purchase_order}
                    onChange={(e) => updateLine(index, { purchase_order: e.target.value })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Commande"
                  />

                  <input
                    value={line.prestation}
                    onChange={(e) => updateLine(index, { prestation: e.target.value })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Prestation"
                  />

                  <input
                    value={line.document_name}
                    onChange={(e) => updateLine(index, { document_name: e.target.value })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Nom document"
                  />

                  <input
                    value={line.requester_name}
                    onChange={(e) => updateLine(index, { requester_name: e.target.value })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Demandeur"
                  />

                  <input
                    value={line.language_pair}
                    onChange={(e) => updateLine(index, { language_pair: e.target.value })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Langues"
                  />

                  <input
                    type="number"
                    value={line.price_ht}
                    onChange={(e) => updateLine(index, { price_ht: Number(e.target.value) })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Prix HT"
                  />
                </div>

                {lines.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="mt-3 text-sm text-rose-600 hover:underline"
                  >
                    Supprimer cette ligne
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            onClick={sendEInvoice}
            disabled={einvoiceSaving}
            className="rounded-2xl border border-[#8B0E3F] px-5 py-3 text-sm font-medium text-[#8B0E3F] hover:bg-[#8B0E3F]/5 disabled:opacity-60"
          >
            {einvoiceSaving ? 'Préparation...' : 'Envoyer facture électronique'}
          </button>

          <button
            onClick={generatePdf}
            disabled={saving}
            className="rounded-2xl bg-[#8B0E3F] px-5 py-3 text-sm font-medium text-white hover:bg-[#6f0b32] disabled:opacity-60"
          >
            {saving ? 'Génération...' : 'Générer PDF'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AdministrationPanel({
  auth,
  onTokenRefresh,
}: {
  auth: AuthResponse;
  onTokenRefresh: (data: AuthResponse) => void;
}) {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'employee' as Role,
  });

  const [editingId, setEditingId] = useState<number | null>(null);

  async function loadUsers() {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchAppUsers(auth.token, onTokenRefresh);
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, [auth.token]);

  function resetForm() {
    setEditingId(null);
    setForm({
      email: '',
      password: '',
      full_name: '',
      role: 'employee',
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editingId) {
        const payload: Partial<typeof form> = {
          email: form.email,
          full_name: form.full_name,
          role: form.role,
        };

        if (form.password.trim()) {
          payload.password = form.password;
        }

        await updateAppUser(auth.token, editingId, payload, onTokenRefresh);
      } else {
        await createAppUser(auth.token, form, onTokenRefresh);
      }

      resetForm();
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  }

  async function removeUser(id: number) {
    if (!window.confirm('Supprimer cet utilisateur ?')) return;

    setError(null);

    try {
      await deleteAppUser(auth.token, id, onTokenRefresh);
      await loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Suppression impossible');
    }
  }

  function editUser(user: AppUser) {
    setEditingId(user.id);
    setForm({
      email: user.email,
      password: '',
      full_name: user.full_name,
      role: user.role,
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
      <form
        onSubmit={submit}
        className="rounded-[24px] border border-[#E8E3DF] bg-[#FFFDFB] p-6 shadow-sm shadow-[#2F2F2F]/5"
      >
        <h2 className="text-xl font-semibold text-[#2F2F2F]">
          {editingId ? 'Modifier un utilisateur' : 'Créer un utilisateur'}
        </h2>

        <p className="mt-2 text-sm text-[#6B6764]">
          Ces comptes servent uniquement à se connecter à l’application CRM.
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-[#4E4E4E]">
              Nom complet
            </label>
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full rounded-2xl border border-[#E8E3DF] px-4 py-3 outline-none focus:border-[#8B0E3F]"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#4E4E4E]">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-2xl border border-[#E8E3DF] px-4 py-3 outline-none focus:border-[#8B0E3F]"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#4E4E4E]">
              Mot de passe {editingId ? '(laisser vide pour ne pas changer)' : ''}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-2xl border border-[#E8E3DF] px-4 py-3 outline-none focus:border-[#8B0E3F]"
              required={!editingId}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-[#4E4E4E]">
              Rôle
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              className="w-full rounded-2xl border border-[#E8E3DF] px-4 py-3 outline-none focus:border-[#8B0E3F]"
            >
              <option value="employee">Salarié</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              disabled={saving}
              type="submit"
              className="rounded-2xl bg-[#8B0E3F] px-5 py-3 text-sm font-medium text-white hover:bg-[#A0124D] disabled:opacity-60"
            >
              {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Créer'}
            </button>

            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-[#E8E3DF] px-5 py-3 text-sm text-[#4E4E4E] hover:bg-[#F8F7F6]"
              >
                Annuler
              </button>
            ) : null}
          </div>
        </div>
      </form>

      <div className="rounded-[24px] border border-[#E8E3DF] bg-[#FFFDFB] shadow-sm shadow-[#2F2F2F]/5">
        <div className="flex items-center justify-between border-b border-[#EFEAE6] px-6 py-4">
          <h2 className="text-xl font-semibold text-[#2F2F2F]">Utilisateurs</h2>

          <button
            onClick={loadUsers}
            className="rounded-2xl border border-[#E8E3DF] px-4 py-2 text-sm text-[#4E4E4E] hover:bg-[#F8F7F6]"
          >
            {loading ? 'Chargement...' : 'Actualiser'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#F8F7F6] text-[#6B6764]">
              <tr>
                <th className="px-4 py-3 font-medium">Nom</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Rôle</th>
                <th className="px-4 py-3 font-medium">Créé le</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-[#8A8582]">
                    Aucun utilisateur.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-t border-[#EFEAE6] text-[#4E4E4E]">
                    <td className="px-4 py-3">{user.full_name}</td>
                    <td className="px-4 py-3">{user.email}</td>
                    <td className="px-4 py-3">
                      {user.role === 'admin' ? 'Administrateur' : 'Salarié'}
                    </td>
                    <td className="px-4 py-3">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => editUser(user)}
                          className="rounded-xl border border-[#E8E3DF] px-3 py-2 text-xs text-[#4E4E4E] hover:bg-[#F8F7F6]"
                        >
                          Modifier
                        </button>

                        <button
                          onClick={() => removeUser(user.id)}
                          disabled={user.id === auth.user.id}
                          className="rounded-xl border border-rose-200 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type DbColumn = {
  column_name: string;
  data_type: string;
  is_nullable: 'YES' | 'NO';
};

type RecordModalMode = 'create' | 'edit';

type RecordModalPayload = {
  mode: RecordModalMode;
  table: string;
  columns: DbColumn[];
  record: Record<string, any>;
};

function isReadOnlyColumn(column: string) {
  return [
    'id',
    'created_at',
    'updated_at',
    'deleted_at',
    'old_uniqueid',
    'password',
    'password_hash',
    'encrypted_password',
    'reset_password_token',
    'remember_token',
    'confirmation_token',
  ].includes(column);
}

function inputTypeFromPgType(type: string) {
  if (type.includes('integer') || type.includes('numeric') || type.includes('double')) return 'number';
  if (type.includes('timestamp') || type.includes('date')) return 'datetime-local';
  if (type.includes('boolean')) return 'checkbox';
  return 'text';
}

function normalizeInputValue(value: any) {
  if (value === null || value === undefined) return '';

  if (typeof value === 'string' && value.includes('T')) {
    return value.slice(0, 16);
  }

  return value;
}

function EditRecordModal({
  payload,
  saving,
  error,
  onClose,
  onSave,
}: {
  payload: RecordModalPayload;
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (values: Record<string, any>) => void;
}) {
  const [form, setForm] = useState<Record<string, any>>(payload.record);

  useEffect(() => {
    setForm(payload.record);
  }, [payload.record]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2F2F2F]/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-[#FFFDFB] shadow-2xl shadow-[#2F2F2F]/20">
        <div className="flex items-center justify-between border-b border-[#E8E3DF] px-6 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#8A8582]">
              {payload.table}
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-[#2F2F2F]">
              {payload.mode === 'create'
                ? 'Créer un nouvel enregistrement'
                : `Modifier l’enregistrement #${payload.record.id}`}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-[#E8E3DF] px-4 py-2 text-sm text-[#4E4E4E] hover:bg-[#F8F7F6]"
          >
            Fermer
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-6">
          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {payload.columns
                .filter((column) => shouldShowColumnInModal(payload, column.column_name))
                .map((column) => {
              const name = column.column_name;
              const readOnly = isReadOnlyColumn(name);
              const value = form[name];

              if (column.data_type === 'boolean') {
                return (
                  <label
                    key={name}
                    className="flex items-center justify-between rounded-2xl border border-[#E8E3DF] p-4"
                  >
                    <div>
                      <div className="font-medium text-[#2F2F2F]">{name}</div>
                      <div className="text-xs text-[#8A8582]">{column.data_type}</div>
                    </div>

                    <input
                      type="checkbox"
                      checked={Boolean(value)}
                      disabled={readOnly}
                      onChange={(e) => setForm({ ...form, [name]: e.target.checked })}
                    />
                  </label>
                );
              }

              if (column.data_type === 'text' || column.data_type.includes('json')) {
                return (
                  <div key={name} className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-[#4E4E4E]">
                      {name}
                      <span className="ml-2 text-xs font-normal text-[#8A8582]">
                        {column.data_type}
                      </span>
                    </label>

                    <textarea
                      value={
                        typeof value === 'object' && value !== null
                          ? JSON.stringify(value, null, 2)
                          : normalizeInputValue(value)
                      }
                      disabled={readOnly}
                      onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                      className="min-h-24 w-full rounded-2xl border border-[#E8E3DF] px-4 py-3 text-sm outline-none focus:border-[#8B0E3F] disabled:bg-[#F3EFEB] disabled:text-[#8A8582]"
                    />
                  </div>
                );
              }

              return (
                <div key={name}>
                  <label className="mb-2 block text-sm font-medium text-[#4E4E4E]">
                    {name}
                    <span className="ml-2 text-xs font-normal text-[#8A8582]">
                      {column.data_type}
                    </span>
                  </label>

                  <input
                    type={inputTypeFromPgType(column.data_type)}
                    value={normalizeInputValue(value)}
                    disabled={readOnly}
                    onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                    className="w-full rounded-2xl border border-[#E8E3DF] px-4 py-3 text-sm outline-none focus:border-[#8B0E3F] disabled:bg-[#F3EFEB] disabled:text-[#8A8582]"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#E8E3DF] px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-2xl border border-[#E8E3DF] px-5 py-3 text-sm text-[#4E4E4E] hover:bg-[#F8F7F6]"
          >
            Annuler
          </button>

          <button
            disabled={saving}
            onClick={() => onSave(form)}
            className="rounded-2xl bg-[#8B0E3F] px-5 py-3 text-sm font-medium text-white hover:bg-[#A0124D] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}


function OpportunitiesQuickTable({
  rows,
  token,
  onSaved,
  onRowClick,
}: {
  rows: OpportunityRow[];
  token: string;
  onSaved: () => Promise<void> | void;
  onRowClick: (row: EntityRow) => void;
}) {
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const dynamicStageOptions = Array.from(
    new Set([
      ...OPPORTUNITY_STAGE_OPTIONS,
      ...rows
        .map((row) => String(row.etape || '').trim())
        .filter((value) => value && value !== '—'),
    ])
  );

  async function quickUpdateStage(row: OpportunityRow, stage: string) {
    if (!row._id || !row._entity || !row._stage_column) {
      setError("Impossible de modifier l'étape : colonne introuvable.");
      return;
    }

    setSavingRowId(row._id);
    setError(null);

    try {
      await api(
        `/records/${row._entity}/${row._id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            [row._stage_column]: stage,
          }),
        },
        token
      );

      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Modification de l'étape impossible");
    } finally {
      setSavingRowId(null);
    }
  }

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Opportunité</th>
                <th className="px-4 py-3 font-medium">Compte</th>
                <th className="px-4 py-3 font-medium">Montant</th>
                <th className="px-4 py-3 font-medium">Étape</th>
                <th className="px-4 py-3 font-medium">Probabilité</th>
                <th className="px-4 py-3 font-medium">Langues</th>
                <th className="px-4 py-3 font-medium">Prestation</th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-400" colSpan={7}>
                    Aucune opportunité.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const saving = savingRowId === row._id;

                  return (
                    <tr
                      key={row._id}
                      onClick={() => onRowClick(row)}
                      className="cursor-pointer border-t border-slate-100 text-slate-700 transition hover:bg-indigo-50/60"
                    >
                      <td className="px-4 py-3">{formatValue(row.opportunite)}</td>
                      <td className="px-4 py-3">{formatValue(row.compte)}</td>
                      <td className="px-4 py-3">{formatValue(row.montant)}</td>

                      <td className="px-4 py-3">
                        <select
                          value={row.etape || ''}
                          disabled={saving || !row._stage_column}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => quickUpdateStage(row, e.target.value)}
                          className="w-full min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                        >
                          <option value="">—</option>

                          {dynamicStageOptions.map((stage) => (
                            <option key={stage} value={stage}>
                              {stage}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3">{formatValue(row.probabilite)}</td>
                      <td className="px-4 py-3">{formatValue(row.langues)}</td>
                      <td className="px-4 py-3">{formatValue(row.prestation)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('COMPTES');
  const [payload, setPayload] = useState<EntityPayload & { summaryCards?: DashboardStats }>({});
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalPayload, setModalPayload] = useState<RecordModalPayload | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [quoteInitialValue, setQuoteInitialValue] = useState<QuoteForm>(() => buildDefaultQuoteForm());
  const [quoteGenerating, setQuoteGenerating] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [invoiceToGenerate, setInvoiceToGenerate] = useState<InvoiceRow | null>(null);

  async function openRecord(row: EntityRow) {
    if (!auth?.token) return;

    const entity = row._entity;
    const id = row._id;

    if (!entity || !id) {
      setError("Impossible d'ouvrir cet élément : identifiant manquant.");
      return;
    }

    setModalLoading(true);
    setModalError(null);

    try {
      const data = await api<RecordModalPayload>(
        `/records/${entity}/${id}`,
        {},
        auth.token,
        setAuth
      );

      setModalPayload(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ouverture impossible');
    } finally {
      setModalLoading(false);
    }
  }

  async function openCreateRecord() {
    if (!auth?.token) return;

    const entity = tabToEntity[activeTab];

    if (!entity) {
      setError(`Création indisponible pour la vue ${activeTab}.`);
      return;
    }

    setModalLoading(true);
    setModalError(null);

    try {
      const data = await api<Omit<RecordModalPayload, 'mode'>>(
        `/records/${entity}/schema`,
        {},
        auth.token,
        setAuth
      );

      const initialRecord = buildCreateInitialRecord(
        data.table,
        data.columns,
        auth.user
      );

      setModalPayload({
        mode: 'create',
        table: data.table,
        columns: data.columns,
        record: initialRecord,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible');
    } finally {
      setModalLoading(false);
    }
  }

  async function saveRecord(values: Record<string, any>) {
    if (!auth?.token || !modalPayload) return;

    setModalSaving(true);
    setModalError(null);

    try {
      if (modalPayload.mode === 'create') {
        const created = await api<Partial<RecordModalPayload> & { record: Record<string, any> }>(
          `/records/${modalPayload.table}`,
          {
            method: 'POST',
            body: JSON.stringify(values),
          },
          auth.token,
          setAuth
        );

        setModalPayload({
          mode: 'edit',
          table: created.table || modalPayload.table,
          columns: created.columns || modalPayload.columns,
          record: created.record,
        });

        await refreshData();
        return;
      }

      const updated = await api<Partial<RecordModalPayload> & { record: Record<string, any> }>(
        `/records/${modalPayload.table}/${modalPayload.record.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify(values),
        },
        auth.token,
        setAuth
      );

      setModalPayload({
        mode: 'edit',
        table: updated.table || modalPayload.table,
        columns: updated.columns || modalPayload.columns,
        record: updated.record,
      });

      await refreshData();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : 'Enregistrement impossible');
    } finally {
      setModalSaving(false);
    }
  }


  function openQuoteModal() {
    setQuoteInitialValue(buildDefaultQuoteForm());
    setQuoteError(null);
    setQuoteModalOpen(true);
  }

  async function handleGenerateQuote(values: QuoteForm) {
    if (!auth?.token) return;

    setQuoteGenerating(true);
    setQuoteError(null);

    try {
      await generateQuoteDocx(auth.token, values, setAuth);
      setQuoteModalOpen(false);
    } catch (err) {
      setQuoteError(err instanceof Error ? err.message : 'Génération du devis impossible');
    } finally {
      setQuoteGenerating(false);
    }
  }

  const tabs = useMemo(() => {
    if (auth?.user.role === 'admin') return adminTabs;
    return employeeTabs;
  }, [auth]);

  useEffect(() => {
    async function restoreSession() {
      setBootstrapping(true);
      setError(null);

      try {
        const restored = await refreshSession();

        if (restored?.token && restored?.user) {
          setAuth(restored);
        } else {
          setAuth(null);
        }
      } catch {
        setAuth(null);
      } finally {
        setBootstrapping(false);
      }
    }

    restoreSession();
  }, []);

  useEffect(() => {
    if (!auth) return;

    const firstTab = auth.user.role === 'admin' ? adminTabs[0].label : employeeTabs[0].label;
    setActiveTab(firstTab);
  }, [auth?.user.role]);

  async function login(email: string, password: string) {
    setLoading(true);
    setError(null);

    try {
      const data = await api<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      setAuth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible');
    } finally {
      setLoading(false);
    }
  }

  async function refreshData() {
    if (!auth?.token) return;

    setDataLoading(true);
    setError(null);

    const updateToken = (data: AuthResponse) => {
      setAuth(data);
    };

    try {
      const [entities, summary, topClients, users, groups] = await Promise.all([
        api<EntityPayload>('/entities', {}, auth.token, updateToken),
        api<{ summary: DashboardStats; summaryCards: DashboardStats }>(
          '/dashboard/summary',
          {},
          auth.token,
          updateToken,
        ),
        api<{ topClients: EntityRow[] }>(
          '/dashboard/top-clients',
          {},
          auth.token,
          updateToken,
        ),
        auth.user.role === 'admin'
          ? api<{ users: EntityRow[] }>('/admin/users', {}, auth.token, updateToken)
          : Promise.resolve({ users: [] }),
        auth.user.role === 'admin'
          ? api<{ groups: EntityRow[] }>('/admin/groups', {}, auth.token, updateToken)
          : Promise.resolve({ groups: [] }),
      ]);

      setPayload({
        ...entities,
        summary: summary.summary.map((item) => ({
          label: item.label,
          value: item.value,
        })),
        summaryCards: summary.summaryCards,
        topClients: topClients.topClients || [],
        users: users.users || [],
        groups: groups.groups || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    } finally {
      setDataLoading(false);
    }
  }

  useEffect(() => {
    if (auth?.token) {
      refreshData();
    }
  }, [auth?.token]);

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setAuth(null);
      setPayload({});
      setError(null);
      setActiveTab('COMPTES');
    }
  }

  if (bootstrapping && !auth) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(139,14,63,0.16),_transparent_34%),linear-gradient(180deg,_#F8F7F6,_#EFEAE6)] px-4 py-10 md:px-8">
        <div className="mx-auto flex min-h-[85vh] max-w-7xl items-center justify-center text-[#2F2F2F]">
          <div className="rounded-3xl border border-[#E8E3DF] bg-[#FFFDFB]/80 px-8 py-6 shadow-2xl backdrop-blur">
            <div className="flex items-center gap-3">
              <RefreshCw className="size-5 animate-spin" />
              <span>Restauration de la session...</span>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!auth) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(139,14,63,0.16),_transparent_34%),linear-gradient(180deg,_#F8F7F6,_#EFEAE6)] px-4 py-10 md:px-8">
        <div className="mx-auto flex min-h-[85vh] max-w-7xl items-center justify-center">
          <LoginCard onLogin={login} loading={loading} error={error} />
        </div>
      </main>
    );
  }

  const activeMeta = tabMeta[activeTab];

  return (
    <main className="min-h-screen bg-[#F8F7F6] text-[#2F2F2F]">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-[#E8E3DF] bg-[#2F2F2F] px-5 py-6 text-white">
          <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
            <img src={wordsinvestLogo} alt="Wordsinvest" className="h-auto w-full rounded-2xl bg-white p-3" />
            <div className="mt-4 flex items-center gap-3">
              <div className="rounded-2xl bg-[#8B0E3F]/25 p-3 text-[#F2DCE5]">
                <LayoutDashboard className="size-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-white/45">Wordsinvest</div>
                <div className="font-serif text-lg font-semibold">CRM métier</div>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm text-white">
            <div className="text-white/45">Connecté en tant que</div>
            <div className="mt-1 font-medium text-white">{auth.user.fullName}</div>
            <div className="text-white/45">{auth.user.role}</div>
          </div>

          <nav className="mt-8 space-y-2">
            {tabs.map(({ label, icon: Icon }) => {
              const isActive = activeTab === label;

              return (
                <button
                  key={label}
                  onClick={() => setActiveTab(label)}
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition ${
                    isActive
                      ? 'bg-[#8B0E3F] text-white shadow-lg shadow-[#8B0E3F]/20'
                      : 'text-white/75 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>

          <button
            onClick={handleLogout}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/75 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="size-4" /> Déconnexion
          </button>
        </aside>

        <section className="p-4 md:p-8">
          <header className="flex flex-col gap-4 rounded-[28px] bg-[#FFFDFB] p-5 shadow-sm shadow-[#2F2F2F]/5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.2em] text-[#8A8582]">
                {auth.user.role === 'admin' ? 'admin' : 'salarié'}
              </div>
              <h1 className="mt-2 font-serif text-4xl font-semibold tracking-[-0.04em] text-[#2F2F2F]">{activeMeta.title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-[#6B6764]">
                {activeMeta.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-[#E8E3DF] bg-[#F8F7F6] px-4 py-3 text-[#6B6764]">
                <Search className="size-4" /> Recherche globale
              </div>

              <button
                onClick={openQuoteModal}
                className="flex items-center gap-2 rounded-2xl bg-[#2F2F2F] px-4 py-3 text-sm font-medium text-white hover:bg-[#4E4E4E]"
              >
                <FileText className="size-4" />
                Générer un devis
              </button>

              <button
                onClick={refreshData}
                className="flex items-center gap-2 rounded-2xl border border-[#E8E3DF] bg-white px-4 py-3 text-sm text-[#4E4E4E] hover:bg-[#F8F7F6]"
              >
                <RefreshCw className={`size-4 ${dataLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </button>

              {tabToEntity[activeTab] ? (
                <button
                  onClick={openCreateRecord}
                  className="flex items-center gap-2 rounded-2xl bg-[#8B0E3F] px-4 py-3 text-sm font-medium text-white hover:bg-[#A0124D]"
                >
                  Créer
                </button>
              ) : null}

              <button className="rounded-2xl border border-[#E8E3DF] bg-white p-3 text-[#4E4E4E] hover:bg-[#F8F7F6]">
                <Bell className="size-4" />
              </button>
            </div>
          </header>

          {/* <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            <KpiCard label="Modules actifs" value={String(tabs.length)} icon={<Layers3 className="size-4" />} />
            <KpiCard label="Rôle" value={auth.user.role === 'admin' ? 'Admin' : 'Salarié'} icon={<Shield className="size-4" />} />
            <KpiCard label="Backend" value={dataLoading ? 'Sync...' : 'Connecté'} icon={<BriefcaseBusiness className="size-4" />} />
            <KpiCard label="Base" value="PostgreSQL" icon={<Building2 className="size-4" />} />
          </div> */}

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-6">
            {activeTab === 'ADMINISTRATION' ? (
              <AdministrationPanel
                auth={auth}
                onTokenRefresh={setAuth}
              />
            ) : activeTab === 'LOGS' ? (
              <LogsPanel
                auth={auth}
                onTokenRefresh={setAuth}
              />
            ) : (
              <Panel
                activeTab={activeTab}
                payload={payload}
                onRowClick={openRecord}
                authToken={auth.token}
                onRefresh={refreshData}
                onGenerateInvoice={setInvoiceToGenerate}
              />
            )}
          </div>
        </section>
      </div>

      {quoteModalOpen ? (
        <QuoteModal
          initialValue={quoteInitialValue}
          generating={quoteGenerating}
          error={quoteError}
          onClose={() => {
            setQuoteModalOpen(false);
            setQuoteError(null);
          }}
          onGenerate={handleGenerateQuote}
        />
      ) : null}

      {modalLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2F2F2F]/60 text-white backdrop-blur-sm">
          <div className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/10 px-8 py-6">
            <RefreshCw className="size-5 animate-spin" />
            Chargement de l’enregistrement...
          </div>
        </div>
      ) : null}

      {modalPayload ? (
        <EditRecordModal
          payload={modalPayload}
          saving={modalSaving}
          error={modalError}
          onClose={() => {
            setModalPayload(null);
            setModalError(null);
          }}
          onSave={saveRecord}
        />
      ) : null}

      {invoiceToGenerate ? (
        <InvoiceGenerationModal
          invoice={invoiceToGenerate}
          token={auth.token}
          onClose={() => setInvoiceToGenerate(null)}
          onGenerated={refreshData}
        />
      ) : null}
    </main>
  );
}