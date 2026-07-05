FROM node:22 AS builder
WORKDIR /app

# Копируем всё
COPY . .

# Собираем фронтенд
RUN cd frontend && npm install && npm run build

# Устанавливаем зависимости бэкенда
RUN cd backend && npm install --production

# Копируем фронтенд прямо внутрь папки dist бэкенда
RUN cp -r frontend/dist backend/dist/public

# Запускаем
WORKDIR /app/backend
CMD ["node", "dist/index.js"]