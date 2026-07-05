FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
# Копируем собранный фронтенд в папку public бэкенда
COPY ../frontend/dist ./public 
CMD ["node", "dist/index.js"]