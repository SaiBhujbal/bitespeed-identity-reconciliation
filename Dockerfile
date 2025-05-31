########################
# 1. Build stage
########################
FROM node:18-alpine AS build
WORKDIR /app

# 1-A  install *all* dependencies (prod + dev)
COPY package*.json tsconfig.json ./
RUN npm ci

# 1-B  generate Prisma client
COPY prisma ./prisma
RUN npx prisma generate

# 1-C  transpile TypeScript
COPY src ./src
RUN npm run build                    # runs `tsc`

# 1-D  remove devDeps so runtime is slim
RUN npm prune --production

########################
# 2. Runtime stage
########################
FROM node:18-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# copy pruned prod deps + compiled code + schema
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist         ./dist
COPY --from=build /app/prisma       ./prisma
COPY package.json ./package.json

EXPOSE 3000

CMD ["sh","-c","npx prisma db push && node dist/index.js"]
