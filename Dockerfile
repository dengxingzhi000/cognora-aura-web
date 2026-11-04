# Multi-stage build for the Next.js standalone output.
# The API_*_TARGET values are baked into the build (next.config.ts rewrites),
# so pass them as build args, e.g.
#   docker build --build-arg API_AUTH_TARGET=http://gateway:8106 ... .
FROM node:26-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:26-alpine AS builder
WORKDIR /app
# next.config.ts turns these into rewrite rules, so they are resolved during
# `npm run build`; override them with --build-arg when the backend is not on
# localhost.
ARG API_AUTH_TARGET=http://localhost:8106
ARG API_SYSTEM_TARGET=http://localhost:8081
ARG API_PRODUCT_TARGET=http://localhost:8201
ARG API_INVENTORY_TARGET=http://localhost:8202
ARG API_ORDER_TARGET=http://localhost:8203
ARG API_WAREHOUSE_TARGET=http://localhost:8204
ARG API_LOGISTICS_TARGET=http://localhost:8205
ARG API_SUPPLIER_TARGET=http://localhost:8206
ARG API_PURCHASE_TARGET=http://localhost:8207
ARG API_FINANCE_TARGET=http://localhost:8208
ARG API_APPROVAL_TARGET=http://localhost:8209
ARG API_AUDIT_TARGET=http://localhost:8210
ARG API_NOTIFY_TARGET=http://localhost:8211
ARG API_TENANT_TARGET=http://localhost:8212
ARG API_DOCUMENT_TARGET=http://localhost:8213
ARG API_FILE_TARGET=http://localhost:8214
ARG API_ANALYTICS_TARGET=http://localhost:8308
ARG API_MALL_TARGET=http://localhost:8301
ARG API_MEMBER_TARGET=http://localhost:8302
ARG API_PROMOTION_TARGET=http://localhost:8303
ARG API_PAYMENT_TARGET=http://localhost:8304
ARG API_ORDER_CENTER_TARGET=http://localhost:8305
ARG API_FULFILLMENT_TARGET=http://localhost:8306
ARG API_SEARCH_TARGET=http://localhost:8307
ENV API_AUTH_TARGET=$API_AUTH_TARGET \
    API_SYSTEM_TARGET=$API_SYSTEM_TARGET \
    API_PRODUCT_TARGET=$API_PRODUCT_TARGET \
    API_INVENTORY_TARGET=$API_INVENTORY_TARGET \
    API_ORDER_TARGET=$API_ORDER_TARGET \
    API_WAREHOUSE_TARGET=$API_WAREHOUSE_TARGET \
    API_LOGISTICS_TARGET=$API_LOGISTICS_TARGET \
    API_SUPPLIER_TARGET=$API_SUPPLIER_TARGET \
    API_PURCHASE_TARGET=$API_PURCHASE_TARGET \
    API_FINANCE_TARGET=$API_FINANCE_TARGET \
    API_APPROVAL_TARGET=$API_APPROVAL_TARGET \
    API_AUDIT_TARGET=$API_AUDIT_TARGET \
    API_NOTIFY_TARGET=$API_NOTIFY_TARGET \
    API_TENANT_TARGET=$API_TENANT_TARGET \
    API_DOCUMENT_TARGET=$API_DOCUMENT_TARGET \
    API_FILE_TARGET=$API_FILE_TARGET \
    API_ANALYTICS_TARGET=$API_ANALYTICS_TARGET \
    API_MALL_TARGET=$API_MALL_TARGET \
    API_MEMBER_TARGET=$API_MEMBER_TARGET \
    API_PROMOTION_TARGET=$API_PROMOTION_TARGET \
    API_PAYMENT_TARGET=$API_PAYMENT_TARGET \
    API_ORDER_CENTER_TARGET=$API_ORDER_CENTER_TARGET \
    API_FULFILLMENT_TARGET=$API_FULFILLMENT_TARGET \
    API_SEARCH_TARGET=$API_SEARCH_TARGET
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM node:26-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
