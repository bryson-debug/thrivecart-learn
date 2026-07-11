import React, { useEffect, useState } from 'react';
import { useHelpScoutContext } from '@helpscout/ui-kit';
import HelpScout, { NOTIFICATION_TYPES } from '@helpscout/javascript-sdk';

const SIDEPANEL_SECRET = import.meta.env.VITE_SIDEPANEL_SECRET || '';

function apiFetch(path, options = {}) {
  return fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-sidepanel-secret': SIDEPANEL_SECRET,
      ...(options.headers || {}),
    },
  });
}

function formatAmount(cents, currency) {
  if (typeof cents !== 'number') return '';
  return `${(cents / 100).toFixed(2)} ${currency || ''}`.trim();
}

export default function App() {
  const context = useHelpScoutContext() || {};
  // NOTE: field names below are our best read of HelpScout's context shape;
  // the "Your email" input below is a deliberate fallback in case the SDK's
  // agent-identity field differs from what we guessed here.
  const customerEmail = context.user?.email || context.customer?.email || '';
  const conversationId = context.conversation?.id || context.ticket?.id || '';
  const guessedAgentEmail = context.agent?.email || context.currentUser?.email || '';

  const [agentEmail, setAgentEmail] = useState(guessedAgentEmail);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [courseId, setCourseId] = useState('');
  const [productName, setProductName] = useState('');
  const [staged, setStaged] = useState(false);
  const [granting, setGranting] = useState(false);
  // Manual search fallback: starts as the conversation's own customer email,
  // but the agent can override it (e.g. if the conversation email doesn't
  // match a ThriveCart record, or to look up a different customer).
  const [activeEmail, setActiveEmail] = useState(customerEmail);
  const [manualEmailInput, setManualEmailInput] = useState('');

  useEffect(() => {
    if (guessedAgentEmail) setAgentEmail(guessedAgentEmail);
  }, [guessedAgentEmail]);

  useEffect(() => {
    if (customerEmail) setActiveEmail(customerEmail);
  }, [customerEmail]);

  function loadCustomer() {
    if (!activeEmail) return;
    setLoading(true);
    setError(null);
    apiFetch(`/api/learn/customer?email=${encodeURIComponent(activeEmail)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`lookup failed (${r.status})`);
        return r.json();
      })
      .then((data) => setCustomerData(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadCustomer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeEmail]);

  function handleManualSearch(e) {
    e.preventDefault();
    if (manualEmailInput.trim()) setActiveEmail(manualEmailInput.trim());
  }

  async function handleConfirmGrant() {
    setGranting(true);
    setError(null);
    try {
      const resp = await apiFetch('/api/learn/grant', {
        method: 'POST',
        body: JSON.stringify({ email: activeEmail, courseId, agentEmail, conversationId, productName }),
      });
      const body = await resp.json();
      if (!resp.ok) throw new Error(body.error || `grant failed (${resp.status})`);
      HelpScout.showNotification(NOTIFICATION_TYPES.SUCCESS, `Granted access to ${activeEmail}`);
      setStaged(false);
      setCourseId('');
      setProductName('');
      loadCustomer();
    } catch (err) {
      setError(err.message);
    } finally {
      setGranting(false);
    }
  }

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 13, padding: 12 }}>
      <p>
        <strong>Your email</strong> (for the audit log){' '}
        <input
          type="email"
          value={agentEmail}
          onChange={(e) => setAgentEmail(e.target.value)}
          placeholder="you@thatmusicteacher.com"
          style={{ width: '100%', marginTop: 4 }}
        />
      </p>

      <form onSubmit={handleManualSearch} style={{ marginBottom: 12 }}>
        <label>
          Look up a different email
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <input
              type="email"
              value={manualEmailInput}
              onChange={(e) => setManualEmailInput(e.target.value)}
              placeholder={activeEmail || 'customer@example.com'}
              style={{ flex: 1 }}
            />
            <button type="submit">Search</button>
          </div>
        </label>
      </form>

      {!activeEmail && <p>No customer email found on this conversation. Use the search box above.</p>}

      {activeEmail && (
        <>
      <h3>Purchase history</h3>
      {loading && <p>Loading…</p>}
      {error && (
        <p style={{ color: '#b00020' }}>
          ThriveCart lookup failed: {error} <button onClick={loadCustomer}>Retry</button>
        </p>
      )}
      {!loading && !error && customerData && !customerData.found && <p>No ThriveCart record found.</p>}
      {!loading && !error && customerData?.found && (
        <>
          {(customerData.data.purchases || []).length === 0 ? (
            <p>No purchases on file.</p>
          ) : (
            <ul style={{ paddingLeft: 16 }}>
              {customerData.data.purchases.map((p) => (
                <li key={p.order_id}>
                  {p.date} — {p.item_name} — {formatAmount(p.amount, p.currency)} —{' '}
                  <strong>{p.status}</strong>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <h3>Grant Learn access</h3>
      <p style={{ color: '#666' }}>
        ThriveCart's API only supports granting access, not viewing current access or revoking it.
        Manage existing access directly in ThriveCart's own dashboard (link below).
      </p>
      <label>
        Course ID (from the ThriveCart Learn dashboard URL)
        <input
          type="text"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
          placeholder="e.g. 224249"
          style={{ width: '100%', marginTop: 4 }}
        />
      </label>
      <label style={{ display: 'block', marginTop: 8 }}>
        Product/course name (for the audit log, optional)
        <input
          type="text"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          style={{ width: '100%', marginTop: 4 }}
        />
      </label>

      {!staged ? (
        <button
          style={{ marginTop: 8 }}
          disabled={!courseId || !agentEmail}
          onClick={() => setStaged(true)}
        >
          Grant access…
        </button>
      ) : (
        <div style={{ marginTop: 8, border: '1px solid #e0a800', padding: 8, borderRadius: 4 }}>
          <p>
            <strong>Confirm:</strong> grant course <code>{courseId}</code> to {activeEmail}?
          </p>
          <p style={{ color: '#8a6d00' }}>
            Granting this access may trigger an automated email to the customer.
          </p>
          <button disabled={granting} onClick={handleConfirmGrant}>
            {granting ? 'Granting…' : 'Confirm grant'}
          </button>{' '}
          <button disabled={granting} onClick={() => setStaged(false)}>
            Cancel
          </button>
        </div>
      )}

      <p style={{ marginTop: 16 }}>
        <a href="https://thrivecart.com/thatmusicteacher/#/learn/students" target="_blank" rel="noreferrer">
          Manage access in ThriveCart Learn →
        </a>
      </p>
        </>
      )}
    </div>
  );
}
