import React from 'react';
import { ShieldAlert, CheckCircle } from 'lucide-react';

export default function PasswordRecovery({
  isSandbox,
  selectedFacility,
  setSelectedFacility,
  facilities,
  recoveryEmail,
  setRecoveryEmail,
  recoveryLoading,
  recoveryError,
  setRecoveryError,
  recoverySuccess,
  setRecoverySuccess,
  codeSent,
  setCodeSent,
  setShowRecovery,
  handleRequestCode,
  handleVerifyResetCode,
  enteredCode,
  setEnteredCode,
  newPass,
  setNewPass
}) {
  return (
    <div className="min-h-screen bg-slate-955 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md mb-4 flex justify-start">
        <button
          onClick={() => {
            setShowRecovery(false);
            setRecoveryError('');
            setRecoverySuccess('');
            setCodeSent(false);
          }}
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition font-semibold cursor-pointer"
        >
          ← Back to Login
        </button>
      </div>

      <div className="flex flex-col items-center mb-6">
        <img src="/logo.png" alt="Eagle Tech Logo" className="h-28 object-contain" />
        <span className="text-[10px] text-teal-400 font-bold tracking-widest uppercase mt-2">HMIS SECURITY LAYER</span>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="mt-2">
          <h2 className="text-xl font-bold text-slate-100 mb-1">Account Password Recovery</h2>
          <p className="text-xs text-slate-400 mb-6 font-medium">
            {isSandbox 
              ? "A security verification code will be generated and dispatched through Titan SMTP."
              : "A password reset link will be sent to your email address from Supabase Auth."}
          </p>
        </div>

        {recoveryError && (
          <div className="mb-4 bg-red-900/20 border border-red-500/30 text-red-400 rounded-lg p-3 text-xs flex items-start gap-2">
            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
            <span>{recoveryError}</span>
          </div>
        )}

        {recoverySuccess && (
          <div className="mb-4 bg-teal-500/10 border border-teal-500/25 text-teal-400 rounded-lg p-3 text-xs flex items-start gap-2 font-medium">
            <CheckCircle size={16} className="shrink-0 mt-0.5" />
            <span>{recoverySuccess}</span>
          </div>
        )}

        {!codeSent ? (
          <form onSubmit={handleRequestCode} className="space-y-4">
            {isSandbox && (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Select Facility / Tenant
                </label>
                <select
                  value={selectedFacility}
                  onChange={(e) => setSelectedFacility(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-slate-100 text-xs focus:outline-none focus:border-teal-500 transition"
                  required
                >
                  <option value="">-- Choose Facility --</option>
                  {facilities.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name} ({fac.code})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Your Account Email
              </label>
              <input
                type="email"
                value={recoveryEmail}
                onChange={(e) => setRecoveryEmail(e.target.value)}
                placeholder="e.g. nurse@egesa.com"
                className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 text-sm focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={recoveryLoading || (isSandbox && !selectedFacility)}
              className="w-full bg-teal-500 hover:bg-teal-600 disabled:bg-slate-850 disabled:text-slate-600 text-slate-950 font-semibold text-sm py-2.5 px-4 rounded-lg shadow-lg active:scale-[0.98] transition mt-2 cursor-pointer"
            >
              {recoveryLoading 
                ? (isSandbox ? 'Generating Reset Code...' : 'Sending Reset Link...') 
                : (isSandbox ? 'Dispatch Reset Code' : 'Send Reset Link')}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyResetCode} className="space-y-4">
            {isSandbox ? (
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Verification Reset Code
                </label>
                <input
                  type="text"
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value)}
                  placeholder="ET-XXXXXX"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 text-sm font-mono focus:outline-none focus:border-teal-500 transition"
                  required
                />
              </div>
            ) : (
              <div className="text-xs text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-lg p-3 font-medium">
                Updating password for Supabase Auth account.
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Choose New Password
              </label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full bg-slate-955 border border-slate-800 rounded-lg py-2.5 px-3 text-slate-100 text-sm focus:outline-none focus:border-teal-500 transition"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-semibold text-sm py-2.5 px-4 rounded-lg shadow-lg active:scale-[0.98] transition mt-2 cursor-pointer"
            >
              {isSandbox ? 'Update Password & Return to Login' : 'Update Password & Enter Portal'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
