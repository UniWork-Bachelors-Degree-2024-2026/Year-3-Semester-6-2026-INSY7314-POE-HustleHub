// Builds the HTML and plain text versions of the one time passcode email.

// Colours match the app: dark background, raised card and the brand blue.
const COLOURS = {
  background: "#0b0b0d",
  card: "#141316",
  raised: "#1b1a1e",
  line: "#2a282d",
  text: "#f4f1ea",
  muted: "#a8a39b",
  blue: "#2563eb",
};

const COPY = {
  register: {
    subject: "Your HustleHub+ verification code",
    heading: "Confirm your email address",
    intro: "Use this code to finish creating your HustleHub+ account.",
  },
  reset: {
    subject: "Your HustleHub+ password reset code",
    heading: "Reset your password",
    intro: "Use this code to choose a new password for your HustleHub+ account.",
  },
  login: {
    subject: "Your HustleHub+ login code",
    heading: "Confirm it is you",
    intro: "Use this code to finish logging in to your HustleHub+ account.",
  },
};

// Escapes the characters that matter in HTML so no value can inject markup.
// replaceAll with a text pattern changes every occurrence, and the ampersand goes first (MDN Web Docs, 2026l).
const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// Table layout and inline styles are used because email clients ignore most modern CSS.
const renderOtpEmail = ({ purpose, code, minutes, username }) => {
  const copy = COPY[purpose];
  let greeting = "Hi there,";
  if (username) {
    greeting = `Hi ${escapeHtml(username)},`;
  }
  const safeCode = escapeHtml(code);

  const html = `<!doctype html>
<html lang="en">
<body style="margin:0;padding:0;background:${COLOURS.background};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${COLOURS.background}" style="background:${COLOURS.background};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
          <tr>
            <td style="padding:0 0 20px 4px;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:${COLOURS.text};">
              <span style="display:inline-block;background:${COLOURS.blue};color:#ffffff;border-radius:8px;padding:5px 8px;font-size:15px;">H+</span>
              &nbsp;HustleHub+
            </td>
          </tr>
          <tr>
            <td bgcolor="${COLOURS.card}" style="background:${COLOURS.card};border:1px solid ${COLOURS.line};border-radius:16px;padding:32px;font-family:Arial,Helvetica,sans-serif;color:${COLOURS.text};">
              <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;color:${COLOURS.text};">${escapeHtml(copy.heading)}</h1>
              <p style="margin:0 0 4px;font-size:15px;line-height:1.6;color:${COLOURS.muted};">${greeting}</p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:${COLOURS.muted};">${escapeHtml(copy.intro)}</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" bgcolor="${COLOURS.raised}" style="background:${COLOURS.raised};border:1px solid ${COLOURS.line};border-radius:12px;padding:20px 8px;">
                    <span style="font-family:'Courier New',Courier,monospace;font-size:34px;font-weight:700;letter-spacing:8px;white-space:nowrap;color:#ffffff;">${safeCode}</span>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-size:14px;line-height:1.6;color:${COLOURS.muted};">
                This code expires in <strong style="color:${COLOURS.text};">${escapeHtml(minutes)} minutes</strong> and can only be used once.
              </p>
              <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:${COLOURS.muted};">
                Never share this code with anyone. HustleHub+ staff will never ask for it.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:${COLOURS.muted};">
              If you did not ask for this email, you can safely ignore it. Nothing will change on your account.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${copy.heading}\n\n${greeting}\n${copy.intro}\n\nYour code: ${code}\n\nIt expires in ${minutes} minutes and can only be used once. Never share it with anyone.\n\nIf you did not ask for this email, you can safely ignore it.`;

  return { subject: copy.subject, html, text };
};

module.exports = { renderOtpEmail, escapeHtml };

// Reference List:
// MDN Web Docs, 2026l. String.prototype.replaceAll(). [online] Available at: <https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replaceAll> [Accessed 10 October 2026].
