// ThriveCart Learn API client.
//
// CONFIRMED against public docs (developers.thrivecart.com):
// - Auth: `Authorization: Bearer <THRIVECART_API_KEY>`
// - Rate limit: 60 requests/min per account
// - Grant course access: POST /api/external/students {email, course_id}
//
// NOT YET CONFIRMED (pending live probe against the real account via
// /api/debug/probe — see that file's comment):
// - Exact path/shape for "look up customer by email, list Learn products
//   they have access to" (candidates tried: /api/external/customer,
//   /api/external/customers, /api/external/students, all with ?email=)
// - Whether a revoke/unenroll endpoint exists at all. No public doc
//   mentions one. revokeAccess() below throws until this is confirmed --
//   do not guess a destructive endpoint and call it blind.
// - Path for listing all Learn products/courses in the account (for the
//   add-access typeahead). Candidates: /api/external/products, /api/external/courses.

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

// TODO: confirm exact path/response shape once /api/debug/probe results are in.
async function getCustomerLearnAccess(_email) {
  throw new Error('getCustomerLearnAccess: endpoint not yet confirmed against live ThriveCart API');
}

// TODO: confirm exact path/response shape once /api/debug/probe results are in.
async function listAllLearnProducts() {
  throw new Error('listAllLearnProducts: endpoint not yet confirmed against live ThriveCart API');
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
