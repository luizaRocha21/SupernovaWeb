FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY server.js ./
COPY supabase/ ./supabase/
EXPOSE 10000
ENV PORT=10000
CMD ["node", "server.js"]
