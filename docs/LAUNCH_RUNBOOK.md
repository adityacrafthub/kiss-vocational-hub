# KISS launch configuration and acceptance checklist

## Inspection: what existed and what changed

Preserved: Resend email and Twilio SMS adapters; HMAC-protected six-digit codes; ten-minute expiry, five attempts, contact/IP rate limits; salted password hashes; one-use reset and session revocation; server-owned customer orders; stock reservation; idempotent order submission; training/certificates; manual parcel pins; readable database records.

Added: mandatory RFC 6238 admin TOTP with encrypted seeds, replay protection and hashed single-use recovery codes; rejection of old password-only admin sessions; exact domain enforcement during registration, verification, login and protected requests; optional customer-domain rules; signed courier API with a development-only mock; Stripe-hosted checkout with provider-side reconciliation and signed webhooks; encrypted database snapshots and an offline restore tool; additional actor-attributed business and authentication audit records; an admin launch-readiness view.

No external credentials, sender verifications, merchant accounts, courier bookings, automated scheduler or independent backup destination were supplied. External delivery has NOT passed a real end-to-end test. Test suites intercept provider HTTP only in isolated local runtimes; production has no OTP or payment success bypass.

## Where to configure

Add runtime values to **this KISS Site's server-side Environment variables / Secrets settings** (the Sites runtime environment), then publish a new version to activate them. `.env` is for local development only; `.env.example` documents names and is safe to commit. Never put secrets in `NEXT_PUBLIC_*`, frontend code, `.openai/hosting.json`, screenshots, Git commits or chat. If your interface does not expose a secure value-entry form, use the platform's supported secret configuration flow; do not paste secrets into conversation.

The existing `ADMIN_ACCOUNTS_JSON` and `OTP_SECRET` are already configured on the hosted Site. `OTP_SECRET` also encrypts MFA seeds with a purpose-derived AES-GCM key. Back it up securely; do not rotate it casually. Rotation requires a planned MFA seed re-encryption/re-enrollment and revocation of pending codes/sessions. `ADMIN_SETUP_HASH` is legacy and unused; public admin setup remains disabled.

| Feature | Exact environment names | Configuration needed |
|---|---|---|
| Email verification/recovery | `OTP_SECRET` (secret, already set), `RESEND_API_KEY` (secret), `VERIFY_EMAIL_FROM` | Create Resend account; verify a domain with required DNS; authorize a sender such as `KISS <accounts@your-domain>`; configure a sending key. A populated sender is only a configuration check, not proof of domain verification. |
| SMS verification/recovery (optional) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` (secret), `TWILIO_FROM_NUMBER` | Twilio account and an authorized SMS-capable sender in E.164 form; complete provider requirements for destination countries. Phone sign-in is unavailable if SMS is not configured. Email-only operation is supported. |
| Institutional participants | `PARTICIPANT_EMAIL_DOMAINS` | Comma-separated actual approved domains, optionally prefixed with `@`. Example syntax only: `example.edu,institution.org`. Blank means no institutional restriction; contact ownership is still required. |
| Institutional customers, if desired | `CUSTOMER_EMAIL_DOMAINS` | Same syntax. Usually blank for a public shop. This rule also applies to participants shopping with their account, so they cannot bypass customer policy by switching roles. |
| Hosted online payments | `STRIPE_SECRET_KEY` (secret), `STRIPE_WEBHOOK_SECRET` (secret), `APP_URL`, `PAYMENTS_ENABLED=true` | Eligible verified Stripe merchant account capable of INR payments; production uses a live secret key. `APP_URL=https://kiss-vocational-hub.ubitmr.chatgpt.site`. Leave `PAYMENTS_ENABLED=false` until acceptance is complete. No card data is stored by this app. |
| Courier adapter | `COURIER_PROVIDER`, `COURIER_WEBHOOK_SECRET` (secret, random 32+ characters) | A real courier/GPS provider and a trusted server-side adapter that validates that provider's native webhook, maps assigned shipments to the contract below, then signs requests. No outbound courier credential is required by this generic inbound interface; native credentials belong in the adapter's secret manager. Exact native credentials cannot be specified until a provider is selected. |
| Database backup | `BACKUP_JOB_SECRET` (secret, random 32+ characters), `BACKUP_ENCRYPTION_KEY` (secret, 32 random bytes as 64 hex characters) | Trusted scheduler, separate durable encrypted-file destination, alerting and retention. Store encryption key separately from backups and retain previous keys during rotation. |
| Runtime safety | `APP_ENV=production`, `COURIER_MOCK_ENABLED=false` | Default safe state. Local test environments may set `APP_ENV=development`; courier mock additionally requires `COURIER_MOCK_ENABLED=true` and a localhost/127.0.0.1/test request hostname. Never enable development settings on the production site. |

