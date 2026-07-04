// src/pages/SignIn.jsx
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { API_URL } from "../api/axios";
import PhotoHeader from "../components/ui/PhotoHeader";

// Friendly messages for ?error= codes the OAuth flow can redirect back with
const OAUTH_ERRORS = {
  google_auth_failed:    "Google sign-in failed. Please try again.",
  google_not_configured: "Google sign-in isn't set up yet. Use email and password.",
};

function SignIn() {
  const navigate     = useNavigate();
  const { login }    = useAuth();
  const [params]     = useSearchParams();
  const [user, setUser]         = useState({ email: "", password: "" });
  const [isVisible, setVisible] = useState(false);
  const [error, setError]       = useState(OAUTH_ERRORS[params.get("error")] ?? null);
  const [loading, setLoading]   = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSignIn(event) {
    event.preventDefault();
    if (!user.email || !user.password) return;
    setLoading(true);
    setError(null);
    try {
      await login(user.email, user.password);
      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.error ?? "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-50 dark:bg-slate-950 min-h-screen">
      <div className="min-h-screen flex flex-row gap-6 items-center justify-center py-6 px-4 transition-colors duration-300">

        {/* Sign in card */}
        <div className="w-full max-w-md">
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm">
            <h1 className="std-text text-center text-2xl sm:text-3xl font-semibold">
              Sign in
            </h1>

            <form className="mt-8 sm:mt-12 space-y-5" onSubmit={handleSignIn}>
              {/* Email */}
              <div>
                <label className="std-text text-sm mb-2 block">Email</label>
                <div className="relative flex items-center">
                  <input
                    name="email"
                    type="email"
                    required
                    value={user.email}
                    onChange={handleChange}
                    className="w-full std-text bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-4 py-3 pr-10 rounded-md outline-blue-600 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Enter email"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" fill="#bbb" stroke="#bbb" className="w-4 h-4 absolute right-4" viewBox="0 0 24 24">
                    <circle cx="10" cy="7" r="6" />
                    <path d="M14 15H6a5 5 0 0 0-5 5 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 5 5 0 0 0-5-5zm8-4h-2.59l.3-.29a1 1 0 0 0-1.42-1.42l-2 2a1 1 0 0 0 0 1.42l2 2a1 1 0 0 0 1.42 0 1 1 0 0 0 0-1.42l-.3-.29H22a1 1 0 0 0 0-2z" />
                  </svg>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="std-text text-sm mb-2 block">Password</label>
                <div className="relative flex items-center">
                  <input
                    name="password"
                    type={isVisible ? "text" : "password"}
                    required
                    value={user.password}
                    onChange={handleChange}
                    className="w-full std-text bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-4 py-3 pr-10 rounded-md outline-blue-600 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Enter password"
                  />
                  <svg onClick={() => setVisible(v => !v)} xmlns="http://www.w3.org/2000/svg" fill="#bbb" stroke="#bbb" className="w-4 h-4 absolute right-4 cursor-pointer" viewBox="0 0 128 128">
                    <path d="M64 104C22.127 104 1.367 67.496.504 65.943a4 4 0 0 1 0-3.887C1.367 60.504 22.127 24 64 24s62.633 36.504 63.496 38.057a4 4 0 0 1 0 3.887C126.633 67.496 105.873 104 64 104zM8.707 63.994C13.465 71.205 32.146 96 64 96c31.955 0 50.553-24.775 55.293-31.994C114.535 56.795 95.854 32 64 32 32.045 32 13.447 56.775 8.707 63.994zM64 88c-13.234 0-24-10.766-24-24s10.766-24 24-24 24 10.766 24 24-10.766 24-24 24zm0-40c-8.822 0-16 7.178-16 16s7.178 16 16 16 16-7.178 16-16-7.178-16-16-16z" />
                  </svg>
                </div>
              </div>

              {/* Remember + forgot */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center">
                  <input id="remember-me" type="checkbox" className="h-4 w-4 text-blue-600 dark:bg-slate-800 border-slate-300 rounded" />
                  <label htmlFor="remember-me" className="ml-3 block text-sm std-text">Remember me</label>
                </div>
                <a href="#" className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-semibold">
                  Forgot your password?
                </a>
              </div>

              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 text-sm font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {loading ? "Signing in…" : "Sign in"}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
                <span className="text-xs text-slate-400">or</span>
                <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              </div>

              {/* Google sign-in – full-page redirect into the backend OAuth flow */}
              <button
                type="button"
                onClick={() => { window.location.href = `${API_URL}/api/auth/google`; }}
                className="w-full py-3 px-4 text-sm font-semibold rounded-md std-text bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-4 h-4" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continue with Google
              </button>

              <p className="std-text text-sm text-center">
                Don't have an account?{" "}
                <a href="/register" className="text-blue-600 dark:text-blue-400 hover:underline ml-1 font-semibold">
                  Register here
                </a>
              </p>
            </form>
          </div>
        </div>

        {/* Photo grid — hidden on mobile, visible md+ */}
        <div className="hidden sm:block">
          <PhotoHeader />
        </div>

      </div>
    </div>
  );
}

export default SignIn;