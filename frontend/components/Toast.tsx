"use client";

import React from "react";
import { useApp } from "@/context/AppContext";

export default function Toast() {
  const { toast } = useApp();

  if (!toast) return null;

  const bgStyles = {
    success: "bg-emerald-600 text-white shadow-emerald-900/40 border-emerald-400/40",
    info: "bg-gray-900 text-white shadow-gray-900/50 border-gray-700",
    alert: "bg-amber-600 text-white shadow-amber-900/40 border-amber-400/40",
    error: "bg-red-600 text-white shadow-red-900/50 border-red-400/50"
  }[toast.type || "success"] || "bg-red-600 text-white shadow-red-900/50 border-red-400/50";

  return (
    <div className="fixed top-6 right-6 z-[9999] flex items-center space-x-3 pointer-events-auto transition-all transform animate-fade-in max-w-md">
      <div className={`${bgStyles} flex items-center space-x-3 px-5 py-3.5 rounded-2xl shadow-2xl border backdrop-blur-md`}>
        {toast.type === "success" && (
          <svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {(toast.type === "alert" || toast.type === "error") && (
          <svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        )}
        {toast.type === "info" && (
          <svg className="w-5 h-5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )}
        <span className="text-sm font-semibold leading-snug break-words">{toast.message}</span>
      </div>
    </div>
  );
}

