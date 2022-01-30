FROM node:16-alpine AS appBuild

# Create app directory
WORKDIR /usr/src/publicecko_api

COPY package*.json ./
COPY . .

RUN npm install

COPY ./src ./src
COPY ./prisma ./prisma

RUN npm run build

# Build stage 2
# This build takes the production build from staging build

FROM node:16-alpine

WORKDIR /usr/src/publicecko_api

COPY package*.json ./

RUN npm install

COPY --from=appBuild /usr/src/publicecko_api/dist ./dist

EXPOSE 8080

CMD [ "npm", "start" ]
