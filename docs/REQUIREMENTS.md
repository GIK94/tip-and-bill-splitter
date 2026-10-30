# Tip & Bill Splitter — Product Requirements (v1)

**Status:** Approved · **Date:** 2026-10-29 · **Currency:** USD

---

## 1. Overview

People dining in a group need to work out the tip, the grand total and each person's share. Doing it by hand or with a phone calculator is slow and error-prone (wrong percentages, shares that don't add up, lost cents). This app does the maths in a few taps and guarantees that every share adds up exactly to the total.

### Primary user
A person splitting a restaurant bill with friends or family, usually **on a phone, at the table**. They want speed, a result they can trust, and an easy way to send it to the group.

### User types
| User | Can calculate | Can share/export current result | Can save | Can view history |
|---|---|---|---|---|
| Guest | Yes | Yes | No | No |
| Logged-in user | Yes | Yes | Yes (manually) | Yes (own entries only) |

---

## 2. Scope

### In scope (v1)
- Mobile-friendly web app (no install).
- Even split and itemised split.
- Tip presets 0 / 10 / 15 / 18 / 20 %, custom percentage, or fixed tip amount.
- Exact-cent results with fair leftover-cent distribution.
- Sign up, log in, log out (email + password, JWT).
- Manual save of results (logged-in users), read-only snapshots.
- History page grouped by date, detail modal, "Edit a copy".
- Sharing: WhatsApp text, Copy text, image download (PNG), PDF download.
- Home, About and Contact Us content.
- Local run via Docker Compose (frontend, backend, MySQL).

### Out of scope (v1)
- Public/shareable links to results.
- Automatic saving.
- Round-up options.
- Separate tax field (bill amount already includes tax).
- Currencies other than USD.
- Receipt scanning (OCR), payment integrations (Venmo, PayPal…).
- Password reset, email verification, social login.
- Contact form submission (Contact Us is informational only).
- Editing saved calculations in place (use **Edit a copy** instead).

---

## 3. Navigation & pages

| Element | Guest | Logged-in |
|---|---|---|
| Nav links | Home, About, Contact Us | Home, About, Contact Us, History |
| Right side of header | **Login**, **Sign Up** buttons (open modals) | User's name → dropdown with **Logout** |

- **Home (`/`)** — hero area: calculator entry on the left, relevant illustration on the right (illustration hidden on mobile). Below the hero: **About** and **Contact Us** sections. The About / Contact Us nav links scroll to those sections (from other pages they navigate to `/#about`, `/#contact`).
- **Login** and **Sign Up** — **modals** that open on top of the current screen, with links to switch between them. The `/login` and `/signup` URLs open the matching modal over Home.
- **History (`/history`)** — protected; hero banner + saved calculations list. Guests visiting it are taken to Home with the Login modal open, and return to History after logging in.
- On mobile the nav collapses into a menu (hamburger/drawer).

---

## 4. Key user flows

### 4.1 Calculate (guest or logged-in)
1. In the hero's calculator entry point on Home, the user chooses **Even** or **Itemised** and clicks **Start splitting**.
2. The **calculator modal** opens (with a close button).
3. The user enters bill amount, tip and the split details, then presses **Calculate**.
4. If inputs are invalid, errors are shown next to the fields; no result is produced.
5. If valid, the result is shown in the modal, with any warnings, plus actions:
   - **Share** (WhatsApp, Copy text, Image, PDF) — everyone.
   - **Save** — logged-in users. Guests see "Log in or sign up to save this result"; the links open the Login / Sign Up modal **on top of the calculator**, so the result is kept and can be saved straight after logging in.
