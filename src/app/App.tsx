import { useEffect, useMemo, useState, type ComponentType, type ReactNode, type FormEvent } from 'react';
import {
  Bell,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesCombined,
  FileText,
  Handshake,
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

type Role = 'employee' | 'admin';
type EmployeeTab = 'COMPTES' | 'CONTACTS' | 'OPPORTUNITÉS' | 'SOUS-TRAITANT';
type AdminTab =
  | 'PISTES'
  | 'FACTURES'
  | 'SYNTHÈSE'
  | 'MEILLEURS CLIENTS'
  | 'GROUPES'
  | 'ADMINISTRATION';
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

type UserOption = {
  id: number;
  label: string;
};

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api';

const employeeTabs: { label: EmployeeTab; icon: ComponentType<any> }[] = [
  { label: 'COMPTES', icon: Building2 },
  { label: 'CONTACTS', icon: Users },
  { label: 'OPPORTUNITÉS', icon: Target },
  { label: 'SOUS-TRAITANT', icon: Handshake },
];

const adminTabs: { label: AdminTab; icon: ComponentType<any> }[] = [
  { label: 'PISTES', icon: BriefcaseBusiness },
  { label: 'FACTURES', icon: FileText },
  { label: 'SYNTHÈSE', icon: ChartNoAxesCombined },
  { label: 'MEILLEURS CLIENTS', icon: TrendingUp },
  { label: 'GROUPES', icon: Layers3 },
  { label: 'ADMINISTRATION', icon: UserCog },
];

const tabToKey: Record<Tab, string> = {
  COMPTES: 'accounts',
  CONTACTS: 'contacts',
  OPPORTUNITÉS: 'opportunities',
  'SOUS-TRAITANT': 'subcontractors',
  PISTES: 'leads',
  FACTURES: 'invoices',
  SYNTHÈSE: 'summary',
  'MEILLEURS CLIENTS': 'topClients',
  GROUPES: 'groups',
  ADMINISTRATION: 'administration',
};

const tabToEntity: Record<Tab, string | null> = {
  COMPTES: 'accounts',
  CONTACTS: 'contacts',
  OPPORTUNITÉS: 'opportunities',
  'SOUS-TRAITANT': 'suppliers',
  PISTES: 'leads',
  FACTURES: 'abstract_invoices',
  SYNTHÈSE: null,
  'MEILLEURS CLIENTS': null,
  GROUPES: 'groups',
  ADMINISTRATION: null,
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
  PISTES: {
    title: 'Pistes',
    subtitle: 'Pistes commerciales issues de la table leads.',
    columns: ['Nom', 'Société', 'Statut', 'Source', 'Email', 'Téléphone', 'Note'],
  },
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
  GROUPES: {
    title: 'Groupes',
    subtitle: 'Segmentation interne pour pilotage et permissions.',
    columns: ['Nom', 'Membres', 'Créé le'],
  },
  ADMINISTRATION: {
    title: 'Administration',
    subtitle: 'Gestion des utilisateurs de l’application CRM.',
    columns: [],
  },
};

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
    <div className=" max-w-3xl gap-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20 backdrop-blur md:grid-cols-[1.2fr_0.8fr] md:p-8">
      <div className="flex flex-col justify-between rounded-[28px] bg-slate-950/70 p-8 text-white ring-1 ring-white/10">
        <div>
          <h2 className="text-2xl font-semibold">Connexion</h2>
        </div>

        <div className="mt-8 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-slate-400">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-indigo-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-indigo-400"
            />
          </div>

          <button
            disabled={loading}
            onClick={() => onLogin(email, password)}
            className="w-full rounded-2xl bg-indigo-500 px-5 py-4 font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>

          {error ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
        </div>

        <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          Démo : employee@crm.local / admin@crm.local — mot de passe : password123
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between text-slate-500">
        <span className="text-sm">{label}</span>
        {icon}
      </div>
      <div className="mt-4 text-3xl font-semibold text-slate-900">{value}</div>
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
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
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
                <td className="px-4 py-8 text-slate-400" colSpan={columns.length}>
                  Aucune donnée disponible.
                </td>
              </tr>
            ) : (
              safeRows.map((displayRow, index) => (
                <tr
                  key={index}
                  onClick={() => onRowClick?.(rows[index])}
                  className="cursor-pointer border-t border-slate-100 text-slate-700 transition hover:bg-indigo-50/60"
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
}: {
  activeTab: Tab;
  payload: EntityPayload & { summaryCards?: DashboardStats };
  onRowClick: (row: EntityRow) => void;
}) {
  if (activeTab === 'ADMINISTRATION') {
    return null;
  }

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

  const rows = payload[tabToKey[activeTab]] || [];

  return (
    <DataTable
      columns={tabMeta[activeTab].columns}
      rows={rows}
      onRowClick={onRowClick}
    />
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
        className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-xl font-semibold text-slate-900">
          {editingId ? 'Modifier un utilisateur' : 'Créer un utilisateur'}
        </h2>

        <p className="mt-2 text-sm text-slate-500">
          Ces comptes servent uniquement à se connecter à l’application CRM.
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Nom complet
            </label>
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Mot de passe {editingId ? '(laisser vide pour ne pas changer)' : ''}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
              required={!editingId}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Rôle
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-indigo-400"
            >
              <option value="employee">Salarié</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              disabled={saving}
              type="submit"
              className="rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-400 disabled:opacity-60"
            >
              {saving ? 'Enregistrement...' : editingId ? 'Modifier' : 'Créer'}
            </button>

            {editingId ? (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm text-slate-600 hover:bg-slate-50"
              >
                Annuler
              </button>
            ) : null}
          </div>
        </div>
      </form>

      <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-xl font-semibold text-slate-900">Utilisateurs</h2>

          <button
            onClick={loadUsers}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            {loading ? 'Chargement...' : 'Actualiser'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
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
                  <td colSpan={5} className="px-4 py-8 text-slate-400">
                    Aucun utilisateur.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100 text-slate-700">
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
                          className="rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"
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
  token,
  onClose,
  onSave,
}: {
  payload: RecordModalPayload;
  saving: boolean;
  error: string | null;
  token: string;
  onClose: () => void;
  onSave: (values: Record<string, any>) => void;
}) {
  const [form, setForm] = useState<Record<string, any>>(payload.record);
  const [userOptions, setUserOptions] = useState<UserOption[]>([]);

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
      .then((res) => res.json())
      .then((data) => setUserOptions(data.users || []))
      .catch(() => setUserOptions([]));
  }, [payload.columns, token]);

  useEffect(() => {
    setForm(payload.record);
  }, [payload.record]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
              {payload.table}
            </div>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">
              {payload.mode === 'create'
                ? 'Créer un nouvel enregistrement'
                : `Modifier l’enregistrement #${payload.record.id}`}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
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
            {payload.columns.map((column) => {
              const name = column.column_name;
              const readOnly = isReadOnlyColumn(name);
              const value = form[name];

              if (name === 'assigned_to') {
                return (
                  <div key={name}>
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      assigned_to
                      <span className="ml-2 text-xs font-normal text-slate-400">
                        utilisateur
                      </span>
                    </label>

                    <select
                      value={form[name] ?? ''}
                      disabled={readOnly}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          [name]: e.target.value === '' ? null : Number(e.target.value),
                        })
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 disabled:bg-slate-100 disabled:text-slate-400"
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
                    className="flex items-center justify-between rounded-2xl border border-slate-200 p-4"
                  >
                    <div>
                      <div className="font-medium text-slate-800">{name}</div>
                      <div className="text-xs text-slate-400">{column.data_type}</div>
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
                    <label className="mb-2 block text-sm font-medium text-slate-700">
                      {name}
                      <span className="ml-2 text-xs font-normal text-slate-400">
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
                      className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                );
              }

              return (
                <div key={name}>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    {name}
                    <span className="ml-2 text-xs font-normal text-slate-400">
                      {column.data_type}
                    </span>
                  </label>

                  <input
                    type={inputTypeFromPgType(column.data_type)}
                    value={normalizeInputValue(value)}
                    disabled={readOnly}
                    onChange={(e) => setForm({ ...form, [name]: e.target.value })}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-400 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-5 py-3 text-sm text-slate-600 hover:bg-slate-50"
          >
            Annuler
          </button>

          <button
            disabled={saving}
            onClick={() => onSave(form)}
            className="rounded-2xl bg-indigo-500 px-5 py-3 text-sm font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
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

      const initialRecord: Record<string, any> = {};

      for (const column of data.columns) {
        if (isReadOnlyColumn(column.column_name)) continue;
        initialRecord[column.column_name] = '';
      }

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
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_35%),linear-gradient(180deg,_#020617,_#0f172a)] px-4 py-10 md:px-8">
        <div className="mx-auto flex min-h-[85vh] max-w-7xl items-center justify-center text-white">
          <div className="rounded-3xl border border-white/10 bg-white/5 px-8 py-6 shadow-2xl backdrop-blur">
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
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_35%),linear-gradient(180deg,_#020617,_#0f172a)] px-4 py-10 md:px-8">
        <div className="mx-auto flex min-h-[85vh] max-w-7xl items-center justify-center">
          <LoginCard onLogin={login} loading={loading} error={error} />
        </div>
      </main>
    );
  }

  const activeMeta = tabMeta[activeTab];

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-r border-slate-200 bg-slate-950 px-5 py-6 text-white">
          <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-4">
            <div className="rounded-2xl bg-indigo-500/20 p-3 text-indigo-300">
              <LayoutDashboard className="size-5" />
            </div>
            <div>
              <div className="text-sm text-slate-400">Wordsinvest</div>
              <div className="font-semibold">CRM métier</div>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
            <div className="text-slate-400">Connecté en tant que</div>
            <div className="mt-1 font-medium">{auth.user.fullName}</div>
            <div className="text-slate-400">{auth.user.role}</div>
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
                      ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                      : 'text-slate-300 hover:bg-white/5 hover:text-white'
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
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="size-4" /> Déconnexion
          </button>
        </aside>

        <section className="p-4 md:p-8">
          <header className="flex flex-col gap-4 rounded-[28px] bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.2em] text-slate-400">
                {auth.user.role === 'admin' ? 'admin' : 'salarié'}
              </div>
              <h1 className="mt-2 text-3xl font-semibold">{activeMeta.title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">
                {activeMeta.subtitle}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">
                <Search className="size-4" /> Recherche globale
              </div>

              <button
                onClick={refreshData}
                className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 hover:bg-slate-50"
              >
                <RefreshCw className={`size-4 ${dataLoading ? 'animate-spin' : ''}`} />
                Actualiser
              </button>

              {tabToEntity[activeTab] ? (
                <button
                  onClick={openCreateRecord}
                  className="flex items-center gap-2 rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-medium text-white hover:bg-indigo-400"
                >
                  Créer
                </button>
              ) : null}

              <button className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-50">
                <Bell className="size-4" />
              </button>
            </div>
          </header>

          <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            <KpiCard label="Modules actifs" value={String(tabs.length)} icon={<Layers3 className="size-4" />} />
            <KpiCard label="Rôle" value={auth.user.role === 'admin' ? 'Admin' : 'Salarié'} icon={<Shield className="size-4" />} />
            <KpiCard label="Backend" value={dataLoading ? 'Sync...' : 'Connecté'} icon={<BriefcaseBusiness className="size-4" />} />
            <KpiCard label="Base" value="PostgreSQL" icon={<Building2 className="size-4" />} />
          </div>

          {error ? (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-6">
            {activeTab === 'ADMINISTRATION' ? (
              <AdministrationPanel auth={auth} onTokenRefresh={setAuth} />
            ) : (
              <Panel activeTab={activeTab} payload={payload} onRowClick={openRecord} />
            )}
          </div>
        </section>
      </div>

      {modalLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 text-white backdrop-blur-sm">
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
          onClose={() => {
            setModalPayload(null);
            setModalError(null);
          }}
          onSave={saveRecord}
        />
      ) : null}
    </main>
  );
}