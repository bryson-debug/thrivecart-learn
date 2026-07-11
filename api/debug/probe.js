// TEMPORARY diagnostic endpoint — delete once ThriveCart's real API shape is
// confirmed. Breakthrough: thatmusicteacher.thrivecart.com/api/v1/courses
// returned {"error":"You must provide a verb to use this endpoint."} instead
// of "No Endpoint" -- this is a real, recognized endpoint using an
// endpoint+verb RPC pattern, distinct from the /api/external REST-ish API on
// the main thrivecart.com domain. Finding the right verb.
//
// Visit: /api/debug/probe?token=tmt-debug-2026&email=you@example.com

const SUBDOMAIN = 'https://thatmusicteacher.thrivecart.com';
const VERBS = ['list', 'get', 'all', 'index', 'search', 'find', 'view'];

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

  const results = [];
  for (const verb of VERBS) {
    const url = `${SUBDOMAIN}/api/v1/courses`;
    try {
      const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ verb, email }) });
      const bodyText = (await resp.text()).slice(0, 800);
      results.push({ verb, status: resp.status, body: bodyText });
    } catch (err) {
      results.push({ verb, error: String(err) });
    }
  }

  // Also try "verb" as a query param instead of body, and as part of the path,
  // in case the body-param guess above is wrong about where "verb" belongs.
  for (const verb of ['list', 'get']) {
    const qUrl = `${SUBDOMAIN}/api/v1/courses?verb=${verb}`;
    try {
      const resp = await fetch(qUrl, { method: 'POST', headers, body: JSON.stringify({ email }) });
      const bodyText = (await resp.text()).slice(0, 800);
      results.push({ verb: `${verb} (query param)`, status: resp.status, body: bodyText });
    } catch (err) {
      results.push({ verb: `${verb} (query param)`, error: String(err) });
    }
    const pathUrl = `${SUBDOMAIN}/api/v1/courses/${verb}`;
    try {
      const resp = await fetch(pathUrl, { method: 'POST', headers, body: JSON.stringify({ email }) });
      const bodyText = (await resp.text()).slice(0, 800);
      results.push({ verb: `${verb} (path segment)`, status: resp.status, body: bodyText });
    } catch (err) {
      results.push({ verb: `${verb} (path segment)`, error: String(err) });
    }
  }

  res.status(200).json({ email, results });
};
