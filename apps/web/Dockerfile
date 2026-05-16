FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

FROM node:24-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_PACTARA_API_URL=http://localhost:8080
ENV NEXT_PUBLIC_PACTARA_API_URL=$NEXT_PUBLIC_PACTARA_API_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-alpine AS runner
WORKDIR /app
ARG NEXT_PUBLIC_PACTARA_API_URL=http://localhost:8080
ENV NODE_ENV=production
ENV NEXT_PUBLIC_PACTARA_API_URL=$NEXT_PUBLIC_PACTARA_API_URL
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD wget -qO- http://localhost:3000 || exit 1
CMD ["node", "server.js"]
