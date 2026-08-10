FROM node:20.12.0-alpine3.19 AS base
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps ./apps
COPY packages ./packages
RUN npm install 
RUN npm run db:generate
RUN npm run build
EXPOSE 3000
CMD ["npm","run","start-app"]
