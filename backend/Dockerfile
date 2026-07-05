FROM node:18 AS builder
WORKDIR /app

# Копируем всё содержимое проекта в контейнер
COPY . .

# Собираем фронтенд
RUN cd frontend && npm install && npm run build

# Собираем бэкенд
RUN cd backend && npm install --production

# Копируем собранный фронтенд в папку public бэкенда
RUN cp -r frontend/dist backend/public

# Запускаем бэкенд
WORKDIR /app/backend
CMD ["node", "dist/index.js"]