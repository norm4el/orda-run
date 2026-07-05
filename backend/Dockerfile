FROM node:18
WORKDIR /app
COPY package*.json ./
# Устанавливаем ВСЕ зависимости (включая devDependencies, где лежит typescript)
RUN npm install
COPY . .
# Используем npx для вызова tsc из локальной папки node_modules
RUN npx tsc -p tsconfig.json
CMD ["node", "dist/index.js"]