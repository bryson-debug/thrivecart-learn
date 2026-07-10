const { google } = require('googleapis');

// Appends a row to the "ThriveCart Learn Access Changes" tab of the existing
// Flodesk audit spreadsheet, per spec section 7. Background record only —
// never shown inline in the sidebar, and never blocks the write response to
// HelpScout (log failures are swallowed after being reported to the caller).

const SHEET_TAB = process.env.AUDIT_SHEET_TAB_NAME || 'ThriveCart Learn Access Changes';
const SHEET_ID = process.env.AUDIT_SHEET_ID;

let sheetsClientPromise;

function getSheetsClient() {
  if (!sheetsClientPromise) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    sheetsClientPromise = auth.getClient().then((authClient) => google.sheets({ version: 'v4', auth: authClient }));
  }
  return sheetsClientPromise;
}

async function appendAuditRow({ agentEmail, customerEmail, productName, action, conversationId }) {
  if (!SHEET_ID) {
    throw new Error('AUDIT_SHEET_ID is not configured');
  }

  const sheets = await getSheetsClient();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: `'${SHEET_TAB}'!A:F`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [[
        new Date().toISOString(),
        agentEmail,
        customerEmail,
        productName,
        action,
        conversationId,
      ]],
    },
  });
}

module.exports = { appendAuditRow };
