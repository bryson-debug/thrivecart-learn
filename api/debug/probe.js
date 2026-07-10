// TEMPORARY diagnostic endpoint — delete once ThriveCart's real API shape is
// confirmed. Confirmed so far (via live probing against the real account):
// - GET /api/external/products -> 200, list of products {product_id, name, ...}
// - POST /api/external/customer {email} -> 200, {customer, purchases: [...]}
// - POST /api/external/students {email, course_id} -> enroll (course_id required)
// - /api/external/customers (plural) does not exist (501 method.invalid)
//
// Open question this round: does the customer lookup response include a
// distinct "Learn course access / enrollment" field separate from purchase
// history (important because access manually granted via /students wouldn't
// show up as a purchase)? Scan the full response for it instead of guessing
// from a truncated snippet.
//
// Visit: /api/debug/probe?token=tmt-debug-2026&email=you@example.com

function findRelevantKeys(obj, pattern, path = '', out = [], depth = 0) {
  if (depth > 6 || out.length >= 25 || obj === null || typeof obj !== 'object') return out;
  for (const [key, value] of Object.entries(obj)) {
    const nextPath = path ? `${path}.${key}` : key;
    if (pattern.test(key)) {
      out.push({ path: nextPath, value: JSON.stringify(value).slice(0, 300) });
    }
    if (value && typeof value === 'object') {
      findRelevantKeys(Array.isArray(value) ? value[0] || {} : value, pattern, nextPath, out, depth + 1);
    }
  }
  return out;
}

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

  const resp = await fetch(`${base}/api/external/customer`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const rawText = await resp.text();

  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    res.status(200).json({ email, status: resp.status, note: 'response was not JSON', body: rawText.slice(0, 2000) });
    return;
  }

  const topLevelKeys = Object.keys(parsed);
  const firstPurchaseKeys = Array.isArray(parsed.purchases) && parsed.purchases[0] ? Object.keys(parsed.purchases[0]) : null;
  const relevant = findRelevantKeys(parsed, /course|enroll|access|learn|product/i);

  res.status(200).json({
    email,
    status: resp.status,
    topLevelKeys,
    firstPurchaseKeys,
    purchaseCount: Array.isArray(parsed.purchases) ? parsed.purchases.length : null,
    relevantKeyMatches: relevant,
    fullBodyTruncated: rawText.slice(0, 4000),
  });
};
