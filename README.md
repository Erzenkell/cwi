# Wordsinvest CRM

Base CRM avec:
- frontend React + TSX + Vite
- backend Node.js + Express
- PostgreSQL via Docker Compose
- authentification JWT
- vues salariés et admin prêtes

## Frontend
```bash
npm install
npm run dev
```

## Base de données
```bash
docker compose up -d
```

## Backend
```bash
cd server
cp .env.example .env
npm install
npm run seed
npm run dev
```

## Comptes démo
- `employee@crm.local` / `password123`
- `admin@crm.local` / `password123`

## Endpoints
- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/navigation`
- `GET /api/seed-data`
