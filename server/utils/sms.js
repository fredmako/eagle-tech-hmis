const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const isRealSupabase = !!(supabaseUrl && supabaseKey);
const supabase = isRealSupabase ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * Dispatches an SMS via Africa's Talking SMS Gateway using the facility's dynamic config.
 */
async function sendSMS({ facilityId, to, message }) {
  console.log(`[SMS Service] Sending SMS to ${to}: "${message}"...`);

  let username = 'sandbox';
  let apiKey = '';
  let senderId = '';
  let apiUrl = 'https://api.sandbox.africastalking.com/version1/messaging';

  if (supabase && facilityId) {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select('system_admin_config')
        .eq('id', facilityId)
        .maybeSingle();

      if (!error && data && data.system_admin_config && data.system_admin_config.atSmsConfig) {
        const sms = data.system_admin_config.atSmsConfig;
        if (sms.username) username = sms.username;
        if (sms.apiKey) apiKey = sms.apiKey;
        if (sms.senderId) senderId = sms.senderId;
        if (sms.apiUrl) apiUrl = sms.apiUrl;
      }
    } catch (dbErr) {
      console.error('[SMS Service] Failed to load facility SMS config, using default sandbox:', dbErr);
    }
  }

  // If no API key is provided, simulate sandbox/test SMS logging
  if (!apiKey) {
    console.log('[SMS Service Sandbox Mode] No API Key configured. Simulating SMS transmission.');
    if (supabase && facilityId) {
      try {
        await supabase.from('audit_logs').insert({
          facility_id: facilityId,
          user_id: 'system',
          action: 'SMS Sent (Sandbox)',
          details: JSON.stringify({ to, message, status: 'simulated' })
        });
      } catch (logErr) {
        console.error('[SMS Logging] Failed to write simulated log:', logErr);
      }
    }
    return { success: true, status: 'simulated', message: 'SMS simulated successfully (sandbox).' };
  }

  try {
    const params = new URLSearchParams();
    params.append('username', username);
    params.append('to', to);
    params.append('message', message);
    if (senderId) {
      params.append('from', senderId);
    }

    const config = {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'apiKey': apiKey
      },
      timeout: 6000
    };

    const response = await axios.post(apiUrl, params, config);
    console.log('[SMS Service] Dispatch succeeded:', response.data);

    if (supabase && facilityId) {
      try {
        await supabase.from('audit_logs').insert({
          facility_id: facilityId,
          user_id: 'system',
          action: 'SMS Sent (Africa\'s Talking)',
          details: JSON.stringify({ to, message, status: 'sent', response: response.data })
        });
      } catch (logErr) {}
    }

    return { success: true, status: 'sent', data: response.data };
  } catch (err) {
    const errRes = err.response ? { status: err.response.status, data: err.response.data } : { message: err.message };
    console.error('[SMS Service] Dispatch failed:', errRes);

    if (supabase && facilityId) {
      try {
        await supabase.from('audit_logs').insert({
          facility_id: facilityId,
          user_id: 'system',
          action: 'SMS Dispatch Failed',
          details: JSON.stringify({ to, message, error: errRes })
        });
      } catch (logErr) {}
    }

    return { success: false, status: 'failed', error: errRes };
  }
}

module.exports = { sendSMS };
