FROM node:24-bookworm-slim

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY cli.ts ./cli.ts
COPY scripts ./scripts
COPY src ./src
COPY docs/ec2-scenarios.jsonl ./docs/ec2-scenarios.jsonl
COPY vendor/hmem/src ./vendor/hmem/src
COPY vendor/hmem/package.json ./vendor/hmem/package.json
RUN mkdir /app/.cci-memory && chmod 1777 /app/.cci-memory

USER node
EXPOSE 36335
CMD ["npm", "start", "--", "--no-open"]
