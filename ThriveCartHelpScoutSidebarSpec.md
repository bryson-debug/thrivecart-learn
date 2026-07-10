# HelpScout ↔ ThriveCart Learn Sidebar Integration
### Technical Specification for Build
**Owner:** Bryson, That Music Teacher (TMT)
**Prepared for:** Claude Code build
**Status:** Ready for development
**Priority/Timeline:** ASAP — general support tooling, not tied to a specific event launch

---

## 1. Purpose

Support staff (currently Bri Culliton and Noemi Raya) need visibility into a customer's ThriveCart Learn access directly inside a HelpScout conversation, without switching tools. This covers **one ThriveCart product**, shown as a single sidebar section:

- **Learn** — which products the customer currently has access to in ThriveCart Learn, direct link to their ThriveCart Learn profile, and the ability to grant/revoke access.

This solves three overlapping support scenarios:
- **Access disputes** — customer says they paid for/registered for something but can't access it in Learn.
- **Context for replies** — understanding a customer's access history before responding.
- **Access correction** — granting or revoking Learn access directly when a support issue requires it (e.g. a manual fix, a goodwill grant, or removing access tied to a refund handled elsewhere in ThriveCart).

**Important distinction from the Flodesk integration:** Learn is **read + write** (view access, plus grant/revoke directly from the sidebar) — not read-only.

---

## 2. Architecture Overview

```
HelpScout Conversation
      │
      │  loads iframe (signed request, HMAC-SHA1)
      ▼
HelpScout Dynamic App (Sidebar)
      │
      │  HTTPS request
      ▼
Vercel Serverless Function  ← [this is what gets built]
      │
      │  ThriveCart Learn API calls (read + write access)
      ▼
ThriveCart Learn API
      │
      │  audit log append (on writes)
      ▼
Google Sheet — existing "Flodesk Segment Changes" sheet, new tab
```

**Components to build:**
- 1 HelpScout Dynamic App registration (via HelpScout Developer portal) — can potentially reuse the same app shell as the Flodesk integration if HelpScout allows multiple sections in one Dynamic App; confirm at build time.
- 1 Vercel project (or new route within the existing Flodesk Vercel project) with a serverless API route for Learn.
- Google Sheet audit logging — same spreadsheet used for Flodesk, new tab (e.g. "ThriveCart Learn Access Changes").
- ThriveCart API credentials (read + write scope for Learn).

---

## 3. HelpScout Integration Details

### 3.1 Dynamic App Type
HelpScout Dynamic App (Sidebar) — content generated per-customer at load time, same pattern as the Flodesk integration.

### 3.2 Request Verification
Same as Flodesk integration:
- Header: `X-HelpScout-Signature`
- Algorithm: HMAC-SHA1, using the app's secret key (issued at registration)
- Reject/401 any request that fails verification

### 3.3 Trigger/Scope
- **Mailbox scope:** All HelpScout mailboxes (no restriction) — *assumed to match Flodesk pattern; confirm.*
- **Trigger data:** HelpScout passes the customer object on the active conversation.
- **Email used for matching:** **Primary email only** (not secondary/alternate emails) — confirmed to match Flodesk pattern.

### 3.4 Response Schema — Learn Section
The endpoint must return JSON matching HelpScout's Dynamic App content block schema, rendering a single section:

