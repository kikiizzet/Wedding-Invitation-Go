# --- Stage 1: Frontend Build ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
# Copy package files first for better caching
COPY frontend/package*.json ./
RUN npm install
# Copy rest of the frontend source
COPY frontend/ ./
# Build the production assets
RUN npm run build

# --- Stage 2: Backend Build ---
FROM golang:1.23-alpine AS backend-builder
WORKDIR /app
# Copy go.mod and go.sum first for better caching
COPY go.mod go.sum ./
RUN go mod download
# Copy everything including the root files and folders
COPY . .
# Compile the Go application
RUN go build -o main .

# --- Stage 3: Final Runtime ---
FROM alpine:latest
WORKDIR /app

# Install CA certificates to allow connections to external DBs like Neon/Supabase
RUN apk add --no-cache ca-certificates

# Copy the compiled binary from backend-builder
COPY --from=backend-builder /app/main .
# Copy the built frontend dist from frontend-builder
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist
# Copy the static folder from source (for original assets/templates)
COPY static ./static

# Expose the API port (Hugging Face standard)
EXPOSE 7860

# Environment variables
ENV PORT=7860
ENV GIN_MODE=release

# Start the application
CMD ["./main"]
