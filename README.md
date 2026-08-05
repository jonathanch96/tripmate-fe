# TripMate frontend

Next.js 16 BFF and UI for TripMate. Browser code only calls same-origin `/api/*` routes; the Go URL is available exclusively to `src/lib/server/backend.ts`.

## Local setup

```bash
cp .env.example .env.local
pnpm install
pnpm dev
curl http://localhost:3000/api/health
```

Run all local gates with `pnpm verify`. The backend must be running on the `BACKEND_BASE_URL` configured in `.env.local` for the health proxy to respond.

## Commands

- `pnpm dev` — local development server
- `pnpm test` — Vitest contract and architecture guards
- `pnpm test:bundle` — production build followed by the fail-closed client bundle leak guard
- `pnpm lint` — ESLint
- `pnpm typecheck` — TypeScript
- `pnpm build` — production build
