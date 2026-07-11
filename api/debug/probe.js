// TEMPORARY diagnostic endpoint — delete once ThriveCart's real API shape is
// confirmed. All "verb" field/query guesses failed identically while POSTing.
// Last hypothesis before giving up on blind guessing: this subdomain API
// (distinct from thrivecart.com/api/external) might actually expect real
// HTTP verbs (GET/PUT/DELETE), unlike the POST-only /external API.
//
// Visit: /api/debug/probe?token=tmt-debug-2026&email=you@example.com

const URL_ = 'https://thatmusicteacher.thrivecart.com/api/v1/courses';

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
    { label: 'real GET, no body', method: 'GET' },
    { label: 'real GET, ?email=', method: 'GET', query: `?email=${encodeURIComponent(email)}` },
    { label: 'real PUT', method: 'PUT', body: { email } },
    { label: 'real DELETE', method: 'DELETE' },
    { label: 'real PATCH', method: 'PATCH', body: { email } },
  ];

  const results = [];
  for (const a of attempts) {
    try {
      const resp = await fetch(`${URL_}${a.query || ''}`, {
        method: a.method,
        headers,
        ...(a.body ? { body: JSON.stringify(a.body) } : {}),
      });
      const bodyText = (await resp.text()).slice(0, 800);
      results.push({ label: a.label, status: resp.status, body: bodyText });
    } catch (err) {
      results.push({ label: a.label, error: String(err) });
    }
  }

  res.status(200).json({ email, results });
};
