FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts

EXPOSE 3001

USER node

CMD ["node", "src/server.js"]
