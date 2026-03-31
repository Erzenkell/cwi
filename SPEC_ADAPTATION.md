# Adaptation des specs vers ce projet

## Mapping métier

| Specs repérées | Adaptation dans ce projet |
|---|---|
| `entities/accounts` | onglet `COMPTES` + table `accounts` |
| `entities/contacts` | onglet `CONTACTS` + table `contacts` |
| `entities/leads` | onglet admin `PISTES` + table `leads` |
| `entities/opportunities` | onglet `OPPORTUNITÉS` + table `opportunities` |
| `invoice_factories` | onglet admin `FACTURES` + table `invoices` |
| `supplier_factories` | onglet `SOUS-TRAITANT` + table `subcontractors` |
| `admin/users` | module admin `UTILISATEURS` + route `/api/admin/users` |
| `admin/groups` | module admin `GROUPES` + route `/api/admin/groups` |
| `dashboard_spec` | module `SYNTHÈSE` + routes dashboard |
| `opportunities_overview_spec` | module `MEILLEURS CLIENTS` / synthèse pipeline |

## Choix d'architecture

Les specs d'origine semblent provenir d'une app Rails monolithique avec contrôleurs `entities/*`, factories, et feature specs Capybara. Cette adaptation les transpose dans une architecture plus légère:

- frontend React TSX pour la navigation et l'affichage
- backend Node.js / Express pour les endpoints métier
- PostgreSQL pour les données
- seed unique pour jeux de données de démonstration

## Écart assumé

Les specs complètes n'ont pas été rejouées telles quelles en environnement Node, car elles ciblent visiblement une stack Ruby/Rails. À la place, les domaines fonctionnels et les écrans ont été conservés et remappés dans votre base React + Node.
