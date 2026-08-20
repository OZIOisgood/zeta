# Stage 1: Build the Angular application
FROM node:26-alpine AS build

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm@10.33.4 && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

RUN apk upgrade --no-cache

COPY --from=build /app/dist/dashboard-next/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

ENV API_URL=http://localhost:8080
ENV MIN_SESSION_DURATION_MINUTES=15
ENV SESSION_DURATION_STEP_MINUTES=5

# Write runtime config before starting Nginx.
CMD ["/bin/sh", "-c", "echo \"window.__env={apiUrl:\\\"${API_URL}\\\",minSessionDurationMinutes:${MIN_SESSION_DURATION_MINUTES},sessionDurationStepMinutes:${SESSION_DURATION_STEP_MINUTES}}\" > /usr/share/nginx/html/env.js && nginx -g 'daemon off;'"]

EXPOSE 8080
