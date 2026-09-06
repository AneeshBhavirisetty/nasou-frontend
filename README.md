# Nasou Hive — customer storefront

Customer-facing storefront for a plumbing / PVC-uPVC-cPVC fittings supplier.
Browse ~1,400 SKUs by size, material, brand and code; add to cart; check out.
Front end only — auth runs against an in-browser mock (`VITE_MOCK_API=true`).

## Run it

```bash
npm install
npm run dev            # http://localhost:5174
npm run build          # production build (three.js is a lazy chunk)
npm run build:catalog  # regenerate the catalog from shop data 1.xlsx
```

## Catalog

`src/data/catalog.js` reads `src/data/catalog.generated.json`, produced from
`shop data 1.xlsx` by `scripts/build-catalog.mjs`. The workbook has no price /
stock columns, so those are **deterministic synthetic values** (seeded PRNG) —
swap the generator for a real price feed when one exists.

## Demo auth

- Password login: `test@example.com` / `password123`
- OTP login: any 10-digit number, code `123456`
- `DEMO` pill (bottom-left) switches the previewed role (CUSTOMER / ADMIN).

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
