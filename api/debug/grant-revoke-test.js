// TEMPORARY, ONE-TIME diagnostic endpoint. Delete after use.
//
// Actually grants a real product to a real email via ThriveCart's API (this
// WILL trigger ThriveCart's automated "welcome" email per spec 4.3), then
// tries several candidate reversal endpoints to discover whether any kind of
// revoke/unenroll/cancel path exists. Only reachable with an explicit
// confirm=yes param on top of the token, since unlike probe.js this mutates
// real account data.
//
// Visit: /api/debug/grant-revoke-test?token=tmt-debug-2026-grant&confirm=yes&email=you@example.com&courseId=70

const REVOKE_CANDIDATES = (email, courseId, studentId) => [
  { label: 'DELETE /api/external/students (body email+course_id)', method: 'DELETE', path: '/api/external/students', body: { email, course_id: courseId } },
  { label: 'POST /api/external/students/revoke', method: 'POST', path: '/api/external/students/revoke', body: { email, course_id: courseId } },
  { label: 'POST /api/external/students/remove', method: 'POST', path: '/api/external/students/remove', body: { email, course_id: courseId } },
  { label: 'POST /api/external/students/cancel', method: 'POST', path: '/api/external/students/cancel', body: { email, course_id: courseId } },
  { label: 'POST /api/external/students/unenroll', method: 'POST', path: '/api/external/students/unenroll', body: { email, course_id: courseId } },
  ...(studentId ? [{ label: `DELETE /api/external/students/${studentId}`, method: 'DELETE', path: `/api/external/students/${studentId}` }] : []),
];

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

  // "course_id" for /students is a distinct Learn-course identifier, not the
  // storefront product_id from /api/external/products (confirmed: granting
  // with a product_id 400'd as "course ID you provided does not exist").
  // List real course IDs first -- safe, no mutation -- before attempting a
  // real grant.
  const coursesResp = await fetch(`${base}/api/external/courses`, { method: 'POST', headers, body: JSON.stringify({}) });
  const coursesBodyText = await coursesResp.text();
  let coursesBody;
  try { coursesBody = JSON.parse(coursesBodyText); } catch { coursesBody = coursesBodyText; }

  const email = req.query.email;
  const courseId = req.query.courseId;

  if (!email || !courseId) {
    // No courseId supplied yet -- just report the course list so a real one
    // can be picked, without granting anything.
    res.status(200).json({ courses: coursesBody, note: 'Pass &courseId=<real id from courses list> to proceed with the grant test.' });
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

  const studentId = grantBody && (grantBody.student_id || grantBody.id);

  const revokeResults = [];
  for (const c of REVOKE_CANDIDATES(email, courseId, studentId)) {
    try {
      const resp = await fetch(`${base}${c.path}`, {
        method: c.method,
        headers,
        ...(c.body ? { body: JSON.stringify(c.body) } : {}),
      });
      const bodyText = (await resp.text()).slice(0, 500);
      revokeResults.push({ label: c.label, status: resp.status, body: bodyText });
    } catch (err) {
      revokeResults.push({ label: c.label, error: String(err) });
    }
  }

  res.status(200).json({
    coursesListStatus: coursesResp.status,
    grant: { status: grantResp.status, body: grantBody },
    revokeAttempts: revokeResults,
  });
};
