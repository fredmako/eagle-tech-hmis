const nodemailer = require('nodemailer');

module.exports = async (context) => {
  const { req, res, log, error } = context;
  log('Function execution started.');

  // Support both req.body (Appwrite 1.4+) and req.payload (older Appwrite versions)
  let bodyData = req.body || req.payload;

  if (bodyData) {
    if (typeof bodyData === 'string') {
      try {
        bodyData = JSON.parse(bodyData);
      } catch (err) {
        error('Failed to parse request body as JSON: ' + err.message);
        return res.json({ success: false, error: 'Invalid JSON payload' }, 400);
      }
    }
  } else {
    bodyData = {};
  }

  const smtpConfig = bodyData.smtpConfig;
  const emailDetails = bodyData.emailDetails;

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
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    tls: {
      // Disable certificate authorization checks (especially for self-signed certificates or Titan SMTP configurations)
      rejectUnauthorized: false
    }
  });

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
