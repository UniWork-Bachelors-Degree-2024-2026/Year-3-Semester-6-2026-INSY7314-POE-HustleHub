// Sends transactional email through the Brevo HTTP API, or prints it to the console when testing locally.
const BREVO_URL = "https://api.brevo.com/v3/smtp/email";
const REQUEST_TIMEOUT_MS = 10000;

// Sends one HTML email, the Brevo API accepts a single body type per request (Brevo, 2026).
const sendEmail = async ({ to, subject, html, text }) => {
  const provider = (process.env.EMAIL_PROVIDER || "brevo").toLowerCase();

  // The console provider exists for automated tests and must never run in production
  if (provider === "console") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("The console email provider is not allowed in production.");
    }
    console.log("EMAIL (console provider):", JSON.stringify({ to, subject, text }));
    return;
  }

  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.MAIL_FROM_EMAIL;
  const senderName = process.env.MAIL_FROM_NAME || "HustleHub+";

  if (!apiKey || !senderEmail) {
    throw new Error("The email service is not configured.");
  }

  // The api-key header authenticates the request, and the sender must be a verified sender (Brevo, 2026).
  const response = await fetch(BREVO_URL, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    // The provider's reason is kept for the server log only, it is never sent to the browser
    const body = await response.json().catch(() => ({}));
    const reason = String(body.message || "no message").slice(0, 200);
    throw new Error(`Email provider responded with status ${response.status}: ${reason}`);
  }
};

module.exports = { sendEmail };

// Reference List:
// Brevo, 2026. Send a transactional email. [online] Available at: <https://developers.brevo.com/docs/send-a-transactional-email> [Accessed 10 October 2026].
