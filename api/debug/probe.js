// TEMPORARY diagnostic endpoint — delete once ThriveCart's real API shape is
// confirmed. New lead: https://thatmusicteacher.thrivecart.com/api/v1/students
// returned {"success":false,"error":"No Endpoint: students"} -- a real JSON
// API error (not an HTML 404), meaning a /api/v1/ API exists on the account's
// own Learn subdomain that we haven't mapped yet. Probing endpoint names.
//
// Visit: /api/debug/probe?token=tmt-debug-2026&email=you@example.com

const SUBDOMAIN = 'https://thatmusicteacher.thrivecart.com';
const ENDPOINT_NAMES = [
  'customer', 'customers', 'student', 'course', 'courses', 'enrollment',
  'enrollments', 'access', 'learn', 'lessons', 'lesson', 'progress', 'user', 'users',
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
  const headers = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json', 'Content-Type': 'application/json' };

  const results = [];
  for (const name of ENDPOINT_NAMES) {
    const url = `${SUBDOMAIN}/api/v1/${name}`;
    try {
      const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify({ email }) });
      const bodyText = (await resp.text()).slice(0, 500);
      results.push({ endpoint: name, status: resp.status, body: bodyText });
    } catch (err) {
      results.push({ endpoint: name, error: String(err) });
    }
  }

  res.status(200).json({ email, subdomain: SUBDOMAIN, results });
};
