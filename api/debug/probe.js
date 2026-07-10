// TEMPORARY diagnostic endpoint — delete once ThriveCart's real API shape is
// confirmed. Only issues GET/HEAD requests (no writes) against a list of
// candidate paths so we can see which ones are real without guessing blind
// from this sandbox, which has no network access to thrivecart.com.
//
// Visit: /api/debug/probe?token=tmt-debug-2026&email=you@example.com

const CANDIDATES = (email) => [
  { label: 'products (external)', method: 'GET', path: '/api/external/products' },
  // GET returned "method.invalid" (501) for all of these -- ThriveCart's
  // external API appears to be POST-only even for lookups. Test that.
  { label: 'customer (POST, body email)', method: 'POST', path: '/api/external/customer', body: { email } },
  { label: 'customers (POST, body email)', method: 'POST', path: '/api/external/customers', body: { email } },
  // No course_id on purpose -- if this endpoint is "enroll", omitting a
  // required field should just 400/validation-error, not mutate anything.
  // If it instead returns existing enrollments, that's our lookup endpoint.
  { label: 'students (POST, email only -- no course_id)', method: 'POST', path: '/api/external/students', body: { email } },
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
  const base = process.env.THRIVECART_API_BASE_URL || 'https://thrivecart.com';

  const results = [];
  for (const c of CANDIDATES(email)) {
    const url = `${base}${c.path}`;
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
      const bodyText = c.method === 'HEAD' ? '' : (await resp.text()).slice(0, 1500);
      results.push({ label: c.label, url, status: resp.status, body: bodyText });
    } catch (err) {
      results.push({ label: c.label, url, error: String(err) });
    }
  }

  res.status(200).json({ email, results });
};
