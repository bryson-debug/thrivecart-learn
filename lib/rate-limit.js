// Per spec 5.3: max 1 Learn write (grant/revoke) per 3 seconds, scoped to the
// agent+customer pair so one support agent's rapid double-click on one customer
// is blocked without throttling other agents or other customers.

const WINDOW_MS = 3000;
const lastWriteAt = new Map();

function keyFor(agentEmail, customerEmail) {
  return `${agentEmail}::${customerEmail}`;
}

function checkAndRecord(agentEmail, customerEmail) {
  const key = keyFor(agentEmail, customerEmail);
  const now = Date.now();
  const last = lastWriteAt.get(key);
  if (last && now - last < WINDOW_MS) {
    return { allowed: false, retryAfterMs: WINDOW_MS - (now - last) };
  }
  lastWriteAt.set(key, now);
  return { allowed: true };
}

module.exports = { checkAndRecord, WINDOW_MS };
