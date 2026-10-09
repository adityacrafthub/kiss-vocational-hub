# KISS project demo

The existing hosted URL works without buying a domain. Participants and customers choose their role, create an account with a valid-format email and a 12–128 character password, then enter the dashboard immediately. Gmail and university addresses are accepted. Existing accounts, programmes, orders and certificates are preserved. A registration that previously stopped before verification did not create an account: register again.

No Resend, SMS, email sender, domain verification, payment or courier account is needed. Email ownership is not verified. This is a project demonstration; do not treat the entered email as a verified identity. Never use email alone to recover an account.

Forgot password directs the user to an administrator. In **Admin → Settings**, confirm the request with the person, select their account, set a new password, and share it privately. This revokes their existing sessions and records an audit entry. Admin passwords stay managed by the site owner; admin authenticator MFA and recovery codes are unchanged.

## Hosted settings
Keep `DEMO_MODE=true`, `PAYMENTS_ENABLED=false`, `COURIER_MOCK_ENABLED=false`. Keep existing server secrets `ADMIN_ACCOUNTS_JSON` and `OTP_SECRET` (admin MFA encryption). Do not change OTP_SECRET after enrolling an authenticator without an MFA recovery plan. No email/SMS keys or domain allowlists are read by authentication.

Resend settings screens, delivery adapters, and verification actions have been removed. A previously saved encrypted email-settings object is inert and is no longer read; the owner may revoke the old API key in Resend. Historical database verification columns/tables remain for non-destructive migration compatibility, but grant no access and receive no new challenges.

## Regression checks
`npm run build`, `node node_modules/typescript/bin/tsc --noEmit`, then run `node tests/demo-project.mjs`, `node tests/security-orders.mjs`, `node tests/admin-accounts.mjs`, `node tests/launch-security.mjs`, `node tests/academy.mjs`, `node tests/workflow.mjs`, `node tests/certificate-pdf.mjs`, and `node tests/crypto-vectors.mjs`.

The demo and account tests refuse all outbound provider calls. The launch-security test covers optional, disabled-by-default payment/courier adapters using test fixtures only. It is not a live integration test.

Loading changes: login no longer requests email-provider settings; auth no longer reads encrypted email settings from object storage; the admin overview does not request integration status; admin startup uses one authenticated data request, with independent database reads in parallel.

## Production and guest shopping update

- Admin → Production → Assign work: choose a product, a certified maker from its programme who opted to work, and a quantity. The participant opens Production to accept/reject and then press Order complete. Completion adds warehouse stock exactly once and makes it available in Buy products. Existing manually managed batches still work.
- Buy products is open without login. Checkout asks for name, contact and address; no payment is collected. An HttpOnly guest cookie scopes order history and receipt confirmation to this browser. Clearing cookies or changing devices loses guest order access; administrators retain the records.
- After shipment, customers can confirm receipt. Admin Distribution then shows Received by customer. Dashboards refresh active data every 15 seconds.
- Video uploads use an explicit Upload video button. New supported MP4 uploads move metadata to the front without re-encoding. Existing files retain their original encoding; private browser caching and fewer database queries reduce repeated loading. This is not transcoding, and cannot guarantee identical playback times on every connection.

## Account checkout and sidebar update (current)

The shop now requires an authenticated customer/participant account before checkout, order history, cancellation or receipt confirmation. The earlier guest-checkout workflow is superseded; historical guest orders remain in admin records. Public browsing and cart building remain open. Customer sign-in/sign-up opens in the shop without leaving the cart. General login now offers only participant/admin roles; the homepage Products button opens the shop.

Name, phone and address are stored by account in customerProfiles within the versioned workspace, atomically with successful checkout. My account lets the owner edit them. Checkout selects saved details automatically; submitted order snapshots retain their original details. No email delivery or payment configuration is required.

Participant and shop dashboards use responsive sidebars with mobile navigation. Production shows request counts, filters, quantity cards and progress steps; the existing assignment rules remain unchanged.
