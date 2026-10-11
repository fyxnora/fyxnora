# Fyxnora — doorstep device repair marketplace

This is an original Fyxnora application with a guided appointment, technician visit, pickup, diagnosis, quote, repair and return workflow.

## Delivered features
- Responsive customer homepage with uploaded Fyxnora logo, categories and repair flow.
- Registration with an SMTP-delivered email OTP, welcome email with the customer repair-stage PDF guide, and Supabase Auth email/password sign-in.
- Login password recovery with an SMTP-delivered one-time code, email verification and a new-password confirmation step.
- Customer booking (mobile/laptop, brand/model, issue, address, preferred pickup date).
- Customer tracking: statuses, event history, quotation, approve/reject.
- Technician portal: assigned jobs, schedule visit, record pickup handover, transit and delivery.
- Partner portal: receive device, diagnose, issue quotation, repair, mark QC, reject-return workflow.
- Regional portal: region-scoped order visibility and local assignments.
- Super admin: national order view, assign operational accounts, manage workflow.
- Admin user management: invite users by email as customers, technicians, service partners, regional staff or admins; edit profile details and role access, and disable accounts.
- Admin repair catalog: manage device type, brand, model, repair service, doorstep availability, duration, warranty and model-specific pricing.
- Bulk catalog import with a downloadable CSV sample template (up to 500 rows per upload).
- Encrypted SMTP configuration in the super-admin panel; credentials are never returned to the browser.
- Gmail, Zoho Mail and custom SMTP presets, SMTP test email, comma-separated internal recipients and optional CC for service notifications.
- Customer email updates with timestamps and the stage guide attached for booking and workflow milestones; sensitive OTP and password links are never copied to CC recipients.
- Downloadable role workflow guide at `/api/role-workflow`.
- Customer booking funnel: device type → brand → model → repair services → live price estimate → pickup.
- Product cards show brand logos and brand/model-aware device vector artwork; catalog CSV imports may specify an `image_url` to override the artwork for a model.
- Customer pages use an animated repair illustration with reduced-motion support and an FN favicon aligned to the Fyxnora brand.
- Pickup address supports PIN-code lookup to fill area, city, state and country while the street address remains manual, or a browser live-location pin with detected address fields locked until the customer switches back to manual entry.
- “For Business” enquiry page for Repair, AMC, Procurement and Liquidation, with a status-managed Business Queries inbox in the super-admin dashboard.
- Five connected role experiences: customer tracking, field technician custody, service-centre repair operations, regional oversight, and nationwide super-admin control.
- Service-centre-to-technician assignment with verified centre scoping.
- Admin-controlled repair commission, inspection, pickup, express, payment and GST settings.
- Initial mobile catalogue containing 5 publicly listed brands, 86 models, 16 repair services and editable starting estimates.
- Supabase schema with auxiliary tables for condition reports, custody, media, quotation items, repair parts, stock, payments, settlements, warranties, tickets, notifications, audit logging.

## Installation (VS Code / WSL)
1. Install Node 20.19+ or 22 LTS, npm and VS Code.
2. Create a Supabase project. In **SQL Editor**, run `supabase/schema.sql`. It is the single unified schema for both fresh projects and existing Fyxnora databases, and is safe to run again.
3. Supabase Dashboard → Project Settings / Connect → obtain Project URL and **anon/publishable key**. Obtain **service_role/secret key** from Project Settings → API Keys, keeping it private.
4. `cp .env.example .env.local` and fill in the Supabase values. SMTP credentials are configured in the Admin panel and encrypted on the server using the Supabase service-role key. Existing installations that already use `SMTP_SETTINGS_ENCRYPTION_KEY` may keep it to decrypt their saved SMTP password.
5. Bootstrap the first administrator directly in Supabase Dashboard → Authentication → Users by creating an account and setting its password, then run in SQL Editor: `update public.profiles set role='admin' where email='your-email@example.com';` The profile trigger creates the account profile. Sign in, then configure SMTP in Admin → **SMTP settings** before enabling public registration. Never promote a user from a client-side action.
6. In Supabase Authentication → URL Configuration, allow your application origin and the `/auth/update-password` redirect path. The app sends signup codes and invitation/reset links through its configured SMTP; Supabase's built-in confirmation email is not used by these flows.
7. `npm install && npm run dev`. Visit `http://localhost:3000`.
   Development uses `.next-dev` while production builds use `.next`, preventing dev/build artifact collisions when both are run on the same checkout.
