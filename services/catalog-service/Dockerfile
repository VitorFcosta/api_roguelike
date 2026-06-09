FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts

EXPOSE 3002

USER node

CMD ["node", "src/server.js"]
