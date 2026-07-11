// ThriveCart Learn API client.
//
// CONFIRMED live against the real account (extensive manual probing --
// see git history of api/debug/probe.js for the full trail):
// - Auth: `Authorization: Bearer <THRIVECART_API_KEY>`
// - The external API (thrivecart.com/api/external/*) is POST-only, including
//   lookups (GET returns 501 {"error":"method.invalid"}).
// - List storefront products: GET /api/external/products -> 200, array of
//   {product_id, name, label, status, statusString, type, typeString, url, embed_type}
// - Look up a customer: POST /api/external/customer {email} -> 200,
//   {customer: {...}, purchases: [...], subscriptions: [...], lifetime_value}
//   This is PURCHASE/TRANSACTION history (with refund status) -- there is no
//   separate "Learn access/enrollment" field anywhere in this response.
//   /api/external/customers (plural) does not exist (501).
// - Grant Learn course access: POST /api/external/students {email, course_id}
//   -> 200, {student: {id, status, ...}, signin_url, auto_signin_url}.
//   course_id is a distinct Learn-course identifier, NOT the storefront
//   product_id (confirmed: passing a product_id 400s as "course ID you
//   provided does not exist"). There is no API to list course IDs -- copy
//   them from the ThriveCart dashboard URL (.../learn/edit/<id>).
//
// CONFIRMED NOT POSSIBLE via this API (exhaustively tested, not just docs):
// - Viewing current Learn access/enrollment status. A manually-granted
//   enrollment does not appear anywhere in the customer lookup response --
//   granted access is invisible to this API entirely.
// - Revoking access. Every reasonable path (/students/revoke, /remove,
//   /cancel, /unenroll, DELETE variants) and every reasonable "undo" shape
//   (PUT/PATCH with status:0, re-POST with status:0) either 501'd as a
//   nonexistent route or silently no-op'd. There is also a distinct,
//   undocumented `/api/v1/*` RPC-style API on the account's own Learn
//   subdomain (thatmusicteacher.thrivecart.com) with a recognized `courses`
//   endpoint, but its calling convention ("you must provide a verb") could
//   not be reverse-engineered blind. Revoking Learn access must be done
//   manually in ThriveCart's dashboard.

const BASE_URL = process.env.THRIVECART_API_BASE_URL || 'https://thrivecart.com';

function authHeaders() {
  const apiKey = process.env.THRIVECART_API_KEY;
  if (!apiKey) throw new Error('THRIVECART_API_KEY is not configured');
  return { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' };
}

async function request(path, options = {}) {
  const resp = await fetch(`${BASE_URL}${path}`, { ...options, headers: { ...authHeaders(), ...(options.headers || {}) } });
  const text = await resp.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!resp.ok) {
    const err = new Error(`ThriveCart API ${path} failed: ${resp.status}`);
    err.status = resp.status;
    err.body = body;
    throw err;
  }
  return body;
}

// Returns the customer's purchase/transaction history -- this is the closest
// thing to an "access" signal ThriveCart's API exposes, but it is purchase
// history (with refund status), not a live enrollment/access flag. Returns
// null if the email has no ThriveCart customer record.
async function getCustomerPurchaseHistory(email) {
  try {
    return await request('/api/external/customer', { method: 'POST', body: JSON.stringify({ email }) });
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

async function grantAccess({ email, courseId }) {
  return request('/api/external/students', {
    method: 'POST',
    body: JSON.stringify({ email, course_id: courseId }),
  });
}

module.exports = { getCustomerPurchaseHistory, grantAccess };
