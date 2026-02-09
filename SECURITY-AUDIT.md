# VyaparForge Security Audit Report

**Date:** 2026-02-08
**Auditor:** Automated Security Audit (Claude Code)
**Scope:** Full codebase — all source files outside `node_modules/` and `.next/`

---

## Summary

| Category                  | Status      | Critical Issues |
|---------------------------|-------------|-----------------|
| 1. Prompt Injection       | PASS        | 0               |
| 2. Environment & Secrets  | WARNING     | 1               |
| 3. Input Validation       | FAIL        | 3               |
| 4. Authorization          | **FAIL**    | **2 CRITICAL**  |
| 5. Data Integrity         | WARNING     | 2               |
| 6. Dependencies           | WARNING     | 2               |
| 7. File System            | WARNING     | 1               |
| 8. XSS                    | PASS        | 0               |

**Overall Risk Level: HIGH** — The application has no authentication or authorization. Every server action and page is publicly accessible.

---

## 1. PROMPT INJECTION CHECK

**Status: PASS**

Every source file in the project was read and inspected. No prompt injection patterns were found.

### Files Checked (76 total source files)

| File | Status |
|------|--------|
| `CLAUDE.md` (project root) | PASS — Contains only legitimate project instructions |
| `claude.md` (lowercase duplicate) | PASS — Identical content to CLAUDE.md |
| `app/actions.ts` | PASS |
| `app/layout.tsx` | PASS |
| `app/page.tsx` | PASS |
| `app/globals.css` | PASS |
| `app/purchase-orders/actions.ts` | PASS |
| `app/purchase-orders/page.tsx` | PASS |
| `app/purchase-orders/po-table.tsx` | PASS |
| `app/purchase-orders/loading.tsx` | PASS |
| `app/purchase-orders/new/page.tsx` | PASS |
| `app/purchase-orders/new/po-form.tsx` | PASS |
| `app/purchase-orders/new/loading.tsx` | PASS |
| `app/purchase-orders/[id]/page.tsx` | PASS |
| `app/purchase-orders/[id]/loading.tsx` | PASS |
| `app/purchase-orders/[id]/record-gate-pass-button.tsx` | PASS |
| `app/purchase-orders/[id]/record-dispatch-button.tsx` | PASS |
| `app/inward-gate-passes/actions.ts` | PASS |
| `app/inward-gate-passes/page.tsx` | PASS |
| `app/inward-gate-passes/gp-table.tsx` | PASS |
| `app/outward-gate-passes/actions.ts` | PASS |
| `app/outward-gate-passes/page.tsx` | PASS |
| `app/outward-gate-passes/ogp-table.tsx` | PASS |
| `app/dispatches/page.tsx` | PASS |
| `app/invoices/actions.ts` | PASS |
| `app/invoices/page.tsx` | PASS |
| `app/invoices/invoice-table.tsx` | PASS |
| `app/invoices/new/page.tsx` | PASS |
| `app/invoices/new/invoice-form.tsx` | PASS |
| `app/invoices/[id]/page.tsx` | PASS |
| `app/invoices/[id]/invoice-actions.tsx` | PASS |
| `app/po-ledger/actions.ts` | PASS |
| `app/po-ledger/page.tsx` | PASS |
| `app/po-ledger/po-ledger-table.tsx` | PASS |
| `app/settings/actions.ts` | PASS |
| `app/settings/page.tsx` | PASS |
| `app/settings/company-profile-form.tsx` | PASS |
| `app/settings/division-management.tsx` | PASS |
| `components/app-sidebar.tsx` | PASS |
| `components/site-header.tsx` | PASS |
| `components/inward-gate-pass-dialog.tsx` | PASS |
| `components/outward-gate-pass-dialog.tsx` | PASS |
| `components/ui/*.tsx` (13 files) | PASS — Standard shadcn/ui components |
| `lib/db.ts` | PASS |
| `lib/utils.ts` | PASS |
| `hooks/use-mobile.ts` | PASS |
| `prisma/schema.prisma` | PASS |
| `prisma/seed.ts` | PASS |
| `prisma.config.ts` | PASS |
| `next.config.ts` | PASS |
| `package.json` | PASS |
| `tsconfig.json` | PASS |
| `eslint.config.mjs` | PASS |
| `postcss.config.mjs` | PASS |
| `components.json` | PASS |
| `.gitignore` | PASS |
| `README.md` | PASS |

