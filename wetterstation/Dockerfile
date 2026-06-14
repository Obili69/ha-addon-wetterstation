ARG BUILD_FROM
FROM $BUILD_FROM

# Install Node.js + build tools for better-sqlite3
RUN apk add --no-cache nodejs npm python3 make g++

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY config.js server.js db.js ./
COPY public/ ./public/

RUN mkdir -p /data

COPY run.sh /run.sh
RUN chmod +x /run.sh

CMD ["/run.sh"]