**Learn** (read + write)
- `text` block — heading ("Learn")
- List of currently accessible products (badges/pills or plain list — confirm best-fit block type during build)
- Add/remove controls for granting/revoking access (typeahead for add, "x" to stage removal — same pattern as Flodesk segment pills)
- Inline two-tap stage → confirm pattern (same as Flodesk)
- Automation warning note shown whenever a *grant* action is staged (same reasoning as Flodesk's automation caveat — see 4.2)
- `button`/link block — "View in ThriveCart Learn" → opens customer's Learn profile in new tab

*Open question to resolve at build time: same as the Flodesk spec — confirm whether HelpScout's Dynamic App schema supports natively interactive elements (buttons that POST back) for the Learn add/remove/confirm flow, or whether this needs a custom mini web app inside the iframe.*

---

## 4. ThriveCart Integration Details

### 4.1 API Access
- ThriveCart API credentials — read + write scope for Learn.
- Endpoints needed:
  - Look up customer by email (Learn)
  - List customer's currently accessible Learn products
  - List all Learn products in the account (for the add-access typeahead)
  - Grant customer access to a Learn product
  - Revoke customer access to a Learn product

*Open question to resolve at build time: confirm current ThriveCart API capabilities against their live documentation — specifically whether granting/revoking Learn access is supported as a direct API write.*

### 4.2 Automations Caveat (Important)
Confirmed: granting Learn access can trigger automated customer emails (e.g. "welcome to course" access emails). Same handling as the Flodesk automation caveat:
- The system may not be able to show a targeted/specific warning per product.
- Instead: **show a generic caution note every time an agent grants access**, regardless of which product. Example: *"Granting this access may trigger an automated email to the customer."*
- Confirm at build time whether *revoking* access also triggers any automated email (e.g. an "access removed" notice) — if so, apply the same warning pattern to revokes too.

---

## 5. UI / UX Specification

### 5.1 Layout (top to bottom)

**Learn section:**
1. Heading: "Learn"
2. List of currently accessible products
3. Add-access control — typeahead/search to stage granting a new product
4. Remove control — "x" on each product to stage revocation
5. Confirmation step — inline two-tap pattern (stage → confirm), same as Flodesk
6. Automation warning — caution note appears near confirm step whenever a *grant* is staged
7. "View in ThriveCart Learn" button → opens Learn profile in new tab

### 5.2 States to Design For

| State | Display |
|---|---|
| **Loading** | Lightweight loading indicator while data fetches |
| **No customer record found** | Plain message: "No ThriveCart record found" — no additional actions offered |
| **Customer found, zero product access** | Empty state note, e.g. "No active Learn access" — still show the add-access control |
| **API error/timeout** | Distinct message from "no record found" (e.g. "ThriveCart lookup failed") + a Retry button |
| **Stale data warning** | If access data may have changed since the sidebar loaded, show a warning before allowing a commit — re-fetch/compare before finalizing the write |

### 5.3 Interaction Safety
- **Rate limiting:** Max 1 write action (grant/revoke) per 3 seconds.
- **Stale-write protection:** Before committing any grant/revoke, the backend re-checks the customer's current access state against what was loaded; if changed, surface a warning rather than blindly overwriting.

---

## 6. Permissions

- **Who can view:** Anyone with HelpScout access.
- **Who can edit (grant/revoke Learn access):** All current HelpScout users (Bri Culliton, Noemi Raya) — no role restriction, same as Flodesk.
- Revisit role-based restrictions if the team grows.

---

## 7. Audit Logging

Every Learn access grant/revoke must be logged for accountability.

- **Destination:** Existing "Flodesk Segment Changes" Google Sheet, new tab (e.g. "ThriveCart Learn Access Changes")
- **Columns:** Timestamp, Agent name/email, Customer email, Product name, Action (grant/revoke), HelpScout conversation ID
- **Trigger:** Vercel function appends a row immediately after a successful write to ThriveCart Learn
- No log shown inline in the HelpScout sidebar — background record only.

---

## 8. Caching & Performance

*Assumed to match the Flodesk integration's pattern — confirm or adjust:*

- **Cache type:** Short-term in-memory cache on the Vercel function
- **TTL:** 60 seconds
- **Key:** Customer's primary email address
- **Cache invalidation:** Immediately bypass/refresh the cache for a given email right after any Learn write (grant/revoke), so the sidebar reflects the change instantly
- **Product list for typeahead:** Consider a separate, longer-lived cache for the full list of Learn products (used in the add-access search), since this changes far less often than individual customer data

*Open question: confirm current ThriveCart API rate limits to validate the 60-second cache window is sufficient headroom.*

---

## 9. Filtering & Sorting

- **Filtering:** None — all currently accessible products shown.
- **Sort order:** *Confirm preference: alphabetical (matches Flodesk pattern) vs. order granted.*

---

## 10. Testing Plan

1. Build against a test scenario using **Bryson's own personal email** as the "customer" — safe to test grant/revoke without affecting a real customer record.
2. Confirm:
   - Sidebar loads correctly and matches on primary email
   - Current access list displays correctly
   - Grant flow: typeahead search → stage → confirm → ThriveCart updates → audit log row appears in new tab
   - Revoke flow: same, in reverse
   - No-match state displays correctly (test with an email known not to be in ThriveCart)
   - Error state displays correctly (simulate a ThriveCart API failure/timeout)
   - Rate limit correctly blocks rapid repeated actions
   - Stale-data warning triggers correctly (test by changing the same customer's access from two different sessions)
   - "View in ThriveCart Learn" link lands on the correct profile page
3. Once confirmed stable, roll out to Bri and Noemi for live use across all mailboxes.

---

## 11. Credentials & Setup (To Be Completed Together During Build)

- [ ] **ThriveCart API credentials** — read + write scope for Learn
- [ ] **HelpScout Dynamic App registration** (or extension of the existing Flodesk app, if HelpScout supports multi-section apps) — yields app secret key + content endpoint URL
- [ ] **Vercel project** — new deployment or new route within the existing Flodesk project; environment variables for ThriveCart API credentials and HelpScout app secret (never hardcoded)
- [ ] **Google Sheet** — new tab added to the existing Flodesk audit log sheet

---

## 12. Open Technical Questions to Resolve at Build Time

1. Is granting/revoking Learn access supported as a direct API write?
2. Does revoking Learn access (not just granting) trigger any automated customer email?
3. Does HelpScout's Dynamic App schema support natively interactive elements for the Learn grant/revoke/confirm flow, or does it need a custom mini web app inside the iframe (same open question as the Flodesk build)?
4. Confirm current ThriveCart API rate limits to validate the 60-second cache window.
5. Confirm sort order preference for the Learn product list (alphabetical vs. order granted).

---

## Summary Table (Quick Reference)

| Category | Decision |
|---|---|
| Location | HelpScout Dynamic Sidebar App, all mailboxes |
| Section | Learn (read + write) |
| Data shown | Currently accessible products |
| Actions | Grant/revoke access, inline two-tap stage → confirm |
| Profile link | "View in ThriveCart Learn" button |
| Email matching | Primary email only |
| No record found | Plain message, no extra actions |
| API error/timeout | Distinct message + Retry button |
| Automation warning | Generic note on every access grant |
| Stale-data protection | Warn before commit if access changed since load |
| Rate limiting | Max 1 change per 3 seconds |
| Permissions | All HelpScout users can view and edit access |
| Audit trail | Existing Flodesk Google Sheet, new tab |
| Filtering | None |
| Backend | Vercel serverless function (new or extended from Flodesk project) |
| Caching | 60s in-memory, keyed by email, bypassed after writes |
| Testing | Bryson's own email as test customer |
| Timeline | ASAP, general support tool |
