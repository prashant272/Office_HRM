# 1. Base Image - Lightweight Node.js 20 on Alpine Linux
FROM node:20-alpine

# 2. Set working directory inside container
WORKDIR /usr/src/app

# 3. Copy package files first for efficient Docker layer caching
COPY package*.json ./

# 4. Install production dependencies
RUN npm install --omit=dev --no-audit

# 5. Copy the rest of backend application source code
COPY . .

# 6. Expose backend server port
EXPOSE 5000

# 7. Set default environment to production
ENV NODE_ENV=production

# 8. Start the Express & Socket.io server
CMD ["node", "server.js"]

