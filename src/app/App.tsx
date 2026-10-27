import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode, type FormEvent } from 'react';
import { getFieldLabel } from './lib/fieldLabels';
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
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Trash2,
} from 'lucide-react';
import { refreshSession, logout } from './lib/auth';
import wordsinvestLogo from '../assets/wordsinvest-logo.png';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

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
  _delivery_date?: string | null;
  _created_at?: string | null;

  id_opportunite: number;
  campaign_id: number | null;

  opportunite: string;
  compte: string;
  montant: string;
  etape: string;
  marge: number | string | null;
  langues: string;
  prestation: string;
};

type SupplierOption = {
  id: number;
  label: string;
  language_pairs?: string | null;
  word_rate?: number | string | null;
  flat_rate?: number | string | null;
};

type SupplierService = {
  id: number;
  prestation: string;
  service_date: string;
  langue: string;
  type_prestation: string;
  role: string;
  amount_column: string;
  amount: number | string;
};

type UserOption = {
  id: number;
  label: string;
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
    columns: [
      'Nom',
      'Catégorie',
      'Email',
      'Téléphone',
      'Localisation',
    ],
  },
  'OPPORTUNITÉS': {
    title: 'Opportunités',
    subtitle: 'Suivi des opportunités commerciales.',
    columns: [
      'Langues',
      'ID',
      'Opportunité',
      'Compte',
      'Montant',
      'Livraison',
      'Création',
      'Étape',
      'Marge',
      'Prestation',
    ],
  },
  CONTACTS: {
    title: 'Contacts',
    subtitle: 'Contacts rattachés aux comptes via account_contacts.',
    columns: ['Nom', 'Compte', 'Email', 'Téléphone', 'Fonction', 'Localisation'],
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
  'subscribed_users',
  'user_id',
  'access',
  'currency',
  'doc_format',
  'allow_all_language_pairs',
  'do_not_call',
  'nda',
  'email_invoice',
  'skype',
]);

const GLOBAL_EDIT_HIDDEN_FIELDS = new Set([
  'access',
  'currency',
  'closes_on',
  'close_on',
  'lock_version',
  'old_uniqueid',
]);

const ACCOUNT_EDIT_HIDDEN_FIELDS = new Set([
  'rating',
  'score',
]);

const OPPORTUNITY_EDIT_HIDDEN_FIELDS = new Set([
  'access',
  'currency',
  'close_on',
  'closes_on',
  'subcontract_unit_price',
  'probability',
  'subscribed_users',
  'user_id',
  'campaign_id',
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
    'first_name', 'last_name', 'company', 'source', 'email', 'phone', 'rating', 'score',
  ],
  contacts: [
    'first_name', 'last_name', 'name', 'account_id',
    'email', 'alt_email', 'email_address',
    'phone', 'mobile', 'alt_phone', 'telephone',
    'title', 'job_title', 'role', 'department', 'position',
    'location', 'city', 'address',
  ],
  accounts: [
    'name', 'company', 'company_name', 'account_name',
    'sector', 'industry', 'account_type', 'type',
    'email', 'email_address', 'phone', 'toll_free_phone', 'mobile', 'telephone',
    'location', 'city', 'address', 'billing_address',
  ],
  opportunities: [
    'word_count', 'name', 'label', 'title', 'subject', 'account_id',
    'amount', 'value', 'value_eur', 'revenue', 'budget', 'stage',
    'unit_price', 'subcontract_unit_price',
    'task_type', 'service_type', 'type', 'category', 'out_date',
  ],
  suppliers: [
    'first_name', 'last_name', 'name', 'company', 'company_name', 'business_name',
    'email', 'alt_email', 'email_address', 'phone', 'alt_phone', 'mobile', 'telephone',
    'location', 'city', 'address', 'country',
    'specialty', 'speciality', 'skills', 'service_type',
    'language_pairs', 'word_rate', 'flat_rate',
  ],
  subcontractors: [
    'first_name', 'last_name', 'name', 'company', 'company_name', 'business_name',
    'email', 'alt_email', 'email_address', 'phone', 'alt_phone', 'mobile', 'telephone',
    'location', 'city', 'address', 'country',
    'specialty', 'speciality', 'skills', 'service_type',
    'language_pairs', 'word_rate', 'flat_rate',
  ],
  abstract_invoices: [
    'account_id', 'invoice_number', 'amount', 'vat', 'sent_date', 'payment_date', 'paid',
  ],
  invoices: [
    'customer_name', 'invoice_number', 'total_ttc', 'vat', 'sent_date', 'payment_date', 'paid',
  ],
};

const OPPORTUNITY_STAGE_OPTIONS = [
  'Proposition',
  'Lancé',
  'Refusé',
  'Livraison',
  'Facturé',
  'Test gratuit',
];

function shouldShowColumnInModal(
  payload: RecordModalPayload,
  columnName: string
) {
  if (payload.mode === 'create') {
    if (payload.table === 'opportunities' && columnName === 'account_id') return false;
    if (['abstract_invoices', 'invoices'].includes(payload.table) &&
        ['account_id', 'customer_id', 'client_id', 'account_name', 'customer_name', 'client', 'client_name'].includes(columnName)) return false;
    if (['abstract_invoices', 'invoices'].includes(payload.table) &&
        ['invoice_number', 'number', 'reference', 'invoice_year', 'year'].includes(columnName)) {
      return false;
    }
    const visibleFields = CREATE_VISIBLE_FIELDS[payload.table];
    if (visibleFields && !visibleFields.includes(columnName)) {
      return false;
    }
  }

  if (TECHNICAL_FIELDS.has(columnName)) {
    return false;
  }

  if (
    payload.mode === 'edit' &&
    GLOBAL_EDIT_HIDDEN_FIELDS.has(columnName)
  ) {
    return false;
  }

  if (
    payload.table === 'accounts' &&
    payload.mode === 'edit' &&
    ACCOUNT_EDIT_HIDDEN_FIELDS.has(columnName)
  ) {
    return false;
  }

  if (
    payload.table === 'opportunities' &&
    payload.mode === 'edit' &&
    OPPORTUNITY_EDIT_HIDDEN_FIELDS.has(columnName)
  ) {
    return false;
  }

  if (
    payload.table === 'accounts' &&
    payload.mode === 'create' &&
    [
      'name',
      'company',
      'company_name',
      'account_name',
      'client_name',
      'customer_name',
    ].includes(columnName)
  ) {
    return false;
  }

  if (
    payload.mode === 'create' &&
    CREATE_HIDDEN_FIELDS.has(columnName)
  ) {
    return false;
  }

  /*
   * Les langues des opportunités sont gérées
   * par le sélecteur multiple dédié.
   */
  if (
    payload.table === 'opportunities' &&
    payload.mode === 'create' &&
    [
      'language',
      'languages',
      'language_pair',
      'source_language',
      'target_language',
    ].includes(columnName)
  ) {
    return false;
  }

  return true;
}

