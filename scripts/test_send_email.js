import { Client, Functions } from 'node-appwrite';
import fs from 'fs';

// 1. Load env parameters
const envPath = '.env';
if (!fs.existsSync(envPath)) {
  console.error('ERROR: .env file not found.');
  process.exit(1);
}

const envData = fs.readFileSync(envPath, 'utf8');
const env = {};
envData.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    value = value.trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const endpoint = env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const projectId = env.VITE_APPWRITE_PROJECT_ID;
const apiKey = env.VITE_APPWRITE_API_KEY;
const functionId = env.VITE_APPWRITE_FUNCTION_SEND_EMAIL || '6a2d4a8900176cd7c70a';

if (!projectId || !apiKey) {
  console.error('ERROR: Appwrite configuration VITE_APPWRITE_PROJECT_ID or VITE_APPWRITE_API_KEY missing in .env.');
  process.exit(1);
}

// 2. Read SMTP password from command arguments
const smtpPassword = process.argv[2];
if (!smtpPassword) {
  console.error('\nUsage: node scripts/test_send_email.js <your_titan_smtp_password>\n');
  process.exit(1);
}

const recipient = process.argv[3] || 'fredrickmakori102@gmail.com';

console.log('--- Appwrite serverless function execution test ---');
console.log('Endpoint:', endpoint);
console.log('Project ID:', projectId);
console.log('Function ID:', functionId);
console.log('Sending test email to:', recipient);

const client = new Client()
  .setEndpoint(endpoint)
  .setProject(projectId)
  .setKey(apiKey);

const functions = new Functions(client);

const payload = {
  smtpConfig: {
    host: 'smtp.titan.email',
    port: 465,
    encryption: 'SSL',
    sender_email: 'noreply@eagletechsolutions.tech',
    sender_name: 'Eagle Tech System Communications',
    username: 'noreply@eagletechsolutions.tech',
    password: smtpPassword
  },
  emailDetails: {
    recipient: recipient,
    subject: 'Appwrite Serverless Outbound Test Dispatch',
    body: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #0f172a; color: #f1f5f9;">
        <h2 style="color: #2dd4bf; border-bottom: 2px solid #1e293b; padding-bottom: 10px;">Outbound SMTP Deliverability OK</h2>
        <p>Dear Fredrick,</p>
        <p>This is a real email sent successfully from Egesa Health via the server-side Appwrite function <strong>send-email</strong> using your Titan SMTP credentials.</p>
        <div style="background-color: #1e293b; padding: 15px; border-left: 4px solid #2dd4bf; border-radius: 4px; margin: 15px 0;">
          <p style="margin: 0; font-size: 14px;"><strong>SMTP Server:</strong> smtp.titan.email:465 (SSL)</p>
          <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Sent From:</strong> noreply@eagletechsolutions.tech</p>
          <p style="margin: 5px 0 0 0; font-size: 14px;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>Your server-side mail relay is now fully operational!</p>
      </div>
    `
  }
};

async function trigger() {
  try {
    const execution = await functions.createExecution(
      functionId,
      JSON.stringify(payload),
      false // async: false (execute synchronously and wait for response)
    );

    console.log('\n--- Execution Response ---');
    console.log('HTTP Status Code:', execution.statusCode);
    console.log('Response Body:', execution.responseBody);
  } catch (err) {
    console.error('\nExecution Error:', err.message);
  }
}

trigger();
