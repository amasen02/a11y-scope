# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Send a report to **support@iykons.com** with:

- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested mitigations (optional)

We acknowledge all security reports within **7 days** and aim to release a fix within 30 days for confirmed vulnerabilities.

## Scope

In scope:
- Authentication bypass or session hijacking
- SQL injection or data leakage
- SSRF (the webhook endpoint accepts arbitrary URLs — tell us if you find a bypass of intended restrictions)
- XSS in the violation detail renderer
- Secrets exposure in Docker image layers or logs

Out of scope:
- Denial-of-service by scanning a very slow URL (by design, this is a self-hosted tool)
- Brute-force against the login form without rate limiting (add a reverse proxy with rate limiting in front for production)

## Security best practices for self-hosters

- Set a strong random `NEXTAUTH_SECRET` (at least 32 characters)
- Run behind a TLS-terminating reverse proxy (nginx, Caddy, Traefik)
- Do not expose port 3000 directly to the internet
- The SQLite database file contains hashed passwords and site URLs — protect it with appropriate filesystem permissions
