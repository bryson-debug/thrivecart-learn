// Lightweight gate for the side panel's own API calls. These are plain fetch
// calls from the iframe's JS (same-origin, so no CORS is needed), not signed
// HelpScout callbacks -- this shared secret just stops a stray/guessed URL
// hit from working. It's baked into the client bundle at build time, so it's
// a basic deterrent, not real secrecy; fine for a small internal team tool.
function checkSidepanelSecret(req) {
  const expected = process.env.SIDEPANEL_SHARED_SECRET;
  return Boolean(expected) && req.headers['x-sidepanel-secret'] === expected;
}

module.exports = { checkSidepanelSecret };
