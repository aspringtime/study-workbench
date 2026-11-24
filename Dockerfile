# syntax=docker/dockerfile:1

# ---------- 构建 ----------
FROM node:24-alpine AS build
WORKDIR /app

# corepack 在 alpine 上挑版本不太稳，直接装 pnpm 11
RUN npm install -g pnpm@11

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json vite.config.ts ./
COPY src ./src
RUN pnpm build

# ---------- 运行 ----------
FROM node:24-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    DATA_DIR=/data

# 直接把装好的依赖搬过来，运行镜像里不用再装一遍
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/src ./src

RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 8787

# 用 tsx 直接跑 TS，省掉一步 server 端编译
CMD ["node", "./node_modules/tsx/dist/cli.mjs", "src/server/index.ts"]