**Checked for:**
- Strings: "ignore previous instructions", "you are now", "act as", "system prompt", "disregard", "override", "bypass", "pretend", "forget everything"
- Hidden unicode characters / zero-width spaces
- Encoded instructions or obfuscated text
- Base64-encoded payloads in source files

**Result:** No prompt injection attempts detected in any file.

---

## 2. ENVIRONMENT & SECRETS CHECK

**Status: WARNING**

### 2.1 `.gitignore` Coverage

**Status: PASS**

`.gitignore` contains `.env*` wildcard pattern (line 34), which covers:
- `.env` — COVERED
- `.env.local` — COVERED
- `.env.production` — COVERED (by wildcard)

### 2.2 Hardcoded Secrets in Source Code

**Status: PASS**

Searched all `.ts`, `.tsx`, `.mjs` files for:
- API keys, tokens, passwords, connection strings
- `sk_`, `pk_`, `eyJ` (JWT), `ghp_`, `key=`, `password=`

**Result:** No hardcoded secrets found in any source file. All sensitive values are properly loaded from `process.env`.

### 2.3 NEXTAUTH_SECRET

**Status: PASS**

`.env.local` line 21: `NEXTAUTH_SECRET="Y9PfEVhB3GsqUgV6qBAmA/Upc/hRASkWI02jQnWkdK4="`

This appears to be a real base64-encoded secret (not the placeholder `"changeme"` or `"your-secret-here"`).

### 2.4 Supabase Keys in Client-Side Code

**Status: PASS**

Searched all source files (excluding `node_modules`) for `NEXT_PUBLIC_SUPABASE`, `SUPABASE_SERVICE_ROLE`, and `@supabase/supabase-js` imports.

**Result:** No Supabase client is imported or used anywhere in the application source code. The `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` defined in `.env.local` are never referenced in application code.

### 2.5 DATABASE_URL Exposure

**Status: PASS**

`DATABASE_URL` is only accessed in:
- `lib/db.ts` — Server-side Prisma client singleton (`process.env.DATABASE_URL`)
- `prisma/seed.ts` — CLI seed script (`process.env.DIRECT_URL ?? process.env.DATABASE_URL`)
- `prisma.config.ts` — Prisma CLI config (`process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"]`)

No client component (`"use client"`) accesses `DATABASE_URL`. No `NEXT_PUBLIC_DATABASE_URL` exists.

### 2.6 Unused Supabase Keys in .env.local

**Status: WARNING**

`.env.local` contains keys that are never used in the application:
- `NEXT_PUBLIC_SUPABASE_URL` — unused
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — unused
- `SUPABASE_SERVICE_ROLE_KEY` — unused

**Risk:** The `SUPABASE_SERVICE_ROLE_KEY` is a highly privileged key that bypasses Row Level Security. While not currently exposed to the client, its presence in the env file is unnecessary since the app uses Prisma directly.

**Recommended Fix:** Remove unused Supabase keys from `.env.local`. Remove `@supabase/supabase-js` from `package.json` since it's never imported.

---

## 3. INPUT VALIDATION CHECK

**Status: FAIL**

### Server Actions Inventory

