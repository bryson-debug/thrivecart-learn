// TEMPORARY diagnostic endpoint — delete once ThriveCart's real API shape is
// confirmed. Prior rounds confirmed /api/external/{products,customer,students}
// on thrivecart.com, but customer lookups only return purchases/subscriptions
// -- no distinct "Learn access/enrollment" field, and manually-granted access
// is invisible there entirely. This round tests two more hypotheses:
// 1. A separate /api/learn/* namespace (Learn might not live under /external).
// 2. The account's own Learn subdomain (thatmusicteacher.thrivecart.com)
//    exposing its own API, distinct from the main thrivecart.com/api/external.
//
// Visit: /api/debug/probe?token=tmt-debug-2026&email=you@example.com

const CANDIDATES = (email) => [
  { label: 'learn/customer (GET, main domain)', method: 'GET', base: 'https://thrivecart.com', path: `/api/learn/customer?email=${encodeURIComponent(email)}` },
  { label: 'learn/customer (POST, main domain)', method: 'POST', base: 'https://thrivecart.com', path: '/api/learn/customer', body: { email } },
  { label: 'learn/students (POST, main domain)', method: 'POST', base: 'https://thrivecart.com', path: '/api/learn/students', body: { email } },
  { label: 'learn/enrollments (POST, main domain)', method: 'POST', base: 'https://thrivecart.com', path: '/api/learn/enrollments', body: { email } },
  { label: 'account subdomain: api/external/customer (POST)', method: 'POST', base: 'https://thatmusicteacher.thrivecart.com', path: '/api/external/customer', body: { email } },
  { label: 'account subdomain: api/students (GET)', method: 'GET', base: 'https://thatmusicteacher.thrivecart.com', path: `/api/students?email=${encodeURIComponent(email)}` },
  { label: 'account subdomain: api/students (POST)', method: 'POST', base: 'https://thatmusicteacher.thrivecart.com', path: '/api/students', body: { email } },
  { label: 'account subdomain: api/v1/students (POST)', method: 'POST', base: 'https://thatmusicteacher.thrivecart.com', path: '/api/v1/students', body: { email } },
];

module.exports = async (req, res) => {
  if (req.query.token !== 'tmt-debug-2026') {
    res.status(404).json({ error: 'not found' });
    return;
  }

  const apiKey = process.env.THRIVECART_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'THRIVECART_API_KEY not set in this deployment environment' });
    return;
  }

  const email = req.query.email || 'bryson@thatmusicteacher.com';

  const results = [];
  for (const c of CANDIDATES(email)) {
    const url = `${c.base}${c.path}`;
    try {
      const resp = await fetch(url, {
        method: c.method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
          ...(c.body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(c.body ? { body: JSON.stringify(c.body) } : {}),
      });
      const bodyText = (await resp.text()).slice(0, 800);
      results.push({ label: c.label, url, status: resp.status, body: bodyText });
    } catch (err) {
      results.push({ label: c.label, url, error: String(err) });
    }
  }

  res.status(200).json({ email, results });
};
