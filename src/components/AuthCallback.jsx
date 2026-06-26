import React, { useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../context/AuthContext";

export default function AuthCallback({ onCallbackComplete }) {
  const { setUser } = useAuth();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Parse redirect parameters
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1),
        );
        const searchParams = new URLSearchParams(window.location.search);
        const isRecovery =
          searchParams.get("type") === "recovery" ||
          hashParams.get("type") === "recovery";

        // Get the session from the URL hash (Supabase redirects with #access_token=...)
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Auth callback error:", error);
          window.history.replaceState({}, document.title, "/");
          setTimeout(() => onCallbackComplete?.("login"), 2000);
          return;
        }

        if (data?.session) {
          // User successfully authenticated
          const user = data.session.user;
          const isOnboarding =
            sessionStorage.getItem("egesa_health_onboarding_redirect") ===
            "true";

          if (isRecovery) {
            console.log(
              "[AuthCallback] Detected password recovery callback. Storing flag.",
            );
            sessionStorage.setItem("egesa_health_recovery_active", "true");
          }

          if (isOnboarding) {
            // Store the Google user data for the onboarding form
            sessionStorage.setItem(
              "egesa_health_onboarding_google_user",
              JSON.stringify({
                id: user.id,
                email: user.email,
                name:
                  user.user_metadata?.full_name ||
                  user.email.split("@")[0] ||
                  "Google User",
              }),
            );
          }

          if (!isOnboarding && !isRecovery && !supabase.isSandbox) {
            try {
              const pendingFacilityId =
                sessionStorage.getItem("egesa_health_pending_facility") ||
                searchParams.get("facility_id") ||
                searchParams.get("state");
              const activeFacilityId = pendingFacilityId || localStorage.getItem("egesa_active_facility_id");
              const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
              const res = await fetch(`${apiBase}/auth/supabase-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  access_token: data.session.access_token,
                  facility_id: activeFacilityId || undefined,
                  requestedFacilityId: activeFacilityId || undefined,
                }),
              });
              const resData = await res.json().catch(() => ({}));
              if (res.ok && resData.status === "success" && resData.user) {
                localStorage.setItem("egesa_health_token", resData.token);
                localStorage.setItem("egesa_active_facility_id", resData.user.facility_id || "");
                sessionStorage.removeItem("egesa_health_pending_facility");
                sessionStorage.removeItem("egesa_health_google_global_login");
                sessionStorage.setItem("egesa_health_active_user", JSON.stringify(resData.user));
                setUser?.(resData.user);
                window.history.replaceState({}, document.title, "/");
                setTimeout(() => onCallbackComplete?.(resData.user.role === "patient" ? "patient_dashboard" : "dashboard"), 500);
                return;
              }
              if (res.ok && resData.status === "select_facility") {
                sessionStorage.setItem("egesa_oauth_facility_selection", JSON.stringify(resData));
              }
            } catch (profileErr) {
              console.error("[AuthCallback] Staff profile enrichment failed:", profileErr);
            }
          }

          // Clear access token hash and reset pathname to '/'
          window.history.replaceState({}, document.title, "/");

          // Redirect back with the correct screen view context
          setTimeout(
            () => onCallbackComplete?.(isOnboarding ? "signup" : "login"),
            1000,
          );
        } else {
          window.history.replaceState({}, document.title, "/");
          setTimeout(() => onCallbackComplete?.("login"), 2000);
        }
      } catch (err) {
        console.error("Unexpected error in auth callback:", err);
        window.history.replaceState({}, document.title, "/");
        setTimeout(() => onCallbackComplete?.("login"), 2000);
      }
    };

    handleCallback();
  }, [onCallbackComplete, setUser]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        backgroundColor: "#0f172a",
        color: "#fff",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            width: "48px",
            height: "48px",
            border: "2px solid #16a34a",
            borderTop: "2px solid transparent",
            borderRadius: "50%",
            animation: "spin 1s linear infinite",
            margin: "0 auto 24px",
          }}
        />
        <h2 style={{ margin: "0 0 8px 0", fontSize: "18px", fontWeight: 600 }}>
          Completing sign-in...
        </h2>
        <p style={{ margin: 0, fontSize: "14px", color: "#94a3b8" }}>
          Please wait while we verify your Google account.
        </p>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
