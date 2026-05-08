# Stage 1: Build the Angular application
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install -g pnpm@10.33.4 && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

COPY --from=build /app/dist/dashboard/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

ENV API_URL=http://localhost:8080

# Write runtime config before starting Nginx.
CMD ["/bin/sh", "-c", "echo \"window.__env={apiUrl:\\\"${API_URL}\\\"}\" > /usr/share/nginx/html/env.js && nginx -g 'daemon off;'"]

EXPOSE 8080
