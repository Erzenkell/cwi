# Wordsinvest CRM

Le dépôt contient deux applications indépendantes :

- le frontend React/Vite à la racine ;
- l'API Node/Express dans `server/` ;
- PostgreSQL, initialisé depuis le dump métier et les scripts de `server/sql/`.

## Développement

```bash
docker compose up -d
cd server
cp .env.example .env
npm install
npm run seed
npm run dev
```

Dans un second terminal :

```bash
npm install
npm run dev
```

## Production avec Docker

### 1. Configuration

Copier `.env.production.example` vers `.env.production`, puis remplacer tous les secrets `CHANGE_ME`. `APP_ORIGIN` doit être l'URL HTTPS publique exacte, sans slash final.

```bash
cp .env.production.example .env.production
```

Le fichier `.env.production` est ignoré par Git. Ne jamais le committer.

Sur Railway, le service frontend utilise par défaut `API_HOST=api.railway.internal` et `API_PORT=4000`. Si le service API porte un autre nom, définir `API_HOST=<nom-du-service>.railway.internal` dans les variables du frontend.

### 2. Construction et démarrage

```bash
npm run prod:build
npm run prod:up
```

L'application est exposée sur `APP_PORT` (8080 par défaut). PostgreSQL et l'API restent accessibles uniquement sur le réseau Docker interne. Nginx sert le frontend et transmet `/api` à l'API.

Au premier démarrage d'un volume vide, PostgreSQL restaure automatiquement le dump métier puis applique les scripts SQL complémentaires. Cette initialisation peut prendre quelques minutes.

### 3. Premier compte administrateur

Après que les conteneurs sont sains :

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml run --rm api npm run seed:production
```

Cette commande utilise `ADMIN_EMAIL`, `ADMIN_PASSWORD` et `ADMIN_FULL_NAME`. Elle ne remplace jamais le mot de passe d'un compte déjà existant.

### Commandes utiles

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml logs -f
npm run prod:down
```

Le volume `postgres_prod_data` conserve la base lors d'un arrêt ou d'une recréation des conteneurs. La commande `prod:down` ne le supprime pas.

## Comptes de développement uniquement

- `employee@crm.local` / `password123`
- `admin@crm.local` / `password123`
