# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM golang:1.25-alpine AS builder
WORKDIR /workspace

# Cache module downloads separately
COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o device-gateway ./main.go

# ── Stage 2: Runtime ──────────────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12 AS runtime
WORKDIR /app

COPY --from=builder /workspace/device-gateway .

EXPOSE 8084
USER nonroot:nonroot

ENTRYPOINT ["/app/device-gateway"]
