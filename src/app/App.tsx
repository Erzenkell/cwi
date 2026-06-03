import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
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

type Role = 'employee' | 'admin';
type EmployeeTab = 'COMPTES' | 'CONTACTS' | 'OPPORTUNITÉS' | 'SOUS-TRAITANT';
type AdminTab = 'PISTES' | 'FACTURES' | 'SYNTHÈSE' | 'MEILLEURS CLIENTS' | 'UTILISATEURS' | 'GROUPES';
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
type EntityPayload = Record<string, Array<Record<string, string | number | null>>>;

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
  { label: 'UTILISATEURS', icon: UserCog },
  { label: 'GROUPES', icon: Layers3 },
];

const tabToKey: Record<Tab, string> = {
  COMPTES: 'accounts',
  CONTACTS: 'contacts',
  'OPPORTUNITÉS': 'opportunities',
  'SOUS-TRAITANT': 'subcontractors',
  PISTES: 'leads',
  FACTURES: 'invoices',
  SYNTHÈSE: 'summary',
  'MEILLEURS CLIENTS': 'topClients',
  UTILISATEURS: 'users',
  GROUPES: 'groups',
};

const tabMeta: Record<Tab, { title: string; subtitle: string; columns: string[] }> = {
  COMPTES: {
    title: 'Comptes',
    subtitle: 'Référentiel des entreprises clientes et partenaires.',
    columns: ['Nom', 'Secteur', 'Responsable', 'Statut', 'CA'],
  },
  CONTACTS: {
    title: 'Contacts',
    subtitle: 'Interlocuteurs clés rattachés aux comptes.',
    columns: ['Nom', 'Société', 'Email', 'Fonction'],
  },
  'OPPORTUNITÉS': {
    title: 'Opportunités',
    subtitle: 'Pipeline commercial et avancement des affaires.',
    columns: ['Affaire', 'Valeur', 'Étape', 'Probabilité'],
  },
  'SOUS-TRAITANT': {
    title: 'Sous-traitants',
    subtitle: 'Partenaires externes, notes et disponibilité.',
    columns: ['Nom', 'Spécialité', 'Note', 'Disponibilité'],
  },
  PISTES: {
    title: 'Pistes',
    subtitle: 'Prospects entrants, score et attribution commerciale.',
    columns: ['Société', 'Source', 'Score', 'Assigné à'],
  },
  FACTURES: {
    title: 'Factures',
    subtitle: 'Suivi de facturation, état d’émission et encaissement.',
    columns: ['Référence', 'Client', 'Montant', 'Statut'],
  },
  SYNTHÈSE: {
    title: 'Synthèse',
    subtitle: 'Vue consolidée des indicateurs utiles au pilotage.',
    columns: ['Indicateur', 'Valeur'],
  },
  'MEILLEURS CLIENTS': {
    title: 'Meilleurs clients',
    subtitle: 'Classement des comptes par chiffre d’affaires.',
    columns: ['Nom', 'CA', 'Santé'],
  },
  UTILISATEURS: {
    title: 'Utilisateurs',
    subtitle: 'Administration des comptes d’accès et des rôles.',
    columns: ['Nom', 'Email', 'Rôle', 'Groupe'],
  },
  GROUPES: {
    title: 'Groupes',
    subtitle: 'Segmentation interne pour pilotage et permissions.',
    columns: ['Nom', 'Description', 'Membres'],
  },
};

async function api<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erreur réseau' }));
    throw new Error(error.message || 'Erreur réseau');
  }

  return response.json() as Promise<T>;
}

function formatValue(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : String(value);
  return value;
}

