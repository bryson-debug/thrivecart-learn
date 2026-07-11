// TEMPORARY diagnostic endpoint — delete once we've confirmed whether the
// external /api/external/customer response exposes an internal Learn
// student_id (needed to call the internal course-access lookup by email
// instead of by numeric ID).
//
// Visit: /api/debug/probe?token=tmt-debug-2026&email=you@example.com

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

  try {
    const resp = await fetch('https://thrivecart.com/api/external/customer', {
      method: 'POST',
      headers,
      body: JSON.stringify({ email }),
    });
    const bodyText = await resp.text();
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = bodyText;
    }
    res.status(200).json({ email, status: resp.status, body });
  } catch (err) {
    res.status(200).json({ email, error: String(err) });
  }
};
