FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --include=optional
COPY . .
RUN npm run build --if-present
EXPOSE 3000
CMD ["npm", "start"]
