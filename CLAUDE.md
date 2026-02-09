# VyaparForge - Manufacturing ERP for HAL Suppliers

## Overview
VyaparForge is a manufacturing ERP for aerospace fabrication
suppliers to HAL. Tracks POs, gate passes, dispatches, invoicing.

## Tech Stack
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- PostgreSQL via Supabase (Prisma ORM)
- NextAuth.js for authentication

## Business Logic
- HAL divisions: Aircraft, Helicopter, Engine, Avionics, F&F, LRDE
- PO contains line items: part number, work order, qty, rate
- Inward Gate Pass = HAL sends raw material to us
- Outward Gate Pass = we deliver fabricated parts to HAL
- PO Ledger: Ordered vs Received vs Dispatched vs Balance

## Commands
- Dev: npm run dev
- DB push: npx prisma db push
- DB seed: npx prisma db seed
- Generate: npx prisma generate

## Code Style
- TypeScript strictly, no 'any'
- Server components by default
- Prisma for DB, shadcn/ui for UI
- Currency: Indian Rupee. Dates: DD-MM-YYYY display, ISO storage

## GST: Same state CGST 9% + SGST 9%, diff state IGST 18%
## Gate pass qty <= PO balance. Dispatch qty <= received qty.
## PO status: Open -> Partially Fulfilled -> Completed
