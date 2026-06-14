FROM node:20-alpine

RUN apk add --no-cache python3 make g++ jq

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY config.js server.js db.js ./
COPY public/ ./public/

RUN mkdir -p /data

COPY run.sh /run.sh
RUN chmod +x /run.sh

CMD ["/run.sh"]
