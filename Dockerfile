# Laufkarte Softwareeinführung – schlankes Node-Image ohne weitere Abhängigkeiten
FROM node:20-alpine
WORKDIR /app
COPY package.json server.js ./
COPY public ./public
# Daten liegen in einem Volume, damit sie Updates überstehen
ENV PORT=8080 DATA_DIR=/data
RUN mkdir -p /data && chown -R node:node /data
USER node
EXPOSE 8080
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz >/dev/null 2>&1 || exit 1
CMD ["node", "server.js"]
