import React, { useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function AuthCallback({ onCallbackComplete }) {
  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL hash (Supabase redirects with #access_token=...)
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth callback error:', error);
          setTimeout(() => onCallbackComplete?.(), 2000);
          return;
        }

        if (data?.session) {
          // User successfully authenticated
          const user = data.session.user;

          // Store the Google user data for the onboarding form
          sessionStorage.setItem('egesa_health_onboarding_google_user', JSON.stringify({
            id: user.id,
            email: user.email,
            name: user.user_metadata?.full_name || user.email.split('@')[0] || 'Google User'
          }));

          // Redirect back to onboarding with saved state
          setTimeout(() => onCallbackComplete?.(), 1000);
        } else {
          // No session found
          setTimeout(() => onCallbackComplete?.(), 2000);
        }
      } catch (err) {
        console.error('Unexpected error in auth callback:', err);
        setTimeout(() => onCallbackComplete?.(), 2000);
      }
    };

    handleCallback();
  }, [onCallbackComplete]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: '#0f172a',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '2px solid #16a34a',
          borderTop: '2px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 24px'
        }} />
        <h2 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600 }}>Completing sign-in...</h2>
        <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>Please wait while we verify your Google account.</p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
