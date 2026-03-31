# Wordsinvest CRM

Starter CRM React + Node adapté à vos specs métier.

## Ce qui a été adapté

- modules salariés: `COMPTES`, `CONTACTS`, `OPPORTUNITÉS`, `SOUS-TRAITANT`
- modules admin: `PISTES`, `FACTURES`, `SYNTHÈSE`, `MEILLEURS CLIENTS`
- extension issue des specs archivées: `UTILISATEURS` et `GROUPES`
- frontend React TSX connecté à l'API Node.js
- backend Express structuré par domaines
- PostgreSQL sous Docker Compose
- authentification JWT

## Structure backend

- `server/src/routes/auth.routes.js`
- `server/src/routes/entities.routes.js`
- `server/src/routes/dashboard.routes.js`
- `server/src/routes/admin.routes.js`

## Endpoints

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/entities`
- `GET /api/dashboard/summary`
- `GET /api/dashboard/top-clients`
- `GET /api/admin/users`
- `GET /api/admin/groups`

## Lancement

### 1) Base de données
```bash
docker compose up -d
```

### 2) Backend
```bash
cd server
cp .env.example .env
npm install
npm run seed
npm run dev
```

### 3) Frontend
```bash
npm install
npm run dev
```

## Comptes démo

- `employee@crm.local` / `password123`
- `admin@crm.local` / `password123`

## Note sur les specs fournies

Le fichier de specs reçu contenait notamment des références à ces domaines Ruby/RSpec:

- `accounts`
- `contacts`
- `leads`
- `opportunities`
- `invoices`
- `suppliers`
- `admin/users`
- `admin/groups`
- `dashboard`

Cette base les remappe côté Node/React vers les modules CRM correspondants.
