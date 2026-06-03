# Adaptation des vues 

## Mapping des vues

| Vue CRM | Tables utilisées | Champs affichés |
|---|---|---|
| COMPTES | `accounts` | nom, catégorie, email, téléphone, localisation, note |
| CONTACTS | `contacts`, `account_contacts`, `accounts` | nom, compte, email, téléphone, fonction, localisation |
| OPPORTUNITÉS | `opportunities`, `account_opportunities`, `accounts` | opportunité, compte, montant, étape, probabilité, langues, prestation |
| SOUS-TRAITANT | `suppliers` | nom, société, email, téléphone, localisation, spécialité |
| PISTES | `leads` | nom, société, statut, source, email, téléphone, note |
| FACTURES | `abstract_invoices`, `accounts` | référence, client, montant, TVA, statut, dates |
| SYNTHÈSE | agrégats sur `accounts`, `contacts`, `opportunities`, `abstract_invoices`, `leads`, `suppliers` | KPI métier |
| MEILLEURS CLIENTS | `abstract_invoices`, `accounts` | CA facturé par client |
| UTILISATEURS | `users`, `groups_users`, `groups` | annuaire utilisateur du dump, pas utilisé pour le login |
| GROUPES | `groups`, `groups_users` | groupes et nombre de membres |

## Initialisation login applicatif

```bash
cd server
npm run seed
```

Comptes de test applicatifs :

```txt
employee@crm.local / password123
admin@crm.local / password123
```

Ces comptes sont stockés dans `crm_app_users` et ne dépendent pas de l'ancienne table `users` du dump.
