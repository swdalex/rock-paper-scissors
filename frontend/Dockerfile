FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
COPY src/app/environments/docker.ts src/app/environments/environment.ts
RUN npm run build

FROM nginx:alpine

COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:80/ || exit 1
