// src/pages/AuthCallback.jsx
// Landing page for Google OAuth – the backend redirects here with ?token=...
import React, { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function AuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const ran = useRef(false); // StrictMode mounts effects twice in dev

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = params.get("token");
    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    loginWithToken(token)
      .then(() => navigate("/home", { replace: true }))
      .catch(() => navigate("/?error=google_auth_failed", { replace: true }));
  }, [params, loginWithToken, navigate]);

  return (
    <div className="bg-gray-50 dark:bg-slate-950 min-h-screen flex items-center justify-center">
      <p className="std-text text-lg">Signing you in…</p>
    </div>
  );
}

export default AuthCallback;
