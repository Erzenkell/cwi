FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY src ./src
COPY templates ./templates
USER node
EXPOSE 4000
CMD ["node", "src/index.js"]
