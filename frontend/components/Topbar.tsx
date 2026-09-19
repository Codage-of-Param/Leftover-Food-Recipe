"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import NotificationDropdown from "@/components/NotificationDropdown";

export default function Topbar() {
  const {
    searchQuery,
    setSearchQuery,
    setIsAddModalOpen,
    syncStatus,
    triggerSync,
    setIsMobileSidebarOpen,
    setIsProfileModalOpen,
    userProfile,
    activeTab,
    setActiveTab,
    isAuthenticated,
    setShowAuthModal
  } = useApp();

  if (activeTab === "chat-generator") {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-3 py-3 sm:px-8 sm:py-4 flex flex-wrap md:flex-nowrap items-center justify-between gap-y-3">
      {/* Mobile Hamburger Menu */}
      <div className="flex items-center space-x-2 sm:space-x-3 order-1">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="md:hidden p-2 -ml-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Open menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="hidden sm:flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shadow-sm">
            AI
          </div>
          <span className="font-bold text-gray-900 dark:text-gray-100 tracking-tight hidden lg:block">FoodRescue</span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="w-full md:flex-1 md:max-w-xl md:mx-8 relative order-3 md:order-2 mt-1 md:mt-0">
        <svg 
          className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>

        <input 
          type="text" 
          placeholder={
            activeTab === "inventory" 
              ? "Search pantry ingredients..." 
              : activeTab === "saved" 
              ? "Search saved recipes..." 
              : "Search recipes by ingredient..."
          } 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-10 py-2.5 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow dark:text-gray-100"
        />

        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
            title="Clear search"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Right Actions */}
      <div className="flex items-center space-x-2 sm:space-x-4 relative order-2 md:order-3">
        {/* AI Assistant Button - Redirects to AI Recipe Chat Tab */}
        <button
          onClick={() => setActiveTab("chat-generator")}
          className="bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold py-2 px-3 rounded-full flex items-center space-x-1.5 shadow-2xs transition-all border border-emerald-200/50 dark:border-emerald-800/50 active:scale-95"
          title="Go to AI Recipe Chat"
        >
          <svg className="w-4 h-4 fill-current text-emerald-600" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
          </svg>
          <span className="inline">AI Assistant</span>
        </button>

        {/* Sync Button */}
        <button
          onClick={triggerSync}
          className="hidden md:flex items-center space-x-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors shadow-2xs"
          title="Click to sync pantry with Supabase PostgreSQL"
        >
          <svg 
            className={`w-3.5 h-3.5 ${syncStatus === "syncing" ? "animate-spin text-emerald-600 dark:text-emerald-400" : ""}`} 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          <span>{syncStatus === "syncing" ? "Syncing..." : "Pantry Synced"}</span>
        </button>

        {/* Add Ingredients Button */}
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold py-2 px-3 md:px-4 rounded-full flex items-center space-x-1 shadow-xs transition-all transform active:scale-95"
        >
          <span className="hidden sm:inline">+ Add Ingredients</span>
          <span className="sm:hidden">+ Add</span>
        </button>

        {/* User Profile / Sign In Badge */}
        {!isAuthenticated ? (
          <button
            onClick={() => setShowAuthModal(true)}
            className="flex items-center space-x-2.5 p-1 sm:pl-3 sm:pr-4 sm:py-1.5 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:hover:bg-emerald-800/60 rounded-full transition-colors font-semibold text-xs text-emerald-800 dark:text-emerald-100 shadow-sm"
          >
            <span>Sign In</span>
          </button>
        ) : (
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="flex items-center space-x-2.5 p-1 sm:pl-2 sm:pr-4 sm:py-1.5 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-full transition-colors border border-transparent sm:border-gray-100 dark:sm:border-gray-800"
            title="Account Profile & Allergies"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-600 dark:bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-tight">{userProfile?.name || "User"}</span>
            </div>
          </button>
        )}
      </div>
    </header>
  );
}
