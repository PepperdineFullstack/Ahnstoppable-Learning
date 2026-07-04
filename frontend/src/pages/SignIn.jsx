// src/components/Dashboards/SignIn.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import PhotoHeader from "../components/ui/PhotoHeader";

function SignIn() {
  const navigate     = useNavigate();
  const { login }    = useAuth();
  const [user, setUser]         = useState({ email: "", password: "" });
  const [isVisible, setVisible] = useState(false);
  const [error, setError]       = useState(null);
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