# Nasou Hive — customer storefront

The customer-facing half of Nasou Hive: browse, compare suppliers, and check
out. Every listing carries a traceability record (origin, maker, batch, carbon)
because that is the product's actual differentiator — the UI is built around
showing it, not hiding it behind a marketing page.

Front end only. No API, no auth, no persistence — all state is in memory.

## Run it

```bash
npm install
npm run dev
```

Opens on <http://localhost:5174>.

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
| Brand name, contact, footer  | `src/data/site.js`                            |
| Currency (₹ → anything)      | `currency` in `src/data/site.js` — one object |
| Products, categories, suppliers | `src/data/catalog.js`                      |
| Colours, type, radius, shadow | `@theme` block in `src/index.css`            |

Nothing in `src/components` or `src/pages` hardcodes a brand string, a colour
hex or a currency symbol — they all resolve through those four places.

## Structure

```text
src/
├── data/
│   ├── site.js        brand, nav, currency, footer, trust copy
│   └── catalog.js     products + derived trace / batch / supplier offers
├── context/
│   └── CartContext.jsx
├── lib/format.js      money, discount, carbon phrasing, eco banding
├── components/
│   ├── ui.jsx         Button, Badge, Stars, Photo, Stepper, Field, Container
│   ├── Icon.jsx       one stroked icon set, consistent line weight
│   ├── Header.jsx     ticker, mega menu, search, cart
│   ├── ProductCard.jsx
│   ├── TraceRail.jsx  the six-checkpoint journey (light + dark variants)
│   ├── CartDrawer.jsx
│   ├── Footer.jsx
│   └── Logo.jsx
└── pages/             Home, Shop, ProductDetail, Cart, Checkout, OrderConfirmed
```

## Two deliberate decisions

**Cart lines are stored lean.** A line is `{ id, supplierId, qty, price }`.
Product name, photo and eco data are rehydrated from the catalogue on render, so
the cart can never display a stale copy of a product that has since changed.

**Motion never gates content.** Above-the-fold content (hero, product buy box,
checkout steps) uses CSS animation with `both` fill, so it reaches its visible
state even if no animation frame ever runs. Only below-the-fold scroll reveals
use framer-motion. This is why the checkout steps are a keyed `div` rather than
an `AnimatePresence mode="wait"` — that would gate the next step on the previous
one's exit animation finishing, which can strand a shopper mid-purchase.

## Data shape

Products state their own facts once; everything else is derived in
`catalog.js` so it can't drift:

- `buildTrace(product)` — six checkpoints, built from `origin` and `maker`
- `batchId(product)` — deterministic, stable across reloads
- `offersFor(product)` — 3 competing retailers; the cheapest is always exactly
  the listed price so the grid card and product page agree

Swap these for API calls and the components need no changes.

## Not built yet

Auth, wishlist, order history, reviews submission, address book, and search
suggestions are all linked in the UI but resolve to `/shop`. Product photos are
Unsplash URLs with a graceful fallback — replace with real assets.
