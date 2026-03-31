import { useMemo, useState, type ComponentType } from 'react';
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
  Wallet,
} from 'lucide-react';

type Role = 'employee' | 'admin';
type EmployeeTab = 'COMPTES' | 'CONTACTS' | 'OPPORTUNITÉS' | 'SOUS-TRAITANT';
type AdminTab = 'PISTES' | 'FACTURES' | 'SYNTHÈSE' | 'MEILLEURS CLIENTS' | 'COMPTES' | 'CONTACTS' | 'OPPORTUNITÉS' | 'SOUS-TRAITANT';
type Tab = EmployeeTab | AdminTab;

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
  { label: 'COMPTES', icon: Building2 },
  { label: 'CONTACTS', icon: Users },
  { label: 'OPPORTUNITÉS', icon: Target },
  { label: 'SOUS-TRAITANT', icon: Handshake },
];

const accounts = [
  { name: 'Wordsinvest Capital', sector: 'Finance', owner: 'Sofia', status: 'Actif', revenue: '€320k' },
  { name: 'Nova Industrie', sector: 'Industrie', owner: 'Yanis', status: 'À relancer', revenue: '€185k' },
  { name: 'Aster Conseil', sector: 'Conseil', owner: 'Lina', status: 'Fidèle', revenue: '€96k' },
];

const contacts = [
  { name: 'Camille Durand', company: 'Wordsinvest Capital', email: 'camille@wordsinvest.test', role: 'CEO' },
  { name: 'Romain Perez', company: 'Nova Industrie', email: 'romain@nova.test', role: 'Acheteur' },
  { name: 'Inès Martin', company: 'Aster Conseil', email: 'ines@aster.test', role: 'CFO' },
];

const opportunities = [
  { label: 'Refonte CRM Europe', value: '€42k', stage: 'Proposition', probability: '75%' },
  { label: 'Migration data room', value: '€28k', stage: 'Négociation', probability: '60%' },
  { label: 'Audit partenaires', value: '€18k', stage: 'Découverte', probability: '35%' },
];

const subcontractors = [
  { name: 'Atlas Tech', specialty: 'Développement', rating: '4.8/5', availability: 'Disponible' },
  { name: 'Blue Ledger', specialty: 'Comptabilité', rating: '4.4/5', availability: 'Sous 2 semaines' },
  { name: 'North Ops', specialty: 'Support', rating: '4.6/5', availability: 'Disponible' },
];

const leads = [
  { company: 'Meridian Group', source: 'LinkedIn', score: 82, assignedTo: 'Sofia' },
  { company: 'Hexa Patrimoine', source: 'Salon', score: 76, assignedTo: 'Yanis' },
  { company: 'Delta One', source: 'Referral', score: 69, assignedTo: 'Lina' },
];

const invoices = [
  { ref: 'INV-2026-001', client: 'Wordsinvest Capital', amount: '€12,500', status: 'Payée' },
  { ref: 'INV-2026-002', client: 'Nova Industrie', amount: '€8,900', status: 'En attente' },
  { ref: 'INV-2026-003', client: 'Aster Conseil', amount: '€6,100', status: 'Brouillon' },
];

const summaryStats = [
  { label: 'CA mensuel', value: '€128k' },
  { label: 'Taux de conversion', value: '31%' },
  { label: 'Dossiers actifs', value: '48' },
  { label: 'Encours factures', value: '€27k' },
];

const topClients = [
  { name: 'Wordsinvest Capital', turnover: '€320k', health: 'Excellent' },
  { name: 'Nova Industrie', turnover: '€185k', health: 'Stable' },
  { name: 'Aster Conseil', turnover: '€96k', health: 'Croissance' },
];

