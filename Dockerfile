FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY index.html vite.config.ts postcss.config.mjs ./
COPY src ./src

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build


FROM nginx:1.27-alpine

ENV API_HOST=api.railway.internal
ENV API_PORT=4000

COPY nginx.conf /etc/nginx/templates/default.conf.template

COPY railway-resolver.envsh /docker-entrypoint.d/05-railway-resolver.envsh

RUN chmod +x /docker-entrypoint.d/05-railway-resolver.envsh

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1