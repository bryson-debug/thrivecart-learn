const crypto = require('crypto');
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
  // TEMPORARY: report the real shape of a GET request instead of assuming
  // it's just a reachability ping -- need to see if customer/ticket data
  // arrives as query params on GET rather than a signed POST body.
  if (req.method === 'GET') {
    res.status(200).json({ ok: true, query: req.query, headers: req.headers });
    return;
  }

  const rawBody = await readRawBody(req);
  const signature = req.headers['x-helpscout-signature'];
  const secret = process.env.HELPSCOUT_APP_SECRET;

  if (!verifySignature(rawBody, signature, secret)) {
    // TEMPORARY debug info -- remove once signature verification works.
    // Does not expose the secret itself, just enough to diagnose a mismatch.
    const expected = secret ? crypto.createHmac('sha1', secret).update(rawBody, 'utf8').digest('base64') : null;
    res.status(401).json({
      error: 'invalid signature',
      debug: {
        secretConfigured: Boolean(secret),
        secretLength: secret ? secret.length : 0,
        receivedSignatureHeader: signature || null,
        expectedSignature: expected,
        rawBodyLength: rawBody.length,
        rawBodyPreview: rawBody.slice(0, 300),
        method: req.method,
        contentType: req.headers['content-type'] || null,
      },
    });
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