8. New users register at `/register`, receive a six-digit email code, and get an account only after verification. The welcome email includes the customer repair-stage guide PDF. Admins invite other users from `/admin` → **Users & roles**; invitees set their own password through the emailed link.
9. In Admin → **SMTP settings**, choose Gmail, Zoho Mail or Other / Custom. Enter the server host, port, TLS option, username, app password, sender and reply-to. Add internal and optional CC recipients as comma-separated addresses, save, then send a test email. OTPs, invitation links and password reset links are never copied to recipients.
10. Register operations accounts through **Users & roles**. Regional users need a region; technicians and partners need a verified service-centre association. The admin assigns the regional owner to a booking; automatic PIN-code routing is not implemented.
11. Test the booking and role workflow from `/book` through admin assignment, pickup, diagnosis, quotation approval, repair, quality check and delivery. Unauthenticated customers are asked to sign in or register after selecting repair services; the booking draft is restored when they return. PIN lookup uses India Post data; address search/current-location reverse lookup use Photon/OpenStreetMap and require network access and browser location permission. Customer milestone emails include the event timestamp and workflow PDF. Download the role workflow PDF from Admin → SMTP settings or `/api/role-workflow`.
12. Re-run `supabase/schema.sql` when upgrading an existing database to add product image URL and booking address/location columns.
13. To deploy, configure the Supabase environment values in Vercel and allow the production origin and `/auth/update-password` redirect in Supabase Auth URL Configuration.

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
- Device handover OTPs are not physically generated or validated; the technician workflow records a manually verified reference. Device imagery and chain-of-custody signature are also still needed.
- PCI/payment-provider checkout, server webhook signature verification, refunds, invoices, partner settlement processing. **SQL tables are placeholders; real payment processing is NOT integrated.**
- WhatsApp/SMS sending, live maps, automatic dispatch, courier tracking, and customer notification workers.
- Real serviceability and availability by PIN; bookings currently accept any valid Indian PIN. Activate only launched locations before public use.
- Partner onboarding UI, document verification, partner KYC and regional geography enforcement. Role promotion is manual SQL currently.
- Atomic state changes + event insertion in one SQL transaction, robust idempotency/rate limiting, explicit event correlation, and a verified signed handover protocol. Current update uses optimistic status matching but event insert is separate.
- Full customer-friendly conditions, refund and warranty enforcement, privacy/data retention, insurance and legal review.
- Stronger role scoping: regional users are assigned manually to `bookings.regional_id`. For regional assignment by geographical entity, add a dedicated `regional_profile_regions(region_id, profile_id)` join table. The current regional partner filter should not be relied on for production without this adjustment.
- Admin partner/KYC management, tax calculation, quotation line UI, document and invoicing engine, and searchable operational filters.
- Validation/testing of real-world workflows with stakeholders, fraud prevention, observability, accessibility checks and load testing.

## Security implementation notes
All sensitive CRUD runs in server-side Next.js API endpoints that authenticate the caller using `auth.getUser(access_token)`, query their role server-side, and filter orders by ownership / assigned technician / partner / regional coordinator. Supabase RLS is enabled with no permissive browser table policies; the server uses a service-role key stored without `NEXT_PUBLIC_`. Keep the key secret and restrict CI and deployment secret access. Public direct writes do not work by design.

## Reference
The original user experience references https://hellore.in/ ; Fyxnora has its own code and identity.
