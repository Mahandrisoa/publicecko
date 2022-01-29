FROM node:16-alpine

# Create app directory
WORKDIR /usr/src/publicecko_api

COPY . .

RUN npm install && npm run build

COPY dist/ ./dist

EXPOSE 8080

CMD [ "npm", "start" ]
