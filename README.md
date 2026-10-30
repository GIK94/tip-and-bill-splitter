# Tip & Bill Splitter

A mobile-friendly web app that works out the **tip**, the **grand total** and **each person's share** when a group eats out — quickly, and without the arithmetic mistakes that come from doing it by hand. Every share is exact to the cent and the shares always add up to the total.

## Who it's for

The main user is a person splitting a restaurant bill with friends or family, usually **on a phone at the table**.

| User | Calculate | Share / export | Save | History |
|---|---|---|---|---|
| Guest | ✅ | ✅ | — | — |
| Logged-in user | ✅ | ✅ | ✅ (manual only) | ✅ (own results only) |

## Features

- **Even split** — bill + tip divided equally between 1–50 people.
- **Itemised split** — add people and items (items can be shared); the bill (including tax and fees) and the tip are allocated in proportion to each person's items.
- **Tips** — 0 / 10 / 15 / 18 / 20 % presets, a custom percentage, or a fixed dollar amount.
- **Fair cents** — amounts are shown to 2 decimals; leftover cents go to the largest remainders (ties to the first-listed person), so bill shares, tip shares and totals all add up exactly and nobody is more than 1¢ from their exact share.
- **Calculate on demand** — results appear only when **Calculate** is pressed; editing any input clears the result so a saved or shared result always matches its inputs.
- **Share / export** — WhatsApp (pre-filled text), Copy text, PNG image, PDF. If WhatsApp can't be opened, the app says so and offers Copy text.
- **Accounts** — sign up, log in and log out, with Login and Sign Up in **modals**. A guest who logs in from the calculator keeps their result and can save it straight away.
- **Saving & History** — logged-in users save results manually (optionally titled); saving closes the calculator and shows a brief confirmation. **History** groups saved results by date; each can be opened (details, share, **Edit a copy**) or **deleted** after a confirmation. Saved results are read-only snapshots.
- **Pages** — Home (calculator entry point + illustration, About and Contact Us sections) and History.

The full, approved product requirements — calculation rules, worked examples, edge cases and acceptance criteria — are in [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md).

## Product documents

Read in this order; each builds on the one before:

1. [App Roles](docs/app-roles.md) — who uses the app: the **Guest Diner** and the **Registered Diner**.
2. [Jobs To Be Done](docs/jobs-to-be-done.md) — why they use it (J-1 … J-11), each tied to a role.
3. [User Stories with Acceptance Criteria](docs/user-stories.md) — how the app helps (S-1 … S-17), each tied to a job, with Given/When/Then criteria and a status (14 Implemented, 3 Not implemented: round-up, pre-tax tipping, password reset).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite 6, Ant Design 5, React Router 7 (served by nginx in Docker) |
| Backend | NestJS 11, TypeORM, JWT auth (httpOnly cookie), class-validator, bcrypt |
| Database | MySQL 8.4 |
| Calculation engine | Plain TypeScript in `src/shared/calc`, used by **both** the browser and the API |
| Local run | Docker Compose |

## Project structure

```text
README.md
transcripts/                # session-tip-and-bill-splitter.txt (transcript of the AI build session)
docs/                       # REQUIREMENTS.md, app-roles.md, jobs-to-be-done.md, user-stories.md
src/
├── docker-compose.yml      # frontend + backend + MySQL
├── .env.example            # copy to .env (local settings and secrets)
├── shared/calc/            # calculation engine (money parsing, fair-cent allocation, validation) + its tests
├── backend/                # NestJS API
│   ├── src/auth/           # signup / login / logout / me, JWT guard
│   ├── src/calculations/   # save / list / get / delete saved calculations
│   ├── src/database/       # migration (schema)
│   └── test/               # API tests
└── frontend/               # React app
    ├── src/components/     # calculator modal, result view, share/save actions, header
    ├── src/auth/           # session state, Login / Sign Up modal
    ├── src/pages/          # Home, History
    └── src/lib/            # API client, form → engine mapping, share text, PDF/PNG export
```

