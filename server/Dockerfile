FROM node:20-slim

WORKDIR /app

# Install dependencies first (cache layer)
COPY package.json ./
RUN npm install --omit=dev

# Copy source
COPY src/ ./src/

# Cloud Run sets PORT env var
ENV PORT=8080
EXPOSE 8080

CMD ["node", "src/index.js"]
