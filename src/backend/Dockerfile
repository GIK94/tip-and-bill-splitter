# Build context is src/ (the backend imports the shared calculation engine from src/shared).
FROM node:22-alpine AS build
WORKDIR /app
COPY shared ./shared
COPY backend/package.json backend/package-lock.json ./backend/
RUN cd backend && npm ci --no-audit --no-fund
COPY backend ./backend
RUN cd backend && npm run build && npm prune --omit=dev

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app/backend
COPY --from=build --chown=node:node /app/backend/package.json ./
COPY --from=build --chown=node:node /app/backend/node_modules ./node_modules
COPY --from=build --chown=node:node /app/backend/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node", "dist/backend/src/main.js"]
