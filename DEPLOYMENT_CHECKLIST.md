# Deployment Checklist

Use this checklist before, during, and after every deployment to ensure a smooth release.

---

## Pre-Deployment Checks

### Code & Repository
- [ ] All changes committed to `main` or release branch
- [ ] Pull request reviewed and approved
- [ ] No uncommitted changes in working directory
- [ ] Git tag created for release (`v1.0.0-rc.1`)
- [ ] CHANGELOG.md updated with release notes
- [ ] RELEASE_NOTES.md updated

### Testing
- [ ] Backend tests pass (`pytest`)
- [ ] Frontend lint passes (`npm run lint`)
- [ ] Frontend build succeeds (`npm run build`)
- [ ] E2E tests pass (`npm run e2e`)
- [ ] API endpoints manually tested for critical paths
- [ ] No console errors in frontend

### Environment
- [ ] `.env` file configured with production values
- [ ] `DATABASE_URL` points to production database
- [ ] `SECRET_KEY` is a strong, unique value
- [ ] `APP_ENV` set to `production`
- [ ] `SKIP_SCHEDULER` set to `1`
- [ ] All OAuth credentials valid and not expired
- [ ] All API keys valid (Razorpay, Sentry, etc.)
- [ ] `FRONTEND_URL` matches deployment domain
- [ ] `ADMIN_API_TOKEN` set for admin endpoints

### Security
- [ ] CORS origins updated for production domain
- [ ] HTTPS enabled at load balancer/proxy level
- [ ] Rate limiting configured appropriately
- [ ] CSRF protection active
- [ ] Debug mode disabled (`FLASK_DEBUG=0`)
- [ ] Sentry DSN configured (if applicable)

### Infrastructure
- [ ] Database backup created
- [ ] Sufficient disk space available
- [ ] Memory and CPU allocation adequate
- [ ] Docker images built and tagged
- [ ] Container registry authenticated

---

## Deployment Steps

### Docker Deployment

- [ ] Pull latest code: `git pull origin main`
- [ ] Build images: `docker-compose build`
- [ ] Run migrations: `docker-compose run backend alembic upgrade head`
- [ ] Start services: `docker-compose up -d`
- [ ] Check container status: `docker-compose ps`
- [ ] Verify backend health: `curl http://localhost:5000/api/health`
- [ ] Verify frontend loads: `curl http://localhost:80`

### Render Deployment

- [ ] Push to GitHub branch connected to Render
- [ ] Verify backend build succeeds in Render dashboard
- [ ] Verify frontend build succeeds in Render dashboard
- [ ] Check deployment logs for errors
- [ ] Verify health endpoint: `curl https://foundesk-backend.onrender.com/api/health`
- [ ] Verify frontend loads: `curl https://foundesk.onrender.com`

---

## Post-Deployment Verification

### Application Health
- [ ] Backend `/api/health` returns `{"status":"ok"}`
- [ ] Backend `/api/health/ready` returns `{"status":"ready","database":"connected"}`
- [ ] Backend `/api/health/live` returns `{"status":"alive"}`
- [ ] Frontend loads without errors

### Core Features
- [ ] Login with Google OAuth works
- [ ] Dashboard loads with correct data
- [ ] Kanban board displays tasks correctly
- [ ] Drag-and-drop updates task status
- [ ] Goal cascade renders with progress
- [ ] Daily standup compiles (if applicable)
- [ ] Settings page shows integrations
- [ ] Blocker panel shows data

### Database
- [ ] All expected tables exist
- [ ] Data integrity verified (no missing columns)
- [ ] Migration applied successfully
- [ ] `curl /api/admin/db-status` returns expected counts

### Monitoring
- [ ] Sentry errors monitored for first 24 hours
- [ ] Application logs show no critical errors
- [ ] LLM usage tracking operational
- [ ] Response times within normal range

---

## Rollback Steps

If deployment has critical issues:

### Quick Rollback (Docker)
- [ ] `docker-compose down`
- [ ] `git checkout <previous-version>`
- [ ] Restore database from backup
- [ ] `docker-compose up --build -d`

### Database Rollback
- [ ] `cd backend`
- [ ] `alembic downgrade -1` (rollback one migration)
- [ ] Verify schema integrity

### Render Rollback
- [ ] In Render dashboard, navigate to service
- [ ] Click "Manual Deploy" → "Deploy previous version"
- [ ] Select the last known-good version
- [ ] Confirm deployment

---

## Monitoring Checklist

### First Hour After Deployment
- [ ] Server error rate (Sentry)
- [ ] Average response time
- [ ] Error rate by endpoint
- [ ] Database connection pool usage
- [ ] LLM API response times
- [ ] Frontend build error rate

### First 24 Hours
- [ ] User login success rate
- [ ] Pipeline processing success rate
- [ ] Integration sync success rate
- [ ] Memory/CPU usage trends
- [ ] Disk space usage

### Ongoing
- [ ] Daily log review
- [ ] Weekly performance review
- [ ] Monthly dependency audit
- [ ] Quarterly security review
