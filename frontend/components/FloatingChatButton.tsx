"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { motion } from "framer-motion";

export default function FloatingChatButton() {
  const { isChatOpen, setIsChatOpen, activeTab, setActiveTab } = useApp();

  const handleClick = () => {
    if (activeTab === "chat-generator") {
      setIsChatOpen(!isChatOpen);
    } else {
      setIsChatOpen(true);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex items-center space-x-2">
      <motion.button
        whileHover={{ scale: 1.06, y: -2 }}
        whileTap={{ scale: 0.94 }}
        onClick={handleClick}
        className="relative group bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 sm:px-4 sm:py-3.5 rounded-full shadow-xl flex items-center space-x-2.5 transition-all border border-emerald-500/30 backdrop-blur-md"
        title="Open AI Recipe Assistant"
      >
        {/* Glow Ring */}
        <span className="absolute -inset-0.5 rounded-full bg-emerald-500/30 blur-sm group-hover:bg-emerald-400/50 transition-all animate-pulse" />

        {/* Inner Content */}
        <div className="relative flex items-center space-x-2">
          <div className="relative w-6 h-6 flex items-center justify-center">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
            </svg>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-300 rounded-full ring-2 ring-emerald-600 animate-ping" />
          </div>
          <span className="hidden sm:inline text-xs font-extrabold tracking-wide">
            AI Recipe Chat
          </span>
        </div>
      </motion.button>
    </div>
  );
}
