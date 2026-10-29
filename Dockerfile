# AI Sandbox: one container serves the built SPA and the API on $PORT.
FROM node:22-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build
ENV NODE_ENV=production PORT=3000 DATA_DIR=/app/data TRUST_PROXY=1
VOLUME ["/app/data"]
EXPOSE 3000
USER node
CMD ["npx", "tsx", "server/index.ts"]
