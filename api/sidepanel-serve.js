const fs = require('fs');
const path = require('path');

// Vercel's static hosting from /public is broken for this project's
// combination of a custom buildCommand + outputDirectory + declared
// functions (confirmed: even a trivial flat file 404s). Serverless
// functions work reliably, so serve the Vite-built sidepanel through one
// instead, with a vercel.json rewrite keeping the external URL at
// /sidepanel/ so nothing in HelpScout's app config needs to change.

const ROOT = path.join(__dirname, '..', 'public', 'sidepanel');

const CONTENT_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};

module.exports = async (req, res) => {
  let requested = (req.query.path || '').toString();
  if (!requested || requested === '/') requested = 'index.html';

  const normalized = path.normalize(requested).replace(/^([.][.][/\\])+/, '');
  const filePath = path.join(ROOT, normalized);

  if (!filePath.startsWith(ROOT)) {
    res.status(404).send('Not found');
    return;
  }

  let data;
  try {
    data = fs.readFileSync(filePath);
  } catch (err) {
    res.status(404).send('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  res.setHeader('Content-Type', CONTENT_TYPES[ext] || 'application/octet-stream');

  if (ext === '.html') {
    res.setHeader('Cache-Control', 'no-cache');
  } else {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  }

  res.status(200).send(data);
};
