# Contributing to a11y-scope

Thank you for considering a contribution! This guide covers the full development setup and contribution workflow.

## Development setup

Requirements: Node.js 20+, npm, Git.

```bash
git clone https://github.com/amasen02/a11y-scope.git
cd a11y-scope
npm install
cp .env.example .env.local   # fill in NEXTAUTH_SECRET at minimum

# Install Playwright browser
npx playwright install chromium

# Create the DB schema
npm run db:push

# Seed admin user (admin@example.com / admin123)
npm run seed

npm run dev
```

## How to extend the scanner

The scanner lives in `src/lib/scanner.ts`. It exports a single `scanSite()` function. To add a new engine (e.g. Lighthouse):

1. Add the new engine logic in a separate file `src/lib/engines/lighthouse.ts`
2. Import and call it from `scanSite()` alongside axe-core
3. Map results to the `Violation` shape defined in `src/lib/schema.ts`

## Project structure

```
src/app/        Next.js App Router pages and API routes
src/lib/        Core business logic (scanner, DB, auth, scheduler, email)
src/components/ React components
scripts/        CLI utilities (seed-user, etc.)
```

## Submitting a pull request

1. Fork the repo and create a branch: `git checkout -b feature/my-feature`
2. Make your changes with real, working code — no stubs or TODOs
3. Run `npm test`, `npm run lint`, and `npm run build` — all must pass
4. Open a pull request with a clear description of the change and why

## Code style

- TypeScript with strict mode — no `any`, no untyped imports
- Tailwind CSS only — no inline styles
- Drizzle ORM for all DB access — no raw SQL strings
- Server Components for data-fetching pages; `'use client'` only where interactivity is needed

## Reporting bugs

Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml).

## Suggesting features

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml).

## Code of Conduct

This project adheres to the [Contributor Covenant 2.1](CODE_OF_CONDUCT.md). By participating you agree to its terms.
