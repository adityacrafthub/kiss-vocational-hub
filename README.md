# KISS Vocational Hub

Vocational learning and production application with a public programme catalogue, separate administrator and participant accounts, and the existing production, inventory, distribution and sales modules.

## User flows
- Public: browse programme descriptions, learning steps and FAQs; choose a login role.
- Admin: sign in using one of the privately configured administrator accounts. Create/edit programmes, add/reorder video parts, upload MP4/WebM/Ogg videos (25 MB maximum), preview lessons and publish courses. Inspect participants, work choices and sales customers. Browse/export all business data; password hashes, session tokens and rate-limit counters are excluded.
- Participant: verify an email or phone and choose a password; enrol in one programme. Complete video parts in order. The final Finish course action issues a certificate. The certificate screen offers a direct PDF download and a one-time confetti celebration. Choose to work in the trained field or leave after training; the choice can be updated.
- Production: new account-backed makers must be certified and have chosen to work. Legacy certified maker records remain usable.

## Preservation and storage
Existing workspace records are preserved. Unlinked old participants remain legacy records and cannot be silently claimed by new signups. New enrolments snapshot the course title and lessons so later edits do not change an in-progress course. Five requested catalogue programmes are added as drafts when missing; no invented training videos are published.

D1 stores accounts, hashed sessions, login attempt limits, video metadata and versioned business records. R2 stores video bytes, served only to admins or enrolled participants with range support. Business updates use compare-and-swap revisions for consistency. Authentication and role checks run server-side, including the older operations API.

## Authentication
Public website access stays enabled; protected data uses application-owned sessions, not ChatGPT login. Session cookies are HttpOnly, SameSite=Lax, Secure on HTTPS and expire after seven days. Passwords use salted PBKDF2-SHA256 with 100,000 iterations (Workers WebCrypto limit). Administrators are provisioned through the server-only ADMIN_ACCOUNTS_JSON configuration. Public administrator creation is disabled. Never put passwords, provider secrets or session tokens in source control. `.env.example` documents configuration keys.

Verification and recovery flows are implemented but live delivery requires provider configuration, as detailed below. Production institutional use also needs a data retention policy and institution-approved certificate rules. Completion is participant-attested, not a video-watch-time or assessment guarantee.

## Validation
- `node --experimental-strip-types tests/workflow.mjs`: operations and inventory invariants.
- `node --experimental-strip-types tests/academy.mjs`: learning and certification rules.
- `node tests/worker-api.mjs`: integration tests on the built Worker using isolated local D1/R2. Messaging delivery is simulated only in the isolated test runtime. No live data is touched.
- `node --experimental-strip-types tests/certificate-pdf.mjs`: PDF generation, using the Codex canvas runtime for tests only. The app itself has no canvas package dependency.
- `node node_modules/typescript/bin/tsc --noEmit`: types.

Run the existing pnpm scripts for development/build. Apply local SQL migrations before using the preview. Publish applies only new checked-in migrations to the hosted D1 database. Migration 0000 is unchanged; 0001 adds identity, session and media tables.

## Assigned administrators
`ADMIN_ACCOUNTS_JSON` is a server-only deployment secret containing an array of `{id,email,name,salt,password}` records. `password` is a PBKDF2-SHA256 hash (100,000 iterations, 256 bits), not plaintext. The app atomically provisions these accounts on the first authentication request, retaining existing account IDs and business data, revoking prior sessions for changed accounts, and recording the applied configuration revision. Both configured accounts can sign in through the Admin tab. Participant registration cannot grant admin access. Public initial setup is disabled.

