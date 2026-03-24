# ── Stage 1: 安裝依賴 ──
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma/
RUN npm ci

# ── Stage 2: 建置 ──
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 產生 Prisma Client
RUN npx prisma generate

# 建置 Next.js（standalone 模式）
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── Stage 3: 執行環境（最小化映像） ──
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 建立非 root 使用者
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# 複製靜態資源
COPY --from=builder /app/public ./public

# 建立上傳目錄並賦予權限
RUN mkdir -p ./public/uploads && chown -R nextjs:nodejs ./public/uploads

# 複製 standalone 輸出
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 複製 Prisma schema + CLI（migrate deploy 需要）
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

# 啟動腳本
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./docker-entrypoint.sh"]
