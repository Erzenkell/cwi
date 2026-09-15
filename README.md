# Wordsinvest CRM

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