Generate app-owned random secrets in your secret manager or a trusted local terminal, e.g. `openssl rand -hex 32`. Do not reuse provider API keys as backup/courier secrets.

### Ownership versus institutional affiliation

A code proves access to an email inbox or phone. A configured exact email-domain match proves the address belongs to an approved domain; it does not prove current enrollment/employment. Phone-only registration cannot satisfy an institutional-email rule. Subdomains and lookalike suffixes do not match automatically. Policy changes also affect existing sessions. Confirm the real approved domains before enabling them to avoid locking out legitimate participants.

### Administrator MFA

On the next admin login: enter the existing password, add the displayed manual setup key to an authenticator app using TOTP/SHA-1, six digits, 30-second interval, then enter a code. Save the eight recovery codes in a password manager/offline secure location; each is shown once and usable once. No admin session is issued before MFA. Existing admin sessions without MFA must sign in again. Enrollment and authentication challenges expire in five minutes and permit five attempts; consumed time steps cannot be replayed.

There is no public endpoint to disable MFA. If both device and recovery codes are lost, the verified Site owner must perform an operator-reviewed recovery through authorized database administration: revoke all that admin's sessions and challenges, remove that admin's MFA/recovery entries, rotate their password through the private admin provisioning secret, then supervise re-enrollment and record the recovery. Do not use a support request or possession of an email alone to disable MFA. Previously shared administrator passwords should be rotated before real launch; passwords are never committed in source.

### Stripe webhook and payment operations

Configure this endpoint in the Stripe dashboard:
`https://kiss-vocational-hub.ubitmr.chatgpt.site/api/payments/webhook`

Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, and `checkout.session.async_payment_failed`. Copy the endpoint signing secret into `STRIPE_WEBHOOK_SECRET`. The handler verifies the raw-body `Stripe-Signature` HMAC and five-minute timestamp tolerance, fetches the canonical Checkout Session with the server secret, and verifies linked order, mode, live/test mode, currency and amount. It marks paid only when the fetched session says `payment_status=paid`. Browser returns to `/orders` cannot change payment status. Duplicate paid notifications are harmless. Failed asynchronous payments remain unpaid; operators must reconcile unresolved states in the provider dashboard.

Checkout creation uses a stable server-generated idempotency key and an order-level payment lock. Customers cannot cancel or admins manually record payment while a checkout is unresolved. Retry uses the same session. After 23 hours an ambiguous creation failure needs operator reconciliation to avoid Stripe's idempotency-key expiry producing another checkout. Do not clear a lock until the provider confirms no charge and the session is expired. Expired sessions permit cancellation or pay-on-delivery; a new online attempt for that order is deliberately not created. Configure webhook retry/failure alerts. Refund/dispute processing and customer refund policy are not automated; reconcile those in Stripe before commercial use.

Use isolated local/staging data and test keys for payment tests, with `APP_ENV=development`. Production rejects test keys. No real payment was performed during this implementation. Merchant availability, activation, currency support, tax/invoice requirements and payment methods must be confirmed in your provider account.

### Courier interface and GPS semantics

In Admin → Distribution → Update parcel location → Connect a courier shipment, associate the **actual** shipment ID with the exact configured provider name. This does not book a courier. Manual location entry remains available and is kept separately from provider reports. Customer maps display the newest reported point with its source/time and optional provider ETA; older movement reports are retained (last 100). Reports older than the last accepted point are ignored; future/stale coordinates are rejected. Live means reported telemetry, not continuous streaming or guaranteed current location. Polling is every 30 seconds.

Endpoint:
`POST https://kiss-vocational-hub.ubitmr.chatgpt.site/api/courier/webhook`

JSON contract (illustrative values, never seeded into production):
```json
{"eventId":"provider-event-id","shipmentId":"assigned-shipment-id","latitude":20.36,"longitude":85.81,"observedAt":"2026-09-28T12:00:00Z","eta":"2026-09-28T13:00:00Z"}
```
`eta` is optional. Send `X-KISS-Timestamp` as current Unix seconds and `X-KISS-Signature` as lowercase hex HMAC-SHA256 of `timestamp + "." + exact_raw_JSON_body`, using `COURIER_WEBHOOK_SECRET`. Five-minute signature tolerance; location age limit 24 hours; no event may advance a closed order. Adapter must validate native provider signatures, reject unassigned shipments, avoid leaking customer details, and retry failed requests. The app does not accept provider URLs from users and makes no arbitrary outbound courier requests.

For development only, an MFA-authenticated admin may POST the same shape to `/api/courier/mock` with same-origin header and the explicit local flags above. Every accepted mock point is labelled **DEVELOPMENT MOCK**. The hosted production origin cannot use that endpoint even with the mock flag accidentally set. There is no fake production movement, route or ETA.

## Automated backup strategy (implemented tooling; scheduling pending)

