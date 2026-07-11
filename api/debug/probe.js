// TEMPORARY diagnostic endpoint -- inspecting the raw response body/headers
// from the Learn admin lookup instead of just the JSON-parse failure, to
// see what's actually being returned (login page? bot/WAF challenge? rate
// limit?).
//
// Visit: /api/debug/probe?token=tmt-debug-2026&email=you@example.com

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
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://thrivecart.com/thatmusicteacher/',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
      },
    });
    const bodyText = await resp.text();
    res.status(200).json({
      email,
      status: resp.status,
      responseHeaders: Object.fromEntries(resp.headers.entries()),
      bodyPreview: bodyText.slice(0, 1500),
    });
  } catch (err) {
    res.status(200).json({ email, error: String(err) });
  }
};
