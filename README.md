# a11y-scope

[![CI](https://github.com/amasen02/a11y-scope/actions/workflows/ci.yml/badge.svg)](https://github.com/amasen02/a11y-scope/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Contributor Covenant](https://img.shields.io/badge/Contributor%20Covenant-2.1-4baaaa.svg)](CODE_OF_CONDUCT.md)

**Self-hosted WCAG 2.2 accessibility monitoring for teams who can't afford $400/month SaaS.**

a11y-scope is an open-source, Docker-first accessibility compliance dashboard. Add your websites, schedule automated scans, and track violations over time with a clean trend chart. Built for school districts, nonprofits, city governments, and web agencies facing real ADA/EU Accessibility Act legal requirements.

---

## Features

- **Multi-site management** — monitor as many URLs as you need
- **WCAG 2.2 engine** — powered by [axe-core](https://github.com/dequelabs/axe-core) + Playwright (covers 57% of WCAG issues automatically)
- **Scheduled scans** — configure per-site cron (daily at 2am by default)
- **Trend charts** — violation count over time so you see whether you're improving
- **Violation detail** — HTML selector, WCAG criterion, impact level, and suggested fix for every issue
- **Email alerts** — get notified when violations exceed your threshold
- **CI webhook** — trigger a scan from GitHub Actions and fail the build on regression
- **Self-hostable** — single Docker container + SQLite, zero external services required

---

## Quickstart

### Docker (recommended)

```bash
git clone https://github.com/amasen02/a11y-scope.git
cd a11y-scope
cp .env.example .env.local   # edit NEXTAUTH_SECRET at minimum

docker-compose up --build
```

Open http://localhost:3000. Create your admin account by running:

```bash
docker-compose exec app node scripts/seed-user.mjs
# Default: admin@example.com / admin123
# Change the password after first login
```

> **⚠️ Security — replace `NEXTAUTH_SECRET` before any networked deployment.**
> The `.env.example` placeholder (`change-me-strong-random-string`) is intentionally
> weak. Generate a strong secret before exposing a11y-scope on any network beyond
> your own machine:
>
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```
>
> Copy the output into your `.env.local` as `NEXTAUTH_SECRET=<output>`.
> A weak or default secret allows session tokens to be forged.

### Local development

Requirements: Node.js 20+, npm

```bash
git clone https://github.com/amasen02/a11y-scope.git
cd a11y-scope
npm install
cp .env.example .env.local

# Install Playwright browsers
npx playwright install chromium

# Push the SQLite schema
npm run db:push

# Create the admin user
npm run seed

npm run dev
```

---

## Environment variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXTAUTH_SECRET` | **Yes** | — | Random string for session encryption — **must be changed from the example value before any networked deployment** |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` | Full public URL of your deployment |
| `DATABASE_URL` | No | `./data/a11yscope.db` | Path to the SQLite database file |
| `SMTP_HOST` | No | — | SMTP server hostname (email alerts disabled if absent) |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USER` | No | — | SMTP username |
| `SMTP_PASS` | No | — | SMTP password |

---

## CI webhook

Trigger a scan from your GitHub Actions pipeline and surface accessibility regressions as PR checks:

```yaml
- name: Check accessibility
  run: |
    SCAN=$(curl -sf -X POST $A11Y_SCOPE_URL/api/webhook \
      -H 'Content-Type: application/json' \
      -d '{"url":"${{ env.PREVIEW_URL }}"}')
    echo "Scan ID: $(echo $SCAN | jq -r .scanId)"
```

---

## Architecture

```
src/
├── app/
│   ├── (auth)/login/         # Login page
│   ├── (dashboard)/          # Protected dashboard
│   │   ├── page.tsx          # Overview
│   │   ├── sites/            # Site list + add form
│   │   └── scans/[id]/       # Scan detail + violations
│   └── api/
│       ├── auth/[...nextauth] # NextAuth.js handlers
│       ├── sites/             # Site CRUD
│       ├── sites/[id]/scan/  # Trigger manual scan
│       ├── scans/[id]/       # Scan details
│       └── webhook/          # CI integration endpoint
├── lib/
│   ├── schema.ts             # Drizzle ORM schema
│   ├── db.ts                 # SQLite client singleton
│   ├── scanner.ts            # Playwright + axe-core
│   ├── scheduler.ts          # node-cron job manager
│   ├── auth.ts               # NextAuth v5 config
│   └── email.ts              # nodemailer alerts
└── components/
    ├── TrendChart.tsx         # recharts line chart
    ├── ScanStatusBadge.tsx    # status indicator
    └── ViolationItem.tsx      # expandable violation card
```

---

## Want to extend this?

a11y-scope is designed to be forked and extended:

- **Add a new scan engine**: implement the `ScanEngine` interface in `src/lib/scanner.ts` (e.g. Pa11y, Lighthouse)
- **Add Slack/Teams alerts**: extend `src/lib/email.ts` with a webhook sender
- **Add PDF reports**: add a `GET /api/scans/[id]/report` route that renders a PDF from violations data
- **Add team auth**: swap the credentials provider in `src/lib/auth.ts` for an OAuth provider (Google, GitHub, etc.)

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full dev setup and contribution flow.

---

## Tests

```bash
npm test          # unit tests
npm run lint      # ESLint
npm run build     # full TypeScript + Next.js build check
```

---

## Open source commitments

- **MIT licence** — always and forever, no CLA required
- **Honest walkable git history** — all commits by real contributors, no fabricated activity
- **Best-effort triage** — security reports acknowledged within 7 days (see [SECURITY.md](SECURITY.md))
- **[Contributor Covenant 2.1](CODE_OF_CONDUCT.md)** code of conduct
- **Reproducible green CI** — every commit builds and tests pass before merge

---

## License & Author

MIT © 2024 [Ama Senevirathne](https://github.com/amasen02)