| Server Action | File | Input Validated? |
|---------------|------|------------------|
| `getDashboardStats()` | `app/actions.ts` | N/A (no user input) |
| `getActivePOs()` | `app/actions.ts` | N/A (no user input) |
| `getDivisionSummary()` | `app/actions.ts` | N/A (no user input) |
| `getPurchaseOrders()` | `app/purchase-orders/actions.ts` | N/A (no user input) |
| `getPurchaseOrder(id)` | `app/purchase-orders/actions.ts` | **FAIL** — `id` not validated |
| `getDivisions()` | `app/purchase-orders/actions.ts` | N/A (no user input) |
| `createPurchaseOrder(data)` | `app/purchase-orders/actions.ts` | **FAIL** — No server-side validation |
| `updatePurchaseOrder(id, data)` | `app/purchase-orders/actions.ts` | **FAIL** — No server-side validation |
| `deletePurchaseOrder(id)` | `app/purchase-orders/actions.ts` | **FAIL** — `id` not validated |
| `getInwardGatePasses()` | `app/inward-gate-passes/actions.ts` | N/A (no user input) |
| `searchPurchaseOrder(query)` | `app/inward-gate-passes/actions.ts` | PARTIAL — length >= 3 check only |
| `createInwardGatePass(data)` | `app/inward-gate-passes/actions.ts` | PARTIAL — qty > 0 and balance checks |
| `getOutwardGatePasses()` | `app/outward-gate-passes/actions.ts` | N/A (no user input) |
| `searchPOForDispatch(query)` | `app/outward-gate-passes/actions.ts` | PARTIAL — length >= 3 check only |
| `createOutwardGatePass(data)` | `app/outward-gate-passes/actions.ts` | PARTIAL — qty > 0 and balance checks |
| `getInvoices()` | `app/invoices/actions.ts` | N/A (no user input) |
| `getInvoice(id)` | `app/invoices/actions.ts` | **FAIL** — `id` not validated |
| `getPOsWithDispatches()` | `app/invoices/actions.ts` | N/A (no user input) |
| `createInvoice(data)` | `app/invoices/actions.ts` | **FAIL** — No qty/rate/amount validation |
| `updatePaymentStatus(id, status)` | `app/invoices/actions.ts` | **FAIL** — No validation |
| `recordPayment(data)` | `app/invoices/actions.ts` | **FAIL** — No amount validation |
| `getDivisions()` | `app/settings/actions.ts` | N/A (no user input) |
| `createDivision(data)` | `app/settings/actions.ts` | PARTIAL — duplicate check only |
| `updateDivision(id, data)` | `app/settings/actions.ts` | PARTIAL — duplicate check only |
| `deleteDivision(id)` | `app/settings/actions.ts` | PASS — checks referential integrity |
| `getDivisions()` | `app/po-ledger/actions.ts` | N/A (no user input) |
| `getPOLedgerData(filters)` | `app/po-ledger/actions.ts` | **FAIL** — No filter validation |

### 3.1 Negative / Zero Quantity Submission

**Status: FAIL**

- `createPurchaseOrder`: No server-side check for negative or zero `qtyOrdered` or `rate`. Only client-side checks in `po-form.tsx` (lines 99-106), which can be bypassed.
- `createInwardGatePass`: **PASS** — Server-side check: `if (data.qty <= 0)` (line 118)
- `createOutwardGatePass`: **PASS** — Server-side check: `if (data.qty <= 0)` (line 122)
- `createInvoice`: **FAIL** — No server-side check for negative or zero `qty` or `rate` on invoice items.
- `recordPayment`: **FAIL** — No server-side check for negative or zero `amount`. A negative payment could reduce the total paid.

### 3.2 Extremely Large Numbers / Overflow

**Status: WARNING**

Prisma schema uses `Decimal(12,2)` for all quantity and monetary fields, which allows values up to `9,999,999,999.99`. No server-side upper-bound validation exists.

### 3.3 SQL Injection

**Status: WARNING**

- All Prisma `.findMany()`, `.create()`, `.update()`, `.delete()` calls use parameterized queries — **SAFE**.
- **Two `$queryRawUnsafe` calls** found in `app/actions.ts` (lines 16-22):
  ```typescript
  prisma.$queryRawUnsafe<[{ count: bigint }]>(
    `SELECT COUNT(*)::bigint as count FROM "POLineItem" WHERE "qtyReceived" < "qtyOrdered"`
  )
  ```
  These are currently SAFE because they are static strings with no interpolated user input. However, `$queryRawUnsafe` does not support parameterization, making it a ticking time bomb if someone later adds dynamic filters.

**Recommended Fix:** Replace `$queryRawUnsafe` with `prisma.$queryRaw` (tagged template literal) or Prisma's standard query methods.

### 3.4 HTML/Script Tag Injection in Text Fields

**Status: WARNING**

No server-side sanitization exists for string fields (`poNumber`, `partName`, `partNumber`, `remarks`, `workOrder`, `gpNumber`, `vehicleNumber`, `challanNumber`, `batchNumber`, division `name`/`code`). A user can store `<script>alert('xss')</script>` as a part name.

