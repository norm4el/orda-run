FROM node:22 AS builder
WORKDIR /app

# Копируем весь проект целиком
COPY . .

# Собираем фронтенд
RUN cd frontend && npm install && npm run build

# Устанавливаем зависимости бэкенда
RUN cd backend && npm install --production

# Копируем собранный фронтенд в папку public бэкенда
RUN cp -r frontend/dist backend/public

# Запускаем бэкенд из папки backend
WORKDIR /app/backend
CMD ["node", "dist/index.js"]