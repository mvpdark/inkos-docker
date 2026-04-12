FROM node:22-bookworm-slim

ARG INKOS_VERSION=latest
ENV NODE_ENV=production
WORKDIR /workspace

RUN npm install -g @actalk/inkos@${INKOS_VERSION} \
    && npm cache clean --force

EXPOSE 4567

CMD ["sh", "-c", "inkos studio -p 4567"]