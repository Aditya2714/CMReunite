FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM node:20-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN mkdir -p public/uploads/profiles public/uploads/recognitions
EXPOSE 4000
CMD ["node", "server.js"]
