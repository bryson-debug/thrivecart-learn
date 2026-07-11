// TEMPORARY diagnostic endpoint -- checking why /api/learn/library started
// returning 502s. Most likely cause: THRIVECART_SESSION_COOKIE expired
// (a known, accepted tradeoff of the cookie-based course-library lookup).
//
// Visit: /api/debug/probe?token=tmt-debug-2026&email=you@example.com

const { getStudentCourseLibrary } = require('../../lib/thrivecart-session-client');

module.exports = async (req, res) => {
  if (req.query.token !== 'tmt-debug-2026') {
    res.status(404).json({ error: 'not found' });
    return;
  }

  const email = req.query.email || 'bwgtarbet@gmail.com';

  try {
    const library = await getStudentCourseLibrary(email);
    res.status(200).json({ ok: true, email, library });
  } catch (err) {
    res.status(200).json({
      ok: false,
      email,
      errorMessage: err.message,
      errorStatus: err.status || null,
      errorStack: err.stack,
    });
  }
};
