# Nivora — home-improvement marketplace (by Nasou Hive)

Multi-retailer marketplace: customer storefront, a seller console for each
retailer (`/seller`) and the Nasou Hive Super Admin console (`/admin`).
Runs two ways, from the same build:

- **Live** — against [nasou-api](../nasou-api) (Spring Boot + MySQL, deployed on
  Azure). Every list and every change goes to the server; nothing
  business-related is kept in the browser.
- **Browser demo** — no API configured (the Vercel preview): an in-browser
  backend in `src/store` runs every flow from localStorage.

**Start with [docs/MARKETPLACE.md](docs/MARKETPLACE.md)** — demo accounts for
every role, and where each requirement lives.

## Run it

```bash
npm install
npm run dev            # http://localhost:5174
npm run build          # production build (three.js is a lazy chunk)
npm run build:catalog  # regenerate the catalog from shop data 1.xlsx
npm test               # retailer scoping (cross-retailer access must fail) + marketplace maths
```

## Against the API

The API URL is read at run time from `/config.js`, so one build serves every
environment:

```js
window.__NIVORA__ = { apiBaseUrl: 'https://<api>/api/v1', demo: false };
```

- Local: `VITE_API_BASE_URL=http://localhost:8080/api/v1 npm run dev`, or the
  whole stack with `docker compose up` in `nasou-api` (web on :5173).
- Docker: the image (`Dockerfile`, nginx) writes `config.js` from
  `API_BASE_URL` and `SHOW_DEMO` when it starts.
- Azure Static Web Apps: `.github/workflows/deploy.yml` writes it from the
  repository variables. See nasou-api `docs/AZURE.md`.

`src/lib/live.js` fills the stores from the API after sign-in (per role) and
refreshes them after each change; `src/lib/config.js` decides the mode.
Checkout prices come from `POST /pricing/quote`, the same code that charges.

## Catalog

`src/data/catalog.js` reads `src/data/catalog.generated.json`, produced from
`shop data 1.xlsx` by `scripts/build-catalog.mjs`. The workbook has no price /
stock columns, so those are **deterministic synthetic values** (seeded PRNG) —
swap the generator for a real price feed when one exists.

## Demo auth

- Every demo account: password `nivora123`; team accounts then ask for the 2FA code `123456`.
  Full list in [docs/MARKETPLACE.md](docs/MARKETPLACE.md).
- `DEMO` pill (bottom-left) signs in as any demo account in one click.
- OTP login: a demo account's mobile number, any 6 digits.

## 3D hero

`three` + `@react-three/fiber` + `@react-three/drei`, code-split and lazy-loaded
via `src/components/hero/HeroStage.jsx`, with a static SVG fallback for
no-WebGL / `prefers-reduced-motion`.

## Routes

| Path               | Page                                                        |
| ------------------ | ----------------------------------------------------------- |
| `/`                | Home — hero with a live trace record, categories, rails, offers |
| `/shop`            | Catalogue — filters, sort, search, URL-synced state          |
| `/product/:id`     | Product — supplier comparison, trace rail, impact, reviews    |
| `/cart`            | Full cart                                                    |
| `/checkout`        | Four-step checkout (address → delivery → payment → review)    |
| `/order-confirmed` | Confirmation                                                  |

`/shop` reads `?category=`, `?q=`, `?deal=1` and `?sort=`, so any filtered view
is a shareable link.

## Where to change things

| I want to change…            | Edit                                          |
| ---------------------------- | --------------------------------------------- |
| Brand name, nav, footer, copy | `src/data/site.js`                           |
| Currency (₹ → anything)      | `currency` in `src/data/site.js`              |
| Products / prices / stock    | `scripts/build-catalog.mjs`, then `npm run build:catalog` |
| Colours, type, radius, motion tokens | `@theme` block in `src/index.css`     |

## Structure

```text
src/
├── data/        site.js · catalog.js (+ generated JSON) · suppliers.json
├── context/     Cart · Auth · Toast · Wishlist
├── layouts/     Public · Auth (split-screen) · Protected · Admin
├── lib/         format.js · motion.js · api.js (+ mock) · auth.js
├── components/
│   ├── ui.jsx           Button, Badge, Rating, PriceTag, Photo, Field, …
│   ├── ProductArt.jsx   per-type SVG product illustrations
│   ├── Reveal / Counter / Marquee / StatTile / Accordion / Tabs
│   ├── hero/            HeroStage (lazy 3D) · Hero3D · HeroFallbackArt
│   ├── auth/            AuthCard · OtpInput · PasswordField · AuthStepper · ResendTimer
│   └── admin/           AdminSidebar · RoleSwitch
└── pages/       Home, Shop, ProductDetail, Cart, Checkout, OrderConfirmed,
                 Wishlist, Orders, Info, NotFound, auth/*, admin/*
```

## Notes

- **Cart lines are lean** — `{ id, supplierId, qty, price }`; everything displayable is
  rehydrated from the catalog on render, so the cart can't show a stale product copy.
- **Checkout steps are a keyed `div`**, not `AnimatePresence mode="wait"` — the latter would
  gate the next step on the previous one's exit animation and could strand a shopper.
- **Prices are synthetic.** `catalog.generated.json` is deterministic and regenerable; wire a
  real price feed into `build-catalog.mjs` when available.
