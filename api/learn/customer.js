const { checkSidepanelSecret } = require('../../lib/sidepanel-auth');
const { getCustomerPurchaseHistory } = require('../../lib/thrivecart-client');

// Per spec: always fetch live from ThriveCart, no caching layer for this app.
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

  try {
    const data = await getCustomerPurchaseHistory(email);
    res.status(200).json({ found: Boolean(data), data });
  } catch (err) {
    res.status(502).json({ error: 'ThriveCart lookup failed', detail: err.message });
  }
};
