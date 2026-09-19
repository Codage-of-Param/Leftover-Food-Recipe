"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

type AuthMode = "signin" | "signup" | "forgot";

export default function SignInView() {
  const { isAuthenticated, showToast, clearScannedFridgeRecipes } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("signin");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setNewPassword("");
    setAuthError(null);
    setAuthSuccess(null);
  };

  const switchMode = (mode: AuthMode) => {
    resetForm();
    setAuthMode(mode);
  };

  // Email validation
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  };

  if (isAuthenticated) return null;

  // ─── Sign Up ───
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirmPassword) return;

    if (!isValidEmail(email)) {
      setAuthError("Please enter a valid email address.");
      return;
    }
    if (!email.trim().toLowerCase().endsWith("@gmail.com")) {
      setAuthError("Only Gmail accounts are allowed.");
      return;
    }
    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setAuthError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setAuthError(null);

    try {
      // Check if email already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("email")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (existingUser) {
        setAuthError("An account with this email already exists. Please sign in.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      // Insert into public.users with password_hash
      if (data?.user) {
        const { error: insertError } = await supabase.from("users").insert([{
          id: data.user.id,
          email: data.user.email?.toLowerCase(),
          display_name: data.user.email?.split("@")[0] || "Chef",
          level: 1,
          password_hash: password,
        }]);

        if (insertError) {
          setAuthError(`Database Error: ${insertError.message}`);
          showToast(`Database Error: ${insertError.message}`, "alert");
          setLoading(false);
          return;
        }
      }

      // Clear chat history for new user
      if (typeof window !== "undefined") {
        localStorage.removeItem("foodrescue_chat_history");
      }
      clearScannedFridgeRecipes();

      showToast("Account created successfully! Please sign in.", "success");
      setAuthSuccess("Account created! You can now sign in with your credentials.");
      switchMode("signin");
      setEmail(email); // keep email for convenience
    } catch (error: any) {
      const msg = error.message || "Signup failed. Please try again.";
      setAuthError(msg);
      showToast(msg, "alert");
    } finally {
      setLoading(false);
    }
  };

  // ─── Sign In ───
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (!isValidEmail(email)) {
      setAuthError("Please enter a valid email address.");
      return;
    }
    if (!email.trim().toLowerCase().endsWith("@gmail.com")) {
      setAuthError("Only Gmail accounts are allowed.");
      return;
    }

    setLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      // Check if account exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("email")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (!existingUser) {
        setAuthError("No account found with this email. Please sign up first.");
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      showToast("Signed in successfully!", "success");
    } catch (error: any) {
      const msg = error.message || "Authentication failed";
      setAuthError(msg);
      showToast(msg, "alert");
    } finally {
      setLoading(false);
    }
  };

  // ─── Forgot Password ───
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !newPassword) return;

    if (!isValidEmail(email)) {
      setAuthError("Please enter a valid email address.");
      return;
    }
    if (!email.trim().toLowerCase().endsWith("@gmail.com")) {
      setAuthError("Only Gmail accounts are allowed.");
      return;
    }
    if (newPassword.length < 6) {
      setAuthError("New password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      // Verify the email exists in our users table
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, email")
        .eq("email", email.trim().toLowerCase())
        .maybeSingle();

      if (!existingUser) {
        setAuthError("No account found with this email address.");
        setLoading(false);
        return;
      }

      // Use Supabase admin/service or resetPasswordForEmail to send the reset link
      // Since we don't have admin access from the client, we use Supabase's built-in reset
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/`,
      });

      if (resetError) throw resetError;

      // Also update the password_hash in our users table immediately
      await supabase
        .from("users")
        .update({ password_hash: newPassword })
        .eq("id", existingUser.id);

      // Also update the password via Supabase Auth admin API (from an API route)
      try {
        await fetch("/api/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: existingUser.id, newPassword }),
        });
      } catch (e) {
        console.warn("Password reset API call failed, user may need to use email link", e);
      }

      setAuthSuccess("Password has been reset! You can now sign in with your new password.");
      showToast("Password reset successful! Sign in with your new password.", "success");
      
      setTimeout(() => {
        switchMode("signin");
        setEmail(email);
      }, 2000);
    } catch (error: any) {
      const msg = error.message || "Password reset failed. Please try again.";
      setAuthError(msg);
      showToast(msg, "alert");
    } finally {
      setLoading(false);
    }
  };

  const getFormTitle = () => {
    switch (authMode) {
      case "signup": return "Create Account";
      case "forgot": return "Reset Password";
      default: return "Welcome Back";
    }
  };

  const getFormSubtitle = () => {
    switch (authMode) {
      case "signup": return "Create an account to sync your smart pantry.";
      case "forgot": return "Enter your email and set a new password.";
      default: return "Sign in to sync your smart pantry.";
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-md px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-700"
      >
        
        <div className="text-center mb-6 sm:mb-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${
              authMode === "forgot" 
                ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
            }`}
          >
            {authMode === "forgot" ? (
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            ) : (
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            )}
          </motion.div>
          <motion.h2 
            key={authMode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-gray-900 dark:text-white"
          >
            {getFormTitle()}
          </motion.h2>
          <motion.p 
            key={`sub-${authMode}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-gray-500 dark:text-gray-400 mt-2"
          >
            {getFormSubtitle()}
          </motion.p>
        </div>

        {/* Error Alert */}
        <AnimatePresence mode="wait">
          {authError && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-5 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs flex items-start gap-2.5"
            >
              <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="flex-1 leading-snug">{authError}</span>
              <button onClick={() => setAuthError(null)} className="text-red-400 hover:text-red-600">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Alert */}
        <AnimatePresence mode="wait">
          {authSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-5 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-start gap-2.5"
            >
              <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="flex-1 leading-snug">{authSuccess}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── SIGN IN FORM ─── */}
        {authMode === "signin" && (
          <motion.form 
            key="signin-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onSubmit={handleSignIn} 
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50 dark:bg-gray-700/50 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50 dark:bg-gray-700/50 dark:text-white text-sm pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition-all flex justify-center items-center h-12"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                "Sign In"
              )}
            </motion.button>
          </motion.form>
        )}

        {/* ─── SIGN UP FORM ─── */}
        {authMode === "signup" && (
          <motion.form 
            key="signup-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onSubmit={handleSignUp} 
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50 dark:bg-gray-700/50 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50 dark:bg-gray-700/50 dark:text-white text-sm pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {password && password.length < 6 && (
                <p className="text-[10px] text-red-500 mt-1">Password must be at least 6 characters</p>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Confirm Password</label>
              <input 
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50 dark:bg-gray-700/50 dark:text-white text-sm"
              />
              {confirmPassword && password !== confirmPassword && (
                <p className="text-[10px] text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || password.length < 6 || password !== confirmPassword}
              className="w-full mt-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition-all flex justify-center items-center h-12 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                "Create Account"
              )}
            </motion.button>
          </motion.form>
        )}

        {/* ─── FORGOT PASSWORD FORM ─── */}
        {authMode === "forgot" && (
          <motion.form 
            key="forgot-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onSubmit={handleForgotPassword} 
            className="space-y-4"
          >
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50/50 dark:bg-gray-700/50 dark:text-white text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">New Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-gray-50/50 dark:bg-gray-700/50 dark:text-white text-sm pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {newPassword && newPassword.length < 6 && (
                <p className="text-[10px] text-red-500 mt-1">Password must be at least 6 characters</p>
              )}
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading || newPassword.length < 6}
              className="w-full mt-1 bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-xl shadow-md transition-all flex justify-center items-center h-12 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                "Reset Password"
              )}
            </motion.button>
          </motion.form>
        )}
        
        {/* ─── FOOTER LINKS ─── */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500 space-y-2"
        >
          {authMode === "signin" && (
            <p>
              Don&apos;t have an account?{" "}
              <span 
                onClick={() => switchMode("signup")}
                className="text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer hover:underline"
              >
                Sign up
              </span>
            </p>
          )}
          {authMode === "signup" && (
            <p>
              Already have an account?{" "}
              <span 
                onClick={() => switchMode("signin")}
                className="text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer hover:underline"
              >
                Sign in
              </span>
            </p>
          )}
          {authMode === "forgot" && (
            <p>
              Remember your password?{" "}
              <span 
                onClick={() => switchMode("signin")}
                className="text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer hover:underline"
              >
                Back to Sign In
              </span>
            </p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
