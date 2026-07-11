const { checkSidepanelSecret } = require('../../lib/sidepanel-auth');
const { grantAccess } = require('../../lib/thrivecart-client');
const { appendAuditRow } = require('../../lib/sheets-audit');
const { checkAndRecord } = require('../../lib/rate-limit');
const cache = require('../../lib/cache');

module.exports.config = { api: { bodyParser: true } };

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  if (!checkSidepanelSecret(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const { email, courseId, agentEmail, conversationId, productName } = req.body || {};
  if (!email || !courseId || !agentEmail) {
    res.status(400).json({ error: 'email, courseId, and agentEmail are required' });
    return;
  }

  const rate = checkAndRecord(agentEmail, email);
  if (!rate.allowed) {
    res.status(429).json({ error: 'rate limited', retryAfterMs: rate.retryAfterMs });
    return;
  }

  try {
    const result = await grantAccess({ email, courseId });
    cache.invalidate(`customer:${email.toLowerCase()}`);

    try {
      await appendAuditRow({
        agentEmail,
        customerEmail: email,
        productName: productName || `course:${courseId}`,
        action: 'grant',
        conversationId: conversationId || '',
      });
    } catch (auditErr) {
      // Audit logging failure shouldn't fail the grant response -- the grant
      // already succeeded in ThriveCart. Surface it in the response so it's
      // visible, but don't treat the request as failed.
      res.status(200).json({ ok: true, result, auditWarning: auditErr.message });
      return;
    }

    res.status(200).json({ ok: true, result });
  } catch (err) {
    res.status(502).json({ error: 'ThriveCart grant failed', detail: err.body || err.message });
  }
};