function buildCreateInitialRecord(
  table: string,
  columns: DbColumn[],
  user: AuthResponse['user']
) {
  const initialRecord: Record<string, any> = {};
  const columnNames = new Set(columns.map((column) => column.column_name));
  const today = new Date().toISOString().slice(0, 10);

  if (table === 'accounts') {
    initialRecord._client_name = '';
    initialRecord._company_name = '';
  }

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

  for (const column of columns) {
    const name = column.column_name;

    if (!shouldShowColumnInModal({ mode: 'create', table, columns, record: initialRecord }, name)) {
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
        description: 'Mots nouveaux',
        quantity: 0,
        unit_price_ht: 0,
        vat_rate: 20,
      },
      {
        description: 'Mots approximatifs',
        quantity: 0,
        unit_price_ht: 0,
        vat_rate: 20,
      },
      {
        description: 'Mots exacts',
        quantity: 0,
        unit_price_ht: 0,
        vat_rate: 20,
      },
      {
        description: 'Mots répétés',
        quantity: 0,
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
  const [showPassword, setShowPassword] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loading) onLogin(email, password);
  }

  return (
    <div className="relative w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/70 bg-[#FFFDFB] shadow-[0_32px_90px_-32px_rgba(47,47,47,0.35)] md:grid md:min-h-[560px] md:grid-cols-[1.08fr_0.92fr]">
      <div className="relative flex min-h-52 items-center justify-center overflow-hidden bg-[#F7F3F1] p-8 text-[#2F2F2F] md:min-h-0 md:p-12">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(139,14,63,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(139,14,63,0.035)_1px,transparent_1px)] bg-[size:34px_34px]" />
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#8B0E3F]/10 blur-[80px]" />
        <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-[#2F2F2F]/10 blur-[90px]" />
        <div className="absolute right-10 top-10 h-2 w-2 rounded-full bg-[#8B0E3F] md:right-14 md:top-14" />

        <div className="relative flex w-full justify-center">
          <img
            src={wordsinvestLogo}
            alt="Wordsinvest"
            className="h-auto w-64 max-w-full object-contain drop-shadow-sm md:w-80"
          />
        </div>
      </div>

      <div className="relative flex items-center bg-[#292929] p-7 text-white sm:p-10 md:p-12">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent md:inset-y-0 md:left-0 md:right-auto md:h-auto md:w-px" />
        <form onSubmit={handleSubmit} className="w-full">
          <h2 className="font-serif text-[2.15rem] font-semibold leading-none tracking-[-0.04em]">Connexion</h2>

          <div className="mt-10 space-y-5">
          <div>
            <label htmlFor="login-email" className="mb-2 block text-[0.8rem] font-medium text-white/60">Email</label>
            <div className="group relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-white/35 transition-colors group-focus-within:text-[#D984A6]" />
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.055] pl-12 pr-4 text-[0.95rem] text-white outline-none transition duration-200 placeholder:text-white/30 hover:border-white/20 focus:border-[#C75B86] focus:bg-white/[0.075] focus:shadow-[0_0_0_4px_rgba(139,14,63,0.18)]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="mb-2 block text-[0.8rem] font-medium text-white/60">Mot de passe</label>
            <div className="group relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-[18px] -translate-y-1/2 text-white/35 transition-colors group-focus-within:text-[#D984A6]" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 w-full rounded-xl border border-white/10 bg-white/[0.055] pl-12 pr-12 text-[0.95rem] text-white outline-none transition duration-200 placeholder:text-white/30 hover:border-white/20 focus:border-[#C75B86] focus:bg-white/[0.075] focus:shadow-[0_0_0_4px_rgba(139,14,63,0.18)]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-lg text-white/40 transition hover:bg-white/[0.06] hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C75B86]"
              >
                {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#9C124A] px-5 text-[0.95rem] font-semibold text-white shadow-[0_14px_34px_-14px_rgba(139,14,63,0.9)] transition duration-200 hover:-translate-y-0.5 hover:bg-[#AE1857] hover:shadow-[0_18px_38px_-14px_rgba(139,14,63,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D984A6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#292929] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            <span>{loading ? 'Connexion...' : 'Se connecter'}</span>
            {!loading ? <ArrowRight className="size-[18px] transition-transform group-hover:translate-x-1" /> : null}
          </button>

          {error ? (
            <div role="alert" className="rounded-xl border border-[#C05A83]/35 bg-[#8B0E3F]/20 px-4 py-3 text-sm text-[#F6DCE7]">
              {error}
            </div>
          ) : null}
          </div>
        </form>
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

function normalizeRows(
  rows: EntityRow[],
  columns: string[]
) {
  return rows.map((row) => {
    const displayRow = getDisplayRow(row);
    const values = Object.values(displayRow);

    const normalized: EntityRow = {
      _id: row._id,
      _entity: row._entity,
    };

    columns.forEach((column, index) => {
      normalized[column] = values[index] ?? '—';
    });

    return normalized;
  });
}

type SortDirection = 'asc' | 'desc';

type SortConfig = {
  key: string;
  direction: SortDirection;
} | null;

const frenchCollator = new Intl.Collator('fr', {
  sensitivity: 'base',
  numeric: true,
});

function getSortableValue(value: unknown) {
  if (value === null || value === undefined || value === '—') {
    return '';
  }

  if (typeof value === 'number') {
    return value;
  }

  const stringValue = String(value).trim();

  // Date ISO : 2026-05-29
  if (/^\d{4}-\d{2}-\d{2}/.test(stringValue)) {
    const timestamp = new Date(stringValue).getTime();

    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
  }

  // Valeurs comme "2 382,00 EUR", "2382.00 EUR", "20%"
  const numericCandidate = stringValue
    .replace(/\s/g, '')
    .replace(',', '.')
    .replace(/EUR/gi, '')
    .replace('%', '');

  if (/^-?\d+(\.\d+)?$/.test(numericCandidate)) {
    return Number(numericCandidate);
  }

  return stringValue;
}

function compareSortValues(a: unknown, b: unknown) {
  const valueA = getSortableValue(a);
  const valueB = getSortableValue(b);

  if (valueA === '' && valueB === '') return 0;
  if (valueA === '') return 1;
  if (valueB === '') return -1;

  if (typeof valueA === 'number' && typeof valueB === 'number') {
    return valueA - valueB;
  }

  return frenchCollator.compare(String(valueA), String(valueB));
}

function useSortableRows<T extends Record<string, any>>(rows: T[]) {
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  const sortedRows = useMemo(() => {
    if (!sortConfig) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      const result = compareSortValues(
        a[sortConfig.key],
        b[sortConfig.key]
      );

      return sortConfig.direction === 'asc'
        ? result
        : -result;
    });
  }, [rows, sortConfig]);

  function requestSort(key: string) {
    setSortConfig((current) => {
      if (!current || current.key !== key) {
        return {
          key,
          direction: 'asc',
        };
      }

      return {
        key,
        direction:
          current.direction === 'asc'
            ? 'desc'
            : 'asc',
      };
    });
  }

  return {
    sortedRows,
    sortConfig,
    requestSort,
  };
}

function SortableHeader({
  label,
  sortKey,
  sortConfig,
  onSort,
  className = '',
}: {
  label: string;
  sortKey: string;
  sortConfig: SortConfig;
  onSort: (key: string) => void;
  className?: string;
}) {
  const active = sortConfig?.key === sortKey;

  return (
    <th
      className={`px-4 py-3 font-medium ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="group flex items-center gap-2 text-left transition hover:text-[#8B0E3F]"
      >
        <span>{label}</span>

        <span
          className={`text-[10px] transition ${
            active
              ? 'text-[#8B0E3F]'
              : 'text-slate-300 group-hover:text-slate-500'
          }`}
        >
          {!active
            ? '↕'
            : sortConfig.direction === 'asc'
              ? '▲'
              : '▼'}
        </span>
      </button>
    </th>
  );
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
  const normalizedRows = normalizeRows(rows, columns);

  const {
    sortedRows,
    sortConfig,
    requestSort,
  } = useSortableRows(normalizedRows);

  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {columns.map((column) => (
                <SortableHeader
                  key={column}
                  label={column}
                  sortKey={column}
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />
              ))}
            </tr>
          </thead>

          <tbody>
            {sortedRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  Aucun résultat.
                </td>
              </tr>
            ) : (
              sortedRows.map((row, index) => (
                <tr
                  key={row._id ?? index}
                  onClick={() => {
                    if (onRowClick) {
                      onRowClick(row);
                    }
                  }}
                  className={`border-t border-slate-100 text-slate-700 ${
                    onRowClick
                      ? 'cursor-pointer transition hover:bg-slate-50'
                      : ''
                  }`}
                >
                  {columns.map((column) => (
                    <td
                      key={column}
                      className="px-4 py-3"
                    >
                      {formatValue(row[column])}
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
  onGenerateInvoice: (rows: InvoiceRow[]) => void;
}) {
  if (activeTab === 'SYNTHÈSE') {
    return (
      <SummaryPanel summaryCards={payload.summaryCards || []} authToken={authToken} />
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

type ClientRevenue = { client: string; revenue: number };

function SummaryPanel({ summaryCards, authToken }: { summaryCards: DashboardStats; authToken: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(`${today.slice(0, 4)}-01-01`);
  const [endDate, setEndDate] = useState(today);
  const [clients, setClients] = useState<ClientRevenue[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [revenueError, setRevenueError] = useState<string | null>(null);

  useEffect(() => {
    if (!startDate || !endDate || startDate > endDate) return;
    const controller = new AbortController();
    setLoading(true);
    setRevenueError(null);

    api<{ clients: ClientRevenue[]; total: number }>(
      `/dashboard/client-revenue?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
      { signal: controller.signal },
      authToken,
    )
      .then((data) => {
        setClients(data.clients || []);
        setTotal(Number(data.total) || 0);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setRevenueError(err instanceof Error ? err.message : 'Chargement du chiffre d’affaires impossible');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [authToken, startDate, endDate]);

  const chartData = clients.map((row) => ({ ...row, globalRevenue: total }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {summaryCards.map((item) => (
          <KpiCard key={item.label} label={item.label} value={item.value} icon={<ChartNoAxesCombined className="size-4" />} />
        ))}
      </div>

      <section className="rounded-3xl border border-[#E8E3DF] bg-[#FFFDFB] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-[#2F2F2F]">Chiffre d’affaires par client</h2>
            <p className="mt-1 text-sm text-[#8A8582]">Comparez chaque client au chiffre d’affaires global de la période.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="text-sm text-[#6B6764]">Du
              <input type="date" value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 block rounded-xl border border-[#E8E3DF] bg-white px-3 py-2 outline-none focus:border-[#8B0E3F]" />
            </label>
            <label className="text-sm text-[#6B6764]">Au
              <input type="date" value={endDate} min={startDate} max={today} onChange={(event) => setEndDate(event.target.value)} className="mt-1 block rounded-xl border border-[#E8E3DF] bg-white px-3 py-2 outline-none focus:border-[#8B0E3F]" />
            </label>
          </div>
        </div>

        <div className="mt-5 rounded-2xl bg-[#F8F7F6] p-4">
          <div className="text-xs uppercase tracking-[0.16em] text-[#8A8582]">CA global sur la période</div>
          <div className="mt-1 text-3xl font-semibold text-[#8B0E3F]">{loading ? 'Chargement…' : formatCurrency(total)}</div>
        </div>

        {revenueError ? <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{revenueError}</div> : null}
        {!loading && !revenueError && clients.length === 0 ? <div className="py-12 text-center text-sm text-[#8A8582]">Aucune facture sur cette période.</div> : null}

        {clients.length > 0 ? (
          <>
            <div className="mt-6 h-[420px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 15, right: 25, bottom: 75, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E8E3DF" />
                  <XAxis dataKey="client" angle={-35} textAnchor="end" interval={0} height={90} tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(value) => `${Number(value).toLocaleString('fr-FR')} €`} width={90} />
                  <Tooltip formatter={(value: number, name: string) => [formatCurrency(Number(value)), name === 'revenue' ? 'CA client' : 'CA global']} />
                  <Bar dataKey="revenue" name="CA client" fill="#8B0E3F" radius={[7, 7, 0, 0]} />
                  <Line dataKey="globalRevenue" name="CA global" stroke="#2F2F2F" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-[#E8E3DF] text-[#8A8582]"><th className="px-3 py-3 font-medium">Client</th><th className="px-3 py-3 text-right font-medium">CA</th><th className="px-3 py-3 text-right font-medium">Part du global</th></tr></thead>
                <tbody>{clients.map((row) => <tr key={row.client} className="border-b border-[#E8E3DF]/70"><td className="px-3 py-3 font-medium">{row.client}</td><td className="px-3 py-3 text-right">{formatCurrency(row.revenue)}</td><td className="px-3 py-3 text-right">{total ? `${((row.revenue / total) * 100).toFixed(1)} %` : '0 %'}</td></tr>)}</tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}


function SupplierMonthlyServicesModal({
  supplier,
  token,
  onTokenRefresh,
  onClose,
  onSaved,
}: {
  supplier: EntityRow;
  token: string;
  onTokenRefresh: (data: AuthResponse) => void;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [services, setServices] = useState<SupplierService[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supplierName = String(supplier.nom || supplier.societe || 'Sous-traitant');
  const supplierEntity = String(supplier._entity || 'suppliers');
  const supplierId = Number(supplier._id);
  const serviceKey = (service: SupplierService) => `${service.id}:${service.amount_column}`;

  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      setLoading(true);
      setError(null);

      try {
        const data = await api<{ services: SupplierService[] }>(
          `/records/supplier-services/${supplierEntity}/${supplierId}?month=${month}`,
          {},
          token,
          onTokenRefresh,
        );

        if (cancelled) return;
        setServices(data.services || []);
        setAmounts(
          Object.fromEntries(
            (data.services || []).map((service) => [serviceKey(service), String(service.amount ?? 0)]),
          ),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Chargement des prestations impossible');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadServices();
    return () => {
      cancelled = true;
    };
  }, [month, supplierEntity, supplierId, token]);

  const total = services.reduce(
    (sum, service) => sum + (Number(amounts[serviceKey(service)]) || 0),
    0,
  );

  async function saveAmounts() {
    setSaving(true);
    setError(null);

    try {
      const changedServices = services.filter(
        (service) => Number(amounts[serviceKey(service)] || 0) !== Number(service.amount || 0),
      );

      await Promise.all(
        changedServices.map((service) =>
          api(
            `/records/opportunities/${service.id}`,
            {
              method: 'PATCH',
              body: JSON.stringify({
                [service.amount_column]: Number(amounts[serviceKey(service)] || 0),
              }),
            },
            token,
            onTokenRefresh,
          ),
        ),
      );

      setServices((current) =>
        current.map((service) => ({
          ...service,
          amount: Number(amounts[serviceKey(service)] || 0),
        })),
      );
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement des montants impossible');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2F2F2F]/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[28px] bg-[#FFFDFB] shadow-2xl">
        <div className="flex flex-col gap-4 border-b border-[#E8E3DF] px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#8A8582]">Prestations mensuelles</div>
            <h2 className="mt-1 font-serif text-3xl font-semibold text-[#2F2F2F]">{supplierName}</h2>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="rounded-xl border border-[#E8E3DF] bg-white px-4 py-2 outline-none focus:border-[#8B0E3F]"
            />
            <button onClick={onClose} className="rounded-xl border border-[#E8E3DF] px-4 py-2 text-sm hover:bg-[#F8F7F6]">
              Fermer
            </button>
          </div>
        </div>

        <div className="max-h-[65vh] overflow-auto p-6">
          {error ? <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-[#6B6764]">
              <RefreshCw className="size-5 animate-spin" /> Chargement des prestations...
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#E8E3DF]">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[#F8F7F6] text-[#6B6764]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Prestation</th>
                    <th className="px-4 py-3 font-medium">Langue</th>
                    <th className="px-4 py-3 font-medium">Rôle</th>
                    <th className="px-4 py-3 text-right font-medium">Montant sous-traitant</th>
                  </tr>
                </thead>
                <tbody>
                  {services.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-[#8A8582]">Aucune prestation pour ce mois.</td></tr>
                  ) : services.map((service) => (
                    <tr key={serviceKey(service)} className="border-t border-[#E8E3DF]">
                      <td className="whitespace-nowrap px-4 py-3">{formatDateForInput(service.service_date).split('-').reverse().join('/')}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[#2F2F2F]">{service.prestation}</div>
                        <div className="text-xs text-[#8A8582]">{service.type_prestation}</div>
                      </td>
                      <td className="px-4 py-3">{service.langue}</td>
                      <td className="px-4 py-3">{service.role}</td>
                      <td className="px-4 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={amounts[serviceKey(service)] ?? ''}
                            onChange={(event) => setAmounts((current) => ({
                              ...current,
                              [serviceKey(service)]: event.target.value,
                            }))}
                            className="w-32 rounded-xl border border-[#E8E3DF] px-3 py-2 text-right outline-none focus:border-[#8B0E3F]"
                          />
                          <span className="text-[#6B6764]">€</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-[#E8E3DF] px-6 py-4">
          <div className="text-sm text-[#6B6764]">
            Total du mois : <span className="ml-2 font-serif text-2xl font-semibold text-[#2F2F2F]">{formatCurrency(total)}</span>
          </div>
          <button
            type="button"
            onClick={saveAmounts}
            disabled={saving || loading || services.length === 0}
            className="rounded-2xl bg-[#8B0E3F] px-5 py-3 text-sm font-medium text-white hover:bg-[#A0124D] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer les montants'}
          </button>
        </div>
      </div>
    </div>
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
                <h3 className="font-serif text-xl font-semibold text-[#2F2F2F]">Prestations</h3>

                <div className="mt-4 overflow-x-auto rounded-2xl border border-[#E8E3DF]">
                  <div className="grid min-w-[620px] grid-cols-[1.4fr_1fr_1fr_1fr] bg-[#F8F7F6] text-xs font-semibold uppercase tracking-wide text-[#4E4E4E]">
                    <div className="px-3 py-3">Langue</div>
                    <div className="px-3 py-3 text-right">Nombre de mots</div>
                    <div className="px-3 py-3 text-right">Prix au mot</div>
                    <div className="px-3 py-3 text-right">Total</div>
                  </div>
                  {form.lines.map((line, index) => (
                    <div key={index} className="grid min-w-[620px] grid-cols-[1.4fr_1fr_1fr_1fr] items-center border-t border-[#E8E3DF] bg-white">
                      <div className="p-2">
                        <input
                          value={line.description}
                          onChange={(e) => updateLine(index, { description: e.target.value })}
                          aria-label={`Type de mots ${index + 1}`}
                          className="w-full rounded-xl border border-[#E8E3DF] px-3 py-2 outline-none focus:border-[#8B0E3F]"
                        />
                      </div>
                      <div className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={line.quantity}
                          onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                          aria-label={`Nombre de mots ${index + 1}`}
                          className="w-full rounded-xl border border-[#E8E3DF] px-3 py-2 text-right outline-none focus:border-[#8B0E3F]"
                        />
                      </div>
                      <div className="p-2">
                        <input
                          type="number"
                          min="0"
                          step="0.001"
                          value={line.unit_price_ht}
                          onChange={(e) => updateLine(index, { unit_price_ht: Number(e.target.value) })}
                          aria-label={`Prix au mot ${index + 1}`}
                          className="w-full rounded-xl border border-[#E8E3DF] px-3 py-2 text-right outline-none focus:border-[#8B0E3F]"
                        />
                      </div>
                      <div className="px-3 py-2 text-right font-medium text-[#2F2F2F]">
                        {formatCurrency(lineTotalHt(line))}
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
  onGenerateInvoice: (rows: InvoiceRow[]) => void;
}) {
  const [savingRowId, setSavingRowId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const {
    sortedRows,
    sortConfig,
    requestSort,
  } = useSortableRows(rows);

  const selectedRows = rows.filter((row) => selectedIds.has(row._id));
  const selectedClients = new Set(
    selectedRows.map((row) => String(row.client || '').trim().toLocaleLowerCase('fr'))
  );
  const canGroup = selectedRows.length > 0 && selectedClients.size <= 1;

  useEffect(() => {
    const availableIds = new Set(rows.map((row) => row._id));
    setSelectedIds((current) => new Set([...current].filter((id) => availableIds.has(id))));
  }, [rows]);

  function toggleRow(id: number) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds((current) =>
      current.size === rows.length
        ? new Set()
        : new Set(rows.map((row) => row._id))
    );
  }

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

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <span className="text-sm text-slate-600">
          {selectedRows.length} ligne{selectedRows.length > 1 ? 's' : ''} sélectionnée{selectedRows.length > 1 ? 's' : ''}
        </span>
        <button
          type="button"
          disabled={!canGroup}
          onClick={() => onGenerateInvoice(selectedRows)}
          className="rounded-xl bg-[#8B0E3F] px-4 py-2 text-sm font-medium text-white hover:bg-[#6f0b32] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Générer une facture groupée
        </button>
        {selectedRows.length > 0 && selectedClients.size > 1 ? (
          <span className="w-full text-sm text-amber-700">Les lignes sélectionnées doivent appartenir au même client.</span>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label="Sélectionner toutes les lignes"
                    checked={rows.length > 0 && selectedIds.size === rows.length}
                    onChange={toggleAll}
                  />
                </th>
                <SortableHeader
                  label="Référence"
                  sortKey="reference"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />

                <SortableHeader
                  label="Client"
                  sortKey="client"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />

                <SortableHeader
                  label="Montant"
                  sortKey="montant"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />

                <SortableHeader
                  label="TVA"
                  sortKey="tva"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />

                <SortableHeader
                  label="Statut"
                  sortKey="statut"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />

                <SortableHeader
                  label="Date envoi"
                  sortKey="date_envoi"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />

                <SortableHeader
                  label="Date paiement"
                  sortKey="date_paiement"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />

                <th className="px-4 py-3 font-medium">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-400" colSpan={9}>
                    Aucune facture.
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => {
                  const saving = savingRowId === row._id;

                  return (
                    <tr key={row._id} className="border-t border-slate-100 text-slate-700">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Sélectionner la ligne ${row.reference}`}
                          checked={selectedIds.has(row._id)}
                          onChange={() => toggleRow(row._id)}
                        />
                      </td>
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
                          onClick={() => onGenerateInvoice([row])}
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
  invoices,
  token,
  onClose,
  onGenerated,
}: {
  invoices: InvoiceRow[];
  token: string;
  onClose: () => void;
  onGenerated: () => Promise<void> | void;
}) {
  const invoice = invoices[0];
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

  const [lines, setLines] = useState<InvoiceGenerationLine[]>(() =>
    invoices.map((item) => ({
      service_date: formatDateForInput(item.date_envoi),
      purchase_order: item.reference || '',
      prestation: 'Traduction',
      document_name: item.reference || '',
      requester_name: '',
      language_pair: '',
      price_ht: Number(String(item.montant || '0').replace(/[^\d.,-]/g, '').replace(',', '.')) || 0,
    }))
  );

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
    'lead_id',
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

type OpportunityLanguageConfig =
  | { type: 'single'; column: string }
  | { type: 'pair'; sourceColumn: string; targetColumn: string }
  | null;

function getOpportunityLanguageConfig(columns: DbColumn[]): OpportunityLanguageConfig {
  const names = new Set(columns.map((column) => column.column_name));

  for (const name of ['language_pair', 'languages', 'language']) {
    if (names.has(name)) {
      return {
        type: 'single',
        column: name,
      };
    }
  }

  if (names.has('source_language') && names.has('target_language')) {
    return {
      type: 'pair',
      sourceColumn: 'source_language',
      targetColumn: 'target_language',
    };
  }

  return null;
}

function splitOpportunityLanguagePair(value: string) {
  const parts = value
    .split(/\s*(?:>|→|\/|=>)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);

  return {
    source: parts[0] || value.trim(),
    target: parts[1] || '',
  };
}

function EditRecordModal({
  payload,
  saving,
  error,
  token,
  opportunityLanguageOptions,
  onClose,
  onSave,
  onDelete,
}: {
  payload: RecordModalPayload;
  saving: boolean;
  error: string | null;
  token: string;
  opportunityLanguageOptions: string[];
  onClose: () => void;
  onSave: (
    values: Record<string, any>,
    languages?: string[]
  ) => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState<Record<string, any>>(payload.record);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [customLanguage, setCustomLanguage] = useState('');
  const [accountOptions, setAccountOptions] = useState<{ id: string | number; label: string }[]>([]);
  const [accountOptionsError, setAccountOptionsError] = useState<string | null>(null);
  const [supplierOptions, setSupplierOptions] = useState<SupplierOption[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [supplierOptionsError, setSupplierOptionsError] = useState<string | null>(null);

  useEffect(() => {
    setForm(payload.record);
    setSelectedLanguages([]);
    setCustomLanguage('');
    setSelectedSupplierId('');
  }, [payload.record, payload.table, payload.mode]);

  useEffect(() => {
    const hasAssignedTo = payload.columns.some(
      (column) => column.column_name === 'assigned_to'
    );

    if (!hasAssignedTo) return;

    fetch(`${API_URL}/records/options/users`, {
      credentials: 'include',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Erreur utilisateurs');
        return res.json();
      })
      .then((data) => {
        setUserOptions(data.users || []);
      })
      .catch(() => {
        setUserOptions([]);
      });
  }, [payload.columns, token]);

  useEffect(() => {
    if (!['opportunities', 'abstract_invoices', 'invoices'].includes(payload.table) || payload.mode !== 'create') return;
    const controller = new AbortController();
    setAccountOptionsError(null);
    fetch(`${API_URL}/records/options/accounts`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Impossible de charger les comptes');
        return res.json();
      })
      .then((data) => setAccountOptions(data.accounts || []))
      .catch((err) => {
        if (err.name !== 'AbortError') setAccountOptionsError(err.message);
      });
    return () => controller.abort();
  }, [payload.table, payload.mode, token]);

  useEffect(() => {
    if (payload.table !== 'opportunities' || payload.mode !== 'create') return;
    const controller = new AbortController();
    setSupplierOptionsError(null);
    fetch(`${API_URL}/records/options/suppliers`, {
      credentials: 'include',
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Impossible de charger les prestataires');
        return res.json();
      })
      .then((data) => setSupplierOptions(data.suppliers || []))
      .catch((err) => {
        if (err.name !== 'AbortError') setSupplierOptionsError(err.message);
      });
    return () => controller.abort();
  }, [payload.table, payload.mode, token]);

  const compatibleSupplierOptions = useMemo(() => {
    if (selectedLanguages.length === 0) return supplierOptions;
    const normalizePair = (value: string) => value.toUpperCase().replace(/\s+/g, '').replace(/→|=>|\//g, '>');
    return supplierOptions.filter((supplier) => {
      const configured = String(supplier.language_pairs || '')
        .split(/[,;\n]+/)
        .map(normalizePair)
        .filter(Boolean);
      return configured.length === 0 || selectedLanguages.every((pair) => configured.includes(normalizePair(pair)));
    });
  }, [supplierOptions, selectedLanguages]);

  function selectSupplier(id: string) {
    setSelectedSupplierId(id);
    const supplier = supplierOptions.find((item) => String(item.id) === id);
    if (!supplier) return;

    const words = Math.max(0, Number(form.word_count) || 0);
    const rate = Math.max(0, Number(supplier.word_rate) || 0);
    const flatRate = Math.max(0, Number(supplier.flat_rate) || 0);
    setForm((current) => ({
      ...current,
      subcontractant: supplier.label,
      stwc1: words,
      subcontractant_unit_price: rate,
      subcontractant_forfait: flatRate || '',
      subcontractant_total: flatRate || words * rate,
    }));
  }

  useEffect(() => {
    if (!selectedSupplierId) return;
    const supplier = supplierOptions.find((item) => String(item.id) === selectedSupplierId);
    if (!supplier) return;
    const words = Math.max(0, Number(form.word_count) || 0);
    const rate = Math.max(0, Number(supplier.word_rate) || 0);
    const flatRate = Math.max(0, Number(supplier.flat_rate) || 0);
    setForm((current) => ({
      ...current,
      stwc1: words,
      subcontractant_total: flatRate || words * rate,
    }));
  }, [form.word_count, selectedSupplierId, supplierOptions]);

  const opportunityMargin = useMemo(() => {
    if (payload.table !== 'opportunities') {
      return null;
    }

    const sellingPrice = Number(form.unit_price);
    const subcontractPrice = Number(
      form.subcontractant_unit_price ?? form.subcontract_unit_price
    );

    if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
      return null;
    }

    const cost = Number.isFinite(subcontractPrice)
      ? subcontractPrice
      : 0;

    return ((sellingPrice - cost) / sellingPrice) * 100;
  }, [
    payload.table,
    form.unit_price,
    form.subcontractant_unit_price,
    form.subcontract_unit_price,
  ]);

  const opportunityLanguageConfig =
    payload.table === 'opportunities'
      ? getOpportunityLanguageConfig(payload.columns)
      : null;

  function toggleLanguage(language: string) {
    setSelectedLanguages((current) =>
      current.includes(language)
        ? current.filter((item) => item !== language)
        : [...current, language]
    );
  }

  function addCustomLanguage() {
    const value = customLanguage.trim();

    if (!value) return;

    setSelectedLanguages((current) =>
      current.includes(value)
        ? current
        : [...current, value]
    );

    setCustomLanguage('');
  }

  const title =
    payload.table === 'opportunities'
      ? payload.mode === 'create'
        ? 'Créer une opportunité'
        : `Modifier l’opportunité #${payload.record.id}`
      : payload.mode === 'create'
        ? 'Créer un nouvel enregistrement'
        : `Modifier l’enregistrement #${payload.record.id}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2F2F2F]/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-[#FFFDFB] shadow-2xl shadow-[#2F2F2F]/20">
        <div className="flex items-center justify-between border-b border-[#E8E3DF] px-6 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-[#8A8582]">
              {payload.table}
            </div>

            <h2 className="mt-1 text-2xl font-semibold text-[#2F2F2F]">
              {title}
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

          {payload.table === 'opportunities' && payload.mode === 'edit' ? (
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-[#E8E3DF] bg-[#F8F7F6] px-4 py-3">
              <span className="text-xs font-medium uppercase tracking-[0.16em] text-[#8A8582]">
                ID opportunité
              </span>
              <span className="font-semibold text-[#2F2F2F]">
                #{payload.record.id}
              </span>
            </div>
          ) : null}

          {['opportunities', 'abstract_invoices', 'invoices'].includes(payload.table) && payload.mode === 'create' ? (
            <div className="mb-5">
              <label htmlFor="record-account" className="mb-2 block text-sm font-medium text-[#4E4E4E]">
                {payload.table === 'opportunities' ? 'Compte' : 'Client (compte)'}
              </label>
              <select
                id="record-account"
                value={form._account_id ?? ''}
                onChange={(event) => setForm({ ...form, _account_id: event.target.value })}
                className="w-full rounded-2xl border border-[#E8E3DF] bg-white px-4 py-3 text-sm outline-none focus:border-[#8B0E3F]"
              >
                <option value="">Aucun compte</option>
                {accountOptions.map((account) => (
                  <option key={account.id} value={account.id}>{account.label}</option>
                ))}
              </select>
              {accountOptionsError ? <p className="mt-2 text-sm text-rose-700">{accountOptionsError}</p> : null}
            </div>
          ) : null}

          {payload.table === 'opportunities' &&
          payload.mode === 'create' &&
          opportunityLanguageConfig ? (
            <div className="mb-5 rounded-3xl border border-[#E8E3DF] bg-white p-5">
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-semibold text-[#2F2F2F]">
                  Langues
                </h3>

                <p className="text-sm text-[#8A8582]">
                  Sélectionne plusieurs paires : une opportunité distincte sera créée pour chaque langue.
                </p>
              </div>

              {opportunityLanguageOptions.length > 0 ? (
                <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {opportunityLanguageOptions.map((language) => {
                    const checked = selectedLanguages.includes(language);

                    return (
                      <label
                        key={language}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition ${
                          checked
                            ? 'border-[#8B0E3F] bg-[#8B0E3F]/5'
                            : 'border-[#E8E3DF] hover:bg-[#F8F7F6]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleLanguage(language)}
                        />
                        <span className="text-sm text-[#4E4E4E]">
                          {language}
                        </span>
                      </label>
                    );
                  })}
                </div>
              ) : null}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  value={customLanguage}
                  onChange={(e) => setCustomLanguage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomLanguage();
                    }
                  }}
                  placeholder="Ajouter une paire, ex. FR > EN"
                  className="min-w-0 flex-1 rounded-2xl border border-[#E8E3DF] px-4 py-3 text-sm outline-none focus:border-[#8B0E3F]"
                />

                <button
                  type="button"
                  onClick={addCustomLanguage}
                  className="rounded-2xl border border-[#8B0E3F]/25 px-4 py-3 text-sm font-medium text-[#8B0E3F] hover:bg-[#8B0E3F]/5"
                >
                  Ajouter
                </button>
              </div>

              {selectedLanguages.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedLanguages.map((language) => (
                    <button
                      key={language}
                      type="button"
                      onClick={() => toggleLanguage(language)}
                      className="rounded-full bg-[#8B0E3F] px-3 py-1.5 text-xs font-medium text-white"
                      title="Cliquer pour retirer"
                    >
                      {language} ×
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-3 text-xs text-amber-700">
                  Sélectionne au moins une langue avant l’enregistrement.
                </div>
              )}
            </div>
          ) : null}

          {payload.table === 'opportunities' && payload.mode === 'create' ? (
            <div className="mb-5 rounded-3xl border border-[#E8E3DF] bg-white p-5">
              <label htmlFor="record-supplier" className="mb-2 block text-sm font-medium text-[#4E4E4E]">
                Prestataire
              </label>
              <select
                id="record-supplier"
                value={selectedSupplierId}
                onChange={(event) => selectSupplier(event.target.value)}
                className="w-full rounded-2xl border border-[#E8E3DF] bg-white px-4 py-3 text-sm outline-none focus:border-[#8B0E3F]"
              >
                <option value="">Aucun prestataire</option>
                {compatibleSupplierOptions.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.label}</option>
                ))}
              </select>
              {supplierOptionsError ? <p className="mt-2 text-sm text-rose-700">{supplierOptionsError}</p> : null}
              {selectedLanguages.length > 0 && compatibleSupplierOptions.length === 0 ? (
                <p className="mt-2 text-sm text-amber-700">Aucun prestataire n’est relié à toutes les paires sélectionnées.</p>
              ) : null}
              {selectedSupplierId ? (
                <div className="mt-3 grid gap-2 text-sm text-[#4E4E4E] sm:grid-cols-4">
                  <span>Nom : {form.subcontractant || '—'}</span>
                  <span>Mots : {form.stwc1 || 0}</span>
                  <span>Forfait : {form.subcontractant_forfait || '—'}</span>
                  <span>Total : {Number(form.subcontractant_total || 0).toFixed(2)} €</span>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {payload.columns
              .filter((column) => shouldShowColumnInModal(payload, column.column_name))
              .map((column) => {
                const name = column.column_name;
                const readOnly = isReadOnlyColumn(name);
                const value = form[name];

                if (name === 'assigned_to') {
                  return (
                    <div key={name}>
                      <label className="mb-2 block text-sm font-medium text-slate-700">
                        Assigné à
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          utilisateur CRM
                        </span>
                      </label>

                      <select
                        value={value === null || value === undefined ? '' : String(value)}
                        disabled={readOnly}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            [name]: e.target.value === '' ? null : Number(e.target.value),
                          })
                        }
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#8B0E3F] disabled:bg-slate-100 disabled:text-slate-400"
                      >
                        <option value="">Non assigné</option>

                        {userOptions.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                }

                if (column.data_type === 'boolean') {
                  return (
                    <label
                      key={name}
                      className="flex items-center justify-between rounded-2xl border border-[#E8E3DF] p-4"
                    >
                      <div>
                        <div className="font-medium text-[#2F2F2F]">{getFieldLabel(name)}</div>
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
                        {getFieldLabel(name)}
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
                      {getFieldLabel(name)}
                      <span className="ml-2 text-xs font-normal text-[#8A8582]">
                        {column.data_type}
                      </span>
                    </label>

                    <input
                      type={inputTypeFromPgType(column.data_type)}
                      min={payload.table === 'opportunities' && name === 'word_count' ? 0 : undefined}
                      step={payload.table === 'opportunities' && name === 'word_count' ? 1 : undefined}
                      value={normalizeInputValue(value)}
                      disabled={readOnly}
                      onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                      className="w-full rounded-2xl border border-[#E8E3DF] px-4 py-3 text-sm outline-none focus:border-[#8B0E3F] disabled:bg-[#F3EFEB] disabled:text-[#8A8582]"
                    />
                  </div>
                );
              })}
          </div>

          {payload.table === 'accounts' && payload.mode === 'create' ? (
            <div className="mb-5 rounded-3xl border border-[#E8E3DF] bg-white p-5">
              <div>
                <h3 className="text-base font-semibold text-[#2F2F2F]">
                  Identité du compte
                </h3>

                <p className="mt-1 text-sm text-[#8A8582]">
                  Le client sera créé comme contact principal et rattaché au compte.
                </p>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-[#4E4E4E]">
                    Nom client
                  </label>

                  <input
                    value={String(form._client_name || '')}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        _client_name: e.target.value,
                      })
                    }
                    placeholder="Ex : Jean Dupont"
                    className="w-full rounded-2xl border border-[#E8E3DF] px-4 py-3 text-sm outline-none focus:border-[#8B0E3F]"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-[#4E4E4E]">
                    Nom de l’entreprise
                  </label>

                  <input
                    value={String(form._company_name || '')}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        _company_name: e.target.value,
                      })
                    }
                    placeholder="Ex : CHANEL"
                    className="w-full rounded-2xl border border-[#E8E3DF] px-4 py-3 text-sm outline-none focus:border-[#8B0E3F]"
                    required
                  />
                </div>
              </div>
            </div>
          ) : null}

          {payload.table === 'opportunities' ? (
            <div className="mt-5 rounded-2xl border border-[#E8E3DF] bg-[#F8F7F6] p-4">
              <div className="text-xs font-medium uppercase tracking-[0.15em] text-[#8A8582]">
                Marge calculée
              </div>

              <div className="mt-1 text-2xl font-semibold text-[#8B0E3F]">
                {opportunityMargin === null
                  ? '—'
                  : `${opportunityMargin.toFixed(2)} %`}
              </div>

              <div className="mt-1 text-xs text-[#8A8582]">
                ((prix unitaire - coût sous-traitant) / prix unitaire) × 100
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex items-center gap-3 border-t border-[#E8E3DF] px-6 py-4">
          {payload.mode === 'edit' ? (
            <button
              type="button"
              disabled={saving}
              onClick={onDelete}
              className="mr-auto flex items-center gap-2 rounded-2xl border border-rose-200 px-5 py-3 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="size-4" />
              Supprimer
            </button>
          ) : null}

          <button
            onClick={onClose}
            className="rounded-2xl border border-[#E8E3DF] px-5 py-3 text-sm text-[#4E4E4E] hover:bg-[#F8F7F6]"
          >
            Annuler
          </button>

          <button
            disabled={saving}
            onClick={() =>
              onSave(
                form,
                payload.table === 'opportunities' && payload.mode === 'create'
                  ? selectedLanguages
                  : undefined
              )
            }
            className="rounded-2xl bg-[#8B0E3F] px-5 py-3 text-sm font-medium text-white hover:bg-[#A0124D] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}


function normalizeOpportunityStage(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isToday(value?: string | null) {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();

  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function formatOpportunityDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date);
}

function getOpportunityRowColors(row: OpportunityRow) {
  const stage = normalizeOpportunityStage(row.etape);

  if (isToday(row._delivery_date)) {
    return {
      backgroundColor: '#9C3200',
      color: '#FFFFFF',
    };
  }

  if (stage === 'proposition') {
    return {
      backgroundColor: '#00E5ff',
      color: '#172033',
    };
  }

  if (
    stage === 'lance' ||
    stage === 'lance_s_t' ||
    stage === 'lancement'
  ) {
    return {
      backgroundColor: '#FFEA99',
      color: '#172033',
    };
  }

  if (
    stage === 'refuse' ||
    stage === 'refus'
  ) {
    return {
      backgroundColor: '#666666',
      color: '#FFFFFF',
    };
  }

  if (
    stage === 'facture' ||
    stage === 'facturee'
  ) {
    return {
      backgroundColor: '#0BDA51',
      color: '#12301C',
    };
  }

  if (
    stage === 'test gratuit' ||
    stage === 'test_gratuit' ||
    stage === 'test'
  ) {
    return {
      backgroundColor: '#9EB8A0',
      color: '#172033',
    };
  }

  if (
    stage === 'livraison' ||
    stage === 'livre' ||
    stage === 'livree'
  ) {
    return {
      backgroundColor: '#9C3200',
      color: '#FFFFFF',
    };
  }

  return {
    backgroundColor: '#FFFFFF',
    color: '#334155',
  };
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
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    sortedRows,
    sortConfig,
    requestSort,
  } = useSortableRows(rows);

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

  function openOnSingleClick(row: OpportunityRow) {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => onRowClick(row), 220);
  }

  function deliverOnDoubleClick(row: OpportunityRow) {
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = null;
    void quickUpdateStage(row, 'Livrée');
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
                <SortableHeader
                  label="Langues"
                  sortKey="langues"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />

                <SortableHeader
                  label="ID"
                  sortKey="id_opportunite"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />


                <SortableHeader
                  label="Opportunité"
                  sortKey="opportunite"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />

                <SortableHeader
                  label="Compte"
                  sortKey="compte"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />

                <SortableHeader
                  label="Montant"
                  sortKey="montant"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />

                <SortableHeader
                  label="Livraison"
                  sortKey="_delivery_date"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />

                <SortableHeader
                  label="Création"
                  sortKey="_created_at"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />

                <SortableHeader
                  label="Étape"
                  sortKey="etape"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />

                <SortableHeader
                  label="Marge"
                  sortKey="marge"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />

                <SortableHeader
                  label="Prestation"
                  sortKey="prestation"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />
              </tr>
            </thead>

            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-4 py-8 text-slate-400" colSpan={10}>
                    Aucune opportunité.
                  </td>
                </tr>
              ) : (
                sortedRows.map((row) => {
                  const saving = savingRowId === row._id;

                  return (
                    <tr
                      key={row._id}
                      onClick={() => openOnSingleClick(row)}
                      onDoubleClick={() => deliverOnDoubleClick(row)}
                      title="Double-cliquer pour marquer comme livrée"
                      style={getOpportunityRowColors(row)}
                      className="cursor-pointer border-t border-black/5 transition-opacity hover:opacity-90"
                    >

                      <td className="px-4 py-3 font-medium">
                        {formatValue(row.langues)}
                      </td>

                      <td className="px-4 py-3 font-medium">
                        #{row.id_opportunite}
                      </td>


                      <td className="px-4 py-3">
                        {formatValue(row.opportunite)}
                      </td>

                      <td className="px-4 py-3">
                        {formatValue(row.compte)}
                      </td>

                      <td className="px-4 py-3">
                        {formatValue(row.montant)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatOpportunityDate(row._delivery_date)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        {formatOpportunityDate(row._created_at)}
                      </td>

                      <td className="px-4 py-3">
                        <select
                          value={row.etape || ''}
                          disabled={savingRowId === row._id || !row._stage_column}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) =>
                            quickUpdateStage(row, e.target.value)
                          }
                          className="w-full min-w-[150px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none"
                        >
                          <option value="">—</option>

                          {dynamicStageOptions.map((stage) => (
                            <option key={stage} value={stage}>
                              {stage}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="px-4 py-3 font-semibold">
                        {row.marge === null ||
                        row.marge === undefined ||
                        row.marge === ''
                          ? '—'
                          : `${Number(row.marge).toFixed(1)} %`}
                      </td>

                      <td className="px-4 py-3">
                        {formatValue(row.prestation)}
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
  const [invoicesToGenerate, setInvoicesToGenerate] = useState<InvoiceRow[]>([]);
  const [supplierServicesTarget, setSupplierServicesTarget] = useState<EntityRow | null>(null);

  const opportunityLanguageOptions = useMemo(() => {
    const languages = (payload.opportunities || [])
      .map((row) => String(row.langues || '').trim())
      .filter(
        (value) =>
          value &&
          value !== '—'
      );

    return Array.from(
      new Set(languages)
    ).sort((a, b) =>
      a.localeCompare(b, 'fr')
    );
  }, [payload.opportunities]);

  async function openRecord(row: EntityRow) {
    if (!auth?.token) return;

    const entity = row._entity;
    const id = row._id;

    if ((entity === 'suppliers' || entity === 'subcontractors') && id) {
      setSupplierServicesTarget(row);
      return;
    }

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

  async function saveRecord(
    values: Record<string, any>,
    languages?: string[]
  ) {
    if (!auth?.token || !modalPayload) return;

    setModalSaving(true);
    setModalError(null);

    try {
      if (
        modalPayload.mode === 'create' &&
        modalPayload.table === 'opportunities'
      ) {
        const languageConfig = getOpportunityLanguageConfig(
          modalPayload.columns
        );

        if (!languageConfig) {
          throw new Error(
            "Aucune colonne de langue compatible n'a été trouvée dans la table opportunities."
          );
        }

        if (!languages || languages.length === 0) {
          throw new Error(
            'Sélectionne au moins une langue avant de créer l’opportunité.'
          );
        }

        const createdRecords: Record<string, any>[] = [];

        for (const language of languages) {
          const record: Record<string, any> = {
            ...values,
          };

          if (languageConfig.type === 'single') {
            record[languageConfig.column] = language;
          } else {
            const pair = splitOpportunityLanguagePair(language);

            record[languageConfig.sourceColumn] = pair.source || null;
            record[languageConfig.targetColumn] = pair.target || null;
          }

          const created = await api<
            Partial<RecordModalPayload> & {
              record: Record<string, any>;
            }
          >(
            '/records/opportunities',
            {
              method: 'POST',
              body: JSON.stringify(record),
            },
            auth.token,
            setAuth
          );

          if (created.record) {
            createdRecords.push(created.record);
          }
        }

        await refreshData();

        if (createdRecords.length === 1) {
          setModalPayload({
            mode: 'edit',
            table: 'opportunities',
            columns: modalPayload.columns,
            record: createdRecords[0],
          });
        } else {
          setModalPayload(null);
        }

        return;
      }

      if (modalPayload.mode === 'create') {
        const created = await api<
          Partial<RecordModalPayload> & {
            record: Record<string, any>;
          }
        >(
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

      const updated = await api<
        Partial<RecordModalPayload> & {
          record: Record<string, any>;
        }
      >(
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
      setModalError(
        err instanceof Error
          ? err.message
          : 'Enregistrement impossible'
      );
    } finally {
      setModalSaving(false);
    }
  }

  async function deleteRecord() {
    if (!auth?.token || !modalPayload || modalPayload.mode !== 'edit') return;

    const confirmed = window.confirm(
      `Supprimer cet enregistrement #${modalPayload.record.id} ? Cette action le retirera des listes du CRM.`
    );

    if (!confirmed) return;

    setModalSaving(true);
    setModalError(null);

    try {
      await api(
        `/records/${modalPayload.table}/${modalPayload.record.id}`,
        { method: 'DELETE' },
        auth.token,
        setAuth
      );

      setModalPayload(null);
      await refreshData();
    } catch (err) {
      setModalError(
        err instanceof Error ? err.message : 'Suppression impossible'
      );
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
      <main className="relative min-h-screen overflow-hidden bg-[#F3EFEC] px-4 py-8 sm:px-6 md:px-10">
        <div className="pointer-events-none absolute left-1/2 top-[-28rem] h-[46rem] w-[46rem] -translate-x-1/2 rounded-full bg-[#8B0E3F]/[0.09] blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-64 -right-44 h-[34rem] w-[34rem] rounded-full bg-white/80 blur-[80px]" />
        <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl items-center justify-center">
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
                onGenerateInvoice={setInvoicesToGenerate}
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

      {supplierServicesTarget ? (
        <SupplierMonthlyServicesModal
          supplier={supplierServicesTarget}
          token={auth.token}
          onTokenRefresh={setAuth}
          onClose={() => setSupplierServicesTarget(null)}
          onSaved={refreshData}
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
          token={auth.token}
          opportunityLanguageOptions={opportunityLanguageOptions}
          onClose={() => {
            setModalPayload(null);
            setModalError(null);
          }}
          onSave={saveRecord}
          onDelete={deleteRecord}
        />
      ) : null}

      {invoicesToGenerate.length > 0 ? (
        <InvoiceGenerationModal
          invoices={invoicesToGenerate}
          token={auth.token}
          onClose={() => setInvoicesToGenerate([])}
          onGenerated={refreshData}
        />
      ) : null}
    </main>
  );
}
