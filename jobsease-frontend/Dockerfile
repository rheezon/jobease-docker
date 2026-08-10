FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build-time envs for Vite (used by import.meta.env.*)
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_ENABLE_BACKEND_API
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_ENABLE_BACKEND_API=$VITE_ENABLE_BACKEND_API

# Build the app
COPY . .
RUN npm run build

# Serve with Nginx
FROM nginx:alpine AS runner

# Replace default site with SPA-aware config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy entrypoint script for runtime env injection
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Ensure log directory and files exist with proper permissions
RUN mkdir -p /var/log/nginx && \
    touch /var/log/nginx/access.log /var/log/nginx/error.log && \
    chmod -R 777 /var/log/nginx

EXPOSE 5173
ENTRYPOINT ["/docker-entrypoint.sh"]