## Prerequisites

- **Docker Desktop** (or Docker Engine) with **Docker Compose v2** — required to run the app.
- **Node.js 20.19+ or 22** and npm — only needed to run the automated tests outside Docker.
- Free port **8080** (configurable via `APP_PORT` in `src/.env`).

## Run the app

From the repository root:

```bash
cd src
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
docker compose up --build -d
```

Open **<http://localhost:8080>**.

The first build takes a few minutes. MySQL starts first, then the backend (which runs the database migration automatically), then the frontend. Check status with `docker compose ps` — all three services should be `healthy`/`running`.

Useful commands (run in `src/`):

```bash
docker compose logs -f backend    # follow API logs
docker compose down               # stop (keeps saved data)
docker compose down -v            # stop and delete the database volume
```

The values in `.env.example` are for **local use only**. For anything shared, set a long random `JWT_SECRET` and new database passwords, and serve over HTTPS with `COOKIE_SECURE=true`.

### Optional: run without Docker (development)

Requires a MySQL 8 server you can reach. In two terminals:

```bash
# Terminal 1 — API on http://localhost:3000
cd src/backend
npm ci
# set env vars: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET (32+ chars)
npm run start:dev

# Terminal 2 — app on http://localhost:5173 (proxies /api to :3000)
cd src/frontend
npm ci
npm run dev
```

## Run the tests

```bash
# Calculation engine + API tests (Jest)
cd src/backend
npm ci
npm test

# Frontend tests (Vitest + Testing Library)
cd ../frontend
npm ci
npm test
```

