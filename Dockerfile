FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# --- ADD THIS LINE ---
RUN npx prisma generate
# ---------------------

RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]