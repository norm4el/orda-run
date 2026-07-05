FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# Вместо npx используем прямой путь к исполняемому файлу
RUN ./node_modules/.bin/tsc -p tsconfig.json
CMD ["node", "dist/index.js"]