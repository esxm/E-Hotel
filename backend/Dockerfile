# Use a slim base (alpine is fine if you have no native deps)
FROM node:18-alpine

# Define build argument for PORT
ARG PORT=8080

WORKDIR /app

# 1) Only copy your lockfile + package.json so you can leverage layer caching
COPY package*.json ./

# 2) Tell npm you're in production, and use CI for a clean, reproducible install
ENV NODE_ENV=production
RUN npm ci --omit=dev

# 3) Now copy the rest of your source
COPY . .

# 4) Create a non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# 5) Change ownership of the app directory
RUN chown -R nodejs:nodejs /app
USER nodejs

# 6) Set default environment variables
ENV PORT=${PORT}
ENV FIRESTORE_DATABASE_ID=""
ENV FIREBASE_SDK_SA_KEY=""

# 7) Expose port (EXPOSE is just documentation, but good to match your code)
EXPOSE ${PORT}

# 8) Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT}/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# 9) Start your server (make sure your code listens on process.env.PORT)
CMD ["node", "server.js"]
