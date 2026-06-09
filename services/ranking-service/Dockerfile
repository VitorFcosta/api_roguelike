FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY --chown=node:node src ./src

EXPOSE 3004

USER node

CMD ["node", "src/server.js"]
