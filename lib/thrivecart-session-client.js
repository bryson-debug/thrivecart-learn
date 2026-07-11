// Course-library lookup via ThriveCart's internal Learn admin endpoint.
//
// This is NOT the sanctioned external API (thrivecart.com/api/external/*) --
// it's the same endpoint ThriveCart's own admin dashboard calls
// (view.student_iterate), authenticated by a live login session cookie
// rather than an API key. There is no public API for "what courses does
// this customer currently have access to" -- this was confirmed
// exhaustively (see thrivecart-client.js history).
//
// TRADEOFF, by design, accepted deliberately: the session cookie will
// expire at some unknown point and this feature will silently stop
// working until someone re-captures a fresh cookie from a logged-in
// browser (DevTools -> Network -> Fetch/XHR -> any thrivecart.com request
// -> Headers -> Cookie -> copy the `thrivecart_v2` value) and updates the
// THRIVECART_SESSION_COOKIE env var in Vercel.

const BASE_URL = 'https://thrivecart.com/thatmusicteacher/';

function decodeHtmlEntities(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'");
}

function parseStudentRows(html) {
  const rows = [];
  const rowRegex = /data-student_id="(\d+)"\s+data-student_courses="([^"]*)"\s+data-student_course_info="([^"]*)"/g;
  let match;
  while ((match = rowRegex.exec(html))) {
    const [full, studentId, , courseInfoRaw] = match;
    const rowStart = match.index;
    const nextRowIdx = html.indexOf('data-student_id="', rowStart + full.length);
    const rowEnd = nextRowIdx === -1 ? html.length : nextRowIdx;
    const rowHtml = html.slice(rowStart, rowEnd);

    const emailMatch = rowHtml.match(/mailto:([^"]+)"/);

    let courses = [];
    try {
      const courseInfo = JSON.parse(decodeHtmlEntities(courseInfoRaw));
      courses = Object.values(courseInfo).map((c) => ({
        courseId: c.course_id,
        courseName: c.course_name,
        status: c.status,
      }));
    } catch {
      courses = [];
    }

    rows.push({ studentId, email: emailMatch ? emailMatch[1] : null, courses });
  }
  return rows;
}

// Returns { studentId, courses: [{courseId, courseName, status}] } for an
// exact (case-insensitive) email match, or null if the account has no
// Learn student record for that email.
async function getStudentCourseLibrary(email) {
  const cookie = process.env.THRIVECART_SESSION_COOKIE;
  if (!cookie) throw new Error('THRIVECART_SESSION_COOKIE is not configured');

  const qs =
    'view=view.student_iterate&plugin=core.courses&page=' +
    `&search%5Bquery%5D=${encodeURIComponent(email)}` +
    '&search%5Bstatus%5D=all' +
    '&search%5Brange%5D%5Bname%5D=all' +
    '&search%5Brange%5D%5Bfloor%5D=&search%5Brange%5D%5Bceil%5D=' +
    '&search%5Brange%5D%5Bfloor_str%5D=&search%5Brange%5D%5Bceil_str%5D=' +
    '&search%5Bfilter%5D%5Baxis%5D=&search%5Bfilter%5D%5Bcomparison%5D=' +
    '&search%5Bfilter%5D%5Bamt%5D=&search%5Bfilter%5D%5Btype%5D=&search%5Bfilter%5D%5Btags%5D=' +
    '&search%5Btz%5D=-240&order%5B%5D=start_date&order%5B%5D=desc';

  const resp = await fetch(`${BASE_URL}?${qs}`, {
    headers: {
      Cookie: cookie,
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'text/javascript, text/html, application/xml, text/xml, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      Referer: 'https://thrivecart.com/thatmusicteacher/',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
    },
  });

  if (!resp.ok) {
    const err = new Error(`ThriveCart Learn admin lookup failed: ${resp.status}`);
    err.status = resp.status;
    throw err;
  }

  const body = await resp.json();
  const rows = body && body.html ? parseStudentRows(body.html) : [];
  const match = rows.find((r) => r.email && r.email.toLowerCase() === email.toLowerCase());
  if (!match) return null;

  return { studentId: match.studentId, courses: match.courses };
}

module.exports = { getStudentCourseLibrary };
