# ==============================================================================
# Stage 1: Build the React + TypeScript frontend
# ==============================================================================
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Install dependencies with caching
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source and build static artifacts into /app/frontend/dist
COPY frontend/ ./
RUN npm run build

# ==============================================================================
# Stage 2: Production Python runtime with FastAPI
# ==============================================================================
FROM python:3.11-slim

# Prevent python from writing pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    APP_ENV=production

WORKDIR /app

# Install system dependencies (curl for healthchecks, ffmpeg for edge audio if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install backend Python dependencies
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend application source code
COPY backend/ ./backend/

# Copy built frontend assets from Stage 1 into frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose dynamic application port
EXPOSE 8000

# Set Python module path
ENV PYTHONPATH=/app/backend

# Non-root user for production security
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Healthcheck for container orchestrators
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:${PORT}/api/health || exit 1

# Launch production ASGI server
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]

