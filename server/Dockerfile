FROM node:22-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .


# Run your build script (e.g., compile TypeScript to JS)
RUN npm run build

# Remove development dependencies to save space
RUN npm prune --production


FROM node:22-slim AS runner

WORKDIR /app


ENV NODE_ENV=production



# Copy only the compiled code and production modules from Stage 1
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./


EXPOSE 4000

CMD ["node", "dist/app.js"]