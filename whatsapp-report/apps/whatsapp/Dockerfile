# Mass WhatsApp Report orchestrator — @julio/whatsapp-app
# NOTE: repo primary deploy is Procfile; this Dockerfile is provided per REQUIREM §13.
FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
# Yarn v1 workspaces need the full workspace graph to resolve @julio/* symlinks.
COPY package.json yarn.lock .nvmrc ./
COPY apps ./apps
COPY packages ./packages
COPY whatsapp-report ./whatsapp-report
RUN yarn install --frozen-lockfile --non-interactive
# Default process = orchestrator worker. Override CMD for the MCP HTTP surface:
#   docker run ... yarn workspace @julio/whatsapp-app mcp:http
EXPOSE 7300 7301
CMD ["yarn", "workspace", "@julio/whatsapp-app", "start"]
