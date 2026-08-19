FROM node:24-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=47831
ENV DATA_DIRECTORY=/app/ranking-data
ENV UPDATE_DIRECTORY=/app/updates

COPY ranking-server.js ./

RUN mkdir -p /app/ranking-data /app/updates \
    && chown -R node:node /app

USER node
EXPOSE 47831

CMD ["node", "ranking-server.js"]
