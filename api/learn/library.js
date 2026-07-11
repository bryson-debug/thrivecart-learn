const { checkSidepanelSecret } = require('../../lib/sidepanel-auth');
const { getStudentCourseLibrary } = require('../../lib/thrivecart-session-client');

// Always fetch live -- no caching layer for this app.
module.exports = async (req, res) => {
  if (!checkSidepanelSecret(req)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const email = (req.query.email || '').toString().trim().toLowerCase();
  if (!email) {
    res.status(400).json({ error: 'email is required' });
    return;
  }

  try {
    const library = await getStudentCourseLibrary(email);
    res.status(200).json({ found: Boolean(library), library });
  } catch (err) {
    res.status(502).json({ error: 'ThriveCart Learn lookup failed', detail: err.message });
  }
};
