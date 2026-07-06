# --- Stage 1: Build Frontend ---
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: Build Backend ---
FROM node:22-alpine AS backend-builder
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN chmod +x ./node_modules/.bin/tsc
RUN npm run build

# --- Stage 3: Install Production Dependencies for Backend ---
FROM node:22-alpine AS backend-deps
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev

# --- Stage 4: Run Application ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Copy built backend and its production dependencies
COPY --from=backend-builder /app/backend/dist /app/backend/dist
COPY --from=backend-deps /app/backend/node_modules /app/backend/node_modules
COPY --from=backend-builder /app/backend/package.json /app/backend/package.json

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Expose port and run backend
WORKDIR /app/backend
EXPOSE 3000
CMD ["node", "dist/index.js"]
