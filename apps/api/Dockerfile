FROM node:24-alpine
RUN npm install -g pnpm@12.16.1
WORKDIR /app

COPY . .
RUN pnpm install --frozen-lockfile --filter api...
RUN pnpm --filter @kompak/shared build && pnpm --filter api build

ENV NODE_ENV=production
EXPOSE 4000
CMD ["pnpm", "--filter", "api", "start:prod"]