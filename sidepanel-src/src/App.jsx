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

const STATUS_LABELS = { 2: 'Active', 1: 'Paused', 0: 'Disabled' };
const STATUS_COLORS = {
  2: { bg: '#e6f4ea', fg: '#1e7e34' },
  1: { bg: '#fff3cd', fg: '#8a6d00' },
  0: { bg: '#f1f1f1', fg: '#666' },
};

function CoursePill({ course }) {
  const colors = STATUS_COLORS[course.status] || STATUS_COLORS[0];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: colors.bg,
        color: colors.fg,
        borderRadius: 12,
        padding: '3px 10px',
        marginRight: 6,
        marginBottom: 6,
        fontSize: 12,
      }}
    >
      {course.courseName}
      <strong>· {STATUS_LABELS[course.status] || 'Unknown'}</strong>
    </span>
  );
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
  const [error, setError] = useState(null);
  const [courseId, setCourseId] = useState('');
  const [productName, setProductName] = useState('');
  const [staged, setStaged] = useState(false);
  const [granting, setGranting] = useState(false);
  // Manual search fallback: starts as the conversation's own customer email,
  // but the agent can override it (e.g. to grant access to a different
  // customer than the one on this conversation).
  const [activeEmail, setActiveEmail] = useState(customerEmail);
  const [manualEmailInput, setManualEmailInput] = useState('');
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState(null);
  const [library, setLibrary] = useState(null);

  useEffect(() => {
    if (guessedAgentEmail) setAgentEmail(guessedAgentEmail);
  }, [guessedAgentEmail]);

  useEffect(() => {
    if (customerEmail) setActiveEmail(customerEmail);
  }, [customerEmail]);

  function loadLibrary() {
    if (!activeEmail) return;
    setLibraryLoading(true);
    setLibraryError(null);
    apiFetch(`/api/learn/library?email=${encodeURIComponent(activeEmail)}`)
      .then((r) => {
        if (!r.ok) throw new Error(`lookup failed (${r.status})`);
        return r.json();
      })
      .then((data) => setLibrary(data))
      .catch((err) => setLibraryError(err.message))
      .finally(() => setLibraryLoading(false));
  }

  useEffect(() => {
    loadLibrary();
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
      loadLibrary();
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
          <h3>Course library</h3>
          {libraryLoading && <p>Loading…</p>}
          {libraryError && (
            <p style={{ color: '#b00020' }}>
              ThriveCart lookup failed: {libraryError} <button onClick={loadLibrary}>Retry</button>
            </p>
          )}
          {!libraryLoading && !libraryError && library && !library.found && (
            <p>No ThriveCart Learn record found for this email.</p>
          )}
          {!libraryLoading && !libraryError && library?.found && (
            <div style={{ marginBottom: 8 }}>
              {library.library.courses.length === 0 ? (
                <p>No courses in this student's library.</p>
              ) : (
                library.library.courses.map((c) => <CoursePill key={c.courseId} course={c} />)
              )}
            </div>
          )}

          <h3>Grant Learn access</h3>
          <p style={{ color: '#666' }}>
            ThriveCart's API only supports granting access, not viewing current access or revoking it.
            Manage existing access directly in ThriveCart's own dashboard (link below).
          </p>
          {error && <p style={{ color: '#b00020' }}>{error}</p>}
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
