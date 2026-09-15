"use client";

import React from "react";
import { useApp } from "@/context/AppContext";

export default function Sidebar() {
  const { activeTab, setActiveTab, urgentItemsCount, savedRecipeIds, isMobileSidebarOpen, setIsMobileSidebarOpen } = useApp();

  const navItems: Array<{
    id: "dashboard" | "inventory" | "recipes" | "saved" | "chat-generator";
    label: string;
    icon: string;
    badge?: number;
    badgeColor?: string;
  }> = [
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { 
      id: "inventory", 
      label: "Inventory & Scanner", 
      icon: "inventory",
      badge: urgentItemsCount > 0 ? urgentItemsCount : undefined,
      badgeColor: "bg-red-500 text-white"
    },
    { id: "recipes", label: "Scanned recipes", icon: "recipes" },
    { id: "chat-generator", label: "AI Recipe Chat", icon: "chat" },
    { 
      id: "saved", 
      label: "Saved Recipes", 
      icon: "saved",
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col h-full shrink-0 transform transition-transform duration-300 md:relative md:translate-x-0 ${isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo & Close Button */}
        <div className="p-6 flex items-center justify-between">
          <div 
            onClick={() => { setActiveTab("dashboard"); setIsMobileSidebarOpen(false); }}
            className="flex items-center space-x-3 cursor-pointer select-none group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:bg-emerald-700 transition-colors">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zM11 7h2v6h-2zm0 8h2v2h-2z" />
              </svg>
            </div>
            <div>
              <span className="font-extrabold text-base text-gray-900 dark:text-gray-100 tracking-tight block">Midnight Chefs</span>
              <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-500 block -mt-0.5">Kitchen Engine</span>
            </div>
          </div>
          <button 
            className="md:hidden text-gray-400 hover:text-gray-600 p-1"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-2 space-y-1">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setIsMobileSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-emerald-600 dark:bg-emerald-700 text-white shadow-xs"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <div className="flex items-center space-x-3">
                <span className="w-5 h-5 flex items-center justify-center opacity-80">
                  {item.icon === "dashboard" && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  )}
                  {item.icon === "inventory" && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  )}
                  {item.icon === "recipes" && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  )}
                  {item.icon === "chat" && (
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
                    </svg>
                  )}
                  {item.icon === "saved" && (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  )}
                </span>
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Kitchen Status Bottom Card */}
      <div 
        onClick={() => setActiveTab("inventory")}
        className="p-4 mb-4 mx-4 bg-emerald-50/50 dark:bg-emerald-900/20 hover:bg-emerald-50 dark:hover:bg-emerald-900/40 rounded-2xl border border-emerald-100/60 dark:border-emerald-800/50 shadow-2xs cursor-pointer transition-colors"
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">Kitchen Status</span>
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
        </div>
        <p className="text-xs text-gray-700 dark:text-gray-300 leading-snug">
          {urgentItemsCount > 0 ? (
            <span>
              <strong className="text-red-600 font-bold">{urgentItemsCount} expiring items</strong> flagged for rescue tonight.
            </span>
          ) : (
            <span>Zero expiring items. Pantry in balance.</span>
          )}
        </p>
        <div className="mt-2 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 hover:underline">
          View pantry shelf-life →
        </div>
      </div>
    </aside>
    </>
  );
}
