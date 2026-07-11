// TEMPORARY diagnostic endpoint — testing whether the internal Learn
// students-list endpoint (view.student_iterate) can be filtered by email
// using a stored session cookie, and whether each row's data-* attributes
// give us course-library data directly (no need to also hit student_view).
//
// Visit: /api/debug/probe?token=tmt-debug-2026&email=you@example.com

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
    const [full, studentId, coursesRaw, courseInfoRaw] = match;
    const rowStart = match.index;
    const nextRowIdx = html.indexOf('data-student_id="', rowStart + full.length);
    const rowEnd = nextRowIdx === -1 ? html.length : nextRowIdx;
    const rowHtml = html.slice(rowStart, rowEnd);

    const emailMatch = rowHtml.match(/mailto:([^"]+)"/);
    const nameMatch = rowHtml.match(/order-row-customer-name">\s*([^<]+?)\s*</);

    let courses = [];
    try {
      const courseInfo = JSON.parse(decodeHtmlEntities(courseInfoRaw));
      courses = Object.values(courseInfo);
    } catch (err) {
      courses = { parseError: String(err), raw: courseInfoRaw };
    }

    rows.push({
      studentId,
      email: emailMatch ? emailMatch[1] : null,
      name: nameMatch ? nameMatch[1] : null,
      courses,
    });
  }
  return rows;
}

module.exports = async (req, res) => {
  if (req.query.token !== 'tmt-debug-2026') {
    res.status(404).json({ error: 'not found' });
    return;
  }

  const cookie = process.env.THRIVECART_SESSION_COOKIE;
  if (!cookie) {
    res.status(500).json({ error: 'THRIVECART_SESSION_COOKIE not set in this deployment environment' });
    return;
  }

  const email = req.query.email || 'bwgtarbet@gmail.com';
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

  const url = `https://thrivecart.com/thatmusicteacher/?${qs}`;

  try {
    const resp = await fetch(url, {
      headers: {
        Cookie: cookie,
        'X-Requested-With': 'XMLHttpRequest',
        Accept: 'text/javascript, text/html, application/xml, text/xml, */*',
      },
    });
    const bodyText = await resp.text();
    let body;
    try {
      body = JSON.parse(bodyText);
    } catch {
      body = bodyText.slice(0, 2000);
    }

    const rows = body && body.html ? parseStudentRows(body.html) : [];

    res.status(200).json({
      email,
      status: resp.status,
      statistics: body && body.statistics,
      parsedRows: rows,
    });
  } catch (err) {
    res.status(200).json({ email, error: String(err) });
  }
};