function LoginCard({ onLogin, loading, error }: { onLogin: (email: string, password: string) => void; loading: boolean; error: string | null }) {
  const [email, setEmail] = useState('employee@crm.local');
  const [password, setPassword] = useState('password123');

  return (
    <div className="w-full max-w-5xl grid gap-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/20 backdrop-blur md:grid-cols-[1.2fr_0.8fr] md:p-8">
      <div className="flex flex-col justify-between rounded-[28px] bg-slate-950/70 p-8 text-white ring-1 ring-white/10">
        <div>
          <h2 className="text-2xl font-semibold">Connexion</h2>
        </div>

        <div className="mt-8 space-y-4">
          <div>
            <label className="mb-2 block text-sm text-slate-400">Email</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-indigo-400" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-slate-400">Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-indigo-400" />
          </div>
          <button
            disabled={loading}
            onClick={() => onLogin(email, password)}
            className="w-full rounded-2xl bg-indigo-500 px-5 py-4 font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
          {error ? <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
        </div>

        <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          Démo: employee@crm.local / admin@crm.local — mot de passe: password123
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

function DataTable({ columns, rows }: { columns: string[]; rows: Record<string, string | number | null>[] }) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 font-medium">{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-slate-400" colSpan={columns.length}>Aucune donnée disponible.</td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={index} className="border-t border-slate-100 text-slate-700">
                  {Object.values(row).map((value, idx) => (
                    <td key={idx} className="px-4 py-3">{formatValue(value)}</td>
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

function Panel({ activeTab, payload }: { activeTab: Tab; payload: EntityPayload & { summaryCards?: DashboardStats } }) {
  if (activeTab === 'SYNTHÈSE') {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {(payload.summaryCards || []).map((item) => (
            <KpiCard key={item.label} label={item.label} value={item.value} icon={<ChartNoAxesCombined className="size-4" />} />
          ))}
        </div>
        <DataTable
          columns={tabMeta[activeTab].columns}
          rows={(payload.summary || []).map((item) => ({ indicateur: item.label, valeur: item.value }))}
        />
      </div>
    );
  }

  const rows = payload[tabToKey[activeTab]] || [];
  return <DataTable columns={tabMeta[activeTab].columns} rows={rows} />;
}

export default function App() {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('COMPTES');
  const [payload, setPayload] = useState<EntityPayload & { summaryCards?: DashboardStats }>({});
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tabs = useMemo(() => {
    if (auth?.user.role === 'admin') return adminTabs;
    return employeeTabs;
  }, [auth]);

  useEffect(() => {
    if (!auth) return;
    const firstTab = tabs[0]?.label;
    if (firstTab) setActiveTab(firstTab);
  }, [auth, tabs]);

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
    setBootstrapping(true);
    setError(null);
    try {
      const [entities, summary, topClients, users, groups] = await Promise.all([
        api<EntityPayload>('/entities', {}, auth.token),
        api<{ summary: DashboardStats; summaryCards: DashboardStats }>('/dashboard/summary', {}, auth.token),
        api<{ topClients: EntityPayload['topClients'] }>('/dashboard/top-clients', {}, auth.token),
        auth.user.role === 'admin' ? api<{ users: EntityPayload['users'] }>('/admin/users', {}, auth.token) : Promise.resolve({ users: [] }),
        auth.user.role === 'admin' ? api<{ groups: EntityPayload['groups'] }>('/admin/groups', {}, auth.token) : Promise.resolve({ groups: [] }),
      ]);

      setPayload({
        ...entities,
        summary: summary.summary.map((item) => ({ label: item.label, value: item.value })),
        summaryCards: summary.summaryCards,
        topClients: topClients.topClients || [],
        users: users.users || [],
        groups: groups.groups || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chargement impossible');
    } finally {
      setBootstrapping(false);
    }
  }

  useEffect(() => {
    refreshData();
  }, [auth?.token]);

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
                    isActive ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="size-4" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>

          <button
            onClick={() => {
              setAuth(null);
              setPayload({});
              setError(null);
            }}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            <LogOut className="size-4" /> Déconnexion
          </button>
        </aside>

        <section className="p-4 md:p-8">
          <header className="flex flex-col gap-4 rounded-[28px] bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm uppercase tracking-[0.2em] text-slate-400">{auth.user.role === 'admin' ? 'admin' : 'salarié'}</div>
              <h1 className="mt-2 text-3xl font-semibold">{activeMeta.title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-500">{activeMeta.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">
                <Search className="size-4" /> Recherche globale
              </div>
              <button onClick={refreshData} className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 hover:bg-slate-50">
                <RefreshCw className={`size-4 ${bootstrapping ? 'animate-spin' : ''}`} /> Actualiser
              </button>
              <button className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 hover:bg-slate-50">
                <Bell className="size-4" />
              </button>
            </div>
          </header>

          <div className="mt-6 grid gap-4 md:grid-cols-3 xl:grid-cols-4">
            <KpiCard label="Modules actifs" value={String(tabs.length)} icon={<Layers3 className="size-4" />} />
            <KpiCard label="Rôle" value={auth.user.role === 'admin' ? 'Admin' : 'Salarié'} icon={<Shield className="size-4" />} />
            <KpiCard label="Backend" value={bootstrapping ? 'Sync...' : 'Connecté'} icon={<BriefcaseBusiness className="size-4" />} />
            <KpiCard label="Base" value="PostgreSQL" icon={<Building2 className="size-4" />} />
          </div>

          {error ? <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

          <div className="mt-6">
            <Panel activeTab={activeTab} payload={payload} />
          </div>
        </section>
      </div>
    </main>
  );
}
