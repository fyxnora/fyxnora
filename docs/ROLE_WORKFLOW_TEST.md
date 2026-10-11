# Fyxnora role accounts and workflow test

Tested on 11 October 2026 against the configured Supabase project and the local application.

## Test accounts

| Portal | Name | Email | Password |
| --- | --- | --- | --- |
| Customer | Nora Bennett | `nora.bennett@fyxnora.test` | `Nora!Test2026#B7m` |
| Field technician | Oliver Hughes | `oliver.hughes@fyxnora.test` | `Oliver!Ops2026#K4q` |
| Service centre | Amelia Clarke | `amelia.clarke@fyxnora.test` | `Amelia!Hub2026#R8v` |
| Regional operations | George Whitmore | `george.whitmore@fyxnora.test` | `George!Region2026#P3x` |
| Super admin | Charlotte Evans | `charlotte.evans@fyxnora.test` | `Charlotte!Admin2026#T6n` |

These are testing credentials. Change or reset them before any production launch. Amelia and Oliver are linked to **Fyxnora Bengaluru Service Hub**. George is linked to the **Bengaluru, Karnataka** region.

## Completed automated workflow

Test booking: **FX-2026-001001**  
Customer: Nora Bennett  
Device: Apple iPhone 17 Air  
Service: Battery replacement  
Final quotation: **₹4,200**  
Final status: **CLOSED**  
Timeline events recorded: **17**

The following sequence completed successfully with authorization checked at every request:

1. Nora created the repair booking.
2. Charlotte assigned George as regional operator.
3. Charlotte assigned Amelia's verified Bengaluru service centre.
4. Amelia assigned Oliver as the linked field technician.
5. Oliver scheduled the visit and recorded pickup OTP/custody details.
6. Oliver marked the sealed device in transit.
7. Amelia received the device at the centre and completed diagnosis.
8. Amelia submitted an itemized ₹4,200 quotation.
9. Nora approved the quotation.
10. Amelia started and finished the repair, then passed quality control.
11. Oliver marked the device out for delivery and recorded delivery OTP/custody details.
12. Nora confirmed completion and closed the order.

Status path verified:

`BOOKED → ASSIGNED → VISIT_SCHEDULED → PICKUP_VERIFIED → IN_TRANSIT → RECEIVED_AT_CENTRE → DIAGNOSIS → QUOTE_SENT → CUSTOMER_APPROVED → REPAIRING → QUALITY_CHECK → READY_FOR_DELIVERY → OUT_FOR_DELIVERY → DELIVERED → CLOSED`

## Manual portal test

1. Open `/login` and sign in as Nora. Confirm the customer header, order cards, current status, amount and timeline are visible.
2. Sign out and log in as Charlotte. Confirm the public header is hidden and the super-admin console opens.
3. Open **Users & roles**. Filter every role category, edit a profile, and use **Reset password** only when you intend to invalidate that user's current password.
4. Open **Catalog & pricing**. Filter by category, edit a row and save it. Select multiple rows to apply a percentage adjustment, then save selected rows. Download the CSV sample before testing an import.
5. Open **Commission & fees**. Change a service-centre commission and save it. Payment gateway fees are not shown.
6. Open **Integrations**, configure SMTP and use **Test connection**. A real SMTP account is required for a successful connection test.
7. Sign in as George, Amelia and Oliver in turn to inspect their role-specific queues and profiles.

## Coverage and remaining external dependencies

The database and HTTP workflow, role permissions, assignments, quotation approval and complete status timeline were exercised successfully. Real SMS/mobile OTP, WhatsApp, online payment capture, live maps, invoice generation and actual SMTP delivery require provider credentials and cannot be certified with placeholder environment values.