6. Changing any input after calculating **clears the result**; the user must press Calculate again. (Prevents saving/sharing a result that doesn't match the inputs.)
7. Closing the modal discards unsaved input and results.

### 4.2 Save (logged-in)
1. From a result, the user presses **Save**, optionally enters a title (e.g. "Friday dinner"), and confirms.
2. The backend validates the inputs, **recalculates the result itself**, and stores the snapshot.
3. The calculator modal **closes** and a brief confirmation ("Saved to your history.") is shown. There is no de-duplication: saving the same inputs again creates another entry.

### 4.3 History
1. User opens **History**: hero banner, then saved calculations **grouped by saved date** (local time zone), newest first. Group headings: "Today", "Yesterday", then e.g. "Mon, 27 Oct 2026".
2. Each row shows: title (or default "Even split" / "Itemised split"), grand total, number of people, time saved.
3. Selecting a row opens a **detail modal** (read-only): inputs, per-person breakdown, warnings at time of saving, and actions **Share** and **Edit a copy**.
4. **Edit a copy** opens the calculator modal pre-filled with those inputs; saving creates a **new** entry. The original is never modified.
5. **Delete:** each row has a Delete button. It asks for confirmation ("Delete this calculation?", naming the entry and its total; **Cancel** / **Delete**). On confirm the entry is permanently removed and a brief "Calculation deleted." confirmation is shown. Cancel changes nothing. Pressing Delete never opens the details.
6. Empty state: "No saved calculations yet" with a button to start a new split.

### 4.4 Sign up / Log in / Log out (modals)
- **Sign up:** name, email, password, confirm password. On success the modal closes, the user is logged in and stays on the current screen.
- **Log in:** email and password. On failure: generic "Email or password is incorrect".
- **Log out:** from the name dropdown; clears the session and returns to Home.
- **Session expiry:** if a protected request fails because the session expired, the user is told and the Login modal opens.

---

## 5. Calculator inputs & validation

All monetary inputs: USD, max 2 decimal places, no negative values.

| Field | Applies to | Rules |
|---|---|---|
| Bill amount (B) | Both | Required. $0.01 – $99,999.99. Includes tax. |
| Tip type | Both | Percentage (preset or custom) **or** fixed amount. Default: 15 %. |
| Tip % (custom) | Both | 0 – 100, up to 2 decimals. |
| Tip amount (fixed) | Both | $0.00 – $99,999.99. |
| Number of people (N) | Even | Integer 1 – 50. Default 2. |
| People | Itemised | 1 – 50 people. Name required, 1–30 chars, unique (case-insensitive, trimmed). Defaults "Person 1", "Person 2"… |
| Items | Itemised | 1 – 100 items. Name 1–40 chars (default "Item 1"…). Price $0.00 – $99,999.99 (the line total, no quantity field). At least one person assigned. |
| Save title | Save | Optional, max 60 chars. |

---

## 6. Calculation rules

### 6.1 Shared rules
- All money is handled as **integer cents**; no floating-point currency maths.
- **Tip (T):**
  - Percentage: `T = round_half_up(B × pct / 100)` to the cent.
  - Fixed: `T` = amount entered.
- **Grand total:** `G = B + T`.
- Each person's result shows **bill share + tip share = total**. Across all people:
  `Σ bill shares = B`, `Σ tip shares = T`, `Σ totals = G` — exactly.
- **Fair cent distribution (largest remainder):**
  1. Compute each person's exact (unrounded) share.
  2. Round each down to the cent.
  3. Give the remaining cents, one each, to the people with the largest fractional remainders.
  4. **Ties go to the first-listed person.**
  No one is ever more than 1¢ from their exact share; same inputs always give the same output.
- **Order:** allocate G (totals) using the rule above. Then choose each person's bill share so that it **and** the tip share (`total − bill share`) are each within 1¢ of their exact values, giving spare cents to the largest remainders (ties to the first-listed person). This guarantees all three columns add up exactly and every figure is within 1¢. (Subtracting an independently rounded tip could leave a bill share 2¢ off in rare cases.)

### 6.2 Even split
- Each person's exact share is `G / N` (and `T / N` for tip).
- Leftover cents therefore go to the first people in the list ("Person 1", "Person 2", …).

**Worked example** — B = $100.00, tip 18 %, N = 3
- T = $18.00, G = $118.00
- Totals: $39.34, $39.33, $39.33 (Σ $118.00)
- Tip shares: $6.00, $6.00, $6.00 (Σ $18.00)
- Bill shares: $33.34, $33.33, $33.33 (Σ $100.00)

### 6.3 Itemised split
- A shared item's price is divided equally among the people assigned to it.
- Person *i*'s **weight** `wᵢ` = sum of their item portions. `W = Σ item prices`.
- Exact total share = `G × wᵢ / W`; exact tip share = `T × wᵢ / W`. Then distribute cents per 6.1.
- `B − W` (tax, service charges, discounts) is therefore spread proportionally and displayed as **"Tax & fees: $X"** (or "Discount: $X" if negative).
- Weights are kept exact (rational), so shared items never introduce rounding errors before the final step.

**Worked example** — B = $54.00, tip 20 %
- Items: Pasta $20 (Alice), Steak $25 (Bob), Fries $6 (Alice, Bob, Cara). W = $51.00, tax & fees $3.00.
- Weights: Alice 22, Bob 27, Cara 2.
- T = $10.80, G = $64.80.

| Person | Bill share | Tip share | Total |
|---|---|---|---|
| Alice | $23.29 | $4.66 | $27.95 |
| Bob | $28.59 | $5.72 | $34.31 |
| Cara | $2.12 | $0.42 | $2.54 |
| **Sum** | **$54.00** | **$10.80** | **$64.80** |

(Totals: exact 2795.29 / 3430.59 / 254.12¢ → 1¢ left → Bob. Tips: 465.88 / 571.76 / 42.35¢ → 2¢ left → Alice, Bob.)

### 6.4 Edge cases
| Case | Behaviour |
|---|---|
| N = 1 / one person | That person pays everything. |
| 0 % tip or $0 fixed tip | Tip shares are $0.00. |
| Fixed tip > bill | **Warn** ("Tip is larger than the bill") and continue. |
| G in cents < number of people | Some people pay $0.00 (correct result). |
| Item with no one assigned | **Block**, highlight the item. |
| No items, or all items $0.00 (W = 0) | **Block**: "Add at least one item with a price." |
| Item priced $0.00 | Allowed; adds no weight. |
| Person with no items | Allowed; pays $0.00; **warn** ("Dan has no items"). |
| Items total < bill | Normal; difference shown as tax & fees. |
| Items total > bill | **Warn** ("Items add up to more than the bill; shares were scaled down") and continue. |
| Duplicate person names | **Block**. |
| Inputs changed after calculating | Result cleared; must press Calculate again. |

---

## 7. Results & sharing

### 7.1 Result view
- Summary: method, bill, tip (with % or "fixed"), tax & fees (itemised), grand total.
- Per-person table: name, bill share, tip share, total. Even split labels people "Person 1…N".
- Warnings, if any, shown above the table.

### 7.2 Share options (guests and logged-in users; from the calculator result and from History details)
| Option | Behaviour |
|---|---|
| **WhatsApp** | Opens a `wa.me` link pre-filled with the result text (app on phones, WhatsApp Web on desktop). If the browser blocks it from opening, show *"Couldn't open WhatsApp. Copy the result text and paste it into any chat."* with a **Copy text** button. |
| **Copy text** | Always available. Copies the result text to the clipboard; shows confirmation, or a selectable text box if clipboard access is denied. |
| **Image** | Downloads a PNG of the result card. |
| **PDF** | Downloads a PDF of the result. |

Result text format:
```
Tip & Bill Split — Itemised
Bill: $54.00 · Tip (20%): $10.80 · Total: $64.80
Alice: $27.95
Bob: $34.31
Cara: $2.54
```
File names: `bill-split-YYYY-MM-DD.png` / `.pdf`.

---

## 8. Accounts & security

- **Passwords:** 8–72 characters, at least one letter and one number. Hashed with **bcrypt** (cost ≥ 10); never stored or logged in plain text.
- **Email:** valid format, unique (case-insensitive), max 254 chars. **Name:** 1–50 chars.
- **Authentication:** JWT, valid 24 h, sent in an **httpOnly, SameSite=Lax cookie** (not readable by JavaScript). Logout clears the cookie.
- **Authorization:** all history endpoints require a valid JWT. Every query is filtered by the authenticated user's ID; requesting another user's calculation returns **404** (doesn't reveal it exists).
- **Validation:** all request bodies validated server-side (whitelist, reject unknown fields), regardless of frontend checks.
- **Server-side recalculation:** on save, the backend recomputes results from the inputs; client-submitted results are never trusted.
- **Brute-force protection:** rate limit on login and sign-up endpoints.
- Secrets (JWT secret, DB password) come from environment variables; an example `.env` is provided for local use only.

---

## 9. Content

- **Hero:** headline, one-line value statement, calculator entry point (Even / Itemised choice + **Start splitting**). Right side: bundled illustration of a group meal (hidden on mobile).
- **About:** short explanation of what the app does, the two split methods and the fair-cents guarantee.
- **Contact Us:** clearly marked placeholder details (e.g. `support@example.com — placeholder`). No real contact details, no form.

---

## 10. Non-functional requirements

- **Mobile first:** usable from 360 px width; no horizontal scroll; tap targets ≥ 44 px; numeric keyboards for amount fields.
- **Accessibility:** labelled form fields, keyboard-navigable modals, errors announced to screen readers, sufficient colour contrast.
- **Performance:** calculation runs instantly in the browser (no network needed for guests).
- **Browsers:** current Chrome, Safari (iOS), Firefox, Edge.

---

## 11. Technology & setup

| Layer | Choice |
|---|---|
| Frontend | React + Vite + Ant Design |
| Backend | NestJS, JWT auth |
| Database | MySQL |
| Local run | Docker Compose (frontend, backend, MySQL) |

Repository layout:
```
README.md
src/
  docker-compose.yml
  frontend/
  backend/
  docs/REQUIREMENTS.md
```
`node_modules` and build output are excluded. The README covers: the app and its users, prerequisites, exact install/run commands, how to run tests, AI tool/model used, manual code changes, and assumptions.

---

## 12. Acceptance criteria

**Calculation**
- AC-01 Even split, $100.00, 18 %, 3 people → totals $39.34 / $39.33 / $39.33; tip shares $6.00 each; bill shares $33.34 / $33.33 / $33.33.
- AC-02 Itemised example in 6.3 produces exactly the table shown.
- AC-03 For any valid input, Σ totals = G, Σ tip shares = T, Σ bill shares = B, and every share is within 1¢ of its exact value.
- AC-04 Leftover-cent ties go to the first-listed person.
- AC-05 Percentage tip rounds half up (e.g. $10.05 × 15 % = $1.5075 → $1.51).
- AC-06 Each blocking edge case in 6.4 shows its error and produces no result; each warning case shows its warning and produces a result.
- AC-07 Results appear only after pressing Calculate; editing any input clears the result.

**Accounts & history**
- AC-08 Sign up with valid data logs the user in; duplicate email is rejected; weak password is rejected.
- AC-09 Header shows Login/Sign Up for guests and History + name dropdown (with Logout) for logged-in users.
- AC-10 Guests see no Save action; logged-in users can save; nothing is saved without pressing Save.
- AC-11 History lists only the current user's calculations, grouped by date, newest first.
- AC-12 API: history requests without a valid token → 401; requests for another user's calculation → 404.
- AC-13 Stored passwords are bcrypt hashes.
- AC-14 Saved calculations are read-only; "Edit a copy" saves a new entry and leaves the original unchanged.
- AC-15 The save API accepts inputs only (a request containing a `result` field is rejected); the stored result is always calculated by the backend.

**Sharing & layout**
- AC-16 WhatsApp, Copy text, Image and PDF work from both the calculator result and History details, for guests where applicable.
- AC-17 If WhatsApp can't open, the fallback message and Copy text button appear.
- AC-18 At ≤ 768 px the hero image is hidden and the app is fully usable at 360 px.

**Setup**
- AC-19 Following the README on a clean machine with Docker, `docker compose up` starts frontend, backend and MySQL, and the app works end to end.

**Flow update (2026-10-29)**
- AC-20 Each saved calculation in History can be deleted after a confirmation; Cancel keeps it. API: deleting another user's calculation → 404; without a session → 401.
- AC-21 Saving a result closes the calculator modal and shows a brief "Saved to your history." confirmation.
- AC-22 Login and Sign Up open as modals (from the header, `/login`, `/signup`, or a protected page). A guest who logs in from the calculator keeps their result and can save it.

---

## 13. Resolved questions

All open questions were resolved on 2026-10-29 (see D17–D23 below).

---

## 14. Decision log

| # | Decision |
|---|---|
| D1 | Mobile-friendly web app, no install. |
| D2 | Even and itemised splitting. |
| D3 | Tip presets 0/10/15/18/20 %, custom %, or fixed amount. |
| D4 | Single bill amount including tax; even split tips on that amount; itemised allocates bill and tip proportionally to items. |
| D5 | Two-decimal display; leftover cents distributed fairly; no round-up option. |
| D6 | USD only. |
| D7 | Sign up/login/logout; guests calculate but don't save; manual save only; history; sharing. |
| D8 | Tied leftover cents go to the first-listed person. |
| D9 | Items exceeding the bill: warn and scale proportionally. |
| D10 | Fixed tip exceeding the bill: warn and continue. |
| D11 | Recalculate only on pressing Calculate. |
| D12 | Saved calculations are read-only snapshots; "Edit a copy" saves a new entry. |
| D13 | Sharing = WhatsApp text, Copy text, image, PDF; no public links. |
| D14 | Guests can share/export unsaved results. |
| D15 | WhatsApp via `wa.me`; fallback message + Copy text if blocked; Copy text always available. |
| D16 | Stack: React + Vite + Ant Design, NestJS + JWT, MySQL, Docker Compose; repo = README.md + src/. |
| D17 | The hero contains the calculator entry point: the user chooses Even or Itemised and clicks **Start splitting**, which opens the full calculator form in a modal. |
| D18 | ~~Login and Sign Up are separate pages.~~ Superseded by D24. |
| D19 | ~~A guest's unsaved result is not kept after logging in.~~ Superseded by D25. |
| D20 | ~~Saved calculations cannot be deleted in v1.~~ Superseded by D27. |
| D21 | About and Contact Us are sections on the Home page; nav links scroll to them. |
| D22 | Hero image is a built-in illustration, hidden on mobile. |
| D23 | History shows all saved calculations on one page, no pagination. |
| D24 | Login and Sign Up open in modals instead of separate pages. |
| D25 | A guest who logs in from the calculator keeps their unsaved result and can save it. |
| D26 | Saving closes the calculator modal and shows a brief confirmation. |
| D27 | Saved calculations can be deleted from History, after a confirmation. |
