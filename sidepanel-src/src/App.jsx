import React, { useEffect, useState } from 'react';
import { useHelpScoutContext } from '@helpscout/ui-kit';

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

const FLODESK_BUTTON_STYLE = {
  display: 'inline-block',
  background: '#314DDB',
  color: '#FFFFFF',
  fontSize: 13,
  fontWeight: 700,
  borderRadius: 6,
  padding: '6px 12px',
  border: 'none',
  cursor: 'pointer',
  textDecoration: 'none',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
};

export default function App() {
  const context = useHelpScoutContext() || {};
  // Per @helpscout/javascript-sdk's Context type: `customer` is the person
  // on the conversation -- their email lives in a `emails` array, not
  // `.email`.
  const customerEmail = context.customer?.emails?.[0]?.value || '';

  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryError, setLibraryError] = useState(null);
  const [library, setLibrary] = useState(null);

  function loadLibrary() {
    if (!customerEmail) return;
    setLibraryLoading(true);
    setLibraryError(null);
    apiFetch(`/api/learn/library?email=${encodeURIComponent(customerEmail)}`)
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
  }, [customerEmail]);

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', fontSize: 13, padding: 12 }}>
      {!customerEmail && <p>No customer email found on this conversation.</p>}

      {customerEmail && (
        <>
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

          <p style={{ marginTop: 16 }}>
            <a
              href="https://thrivecart.com/thatmusicteacher/#/learn/students"
              target="_blank"
              rel="noreferrer"
              style={FLODESK_BUTTON_STYLE}
            >
              View in ThriveCart
            </a>
          </p>
        </>
      )}
    </div>
  );
}
