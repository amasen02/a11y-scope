# CLAUDE.md — Architecture & Development Guidelines for a11y-scope

## Project Overview
`a11y-scope` is a self-hosted, privacy-first WCAG 2.2 accessibility monitoring platform. It provides automated web accessibility regression scanning, visual violation heatmaps, and compliance tracking for developer teams without relying on expensive $400/month SaaS platforms.

## Tech Stack & Architecture
- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Database & ORM**: Drizzle ORM with SQLite (embedded default) and PostgreSQL compatibility
- **Accessibility Engine**: Axe-core & Pa11y integration for automated WCAG 2.1 / 2.2 AA/AAA evaluation
- **Testing**: Vitest for unit/integration tests
- **Styling**: TailwindCSS & PostCSS
- **Containerization**: Multi-stage production Dockerfile & Docker Compose stack

## Common Commands
- **Install Dependencies**: `npm install`
- **Development Server**: `npm run dev` (Runs at http://localhost:3000)
- **Production Build**: `npm run build`
- **Start Production**: `npm start`
- **Run Tests**: `npm test` or `npx vitest run`
- **Linting & Type-Check**: `npm run lint` && `npx tsc --noEmit`
- **Database Migration**: `npx drizzle-kit push`
- **Docker Deployment**: `docker compose up -d --build`

## Code Style & Architectural Standards
- **Strict TypeScript**: Avoid `any`; use strongly typed interfaces for scan results, rule violations, and audit history.
- **Error Handling**: Gracefully handle unreachable URLs, timeout barriers, and headless browser navigation crashes during scans.
- **Accessibility Standards**: Maintain strict WCAG 2.2 AA compliance in all internal UI views (proper contrast ratios, semantic landmark roles, full keyboard navigability).
- **Conventional Commits**: Format commit messages as `feat(...)`, `fix(...)`, `docs(...)`, `chore(...)`, or `perf(...)`.
