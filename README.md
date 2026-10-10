# Fyxnora — doorstep device repair marketplace

This is an original Fyxnora application. The customer journey takes inspiration from HelloRe's **appointment / technician visit** and **pickup / diagnosis / quote / repair / return** workflows; branding and code are original.

## Delivered features
- Responsive customer homepage with uploaded Fyxnora logo, categories and repair flow.
- Registration / sign-in via Supabase Auth email + password.
- Customer booking (mobile/laptop, brand/model, issue, address, preferred pickup date).
- Customer tracking: statuses, event history, quotation, approve/reject.
- Technician portal: assigned jobs, schedule visit, record pickup handover, transit and delivery.
- Partner portal: receive device, diagnose, issue quotation, repair, mark QC, reject-return workflow.
- Regional portal: region-scoped order visibility and local assignments.
- Super admin: national order view, assign operational accounts, manage workflow.
- Supabase schema with auxiliary tables for condition reports, custody, media, quotation items, repair parts, stock, payments, settlements, warranties, tickets, notifications, audit logging.

## Installation (VS Code / WSL)
1. Install Node 20.19+ or 22 LTS, npm and VS Code.
2. Create a Supabase project. In **SQL Editor**, run `supabase/schema.sql` once (fresh project recommended).
3. Supabase Dashboard → Project Settings / Connect → obtain Project URL and **anon/publishable key**. Obtain **service_role/secret key** from Project Settings → API Keys, keeping it private.
4. `cp .env.example .env.local` then fill in all three env vars.
5. In Supabase → Authentication → Providers → Email, choose email verification as preferred and configure redirect URLs for your app. For fastest local development you can disable email confirmation only in a throwaway test project.
6. `npm install && npm run dev`. Visit `http://localhost:3000`.
7. Register your account at `/register`; confirm email if enabled. To assign the very first admin, run in Supabase SQL Editor: `update public.profiles set role='admin' where email='your-email@example.com';` (never run user-supplied role escalation from the client).
8. Register separate user accounts for each operational role. In SQL Editor, set roles `technician`, `partner`, `regional` as required. For partner account: first insert verified `partners` record, then set `profiles.role='partner', profiles.partner_id='<partner uuid>'`. For regional staff, set `profiles.role='regional', profiles.region_id='<regions UUID>'`. For technicians and partner accounts, set the same `profiles.region_id` corresponding to their actual operating region. The admin assigns the regional owner to a booking; this MVP does not automatically route bookings from PIN codes.
9. Sign in and test booking → admin assignment → technician pickup → service-centre diagnosis → quotation → customer approval → repair → QC → delivery.
10. To deploy: push to GitHub, import into Vercel as a Next.js project, enter the same three env vars in Vercel settings, and update Supabase Auth redirect settings for your domain.

## Roles and routes
| Role | URL | Purpose |
|---|---|---|
| Customer | `/dashboard` | Own bookings, track progress, approve/reject quotations |
| Technician | `/technician` | Pickup/delivery assigned work |
| Service partner | `/partner` | Diagnose, quote and repair |
| Regional ops | `/regional` | Monitor and coordinate assigned regions |
| Super admin | `/admin` | National orders and assignment |

## Important: limitations before commercial launch
This is a connected **starter MVP**, not a certified production-ready repair marketplace. It requires additional functionality before holding physical devices or accepting money:
- Physical OTP generation/verification (the current workflow records a manually verified reference but does not validate a true OTP), device imagery and chain-of-custody signature.
- PCI/payment-provider checkout, server webhook signature verification, refunds, invoices, partner settlement processing. **SQL tables are placeholders; real payment processing is NOT integrated.**
- WhatsApp/SMS sending, live maps, automatic dispatch, courier tracking, and customer notification workers.
- Real serviceability and availability by PIN; bookings currently accept any valid Indian PIN. Activate only launched locations before public use.
- Partner onboarding UI, document verification, partner KYC and regional geography enforcement. Role promotion is manual SQL currently.
- Atomic state changes + event insertion in one SQL transaction, robust idempotency/rate limiting, explicit event correlation, and a verified signed handover protocol. Current update uses optimistic status matching but event insert is separate.
- Full customer-friendly conditions, refund and warranty enforcement, privacy/data retention, insurance and legal review.
- Stronger role scoping: regional users are assigned manually to `bookings.regional_id`. For regional assignment by geographical entity, add a dedicated `regional_profile_regions(region_id, profile_id)` join table. The current regional partner filter should not be relied on for production without this adjustment.
- Admin partner management, dynamic brands/models, multiple pricing tiers, tax calculation, quotation line UI, document and invoicing engine, and searchable operational filters.
- Validation/testing of real-world workflows with stakeholders, fraud prevention, observability, accessibility checks and load testing.

## Security implementation notes
All sensitive CRUD runs in server-side Next.js API endpoints that authenticate the caller using `auth.getUser(access_token)`, query their role server-side, and filter orders by ownership / assigned technician / partner / regional coordinator. Supabase RLS is enabled with no permissive browser table policies; the server uses a service-role key stored without `NEXT_PUBLIC_`. Keep the key secret and restrict CI and deployment secret access. Public direct writes do not work by design.

## Reference
The original user experience references https://hellore.in/ ; Fyxnora has its own code and identity.
