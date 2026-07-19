# Deployment Guide

---

## Prerequisites

- **Python 3.11+** for backend
- **Node.js 20+** for frontend build
- **PostgreSQL 16** (production) or **SQLite** (development)
- **Docker** and **Docker Compose** (for containerized deployment)
- **Ollama** (optional, for local LLM inference)
- **Git** for version control

---

## Environment Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/foundesk.git
cd foundesk
```

### 2. Configure Environment Variables

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your production values. Key variables:

| Variable | Example Value | Source |
|----------|---------------|--------|
| `DATABASE_URL` | `postgresql://user:pass@host:5432/foundesk_db` | Database provider |
| `SECRET_KEY` | `your-256-bit-secret` | Generate via `openssl rand -hex 32` |
| `GOOGLE_INTEGRATION_CLIENT_ID` | `xxx.apps.googleusercontent.com` | Google Cloud Console |
| `GOOGLE_INTEGRATION_CLIENT_SECRET` | `GOCSPX-xxx` | Google Cloud Console |
| `ADMIN_API_TOKEN` | `secure-random-token` | Generate via `openssl rand -hex 32` |
| `APP_ENV` | `production` | Set to `production` |
| `SENTRY_DSN` | `https://xxx@sentry.io/xxx` | Sentry project (optional) |

### 3. Production-Specific Environment Variables

```bash
# Set for production deployment
export APP_ENV=production
export SKIP_SCHEDULER=1           # Use external cron instead
export LLM_DAILY_LIMIT=500        # Adjust based on budget
export BILLING_ENFORCEMENT_ENABLED=true
export FRONTEND_URL=https://your-domain.com
```

---

## Docker Deployment

### Build and Run with Docker Compose

```bash
docker-compose up --build -d
```

This starts three services:
- **db** — PostgreSQL 16 on port 5432
- **backend** — Flask/Gunicorn on port 5000
- **frontend** — Nginx on port 80

### Verify Deployment

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Check health endpoints
curl http://localhost:80/api/health
curl http://localhost:5000/api/health
```

### Production Docker Compose Override

Create `docker-compose.prod.yml`:

```yaml
version: "3.9"
services:
  db:
    image: postgres:16-alpine
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: foundesk_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    deploy:
      resources:
        limits:
          memory: 512M

  backend:
    build: ./backend
    environment:
      APP_ENV: production
      SKIP_SCHEDULER: "1"
    deploy:
      resources:
        limits:
          memory: 1G
      replicas: 2

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    deploy:
      resources:
        limits:
          memory: 256M
```

Run with:
```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Render Deployment

### Backend Service

1. Create a **Web Service** on Render
2. Connect your GitHub repository
3. Use the following settings:
   - **Name**: `foundesk-backend`
   - **Environment**: `Docker`
   - **Dockerfile Path**: `./backend/Dockerfile`
   - **Plan**: Free or Starter
   - **Health Check Path**: `/api/health`

4. Set environment variables in Render dashboard:
   - `DATABASE_URL` — Use Render PostgreSQL or external provider
   - `APP_ENV` → `production`
   - `LLM_ROUTING_STRATEGY` → `production`
   - `SKIP_SCHEDULER` → `1`
   - All OAuth credentials and API keys

### Frontend Service

1. Create a **Static Site** on Render
2. Configure:
   - **Build Command**: `cd frontend && npm ci && npm run build`
   - **Publish Directory**: `frontend/dist`
   - **Routes**: Rewrite all to `/index.html` (SPA routing)

3. Set environment variable:
   - `VITE_API_URL` — URL of your backend service

### Render PostgreSQL

1. Create a **PostgreSQL** database on Render
2. Copy the internal connection string
3. Set as `DATABASE_URL` in backend service environment variables

---

## Database Migrations

### Initial Setup

```bash
cd backend

# Initialize migration repository (if not already done)
alembic init alembic

# Create initial migration
alembic revision --autogenerate -m "Initial migration"

# Run migrations
alembic upgrade head
```

### Migration Workflow

```bash
# Create a new migration after model changes
alembic revision --autogenerate -m "Description of changes"

# Review the generated migration file
# Apply migrations
alembic upgrade head

# Rollback if needed
alembic downgrade -1
```

---

## Health Checks

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Basic health (status, uptime, service name) |
| `/api/health/ready` | GET | Readiness check (database connectivity) |
| `/api/health/live` | GET | Liveness check |

### Docker Health Checks

Both Dockerfiles include built-in health checks:

- **Backend**: `python -c "import urllib.request; urllib.request.urlopen('http://localhost:5000/api/health')"` — every 30s, timeout 10s, 3 retries
- **Frontend**: `wget -q -O- http://localhost:80` — every 30s, timeout 10s, 3 retries

---

## Monitoring Setup

### Sentry Error Tracking

1. Create a Sentry project
2. Set `SENTRY_DSN` environment variable
3. (Optional) Set `SENTRY_TRACES_RATE` (default 0.1)

### LLM Usage Monitoring

Admin endpoints:
```bash
# Check daily LLM usage
curl -H "X-Admin-Token: your-token" https://your-domain.com/api/admin/llm-usage

# Check database status
curl -H "X-Admin-Token: your-token" https://your-domain.com/api/admin/db-status
```

### Structured Logging

The backend uses Python's `logging` module with structured format:
```
%(asctime)s [%(levelname)s] %(name)s: %(message)s
```

Log levels can be configured via the logging config in `app.py`.

---

## Rollback Procedure

### Application Rollback

```bash
# Docker deployment
docker-compose down
git checkout <previous-tag>
docker-compose up --build -d

# Render deployment
# Use Render dashboard to redeploy a previous version
```

### Database Rollback

```bash
cd backend
alembic downgrade -1          # Rollback one migration
alembic downgrade <revision>  # Rollback to specific revision
```

### Data Rollback (if needed)

1. Stop the application to prevent new writes
2. Restore from the latest database backup
3. Verify data integrity
4. Restart the application

---

## Backup Strategy

### Database Backup

```bash
# PostgreSQL
pg_dump -h localhost -U postgres foundesk_db > backup_$(date +%Y%m%d).sql

# Restore
psql -h localhost -U postgres foundesk_db < backup_file.sql
```

### Regular Backups

- Schedule daily database backups
- Store backups in a separate secure location
- Test restore procedure monthly
- Keep 30 days of backups