While React's JSX auto-escapes these values when rendering (preventing XSS), the malicious strings will persist in the database and could be dangerous if:
- Data is exported to CSV/PDF without escaping
- Data is consumed by another system/API
- An email template is added later

**Recommended Fix:** Sanitize/trim all string inputs on the server side. Enforce max lengths. Strip HTML tags from free-text fields.

---

## 4. AUTHORIZATION CHECK

**Status: FAIL — CRITICAL**

### 4.1 Authentication Middleware

**Status: FAIL — CRITICAL**

**No `middleware.ts` file exists** in the project root. Despite `next-auth` being installed as a dependency and referenced in `CLAUDE.md`, authentication has never been implemented.

**Impact:** Every page and server action is publicly accessible without login. Anyone who knows the URL can:
- View all purchase orders, invoices, gate passes, and financial data
- Create, update, and delete purchase orders
- Create gate passes and dispatches
- Create invoices and record payments
- Create and delete HAL divisions
- View the full PO ledger with financial balances

### 4.2 Server Action Authentication

**Status: FAIL — CRITICAL**

Zero out of 27 server actions check for an authenticated session. There is no `getServerSession()`, `auth()`, or any session verification anywhere in the codebase.

**Example — any anonymous HTTP request can delete a PO:**
```
POST /purchase-orders/actions (deletePurchaseOrder)
Body: { id: "cuid-of-any-po" }
```

### 4.3 API Route Protection

**Status: N/A**

No API routes (`app/api/`) exist. All data access is via Next.js server actions, which are themselves unprotected.

### 4.4 NextAuth Configuration

**Status: FAIL**

`next-auth` v4 is installed in `package.json`, and `@auth/prisma-adapter` is present, but:
- No `app/api/auth/[...nextauth]/route.ts` exists
- No `auth.ts` or `auth.config.ts` exists
- No `SessionProvider` wraps the app
- No session checks anywhere

The auth packages are installed but completely unused.

**Recommended Fix:** Implement NextAuth.js configuration, add `middleware.ts` to protect all routes, and add `getServerSession()` checks to every server action.

---

## 5. DATA INTEGRITY CHECK

**Status: WARNING**

### 5.1 Inward Gate Pass Quantity Validation

**Status: PASS**

`createInwardGatePass` in `app/inward-gate-passes/actions.ts` (lines 103-169):
- Runs inside a `prisma.$transaction` — GOOD
- Fetches line item and calculates `balance = qtyOrdered - qtyReceived` — CORRECT
- Checks `if (data.qty > balance)` — CORRECT
- Checks `if (data.qty <= 0)` — CORRECT
- Increments `qtyReceived` atomically — CORRECT
- Updates PO status based on all line items — CORRECT

### 5.2 Outward Gate Pass (Dispatch) Quantity Validation

**Status: PASS**

`createOutwardGatePass` in `app/outward-gate-passes/actions.ts` (lines 107-178):
- Runs inside a `prisma.$transaction` — GOOD
- Calculates `dispatchBalance = qtyReceived - qtyDispatched` — CORRECT
- Checks `if (data.qty > dispatchBalance)` — CORRECT
- Checks `if (data.qty <= 0)` — CORRECT
- Increments `qtyDispatched` atomically — CORRECT
- Updates PO status — CORRECT

### 5.3 Server-Side vs Client-Side Validation

**Status: PASS for gate passes, FAIL for PO creation and invoices**

- Gate pass creation: Server-side validation exists (inside transaction) — **PASS**
- PO creation (`createPurchaseOrder`): **FAIL** — No server-side validation. Quantity and rate checks only exist in the client-side form (`po-form.tsx` lines 94-107). A direct server action call can submit `qtyOrdered: -100` or `rate: 0`.
- Invoice creation (`createInvoice`): **FAIL** — No server-side validation of item quantities or rates. No check that `qty <= invoiceableQty`.
- Payment recording (`recordPayment`): **FAIL** — No validation that amount > 0.

### 5.4 PO Status Transitions

**Status: WARNING**

- Inward gate pass creation: Correctly transitions `OPEN → PARTIALLY_FULFILLED → COMPLETED` based on received quantities.
- Outward gate pass creation: Correctly transitions based on dispatched quantities.
- **However:** `updatePurchaseOrder` allows **arbitrary status changes** via the `status` field (line 173 in `app/purchase-orders/actions.ts`). A user can set any PO to `COMPLETED` or back to `OPEN` without business rule enforcement.
- The `CANCELLED` status can be set directly without checking if the PO has active gate passes or invoices.

