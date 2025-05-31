########################
# 1️⃣ Build stage
########################
FROM node:18-alpine AS build
WORKDIR /app

# 1. Install dependencies
COPY package*.json tsconfig.json ./
RUN npm ci

# 2. Prisma client (no DB access needed)
COPY prisma ./prisma
RUN npx prisma generate

# 3. Compile TypeScript
COPY src ./src
RUN npm run build                 # "build": "node ./node_modules/typescript/lib/tsc.js"

########################
# 2️⃣ Runtime stage
########################
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production

# copy only what we need
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist         ./dist
COPY prisma ./prisma                # keep schema for db push
COPY package.json ./package.json

EXPOSE 3000

# 🛠️  runtime: create/update tables, then start API
CMD ["sh","-c","npx prisma db push && node dist/index.js"]
