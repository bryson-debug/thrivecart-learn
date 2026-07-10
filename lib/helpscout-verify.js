const crypto = require('crypto');

// HelpScout signs Dynamic App requests with HMAC-SHA1 of the raw request body,
// base64-encoded, sent in the X-HelpScout-Signature header. Same scheme as the
// Flodesk integration (spec 3.2).
function verifySignature(rawBody, signatureHeader, secretKey) {
  if (!signatureHeader || !secretKey) return false;

  const expected = crypto
    .createHmac('sha1', secretKey)
    .update(rawBody, 'utf8')
    .digest('base64');

  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signatureHeader);

  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

module.exports = { verifySignature };
