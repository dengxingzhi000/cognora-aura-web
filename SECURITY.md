# Security Policy

## Supported versions

| Version | Supported |
|---------|-----------|
| Latest (`main`) | ✅ Security updates applied |
| Older tags | ❌ No longer supported |

## Reporting a vulnerability

**Do NOT report security vulnerabilities through public GitHub issues.**

- **Email:** [security@scmcloud.com](mailto:security@scmcloud.com)
- **PGP key:** available on request for encrypted communication

Please include:

1. Type of vulnerability (XSS, auth bypass, token leakage, dependency issue, …)
2. Affected page / route / commit
3. Reproduction steps
4. Potential impact
5. Suggested fix (optional)

We acknowledge within 48 hours, triage within 7 days, and aim to ship a fix
within 30 days.

## Scope

In scope: this frontend application (Next.js app, API proxy rewrites, auth
cookie handling, generated API clients).

Out of scope: backend services (report them to the platform repository),
third-party services, missing-best-practice reports without a concrete exploit,
and issues that require physical access.

## Security features

- Access tokens are stored in http-only cookies and never in `localStorage`
- All backend calls go through the gateway (or the `API_*_TARGET` rewrites);
  no direct database or internal service access from the browser
- Rate limiting and permission checks are enforced by the backend
- CodeQL (JavaScript/TypeScript + Actions) runs on every PR and weekly
- Dependabot alerts and security updates are enabled
- Secret scanning with push protection is enabled on the repository

## Responsible disclosure

We will credit reporters (with permission), will not take legal action against
good-faith research, and ask that you do not access other tenants' data, run
DoS tests, or disclose publicly before a fix is available.
