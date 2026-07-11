// TEMPORARY diagnostic endpoint — delete once ThriveCart's real API shape is
// confirmed. "verb" guesses like list/get/all/search all failed identically
// in body, query, and path position -- next hypothesis: "verb" means an
// HTTP-method-style value (GET/POST/PUT/DELETE), mimicking REST semantics
// within a single POST transport (common when a UI proxies method-restricted
// calls). Testing that, plus a few structural variants in case the body
// shape itself (not just the verb value) is wrong.
//
// Visit: /api/debug/probe?token=tmt-debug-2026&email=you@example.com

const SUBDOMAIN = 'https://thatmusicteacher.thrivecart.com';
const URL_ = `${SUBDOMAIN}/api/v1/courses`;

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
  const headers = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json', 'Content-Type': 'application/json' };

  const attempts = [
    { label: 'verb: GET', body: { verb: 'GET', email } },
    { label: 'verb: POST', body: { verb: 'POST', email } },
    { label: 'verb: get (lowercase)', body: { verb: 'get', email } },
    { label: 'method: GET', body: { method: 'GET', email } },
    { label: 'action: GET', body: { action: 'GET', email } },
    // maybe "verb" needs to be a top-level query param AND uppercase
    { label: 'query ?verb=GET', body: { email }, query: '?verb=GET' },
  ];

  const results = [];
  for (const a of attempts) {
    try {
      const resp = await fetch(`${URL_}${a.query || ''}`, { method: 'POST', headers, body: JSON.stringify(a.body) });
      const bodyText = (await resp.text()).slice(0, 800);
      results.push({ label: a.label, status: resp.status, body: bodyText });
    } catch (err) {
      results.push({ label: a.label, error: String(err) });
    }
  }

  res.status(200).json({ email, results });
};
