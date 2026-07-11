// TEMPORARY, ONE-TIME diagnostic endpoint. Delete after use.
//
// Grants a real product to a real email via ThriveCart's API (triggers
// ThriveCart's automated "welcome" email per spec 4.3), then tries candidate
// reversal endpoints to discover whether any kind of revoke/unenroll/cancel
// path exists. Gated by token+confirm since (unlike probe.js) this mutates
// real account data.
//
// First call (grants + tries path-style revoke candidates):
//   ?token=tmt-debug-2026-grant&confirm=yes&email=...&courseId=224249
// Follow-up call against the resulting real enrollment, without granting
// again (tries status-toggle-style revoke candidates instead):
//   ?token=tmt-debug-2026-grant&confirm=yes&email=...&courseId=224249&studentId=5559816

function pathRevokeCandidates(email, courseId, studentId) {
  return [
    { label: 'DELETE /api/external/students (body email+course_id)', method: 'DELETE', path: '/api/external/students', body: { email, course_id: courseId } },
    { label: 'POST /api/external/students/revoke', method: 'POST', path: '/api/external/students/revoke', body: { email, course_id: courseId } },
    { label: 'POST /api/external/students/remove', method: 'POST', path: '/api/external/students/remove', body: { email, course_id: courseId } },
    { label: 'POST /api/external/students/cancel', method: 'POST', path: '/api/external/students/cancel', body: { email, course_id: courseId } },
    { label: 'POST /api/external/students/unenroll', method: 'POST', path: '/api/external/students/unenroll', body: { email, course_id: courseId } },
    ...(studentId ? [{ label: `DELETE /api/external/students/${studentId}`, method: 'DELETE', path: `/api/external/students/${studentId}` }] : []),
  ];
}

function statusToggleCandidates(email, courseId, studentId) {
  return [
    ...(studentId ? [
      { label: `PUT /api/external/students/${studentId} {status:0}`, method: 'PUT', path: `/api/external/students/${studentId}`, body: { status: 0 } },
      { label: `PATCH /api/external/students/${studentId} {status:0}`, method: 'PATCH', path: `/api/external/students/${studentId}`, body: { status: 0 } },
      { label: `POST /api/external/students/${studentId} {status:0}`, method: 'POST', path: `/api/external/students/${studentId}`, body: { status: 0 } },
    ] : []),
    { label: 'POST /api/external/students (re-post, status:0)', method: 'POST', path: '/api/external/students', body: { email, course_id: courseId, status: 0 } },
    { label: 'PUT /api/external/students (email+course_id, status:0)', method: 'PUT', path: '/api/external/students', body: { email, course_id: courseId, status: 0 } },
  ];
}

async function runCandidates(base, headers, candidates) {
  const results = [];
  for (const c of candidates) {
    try {
      const resp = await fetch(`${base}${c.path}`, {
        method: c.method,
        headers,
        ...(c.body ? { body: JSON.stringify(c.body) } : {}),
      });
      const bodyText = (await resp.text()).slice(0, 500);
      results.push({ label: c.label, status: resp.status, body: bodyText });
    } catch (err) {
      results.push({ label: c.label, error: String(err) });
    }
  }
  return results;
}

module.exports = async (req, res) => {
  if (req.query.token !== 'tmt-debug-2026-grant' || req.query.confirm !== 'yes') {
    res.status(404).json({ error: 'not found' });
    return;
  }

  const apiKey = process.env.THRIVECART_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'THRIVECART_API_KEY not set in this deployment environment' });
    return;
  }

  const base = process.env.THRIVECART_API_BASE_URL || 'https://thrivecart.com';
  const headers = { Authorization: `Bearer ${apiKey}`, Accept: 'application/json', 'Content-Type': 'application/json' };

  const email = req.query.email;
  const courseId = req.query.courseId;
  const existingStudentId = req.query.studentId;

  if (!email || !courseId) {
    res.status(400).json({ error: 'email and courseId query params are required' });
    return;
  }

  if (existingStudentId) {
    // Follow-up mode: don't grant again, just try status-toggle-style revoke
    // candidates against the enrollment that already exists.
    const revokeAttempts = await runCandidates(base, headers, statusToggleCandidates(email, courseId, existingStudentId));
    res.status(200).json({ mode: 'status-toggle-attempt', studentId: existingStudentId, revokeAttempts });
    return;
  }

  const grantResp = await fetch(`${base}/api/external/students`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, course_id: courseId }),
  });
  const grantBodyText = await grantResp.text();
  let grantBody;
  try { grantBody = JSON.parse(grantBodyText); } catch { grantBody = grantBodyText; }

  const studentId = grantBody && grantBody.student && grantBody.student.id;

  const revokeAttempts = await runCandidates(base, headers, pathRevokeCandidates(email, courseId, studentId));

  res.status(200).json({
    mode: 'grant-then-path-attempt',
    grant: { status: grantResp.status, body: grantBody },
    studentId,
    revokeAttempts,
  });
};
