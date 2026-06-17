import React from 'react';
import { CheckCircle, Building, Send, Shield, RefreshCw } from 'lucide-react';
import { getDefaultSmtpConfig } from '../../notificationService';

export default function SmtpSettings({
  handleSaveSmtp,
  smtp,
  setSmtp,
  smtpMessage,
  smtpLoading,
  handleSendTestEmail,
  testMessage,
  testRecipient,
  setTestRecipient,
  testLoading,
  handleCheckDns,
  dnsChecking,
  dnsMessage
}) {
  return (
    <div className="space-y-6">
      <form onSubmit={handleSaveSmtp} className="space-y-5">
        <div className="flex justify-between items-center pb-1 border-b border-slate-850">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Titan Server Authentication Configuration</h4>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSmtp(getDefaultSmtpConfig())}
              className="text-[10px] text-slate-500 hover:text-slate-200 font-bold cursor-pointer"
            >
              Reset Titan Presets
            </button>
          </div>
        </div>

        {smtpMessage.text && (
          <div className={`p-2.5 rounded text-xs flex gap-2 ${
            smtpMessage.type === 'success' ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' : 'bg-red-500/5 border border-red-500/20 text-red-400'
          }`}>
            <CheckCircle size={14} className="shrink-0 mt-0.5" />
            <span>{smtpMessage.text}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SMTP Host</label>
            <input
              type="text"
              value={smtp.host}
              onChange={(e) => setSmtp({ ...smtp, host: e.target.value })}
              placeholder="smtp.titan.email"
              className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SMTP Port</label>
            <input
              type="number"
              value={smtp.port}
              onChange={(e) => setSmtp({ ...smtp, port: parseInt(e.target.value) })}
              placeholder="465"
              className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Encryption Protocol</label>
            <select
              value={smtp.encryption}
              onChange={(e) => setSmtp({ ...smtp, encryption: e.target.value })}
              className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
            >
              <option value="SSL">SSL (Implicit)</option>
              <option value="TLS">STARTTLS (Explicit)</option>
              <option value="None">None (Unsecured)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Timeout Settings (Seconds)</label>
            <input
              type="number"
              value={smtp.timeout || 15}
              onChange={(e) => setSmtp({ ...smtp, timeout: parseInt(e.target.value) })}
              className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
              min={5}
              max={90}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sender Email Identity</label>
            <input
              type="email"
              value={smtp.sender_email}
              onChange={(e) => setSmtp({ ...smtp, sender_email: e.target.value })}
              placeholder="noreply@eagletechsolutions.tech"
              className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Sender Name Prefix</label>
            <input
              type="text"
              value={smtp.sender_name}
              onChange={(e) => setSmtp({ ...smtp, sender_name: e.target.value })}
              placeholder="Eagle Tech Medical Desk"
              className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 font-mono">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SMTP Username</label>
            <input
              type="text"
              value={smtp.username}
              onChange={(e) => setSmtp({ ...smtp, username: e.target.value })}
              placeholder="noreply@eagletechsolutions.tech"
              className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">SMTP Password</label>
            <input
              type="password"
              value={smtp.password}
              onChange={(e) => setSmtp({ ...smtp, password: e.target.value })}
              placeholder="••••••••••••"
              className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Retry & Failover Policy</label>
            <select
              value={smtp.retry_policy}
              onChange={(e) => setSmtp({ ...smtp, retry_policy: e.target.value })}
              className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 focus:border-teal-500 transition"
            >
              <option value="3 attempts, linear backoff">3 attempts, linear backoff</option>
              <option value="5 attempts, exponential backoff">5 attempts, exponential backoff</option>
              <option value="No retries">No retries</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Log Retention Period (Days)</label>
            <input
              type="number"
              value={smtp.log_retention || 30}
              onChange={(e) => setSmtp({ ...smtp, log_retention: parseInt(e.target.value) })}
              className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
              min={1}
              max={365}
            />
          </div>
        </div>

        {/* Preferences Toggle Matrix */}
        <div className="space-y-3 pt-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">System Notification Preferences Toggles</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-slate-955 border border-slate-850 p-4 rounded-xl">
            {Object.keys(smtp.preferences || {}).map((prefKey) => (
              <label key={prefKey} className="flex items-center gap-2 text-[10px] text-slate-350 cursor-pointer font-bold select-none hover:text-white transition">
                <input
                  type="checkbox"
                  checked={smtp.preferences[prefKey]}
                  onChange={(e) => setSmtp({
                    ...smtp,
                    preferences: {
                      ...smtp.preferences,
                      [prefKey]: e.target.checked
                    }
                  })}
                  className="w-3.5 h-3.5 accent-teal-500 rounded border-slate-800 bg-slate-900"
                />
                <span className="capitalize">{prefKey.replace(/_/g, ' ').toLowerCase()}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Custom Google OAuth Credentials Section */}
        <div className="space-y-3 pt-4 border-t border-slate-850">
          <h5 className="text-[11px] font-bold text-slate-355 uppercase tracking-wider flex items-center gap-1.5">
            <Building size={12} className="text-teal-400" /> Custom Google Sign-In Credentials
          </h5>
          <p className="text-[10px] text-slate-500">Enable and configure hospital-specific Google OAuth credentials to display your logo and brand on the Google Consent Login screen.</p>
          
          <div className="bg-slate-955 border border-slate-850 p-4 rounded-xl space-y-3">
            <label className="flex items-center gap-2 text-[10px] text-slate-300 cursor-pointer font-bold select-none hover:text-white transition">
              <input
                type="checkbox"
                checked={smtp.google_auth_enabled || false}
                onChange={(e) => setSmtp({
                  ...smtp,
                  google_auth_enabled: e.target.checked
                })}
                className="w-3.5 h-3.5 accent-teal-500 rounded border-slate-800 bg-slate-900"
              />
              Enable Hospital-Specific Google Login
            </label>

            {(smtp.google_auth_enabled) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Google Client ID</label>
                  <input
                    type="text"
                    value={smtp.google_client_id || ''}
                    onChange={(e) => setSmtp({ ...smtp, google_client_id: e.target.value })}
                    placeholder="xxxx-xxxx.apps.googleusercontent.com"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Google Client Secret</label>
                  <input
                    type="password"
                    value={smtp.google_client_secret || ''}
                    onChange={(e) => setSmtp({ ...smtp, google_client_secret: e.target.value })}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
                    required
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-850">
          <button
            type="submit"
            disabled={smtpLoading}
            className="bg-teal-500 hover:bg-teal-600 text-slate-955 font-bold text-xs py-2 px-5 rounded-lg shadow-md transition active:scale-[0.98] cursor-pointer"
          >
            {smtpLoading ? 'Saving Configurations...' : 'Save SMTP Configurations'}
          </button>
        </div>
      </form>

      {/* SMTP test utility */}
      <form onSubmit={handleSendTestEmail} className="bg-slate-955 border border-slate-850 p-4 rounded-xl space-y-3.5">
        <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
          <Send size={11} className="text-teal-400" /> Outbound SMTP Test Utility
        </h5>
        <p className="text-[10px] text-slate-500">Dispatch a test welcome email using your active Titan credentials above to verify DNS connectivity.</p>

        {testMessage.text && (
          <div className={`p-2.5 rounded text-xs flex gap-2 ${
            testMessage.type === 'success' ? 'bg-teal-500/5 border border-teal-500/20 text-teal-400' : 'bg-red-500/5 border border-red-500/20 text-red-400'
          }`}>
            <CheckCircle size={14} className="shrink-0 mt-0.5" />
            <span>{testMessage.text}</span>
          </div>
        )}

        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-3 text-xs text-slate-100 font-mono focus:border-teal-500 transition"
              required
            />
          </div>
          <button
            type="submit"
            disabled={testLoading}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-teal-400 font-bold text-xs px-4 rounded-lg flex items-center gap-1.5 transition active:scale-[0.98] cursor-pointer"
          >
            <Send size={12} /> {testLoading ? 'Sending Test...' : 'Send Test Mail'}
          </button>
        </div>
      </form>

      {/* DNS settings checker */}
      <div className="bg-slate-955 border border-slate-855 p-4 rounded-xl space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-slate-900">
          <h5 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-sans">
            <Shield size={11} className="text-teal-400" /> Eagle Tech Outsource Custom Domain DNS Diagnostics
          </h5>
          <button
            type="button"
            onClick={handleCheckDns}
            disabled={dnsChecking}
            className="text-[10px] text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 font-sans cursor-pointer"
          >
            <RefreshCw size={10} className={dnsChecking ? 'animate-spin' : ''} /> {dnsChecking ? 'Verifying...' : 'Re-check DNS'}
          </button>
        </div>
        <p className="text-[10px] text-slate-500 font-sans">Configure these DNS records at your domain registrar to authenticate your custom domain and maximize Titan SMTP inbox deliverability.</p>
        
        {dnsMessage && (
          <div className="bg-teal-500/5 border border-teal-500/20 text-teal-400 p-2.5 rounded text-[10px] flex gap-1.5 font-sans">
            <CheckCircle size={12} className="shrink-0 mt-0.5" />
            <span>{dnsMessage}</span>
          </div>
        )}

        <div className="overflow-x-auto border border-slate-900 rounded-lg">
          <table className="w-full text-left text-[10px] border-collapse font-mono">
            <thead>
              <tr className="bg-slate-900/60 text-slate-500 font-bold border-b border-slate-900 text-[9px] uppercase">
                <th className="py-1.5 px-2.5">Record Type</th>
                <th className="py-1.5 px-2.5">Host Name</th>
                <th className="py-1.5 px-2.5">Target/Value</th>
                <th className="py-1.5 px-2.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="text-slate-450 divide-y divide-slate-900 font-semibold">
              <tr>
                <td className="py-1.5 px-2.5 text-slate-300">TXT (SPF)</td>
                <td className="py-1.5 px-2.5 text-teal-500">@</td>
                <td className="py-1.5 px-2.5 break-all max-w-[200px]" title='v=spf1 include:spf.titan.email ~all'>"v=spf1 include:spf.titan.email ~all"</td>
                <td className="py-1.5 px-2.5 text-center text-green-400 font-bold">● Active</td>
              </tr>
              <tr>
                <td className="py-1.5 px-2.5 text-slate-300">TXT (DKIM)</td>
                <td className="py-1.5 px-2.5 text-teal-500">titan1._domainkey</td>
                <td className="py-1.5 px-2.5 truncate max-w-[200px]" title='v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0G...'>"v=DKIM1; k=rsa; p=MIIBIjANBgkq..."</td>
                <td className="py-1.5 px-2.5 text-center text-green-400 font-bold">● Active</td>
              </tr>
              <tr>
                <td className="py-1.5 px-2.5 text-slate-300">MX</td>
                <td className="py-1.5 px-2.5 text-teal-500">@</td>
                <td className="py-1.5 px-2.5">mx1.titan.email (10) / mx2.titan.email (20)</td>
                <td className="py-1.5 px-2.5 text-center text-green-400 font-bold">● Active</td>
              </tr>
              <tr>
                <td className="py-1.5 px-2.5 text-slate-300">CNAME</td>
                <td className="py-1.5 px-2.5 text-teal-500">api</td>
                <td className="py-1.5 px-2.5">api.eagletechsolutions.tech</td>
                <td className="py-1.5 px-2.5 text-center text-green-400 font-bold">● Active</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
