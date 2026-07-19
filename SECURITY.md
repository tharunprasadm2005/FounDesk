# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.0.0-rc.1 | ✅ |
| < 1.0.0 | ❌ (pre-release) |

---

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow these steps:

1. **Do not** disclose the issue publicly (do not create a GitHub issue)
2. **Email** the maintainers directly or use the GitHub Security Advisory feature
3. **Include** the following information:
   - Type of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge receipt within **48 hours** and provide a timeline for a fix within **7 days**.

---

## Security Best Practices Followed

### Authentication & Authorization
- **Google OAuth 2.0** for user authentication
- **JWT** with expiration for API access
- **Token-based** workspace authorization (user must be workspace member)
- **Admin API token** for privileged endpoints

### Data Protection
- **HTTPS** enforced in production
- **Password hashing** via bcrypt (for non-OAuth auth)
- **Encryption** of sensitive tokens at rest (cryptography library)
- **Environment variables** for all secrets — never hardcoded

### API Security
- **Rate limiting** via Flask-Limiter (10 req/min on auth, configurable on others)
- **CSRF protection** via Flask-WTF
- **CORS** restricted to frontend origin
- **Input validation** on all API endpoints
- **SQL injection** prevention via SQLAlchemy ORM

### Infrastructure
- **Non-root user** in Docker containers
- **Docker health checks** for service monitoring
- **Sentry error tracking** (opt-in) for production monitoring
- **Database connection pooling** with connection recycling

---

## Known Security Considerations

### Current Limitations
- Rate limiting is basic and may need tuning for production scale
- API key rotation policy is not enforced programmatically
- Audit logging is present but not comprehensive for all actions
- No built-in brute force protection beyond rate limiting

### Recommended Production Additions
- **Web Application Firewall (WAF)** for production deployment
- **Regular dependency scanning** (Dependabot or Snyk)
- **Penetration testing** before major releases
- **MFA support** for sensitive operations
- **Session management** with refresh token rotation
- **Secrets management** (HashiCorp Vault or AWS Secrets Manager)

---

## Security Contact

For security-related inquiries, please open a GitHub Security Advisory on the repository.