1. Configure the two backup secrets on the Site. Configure a trusted scheduler to run `node scripts/backup-job.mjs` daily at 02:00 Asia/Kolkata (20:30 UTC previous date); hourly is appropriate if a 24-hour data-loss window is unacceptable.
2. Scheduler environment: `KISS_SITE_URL=https://kiss-vocational-hub.ubitmr.chatgpt.site`, `BACKUP_JOB_SECRET`, `BACKUP_OUTPUT_DIR=/durable/offsite/kiss`. The scheduler needs no encryption key. The output path must be durable and separate from the Site, not an ephemeral runner directory. If using CI, upload the encrypted output to your private backup store before the runner exits.
3. The job calls `/api/maintenance/backup` with a bearer secret. The app reads all application tables in one D1 batch, includes schema/index definitions, encrypts with AES-256-GCM, writes a copy under R2 `backups/`, and returns only encrypted bytes. Authentication credentials/MFA seeds in the snapshot remain encrypted in transit/storage; the backup key is separate from OTP encryption. The route has a two-per-hour limit and records an audit event. Maximum logical snapshot size is 20 MiB; move to provider-level exports when growth approaches this bound. Schema deployments should not run during snapshots.
4. Set retention on both backup stores: 30 daily and 12 monthly recovery points, with monitored failure alerts and an independently protected copy. Do not apply a bucket-wide deletion policy to learning videos. This app does not silently delete old backups.
5. Monthly, run `scripts/restore-backup.mjs encrypted.enc staging.sql` with `BACKUP_ENCRYPTION_KEY` injected securely. Import ONLY into an empty isolated staging database, then verify account/order counts, uniqueness indexes, stock totals, certificates and MFA decryption. Restored sessions and pending reset/verification/MFA challenges are revoked. Protect and destroy decrypted SQL after the drill. The script never writes to production.
6. Back up R2 lesson media independently, preserving keys and metadata. The logical database backup includes media metadata but not video bytes. Keep deployment source/migrations and environment-secret versions separately. Site-managed D1 may offer provider recovery, but access/retention has not been verified; do not assume a Time Travel promise substitutes for your tested recovery plan.

A full encrypted logical snapshot was restored into isolated SQLite during tests. A hosted snapshot, offsite scheduler, production restore, media restore and failure alert have NOT yet been exercised. Target RPO/RTO must be agreed and verified by a drill; no recovery guarantee is claimed.

## Required acceptance tests before launch

- Real Resend email arrives at an allowed address; registration succeeds only after code verification; invalid/expired code fails. Test a wrong sender/key without exposing provider errors or credentials to the browser.
- Real Twilio SMS arrives if phone login is enabled. Test trial-account/destination restrictions before advertising SMS.
- Real password recovery succeeds, old password and all prior sessions stop working, reused/expired code fails. Admin recovery never removes MFA; it also revokes pending password-authenticated MFA challenges.
- Both admins enroll authenticators and store recovery codes. Test recovery in a controlled account. Rotate previously shared passwords.
- Configure actual institutional domains and check allowed, unapproved, suffix-lookalike and phone-bypass cases.
- Complete provider sandbox payment, signed webhook, duplicates, wrong amount/signature, delayed/expired payment and refund handling; then perform a small authorized live payment and refund with a live eligible merchant account. Do not enable publicly until this passes.
- Connect a real assigned courier shipment; validate native-to-adapter authentication, changing locations, stale report behavior, ETA absence and manual updates.
- Activate backup schedule, offsite storage, media backup, alerts and a restore drill. Inspect admin audit records.
- Establish privacy/retention, delivery area, cancellation/return/refund, invoicing and certificate policies. Load testing, formal penetration testing and a full accounting/refunds lifecycle remain outside what these regression tests establish.

## Regression commands

Build first: `node /root/.codex/plugins/cache/openai-curated-remote/sites/0.1.75/scripts/build-site.mjs` in this managed environment; elsewhere use the project's build script.

- `pnpm exec tsc --noEmit`
- `node tests/worker-api.mjs`
- `node tests/admin-accounts.mjs`
- `node tests/launch-security.mjs`
- `node --experimental-strip-types tests/crypto-vectors.mjs`
- `node --experimental-strip-types tests/workflow.mjs`
- `node --experimental-strip-types tests/academy.mjs`
- `node --experimental-strip-types tests/certificate-pdf.mjs`

Provider HTTP is mocked only by isolated test runtime fixtures. No test keys are production credentials.

Primary implementation references: [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238), [Stripe Checkout](https://docs.stripe.com/api/checkout/sessions), [Stripe idempotency](https://docs.stripe.com/api/idempotent_requests), [Stripe webhooks](https://docs.stripe.com/webhooks), [Resend send API](https://resend.com/docs/api-reference/emails/send-email), [Twilio Messaging API](https://www.twilio.com/docs/messaging/api), [Cloudflare D1 recovery](https://developers.cloudflare.com/d1/reference/time-travel/).
