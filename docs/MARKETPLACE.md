# Nivora marketplace — what is built and where

This covers client review 5 and the *Super Admin: Requirements by Priority*
brief. The storefront still runs on its in-browser demo backend
(`VITE_MOCK_API=true`), so every rule below works end to end in the deployed
demo. The **Server work** column lists what `nasou-api` must also enforce
before production.

## Demo accounts

Password for every account: **`nivora123`**. Nasou Hive team accounts then ask
for a two-factor code: **`123456`**. The `DEMO` pill (bottom-left) also
switches between accounts in one click and skips 2FA.

| Portal | Email | Who |
| --- | --- | --- |
| Super Admin | `owner@nivora.test` | Priya Sharma — Owner, the one IAM admin |
| Super Admin | `ops@nivora.test` | Imran Sheikh — Operations |
| Super Admin | `support@nivora.test` | Sana Fatima — Support |
| Super Admin | `finance@nivora.test` | Vikram Das — Finance |
| Super Admin | `management@nivora.test` | Anita Rao — Management (read-only) |
| Seller | `retailer@nivora.test` | Sri Sai Pipes & Sanitary — store owner |
| Seller | `staff@nivora.test` | Sri Sai Pipes — fulfilment staff (orders only) |
| Seller | `retailer2@nivora.test` | Deccan Hardware Mart — store owner |
| Seller | `retailer3@nivora.test` | Krishna Agro & Plumbing — store owner |
| Seller | `pending@nivora.test` | Balaji Electricals — waiting for approval |
| Seller | `retailer5@nivora.test` | Coastal Paints & Tools — corrections asked |
| Customer | `customer@nivora.test` | Aarav Reddy — has orders and saved addresses |

Older logins `admin@nasou.test` and `customer@nasou.test` still work, as does
the old password `nasou123`. A staff invite link to try:
`/invite/demo-invite-r1`.

## Where each requirement lives

| # | Requirement | Screens | Code | Server work |
| --- | --- | --- | --- | --- |
| 1 | Retailer data scoping | every list | `lib/scope.js` (one shared scope), `lib/useScoped.js`, tests in `scripts/scope.test.mjs` | Same filter in the shared repository layer; bypass logging |
| 2 | Retailer-aware login | `/login` | session carries `role`, `teamRole`, `retailerId`, `staffRole` (`context/AuthContext.jsx`) | JWT claims |
| 3 | Team roles, 2FA | Team & customers › Roles | `lib/access.js` (matrix = section 4 of the brief), `context/IamStore.jsx` | Check the matrix on every endpoint; real OTP sender |
| 4 | Audit log | Audit log | `lib/auditLog.js` — append-only, hash-chained | Server copy with real client IP |
| 5 | Retailer signup + documents | `/sell`, `/sell/register` | `pages/seller/Register.jsx`, `lib/files.js` | Object storage, captcha, rate limit |
| 6 | Approval queue | Approvals | `pages/admin/Approvals.jsx`, `store/retailers.js` | — |
| 7 | Global list views | Retailers, Orders, Team & customers, Payouts… | `components/admin/DataTable.jsx` | Server-side paging when lists grow |
| 8 | Split checkout | Checkout, Orders | `lib/marketplace.js` `splitOrder`, `store/orders.js` | — |
| 9 | Razorpay split | Order page (transfer per part), Reconciliation | simulated in `store/orders.js` | Razorpay Route linked accounts, transfers with `on_hold` |
| 10 | Commission | Commission & plans, retailer page | `commissionRate` in `lib/marketplace.js` | — |
| 11 | Suspend / deactivate / delete | Retailer page | `store/actions.js` — delete shows its effects, needs Owner, soft delete | — |
| 12 | Support control | Customer page, Order page | edit, block, password reset, notes, flag, cancel, refund | Real reset email |
| 13 | Payouts & settlements | Payouts | `store/payouts.js` — weekly cycles on delivery date | Bank file / RazorpayX payouts |
| 14 | Retailer admin view | `/seller` | `layouts/SellerLayout.jsx`, `pages/seller/*` | — |
| 15 | Storefront changes | product cards, cart, orders, invoice | seller shown everywhere; cart grouped by seller | — |
| 16 | Master catalog | Master catalog | `pages/admin/MasterCatalog.jsx`; sellers pick from it | — |
| 17 | Approval of retailer changes | Seller › Store profile → Approvals › Profile changes | `proposeChanges` / `decideChanges` | — |
| 18 | Subscriptions | Commission & plans | plans, assignment, renewals, fee in payouts | Billing schedule |
| 19 | Refunds | Refunds, Order page | Support starts, Finance approves, part-only | Razorpay refunds + transfer reversals |
| 20 | Reconciliation | Reconciliation | `store/payouts.js` — report is simulated with 3 planted differences | Razorpay settlement reports |
| 21 | Retailer team accounts | Seller › Team, `/invite/:token` | `inviteStaff`, `acceptInvite` | Invite email |
| 22 | Dashboards | Super Admin dashboard (5 tabs), seller dashboard | `pages/admin/Dashboard.jsx` | — |
| 23 | CSV export | every list | `DataTable` export — role-limited, audited | — |
| 24 | Tax rules | Content & settings › Tax | `taxRateFor` used by checkout | Accountant sign-off |
| 25 | Shipping rules | Content & settings › Shipping | `shippingFor` per seller part | — |
| 26 | Homepage & banners | Content & settings › Homepage | banners and featured categories drive `/` | — |
| 27 | Message templates | Content & settings › Templates | with live preview | Email / SMS providers |
| 28 | Bulk import / export | Catalog import / export | per retailer | — |
| 29 | Log in as retailer | Retailer page › View as retailer | Owner / Operations, reason, 15 min, read-only banner, audited | — |
| 30–32 | Returns, disputes, tickets | — (priority 5) | data model reserved: `part.returns[]` in `store/orders.js` | Build later |

## Client review 5

**Customer website:**

1. Colours and UI: everything uses the reference palette (cream, forest, sand). The home page now opens with a "cinematic" hero, the chat follows the reference, and the cards, dashboards and wishlist have been refreshed.
2. The product is renamed to Nivora; Nasou Hive stays as the company name.
3. Locate me and addresses: there is a "Deliver to" chip in the header, an address book in My profile, and "Use my current location" plus PIN-code autofill (`lib/geo.js`, `components/AddressForm.jsx`).
4. The bell: customer actions and team actions on a customer both notify. There are tabs, per-item read and dismiss (`store/notifications.js`).
5. Accounts: customers can deactivate (reversible by signing in), delete (with a typed confirmation), sign out, and sign out of all devices.
6. Wishlist: it has fixed category chips (always shown), quick filters, sorting, and "Move to cart".

**Admin:**

1. Retailers became Nasou Hive team members with roles. Team & customers has two tabs, internal users and customers, plus Roles. There is one Owner (the IAM admin); the rest are team members.
2. Discounts by code: Products › Apply discount › "Use a discount code" ties a Discounts-module code to a category, and the code then applies itself at checkout.
3. Inventory: placing an order takes stock out, and cancelling puts it back. Every movement is listed under Products › Stock movements. With the API configured, checkout posts to `POST /checkout`, which decrements stock in the same transaction.

## Open decisions (section 5), set to the recommended defaults

All of these can be changed in **Commission & plans › Money rules**:

- Settlement cycle: weekly.
- Held money: released on delivery.
- Subscription fees: deducted from the first payout of the month.
- Every refund needs Finance approval (threshold ₹0).
- Retailers are soft-deleted.
- Bank, tax and legal fields need approval before a change takes effect.
- Retailer team accounts and "log in as retailer" are both built.
