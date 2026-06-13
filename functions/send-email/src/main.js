import nodemailer from 'nodemailer';

export default async ({ req, res, log, error }) => {
  log('Function execution started.');

  // 1. Parse body and validate payload
  let payload = {};
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        payload = JSON.parse(req.body);
      } catch (err) {
        error('Failed to parse request body as JSON: ' + err.message);
        return res.json({ success: false, error: 'Invalid JSON payload' }, 400);
      }
    } else {
      payload = req.body;
    }
  }

  const { smtpConfig, emailDetails } = payload;

  if (!smtpConfig || !emailDetails) {
    error('Missing smtpConfig or emailDetails in request payload.');
    return res.json({
      success: false,
      error: 'Missing required configuration (smtpConfig and emailDetails)'
    }, 400);
  }

  const { host, port, encryption, username, password, sender_email, sender_name } = smtpConfig;
  const { recipient, subject, body } = emailDetails;

  if (!host || !port || !username || !password || !sender_email) {
    error('Missing required SMTP configuration fields.');
    return res.json({
      success: false,
      error: 'Missing SMTP credentials (host, port, username, password, sender_email)'
    }, 400);
  }

  if (!recipient || !subject || !body) {
    error('Missing email details (recipient, subject, body).');
    return res.json({
      success: false,
      error: 'Missing email details (recipient, subject, body)'
    }, 400);
  }

  log(`Attempting to send email to ${recipient} via ${host}:${port} (${encryption || 'default encryption'})`);

  // 2. Configure NodeMailer Transporter
  // Port 465 is secure (SSL/TLS), others typically use STARTTLS (secure: false)
  const isSecure = port === 465 || String(encryption).toUpperCase() === 'SSL';

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: {
      user: username,
      pass: password
    },
    // Dynamically set connection timeout settings
    connectionTimeout: 15000, // 15 seconds
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: {
      // Disable certificate authorization verification checks (especially for self-signed certificates or custom domains)
      rejectUnauthorized: false
    }
  });

  // 3. Send Email
  try {
    const fromName = sender_name || 'Eagle Tech Outsource Solutions';
    const info = await transporter.sendMail({
      from: `"${fromName}" <${sender_email}>`,
      to: recipient,
      subject: subject,
      html: body,
      // Create a plain text fallback from HTML body (strip HTML tags)
      text: body.replace(/<[^>]*>/g, '')
    });

    log(`Email successfully sent! Message ID: ${info.messageId}`);
    return res.json({
      success: true,
      messageId: info.messageId,
      response: info.response
    });
  } catch (err) {
    error(`NodeMailer Error: ${err.message}`);
    return res.json({
      success: false,
      error: err.message
    }, 500);
  }
};
