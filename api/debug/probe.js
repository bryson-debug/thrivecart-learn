// TEMPORARY diagnostic endpoint — delete once ThriveCart's real API shape is
// confirmed. Only issues GET/HEAD requests (no writes) against a list of
// candidate paths so we can see which ones are real without guessing blind
// from this sandbox, which has no network access to thrivecart.com.
//
// Visit: /api/debug/probe?token=tmt-debug-2026&email=you@example.com

const CANDIDATES = (email) => [
  { label: 'products (external)', method: 'GET', path: '/api/external/products' },
  { label: 'courses (external)', method: 'GET', path: '/api/external/courses' },
  { label: 'customer (external, query email)', method: 'GET', path: `/api/external/customer?email=${encodeURIComponent(email)}` },
  { label: 'customers (external, query email)', method: 'GET', path: `/api/external/customers?email=${encodeURIComponent(email)}` },
  { label: 'students (external, query email)', method: 'GET', path: `/api/external/students?email=${encodeURIComponent(email)}` },
  { label: 'students (external) - method check only', method: 'HEAD', path: '/api/external/students' },
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
        headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' },
      });
      const bodyText = c.method === 'HEAD' ? '' : (await resp.text()).slice(0, 1500);
      results.push({ label: c.label, url, status: resp.status, body: bodyText });
    } catch (err) {
      results.push({ label: c.label, url, error: String(err) });
    }
  }

  res.status(200).json({ email, results });
};
