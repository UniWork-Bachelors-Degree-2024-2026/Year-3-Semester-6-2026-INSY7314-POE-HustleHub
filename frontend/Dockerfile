# Base image -> Node environment for building the React application
# (rudderz243, 2026).
FROM node:24-alpine AS build

# Workdir -> where the app will live in the container during build
WORKDIR /app

# 1st step in building -> get package descriptors
COPY package.json package-lock.json ./

# Install all dependencies inside the container
RUN npm ci

# Copy the actual frontend source code
COPY . .

# The API address is baked into the React build, docker-compose.yml passes it in as a build argument
ARG VITE_API_URL=https://localhost:3000/api
ENV VITE_API_URL=$VITE_API_URL

# Build the production static distribution
RUN npm run build

# Stage 2: Serve using unprivileged Nginx for maximum security
FROM nginxinc/nginx-unprivileged:alpine

# Install curl for Docker healthcheck monitoring
USER root
RUN apk add --no-cache curl
USER 101

# The Nginx config is a template: the official image fills in ${API_ORIGIN} when the container starts
# and writes the result to /etc/nginx/conf.d/default.conf (Nginx Inc., 2026).
ENV API_ORIGIN=https://localhost:3000
ENV NGINX_ENVSUBST_FILTER=API_ORIGIN

# Copy custom Nginx configuration template and compiled distribution
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

# Expose HTTPS port for frontend
EXPOSE 5173

# Reference List:
# rudderz243, 2026. insy7314-library. [online] Available at: <https://github.com/rudderz243/insy7314-library> [Accessed 15 August 2026].
