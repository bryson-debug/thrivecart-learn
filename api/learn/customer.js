const { checkSidepanelSecret } = require('../../lib/sidepanel-auth');
const { getCustomerPurchaseHistory } = require('../../lib/thrivecart-client');
const cache = require('../../lib/cache');

const CACHE_TTL_MS = 60_000;

module.exports = async (req, res) => {
  if (!checkSidepanelSecret(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const email = (req.query.email || '').toString().trim().toLowerCase();
  if (!email) {
    res.status(400).json({ error: 'email is required' });
    return;
  }

  const cacheKey = `customer:${email}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    res.status(200).json(cached);
    return;
  }

  try {
    const data = await getCustomerPurchaseHistory(email);
    const payload = { found: Boolean(data), data };
    cache.set(cacheKey, payload, CACHE_TTL_MS);
    res.status(200).json(payload);
  } catch (err) {
    res.status(502).json({ error: 'ThriveCart lookup failed', detail: err.message });
  }
};
