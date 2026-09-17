"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

export default function SignInView() {
  const { isAuthenticated, showToast, setIsAuthenticated, clearScannedFridgeRecipes } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const toggleAuthMode = () => {
    setIsSignUp(!isSignUp);
    setEmail("");
    setPassword("");
    setAuthError(null);
  };

  const [authError, setAuthError] = useState<string | null>(null);

  if (isAuthenticated) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    
    setLoading(true);
    setAuthError(null);
    
    try {
      if (isSignUp) {
        // Check if email already exists
        const { data: existingUser } = await supabase.from("users").select("email").eq("email", email).maybeSingle();
        
        if (existingUser) {
          const msg = "Email already exists! Please sign in.";
          setAuthError(msg);
          showToast(msg, "alert");
          setIsSignUp(false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;

        // Try to insert into public.users immediately so they see it in their table
        if (data?.user) {
          const { error: insertError } = await supabase.from("users").insert([{
            id: data.user.id,
            email: data.user.email,
            display_name: data.user.email?.split("@")[0] || "Chef",
            level: 1,
          }]);
          
          if (insertError) {
            const msg = `Database Error: ${insertError.message}`;
            setAuthError(msg);
            showToast(msg, "alert");
            console.error("Failed to add to public.users table:", insertError.message);
            setLoading(false);
            return;
          }
        }

        // Clear chat history and scanned recipes for the new user
        if (typeof window !== "undefined") {
          localStorage.removeItem("foodrescue_chat_history");
        }
        clearScannedFridgeRecipes();

        showToast("Signup successful! You can now sign in.", "success");
        setIsSignUp(false); // Switch back to Sign In mode
      } else {
        // Explicitly check if email exists for better UX
        const { data: existingUser } = await supabase.from("users").select("email").eq("email", email).maybeSingle();
        
        if (!existingUser) {
          const msg = "Account not found! Please sign up first.";
          setAuthError(msg);
          showToast(msg, "alert");
          setLoading(false);
          return;
        }

        const { error, data } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Context will pick up the session change via onAuthStateChange
        showToast("Signed in successfully!", "success");
      }
    } catch (error: any) {
      const msg = error.message || "Authentication failed";
      setAuthError(msg);
      showToast(msg, "alert");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-gray-50/90 dark:bg-gray-900/90 backdrop-blur-md">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-gray-700"
      >
        
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </motion.div>
          <motion.h2 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-gray-900 dark:text-white"
          >
            Midnight Chefs
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-gray-500 dark:text-gray-400 mt-2"
          >
            {isSignUp ? "Create an account to sync your smart pantry." : "Sign in to sync your smart pantry."}
          </motion.p>
        </div>

        {authError && (
          <div className="mb-6 p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-300 text-xs flex items-start gap-2.5 animate-fade-in">
            <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="flex-1 leading-snug">{authError}</span>
            <button onClick={() => setAuthError(null)} className="text-red-400 hover:text-red-600">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <motion.form 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
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
              placeholder="chef@kitchen.com"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50 dark:bg-gray-700/50 dark:text-white"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50/50 dark:bg-gray-700/50 dark:text-white"
            />
          </div>
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition-all flex justify-center items-center h-12"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              isSignUp ? "Sign Up" : "Sign In"
            )}
          </motion.button>
        </motion.form>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-6 text-center text-xs text-gray-400 dark:text-gray-500"
        >
          <p>
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <span 
              onClick={toggleAuthMode}
              className="text-emerald-600 dark:text-emerald-400 font-semibold cursor-pointer"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
