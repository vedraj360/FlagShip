FROM node:20-slim

RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY backend/package*.json ./
COPY backend/prisma ./prisma/

RUN npm install

COPY backend/. .

RUN npx prisma generate
RUN npm run build

EXPOSE 4000
CMD ["npm", "start"]
