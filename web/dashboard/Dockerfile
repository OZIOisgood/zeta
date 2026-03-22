# Stage 1: Build the Angular application
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

COPY --from=build /app/dist/dashboard/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

ENV API_URL=http://localhost:8080

# Replace __API_URL__ placeholder in compiled JS with the actual API_URL at container start.
CMD ["/bin/sh", "-c", "find /usr/share/nginx/html -name '*.js' -exec sed -i \"s|__API_URL__|${API_URL}|g\" {} + && nginx -g 'daemon off;'"]

EXPOSE 8080