## Customer shop and order management
- Production → Products & prices creates product types, assigns programmes, sets INR prices and adjusts available stock. Add real products and stock before selling; no fictitious saleable stock is seeded.
- Orders atomically reserve warehouse stock using the existing revision-checked workspace update. Prices and availability are revalidated at checkout; idempotency keys prevent duplicate orders on retries. Order item names and prices are snapshots.
- Inventory keeps deleted product records and stock-adjustment history. Distribution advances customer orders through Pending, Shipped, In transit, Delivered. Sales lists order histories and explicit payment-received actions alongside legacy outlet sales.
- Programme deletion hides the programme and its shop items but retains prior enrolments, certificates and business history. Product deletion hides it from new purchases and preserves existing orders.
- Checkout and eligible cancellation require an owning verified shopper session; all other commerce mutations require an admin session. Public catalogue responses exclude order/customer information.

## Verified accounts and location tracking (current behaviour)
- Customer registration and participant registration require an email or SMS code before an account is created. Existing unverified non-admin accounts must verify after password login. Previously issued unverified sessions are rejected. Admin provisioning remains private and password login remains available.
- Participant accounts can shop with the same account; separate customer accounts are also supported. Orders use server-derived account ownership. Old guest orders are deliberately not attached by matching an unverified phone number: an admin must establish ownership before a future migration.
- Password recovery returns a generic account-existence message, uses a one-time code, requires a new 12–128 character password, and revokes all sessions for that account. Challenges expire after 10 minutes and allow at most 5 attempts. HMAC-protected code hashes, per-contact send limits and IP limits are enforced. Password hashes and verification payloads never appear in responses or record inspection.
- `PARTICIPANT_EMAIL_DOMAINS` optionally restricts institutional domains. Code verification proves contact ownership, not student/employment affiliation. Until approved domains are supplied, ownership verification is used.
- Leaflet + attributed OpenStreetMap tiles provide selection and display; coordinate entry and geolocation are available. Dispatch origin is the exact user-supplied KP 25 J address and coordinates. Parcel points are explicit administrator reports with timestamps, not courier GPS. A courier integration is required for live telemetry, routing, ETA and tracking webhooks.
- Customers can cancel only their own unpaid Pending orders; reservations are released atomically. Shipped, paid, delivered or already cancelled orders cannot be cancelled through this flow.

## Review findings and follow-up priorities
Implemented: verified sign-up gate, code expiry/attempt limits, password-reset session revocation, account-scoped order history, server-side stock checks, stock-returning cancellation, hidden secret fields in record tables, and truthful timestamped tracking.
Not claimed as complete: live email/SMS delivery, courier GPS, payment gateway/webhook verification, institutional affiliation checks, production load testing or a formal penetration test. Delivery-contact phone numbers entered at checkout are customer-supplied; only the sign-in contact is ownership-verified.
Recommended before real commercial launch: activate and test verified senders; add a courier provider and verified payment webhooks; configure allowed participant domains if institutional-only access is required; establish delivery/service areas, return/refund policy and applicable invoices; migrate the JSON workspace to relational order/stock tables when volume grows; activate scheduled backups and alerting. Admin MFA is now mandatory, as described in the launch runbook.
Validation entry points: `node tests/worker-api.mjs`, `node tests/admin-accounts.mjs`, plus the existing workflow and academy model tests. The old `tests/api-e2e.mjs` describes the superseded guest checkout / unverified signup flow and is retained only as a historical reference.

## Launch hardening update
See [docs/LAUNCH_RUNBOOK.md](docs/LAUNCH_RUNBOOK.md) for the current implementation inventory, mandatory administrator MFA enrollment, all runtime variable names, provider/webhook setup, encrypted scheduled-backup tooling, restore instructions and the external acceptance tests still required. This runbook supersedes earlier comments about password-only admin authentication. Production integrations are not claimed operational without real provider testing.

## Current project-demo scope
## Current project demo

See [docs/DEMO_SETUP.md](docs/DEMO_SETUP.md) for the current setup. Registration now uses email and password directly, without Resend, SMS, institutional restrictions or ownership verification. Password recovery is handled by an administrator in Settings. The Customer dashboard includes products, cart and orders; real payments, maps and delivery are disabled in demo mode. Existing admin MFA remains enabled. Earlier production runbooks describe optional integrations, not prerequisites for this demo.
