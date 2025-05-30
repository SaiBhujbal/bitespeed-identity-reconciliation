##################  BUILD  ##################
FROM node:18-alpine AS build
WORKDIR /app

# 1. install deps
COPY package*.json tsconfig.json ./
RUN npm ci

# 2. generate linux-musl Prisma client
COPY prisma ./prisma
RUN npx prisma generate
RUN npx prisma db push

# 3. compile TS
COPY src ./src
RUN npm run build          # assumes "build": "node ./node_modules/typescript/lib/tsc.js"

##################  RUNTIME ##################
FROM node:18-alpine
WORKDIR /app

ENV NODE_ENV=production

# copy runtime deps + Prisma client
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist         ./dist
COPY --from=build /app/package.json ./package.json
COPY prisma ./prisma

EXPOSE 3000
CMD ["node","dist/index.js"]