function LoginCard({ onLogin }: { onLogin: (role: Role) => void }) {
  return (
    <div className="absolute left-1/2 top-1/2 flex flex-col w-1/3 -translate-x-1/2 -translate-y-1/2 justify-between rounded-[28px] bg-slate-950/70 p-8 text-white ring-1 ring-white/10">
      <div>
        <h2 className="text-2xl font-semibold">Connexion démo</h2>
        <p className="mt-2 text-sm text-slate-400">Choisissez un rôle pour ouvrir l'interface correspondante.</p>
      </div>

      <div className="mt-8 space-y-4">
        <button
          onClick={() => onLogin('employee')}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-left transition hover:border-indigo-400 hover:bg-slate-800 cursor-pointer"
        >
          <div>
            <div className="font-medium">Connexion salarié</div>
            <div className="text-sm text-slate-400">Comptes, contacts, opportunités, sous-traitants</div>
          </div>
          <Users className="size-5" />
        </button>

        <button
          onClick={() => onLogin('admin')}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-700 bg-slate-900 px-5 py-4 text-left transition hover:border-indigo-400 hover:bg-slate-800 cursor-pointer"
        >
          <div>
            <div className="font-medium">Connexion admin</div>
            <div className="text-sm text-slate-400">Pistes, factures, synthèse, meilleurs clients</div>
          </div>
          <Shield className="size-5" />
        </button>
      </div>

      <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">
        Comptes démo backend: employee@crm.local / admin@crm.local — mot de passe: password123
      </div>
    </div>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: Record<string, string | number>[] }) {
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
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-slate-100 text-slate-700">
                {Object.values(row).map((value, idx) => (
                  <td key={idx} className="px-4 py-3">{value}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Panel({ activeTab }: { activeTab: Tab }) {
  switch (activeTab) {
    case 'COMPTES':
      return <DataTable columns={['Nom', 'Secteur', 'Responsable', 'Statut', 'CA']} rows={accounts} />;
    case 'CONTACTS':
      return <DataTable columns={['Nom', 'Société', 'Email', 'Fonction']} rows={contacts} />;
    case 'OPPORTUNITÉS':
      return <DataTable columns={['Affaire', 'Valeur', 'Étape', 'Probabilité']} rows={opportunities} />;
    case 'SOUS-TRAITANT':
      return <DataTable columns={['Nom', 'Spécialité', 'Note', 'Disponibilité']} rows={subcontractors} />;
    case 'PISTES':
      return <DataTable columns={['Société', 'Source', 'Score', 'Assigné à']} rows={leads} />;
    case 'FACTURES':
      return <DataTable columns={['Réf.', 'Client', 'Montant', 'Statut']} rows={invoices} />;
    case 'SYNTHÈSE':
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryStats.map((item) => (
            <div key={item.label} className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-sm text-slate-500">{item.label}</div>
              <div className="mt-2 text-3xl font-semibold text-slate-900">{item.value}</div>
            </div>
          ))}
        </div>
      );
    case 'MEILLEURS CLIENTS':
      return <DataTable columns={['Client', 'Chiffre d\'affaires', 'Santé']} rows={topClients} />;
    default:
      return null;
  }
}

function Dashboard({ role, onLogout }: { role: Role; onLogout: () => void }) {
  const tabs = role === 'admin' ? adminTabs : employeeTabs;
  const [activeTab, setActiveTab] = useState<Tab>(tabs[0].label);

  const kpis = useMemo(
    () =>
      role === 'admin'
        ? [
            { label: 'Pistes actives', value: '24' },
            { label: 'Factures du mois', value: '17' },
            { label: 'Taux de closing', value: '31%' },
          ]
        : [
            { label: 'Comptes gérés', value: '42' },
            { label: 'Contacts clés', value: '118' },
            { label: 'Pipeline ouvert', value: '€88k' },
          ],
    [role],
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-slate-950 px-6 py-8 text-white lg:block">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-indigo-500 text-white">W</div>
          Wordsinvest CRM
        </div>

        <div className="mt-10 text-xs uppercase tracking-[0.2em] text-slate-400">Navigation</div>
        <nav className="mt-4 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.label;
            return (
              <button
                key={tab.label}
                onClick={() => setActiveTab(tab.label)}
                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition ${
                  active ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-white/10 hover:text-white cursor-pointer'
                }`}
              >
                <Icon className="size-4" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-4 backdrop-blur md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm text-slate-500">{role === 'admin' ? 'Espace administrateur' : 'Espace salarié'}</div>
              <h1 className="text-2xl font-semibold">{activeTab}</h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="rounded-2xl border border-slate-200 bg-white p-3"><Bell className="size-4" /></button>
              <button onClick={onLogout} className="flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white cursor-pointer">
                <LogOut className="size-4" /> Déconnexion
              </button>
            </div>
          </div>
        </header>

        <section className="space-y-6 px-4 py-6 md:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            {kpis.map((item) => (
              <div key={item.label} className="rounded-[24px] bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <div className="text-sm text-slate-500">{item.label}</div>
                <div className="mt-2 text-3xl font-semibold">{item.value}</div>
              </div>
            ))}
          </div>
          <Panel activeTab={activeTab} />
        </section>
      </main>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState<Role | null>(null);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.18),_transparent_35%),linear-gradient(180deg,_#020617,_#111827)] p-4 md:p-8">
      {role ? <Dashboard role={role} onLogout={() => setRole(null)} /> : <LoginCard onLogin={setRole} />}
    </div>
  );
}