### 5.5 Invoice Quantity Validation

**Status: FAIL**

`createInvoice` in `app/invoices/actions.ts` does NOT validate that:
- `item.qty > 0`
- `item.qty <= invoiceableQty` (dispatched - already invoiced)
- `item.rate > 0`

The `getPOsWithDispatches` function calculates `invoiceableQty` and filters on the client side, but the actual `createInvoice` server action trusts whatever quantities are submitted.

### 5.6 Payment Amount Validation

**Status: FAIL**

`recordPayment` in `app/invoices/actions.ts` does NOT validate that:
- `amount > 0`
- Total payments don't exceed the invoice total (overpayment is silently accepted — status becomes `PAID` once `totalPaid >= totalAmount`)

---

## 6. DEPENDENCY CHECK

**Status: WARNING**

### Installed Packages

**Production Dependencies (18):**

| Package | Version | Status |
|---------|---------|--------|
| `@auth/prisma-adapter` | ^2.11.1 | WARNING — Installed but unused (no auth configured) |
| `@prisma/adapter-pg` | ^7.3.0 | OK |
| `@prisma/client` | ^7.3.0 | OK |
| `@supabase/supabase-js` | ^2.95.3 | **WARNING — Never imported anywhere in source code** |
| `class-variance-authority` | ^0.7.1 | OK (shadcn/ui dependency) |
| `clsx` | ^2.1.1 | OK |
| `date-fns` | ^4.1.0 | OK |
| `dotenv` | ^17.2.4 | OK (used in prisma.config.ts and seed.ts) |
| `lucide-react` | ^0.563.0 | OK |
| `next` | 16.1.6 | OK |
| `next-auth` | ^4.24.13 | WARNING — Installed but unused (no auth configured) |
| `next-themes` | ^0.4.6 | OK |
| `pg` | ^8.18.0 | OK (Prisma adapter dependency) |
| `radix-ui` | ^1.4.3 | OK (shadcn/ui dependency) |
| `react` | 19.2.3 | OK |
| `react-dom` | 19.2.3 | OK |
| `sonner` | ^2.0.7 | OK |
| `tailwind-merge` | ^3.4.0 | OK |

**Dev Dependencies (10):**

| Package | Version | Status |
|---------|---------|--------|
| `@tailwindcss/postcss` | ^4 | OK |
| `@types/node` | ^20 | OK |
| `@types/pg` | ^8.16.0 | OK |
| `@types/react` | ^19 | OK |
| `@types/react-dom` | ^19 | OK |
| `eslint` | ^9 | OK |
| `eslint-config-next` | 16.1.6 | OK |
| `prisma` | ^7.3.0 | OK |
| `shadcn` | ^3.8.4 | OK |
| `tailwindcss` | ^4 | OK |
| `tsx` | ^4.21.0 | OK |
| `tw-animate-css` | ^1.4.0 | OK |
| `typescript` | ^5 | OK |

### Suspicious / Unnecessary Packages

1. **`@supabase/supabase-js`** — Not imported anywhere. Should be removed.
2. **`@auth/prisma-adapter`** — Installed for NextAuth but auth is not configured. Unnecessary until auth is implemented.
3. **`next-auth`** — Same as above.

