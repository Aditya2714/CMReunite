FROM node:24-alpine AS frontend-build
WORKDIR /frontend
COPY Frontend/package.json Frontend/package-lock.json ./
RUN npm ci
COPY Frontend/ ./
RUN npm run build

FROM node:24-alpine AS backend-dependencies
WORKDIR /app
COPY Backend/package.json Backend/package-lock.json ./
RUN npm ci --omit=dev

FROM node:24-alpine
ENV NODE_ENV=production
ENV HOST=0.0.0.0
WORKDIR /app
COPY --from=backend-dependencies /app/node_modules ./node_modules
COPY --chown=node:node Backend/ ./
COPY --from=frontend-build --chown=node:node /frontend/dist/ ./public/
RUN mkdir -p public/uploads/profiles public/uploads/recognitions public/uploads/announcements \
    && chown -R node:node public/uploads \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
      /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
USER node
EXPOSE 10000
CMD ["node", "server.js"]
