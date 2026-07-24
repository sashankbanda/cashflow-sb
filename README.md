# Cashflow

Premium mobile-first money app — group expense splitting + personal finance, in an Apple × VisionOS liquid-glass design language.

**Status:** in development — building phase by phase from [docs/05-ROADMAP.md](docs/05-ROADMAP.md).

## Development

Requirements: Node 22+, pnpm 11+.

```bash
pnpm install        # install dependencies
pnpm dev            # start dev server (Turbopack)
pnpm build          # production build
pnpm lint           # ESLint
pnpm typecheck      # TypeScript, no emit
pnpm test           # Vitest unit tests
pnpm format         # Prettier write
```

Stack: Next.js (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 · Drizzle + Neon PostgreSQL · Better Auth. See [docs/03-ARCHITECTURE.md](docs/03-ARCHITECTURE.md) for structure and conventions — routes live in `src/app`, domain logic in `src/features/*`, pure engines in `src/lib`, database and server plumbing in `src/server`.

## Design documents

| Doc | Contents |
|---|---|
| [docs/01-PRODUCT.md](docs/01-PRODUCT.md) | Vision, features, screens, UX principles, settlement logic |
| [docs/02-DESIGN-SYSTEM.md](docs/02-DESIGN-SYSTEM.md) | Tokens, glass recipe, typography, motion, component kit |
| [docs/03-ARCHITECTURE.md](docs/03-ARCHITECTURE.md) | Stack decisions, folder structure, server/security/perf/testing |
| [docs/04-DATABASE.md](docs/04-DATABASE.md) | Full PostgreSQL schema, indexes, integrity rules |
| [docs/05-ROADMAP.md](docs/05-ROADMAP.md) | 36 implementation phases with acceptance criteria |