| Suite | What it covers |
|---|---|
| `src/shared/calc/calc.spec.ts` (36 tests, run by the backend's `npm test`) | Money parsing/formatting; worked examples from the requirements (AC-01, AC-02); half-up tip rounding (AC-05); every edge case (blocks and warnings); 6,000 randomised inputs checking that all columns add up exactly and every share is within 1¢ (AC-03) |
| `src/backend/test/api.e2e-spec.ts` (13 tests) | Signup/login/logout, httpOnly cookie, bcrypt hashing (AC-13), validation (AC-08), 401 without a session and with forged tokens, 404 for another user's calculation, per-user lists (AC-11, AC-12), server-side results only (AC-15), deleting only your own calculations (AC-20). Uses the real controllers, guards and validation with an in-memory repository, so no database is needed |
| `src/frontend/src/lib/lib.test.ts` (9 tests) | Form → engine mapping and error messages, "Edit a copy" round-trip, share text, WhatsApp link, file names, History date grouping |
| `src/frontend/src/components/CalculatorModal.test.tsx` (7 tests) | Result only after Calculate and cleared on edit (AC-07), guests see no Save (AC-10), "Log in" from a result opens the modal and keeps the result (AC-22), field errors (AC-06), WhatsApp fallback (AC-17), saving closes the modal with a confirmation (AC-21), History delete only after confirmation (AC-20) |

The frontend component tests are slow (~15 s each) because Ant Design renders slowly under jsdom.

## Verification

Beyond the automated tests, the Docker build was checked end to end:

- **API against the real MySQL stack** — signup, save, list, cross-user access (404), guest access (401), bcrypt hashes in the `users` table, the migration recorded, security headers present, login rate limit (429 after 10 attempts/minute).
- **Browser (headless Chrome) at 1280 px and 360 px** — guest even split ($39.34 / $39.33 / $39.33), no Save for guests, Copy text, PNG and PDF downloads, WhatsApp link, result cleared on edit, hero image hidden on mobile with no horizontal scrolling, itemised split matching the worked example, Save (calculator closes, confirmation shown) → History (grouped "Today") → details → PDF export → Edit a copy (pre-filled), logout. Login/Sign Up modals from the header; guest logs in from the result and saves it without losing it; History delete with Cancel and Delete (persists after reload); `/history` as a guest opens the Login modal and returns to History after login; `/signup` while logged in doesn't show the form. No console errors.

## Security

- Passwords: 8–72 characters with a letter and a number; hashed with **bcrypt** (cost 12); never returned or logged. Login checks a dummy hash when the email is unknown, so response times don't reveal which emails have accounts, and returns one generic error.
- Sessions: **JWT (HS256, 24 h)** in an **httpOnly, SameSite=Lax** cookie — not readable by JavaScript. Logout clears it.
- Authorization: every `/api/calculations` route requires a valid session, and every query is filtered by the logged-in user's ID; another user's calculation returns **404**.
- Validation: all request bodies are validated server-side; unknown fields are rejected. Saved results are always **recalculated by the server** from the inputs — clients cannot submit results.
- Rate limiting: 10 sign-up/login attempts per minute per IP; 120 requests/minute otherwise.
- Headers: Helmet on the API; CSP, `X-Frame-Options: DENY`, `nosniff` on the frontend. The API is served from the same origin via nginx, so no CORS is opened.
- Production dependencies pass `npm audit` (multer is pinned to a patched version via `overrides` in the backend).

## API overview

All routes are under `/api`.

| Method & path | Auth | Purpose |
|---|---|---|
| `POST /auth/signup` | — | Create account, start session |
| `POST /auth/login` | — | Start session |
| `POST /auth/logout` | — | End session |
| `GET /auth/me` | — | Current user, or `{ "user": null }` for guests |
| `GET /calculations` | ✅ | List own saved calculations (newest first) |
| `GET /calculations/:id` | ✅ | One own calculation (404 otherwise) |
| `POST /calculations` | ✅ | Save `{ title?, input }`; result calculated on the server |
| `DELETE /calculations/:id` | ✅ | Delete one own calculation (204; 404 otherwise) |
| `GET /health` | — | Health check |

## AI tool and model used

This project was designed and built with **Claude Code** (Anthropic's coding agent, used from the VS Code extension) running **Claude Opus 5.5** (`claude-opus-5-5`). The AI took part in requirements discussion, wrote the requirements document, implemented all code and tests, and ran the verification described above. Every product decision was made or approved by the project owner — see the decision log in [REQUIREMENTS.md](docs/REQUIREMENTS.md#14-decision-log). The full conversation with the AI is in [transcripts/session-tip-and-bill-splitter.txt](transcripts/session-tip-and-bill-splitter.txt).

## Manual code changes

**None so far.** All code was generated by the AI tool and reviewed through the conversation; no files were edited by hand.
<!-- If you edit code by hand before submitting, list each change here: file, what changed, and why. -->

## Assumptions

Product assumptions agreed with the owner (full list in the requirements decision log):

- One **bill amount that already includes tax**; no separate tax field. In itemised mode, the difference between the bill and the item total (tax, fees or a discount) is shared proportionally.
- **USD only**. Amounts up to $99,999.99; 1–50 people; 1–100 items.
- Item prices are **line totals** (no quantity field). A shared item is split equally between the people assigned to it.
- Fixed tip larger than the bill, or items adding up to more than the bill → **warning, then continue**. Unassigned items, duplicate names, or an item total of $0 → **blocked** with an error.
- A guest who logs in from the calculator keeps their result. Deleting a saved calculation is permanent (no undo). History shows all entries without pagination.
- **Sharing means export/send** (WhatsApp text, Copy text, image, PDF) — no public links.
- **Contact Us details are placeholders** (`support@example.com`, a 555 phone number, an example address) and are labelled as such; there is no contact form.

Technical assumptions:

- A web page cannot detect whether WhatsApp is installed. The app opens a `wa.me` link (the app on phones, WhatsApp Web on desktop) and shows the fallback when the browser blocks it; **Copy text** is always available.
- PDFs use the built-in PDF fonts, which cover Latin characters only; names in other scripts (or emoji) may not render in the PDF. The PNG export and the shared text are unaffected.
- History groups entries by the **viewer's local date**; times are stored in UTC.
- No password reset or email verification in v1. Sessions last 24 hours, after which the user is asked to log in again.
