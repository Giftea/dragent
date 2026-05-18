FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY packages/api/package*.json ./packages/api/
COPY packages/core/package*.json ./packages/core/
COPY packages/api/tsconfig.json ./packages/api/
COPY packages/core/tsconfig.json ./packages/core/
COPY packages/api/src ./packages/api/src
COPY packages/core/src ./packages/core/src
COPY packages/contracts/artifacts ./packages/contracts/artifacts
RUN npm install --workspace=packages/api --workspace=packages/core
RUN npm run build --workspace=packages/core
RUN npm run build --workspace=packages/api
CMD ["node", "packages/api/dist/index.js"]
