########################
# 1. Build stage
########################
FROM node:18-alpine AS build
WORKDIR /app

# 1-A  install production-only deps (keeps final image slim)
COPY package*.json tsconfig.json ./
RUN npm ci --omit=dev

# 1-B  generate Prisma client – no DB access needed
COPY prisma ./prisma
RUN npx prisma generate

# 1-C  transpile TypeScript → dist/
COPY src ./src
RUN npm run build          # "build": "node ./node_modules/typescript/lib/tsc.js"

########################
# 2. Runtime stage
########################
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# 2-A  copy only what the server needs
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist         ./dist
COPY --from=build /app/prisma       ./prisma   # ← uses the already-verified copy
COPY package.json ./package.json

EXPOSE 3000

# 2-B  At start-time:
#      1. push/upgrade schema (DATABASE_URL is now present)
#      2. launch the API
CMD ["sh","-c","npx prisma db push && node dist/index.js"]
