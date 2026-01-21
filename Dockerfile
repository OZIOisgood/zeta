FROM golang:alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o bin/api ./cmd/api

FROM alpine:latest

WORKDIR /app

COPY --from=builder /app/bin/api .
COPY --from=builder /app/assets ./assets

EXPOSE 8080

CMD ["./api"]
