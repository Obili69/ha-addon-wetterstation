FROM ghcr.io/home-assistant/amd64-base:latest

# Install Node.js 20 LTS (HA base ships newer node which breaks better-sqlite3)
RUN apk add --no-cache nodejs-lts npm python3 make g++

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY config.js server.js db.js ./
COPY public/ ./public/

RUN mkdir -p /data

COPY run.sh /run.sh
RUN chmod +x /run.sh

CMD ["/run.sh"]
