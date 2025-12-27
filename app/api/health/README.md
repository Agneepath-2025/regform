# API Health Check Endpoint

This endpoint is used by Docker health checks to verify the application is running properly.

## Endpoint

```
GET /api/health
```

## Response

### Success (200 OK)
```json
{
  "status": "ok",
  "timestamp": "2025-12-27T12:00:00.000Z"
}
```

### Error (503 Service Unavailable)
```json
{
  "status": "error",
  "timestamp": "2025-12-27T12:00:00.000Z"
}
```

## Usage in Docker

The health check is configured in `docker-compose.yml`:

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```
