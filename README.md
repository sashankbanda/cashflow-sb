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

## Auto-capture: log payments without opening the app

Every user gets a private webhook (`POST /api/capture` with `{"token","text"}`) at **Profile → Auto-capture payments**, which parses any UPI receipt or bank SMS — amount, payee, expense vs income, and an optional `split with Rahul, Sandeep` clause that books an equal split instantly. Entries are idempotent per (user, text), categorized by merchant memory, and confirmed with a push notification. The in-app page carries the full step-by-step recipes; summary:

### iPhone — 3-question automation (recommended)

One-time setup in the Shortcuts app. Close your UPI app after paying → three quick prompts → logged (and split).

1. **Automation** → **+** → **App** → pick your UPI apps → **Is Closed** → **Run Immediately** → **New Blank Automation**.
2. Add three **Ask for Input** actions: Number `How much?`, Text `Where did you spend?`, Text `Split with?`.
3. Add a **Text** action: `Paid ₹ [answer1] to [answer2] split with [answer3]` — insert every variable via **Select Variable**, tapping the bubble *directly under the matching question* (keyboard-bar suggestions can bind to the wrong prompt).
4. Add **Get Contents of URL**: *type* the webhook URL by hand (a pasted rich-text chip fails to convert to a URL) → **POST** → Request Body **JSON** → field `token` = your token, field `text` = the Text action's variable (never "Shortcut Input" — it's empty in app-closed automations).
5. Test with ▶ — the response echoes `received`, which must contain all three answers. Empty split answer = normal expense.

An SMS-triggered variant (Automation → Message contains `debited`/`credited` → same URL action with `text` = Shortcut Input) is fully zero-touch if your bank sends SMS.

### Android — share sheet, no extra apps

The installed PWA registers as a **share target**: share any GPay/PhonePe/bank receipt (or long-press an SMS → Share) → **Cashflow** → the entry opens prefilled; tap name chips to split, then Save. Long-press the app icon → **Quick add** for manual fast entry, or use the Paste button with any copied payment text. Any HTTP automation app (MacroDroid/Tasker) can also POST notifications/SMS to the same webhook for true zero-touch capture.

## Design documents

| Doc                                                  | Contents                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------- |
| [docs/01-PRODUCT.md](docs/01-PRODUCT.md)             | Vision, features, screens, UX principles, settlement logic      |
| [docs/02-DESIGN-SYSTEM.md](docs/02-DESIGN-SYSTEM.md) | Tokens, glass recipe, typography, motion, component kit         |
| [docs/03-ARCHITECTURE.md](docs/03-ARCHITECTURE.md)   | Stack decisions, folder structure, server/security/perf/testing |
| [docs/04-DATABASE.md](docs/04-DATABASE.md)           | Full PostgreSQL schema, indexes, integrity rules                |
| [docs/05-ROADMAP.md](docs/05-ROADMAP.md)             | 36 implementation phases with acceptance criteria               |
