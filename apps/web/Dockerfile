FROM node:24-alpine
RUN npm install -g pnpm@12.16.1
WORKDIR /app

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL

COPY . .
RUN pnpm install --frozen-lockfile --filter web...
RUN pnpm --filter @kompak/shared build && pnpm --filter web build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "--filter", "web", "start"]