# Multi-stage: build static Go binary, ship on distroless/static.
ARG SERVICE=user

FROM golang:1.26-alpine AS builder
ARG SERVICE
WORKDIR /src

RUN apk add --no-cache git ca-certificates tzdata

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -ldflags="-s -w" -o /out/service \
    ./services/${SERVICE}/cmd

FROM gcr.io/distroless/static-debian12:nonroot
ARG SERVICE
WORKDIR /app

COPY --from=builder /out/service /app/service
COPY --from=builder /src/services/${SERVICE}/configs /app/configs

ENV ASH_CONFIG=/app/configs/config.yaml
EXPOSE 8001 8002 8003
USER nonroot:nonroot
ENTRYPOINT ["/app/service"]