### Scripts in package.json

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint"
}
```

**Status: PASS** — Only standard Next.js scripts. No suspicious pre/post install hooks or custom scripts.

---

## 7. FILE SYSTEM CHECK

**Status: WARNING**

### 7.1 Junk / Unexpected Files

| File | Status |
|------|--------|
| `nul` (project root) | **WARNING** — Empty file, likely created by a Windows `NUL` device path accident. Should be deleted. |
| `claude.md` (lowercase) | WARNING — Duplicate of `CLAUDE.md`. Having both may cause confusion. |
| `public/file.svg` | OK — Default Next.js asset |
| `public/globe.svg` | OK — Default Next.js asset |
| `public/next.svg` | OK — Default Next.js asset |
| `public/vercel.svg` | OK — Default Next.js asset |
| `public/window.svg` | OK — Default Next.js asset |

### 7.2 Executable Scripts

**Status: PASS**

No unexpected executable scripts found. Only `prisma/seed.ts` exists as a runnable script, and it's a standard database seeder.

### 7.3 Filesystem Writes

**Status: PASS**

No source file writes to the filesystem. All data operations go through Prisma → PostgreSQL.

---

## 8. XSS (Cross-Site Scripting) CHECK

**Status: PASS**

### 8.1 dangerouslySetInnerHTML

**Status: PASS**

Searched all `.ts` and `.tsx` files in the project source (excluding `node_modules`). Zero instances of `dangerouslySetInnerHTML` found.

### 8.2 Unescaped DOM Insertion

**Status: PASS**

No usage of:
- `dangerouslySetInnerHTML`
- `innerHTML`
- `outerHTML`
- `document.write()`
- `eval()`
- `Function()` constructor
- jQuery `.html()` or similar

All user data is rendered through React JSX, which auto-escapes HTML entities by default.

### 8.3 `style` Prop with User Data

**Status: PASS**

One `style` prop found in `app/page.tsx` line 171:
```tsx
style={{ width: `${po.fulfillmentPct}%` }}
```

`fulfillmentPct` is calculated server-side as `Math.round((totalDispatched / totalOrdered) * 100)` — a number derived from database values, not direct user input. Low risk.

---

## Critical Findings Summary

### CRITICAL (Must Fix Before Production)

1. **No Authentication** — The entire application is publicly accessible. Anyone can view, create, modify, and delete all business data (POs, invoices, payments, gate passes). `next-auth` is installed but never configured.

2. **No Authorization Middleware** — No `middleware.ts` exists. No route protection of any kind.

3. **No Server-Side Validation on PO Creation** — `createPurchaseOrder` accepts any `qtyOrdered` and `rate` values without validation. Negative quantities and zero rates can be submitted by bypassing client-side checks.

4. **No Server-Side Validation on Invoice Creation** — `createInvoice` does not validate quantities against invoiceable balance. Arbitrary amounts can be invoiced.

5. **No Payment Amount Validation** — `recordPayment` accepts any amount including negative values and has no overpayment protection.

### HIGH (Should Fix)

6. **`$queryRawUnsafe` Usage** — Two instances in `app/actions.ts`. Currently safe (static SQL) but dangerous pattern that could lead to SQL injection if modified.

7. **Arbitrary PO Status Changes** — `updatePurchaseOrder` allows setting any status without business rule checks.

8. **Unused Service Role Key** — `SUPABASE_SERVICE_ROLE_KEY` is in `.env.local` but never used. This key bypasses all Supabase RLS and should be removed if not needed.

### LOW (Nice to Fix)

9. **Unused Dependencies** — `@supabase/supabase-js`, `next-auth`, `@auth/prisma-adapter` are installed but unused.

10. **`nul` Junk File** — Empty file created by Windows path accident.

11. **No String Length Limits** — Text fields like `poNumber`, `partName`, `remarks` have no max length enforcement.

12. **Company Profile in localStorage** — Unencrypted, not synced, parseable by any JS on the page.

---

## Recommended Actions (Priority Order)

1. **Implement NextAuth.js authentication** — Configure providers, create `middleware.ts`, wrap app in `SessionProvider`, add `getServerSession()` to every server action.

2. **Add server-side input validation** — Use a schema validation library (e.g., Zod) to validate all server action inputs: required fields, positive numbers, max lengths, valid enum values.

3. **Replace `$queryRawUnsafe`** — Use `prisma.$queryRaw` with tagged template literals or standard Prisma query methods.

4. **Add business rule enforcement to `updatePurchaseOrder`** — Prevent invalid status transitions and validate against related records.

5. **Add invoice quantity validation** — Server-side check that `qty <= invoiceableQty` in `createInvoice`.

6. **Add payment validation** — Ensure `amount > 0` and optionally warn on overpayment in `recordPayment`.

7. **Remove unused dependencies** — Uninstall `@supabase/supabase-js`. Keep `next-auth` and `@auth/prisma-adapter` if auth will be implemented.

8. **Remove unused env vars** — Remove `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` from `.env.local` if Supabase JS client is not needed.

9. **Delete junk files** — Remove `nul` from project root.

---

*End of Security Audit Report*
