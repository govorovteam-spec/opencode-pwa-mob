FROM node:22-alpine
WORKDIR /app
COPY server.mjs package.json ./
COPY public ./public
EXPOSE 3000
CMD ["node", "server.mjs"]
