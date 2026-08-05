# TripMate frontend

Next.js 16 BFF and UI for TripMate. Browser code only calls same-origin `/api/*` routes; the Go URL and access/refresh tokens remain server-only. NextAuth stores the tokens in its encrypted, httpOnly JWT cookie and rotates access through the Go service.

## Local setup

```bash
cp .env.example .env.local
pnpm install
pnpm dev
curl http://localhost:3000/api/health
```

Run all local gates with `pnpm verify`. The backend must be running on the `BACKEND_BASE_URL` configured in `.env.local`. Set a unique, high-entropy `NEXTAUTH_SECRET` outside local development. Next.js 16 route protection is implemented in `src/proxy.ts`.

## Commands

- `pnpm dev` — local development server
- `pnpm test` — Vitest contract and architecture guards
- `pnpm test:bundle` — production build followed by the fail-closed client bundle leak guard
- `pnpm test:e2e` — Playwright session persistence and concurrent refresh test (manages local Postgres and both dev servers)
- `pnpm lint` — ESLint
- `pnpm typecheck` — TypeScript
- `pnpm build` — production build
