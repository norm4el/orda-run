FROM node:18
WORKDIR /app

# Копируем и устанавливаем зависимости
COPY backend/package*.json ./
RUN npm install --production

# Копируем код бэкенда
COPY backend/ .

# Копируем собранный фронтенд в папку public
COPY frontend/dist ./public

CMD ["node", "dist/index.js"]