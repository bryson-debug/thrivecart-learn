// ThriveCart Learn API client.
//
// CONFIRMED live against the real account (see api/debug/probe.js history):
// - Auth: `Authorization: Bearer <THRIVECART_API_KEY>`
// - The external API is POST-only, including lookups (GET returns 501
//   {"error":"method.invalid"}).
// - List all products: GET /api/external/products -> 200, array of
//   {product_id, name, label, status, statusString, type, typeString, url, embed_type}
// - Look up a customer: POST /api/external/customer {email} -> 200,
//   {customer: {...}, purchases: [{status, order_id, date, item_name, item_id, ...}]}
//   NOTE: /api/external/customers (plural) does not exist (501).
// - Grant course access: POST /api/external/students {email, course_id}
//   (course_id is required -- confirmed via 400 "You must provide a course
//   ID to register this student for." when omitted)
//
// STILL OPEN:
// - Whether "purchases" (which includes refunded/failed items) is the right
//   signal for "currently has Learn access," or whether there's a distinct
//   enrollment/access field for grants made directly via /students (which
//   wouldn't be a purchase). Pending a deeper probe of the full customer
//   response shape.
// - Whether a revoke/unenroll endpoint exists at all. No public doc or probe
//   result has surfaced one yet. revokeAccess() below throws until this is
//   confirmed -- do not guess a destructive endpoint and call it blind.

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

// Returns null if the email has no ThriveCart customer record.
// TODO: once we confirm whether "purchases" is the right access signal (see
// file header), filter/derive the actual Learn product list here instead of
// returning the raw customer payload.
async function getCustomerLearnAccess(email) {
  try {
    return await request('/api/external/customer', { method: 'POST', body: JSON.stringify({ email }) });
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

async function listAllLearnProducts() {
  return request('/api/external/products', { method: 'GET' });
}

async function grantAccess({ email, courseId }) {
  return request('/api/external/students', {
    method: 'POST',
    body: JSON.stringify({ email, course_id: courseId }),
  });
}

// No revoke/unenroll endpoint has been found in ThriveCart's public API docs.
// Do not call a guessed destructive endpoint -- confirm with ThriveCart support
// or their dashboard before implementing this.
async function revokeAccess(_args) {
  throw new Error('revokeAccess: no confirmed ThriveCart API endpoint for revoking Learn access');
}

module.exports = { getCustomerLearnAccess, listAllLearnProducts, grantAccess, revokeAccess };
