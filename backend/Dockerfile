# Backend image — Prisma client is generated at build time into ./generated/prisma
FROM node:22-alpine AS builder

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

# Schema must exist before npm install (postinstall runs `prisma generate`).
COPY package.json ./
COPY prisma ./prisma

# Dummy URL is enough for `prisma generate` (no live DB needed).
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"

RUN npm install --no-audit --no-fund \
  && npx prisma generate

FROM node:22-alpine

RUN apk add --no-cache openssl libc6-compat

WORKDIR /app

COPY package.json ./
# Skip postinstall here — prisma CLI is a devDependency; client comes from builder.
RUN npm install --omit=dev --ignore-scripts --no-audit --no-fund

COPY . .
COPY --from=builder /app/generated ./generated

ENV NODE_ENV=production
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
