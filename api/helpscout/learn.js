const { verifySignature } = require('../../lib/helpscout-verify');

// HelpScout's Legacy Dynamic App content endpoint. Disable the platform's
// automatic body parsing so we can verify the HMAC signature against the
// exact raw bytes HelpScout signed, not a re-serialized copy.
module.exports.config = { api: { bodyParser: false } };

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

module.exports = async (req, res) => {
  const rawBody = await readRawBody(req);
  const signature = req.headers['x-helpscout-signature'];
  const secret = process.env.HELPSCOUT_APP_SECRET;

  if (!verifySignature(rawBody, signature, secret)) {
    res.status(401).json({ error: 'invalid signature' });
    return;
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ error: 'invalid request body' });
    return;
  }

  const email = payload.customer && payload.customer.email;

  // TODO: replace with real ThriveCart Learn lookup once lib/thrivecart-client.js
  // has a confirmed customer/access endpoint (see that file's TODOs).
  const html = email
    ? `<strong>Learn</strong><br/>Access lookup for ${escapeHtml(email)} — integration in progress.`
    : `<strong>Learn</strong><br/>No customer email found on this conversation.`;

  res.status(200).json({ html });
};
