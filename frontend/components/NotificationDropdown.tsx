"use client";

import React, { useRef, useEffect } from "react";
import { useApp } from "@/context/AppContext";

export default function NotificationDropdown() {
  const { isNotificationOpen, setIsNotificationOpen, inventory, setActiveTab, setSearchQuery } = useApp();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    }
    if (isNotificationOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isNotificationOpen, setIsNotificationOpen]);

  if (!isNotificationOpen) return null;

  const urgentItems = inventory.filter((i) => i.isUrgent || i.daysLeft <= 2);

  const handleRescueItem = (name: string) => {
    setSearchQuery(name);
    setActiveTab("recipes");
    setIsNotificationOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 animate-fade-in"
    >
      <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          <span className="text-xs font-bold text-gray-800 uppercase tracking-wider">Perishable Alerts</span>
        </div>
        <span className="text-[10px] text-gray-400 font-medium">{urgentItems.length} urgent</span>
      </div>

      {urgentItems.length === 0 ? (
        <div className="text-center py-6 text-gray-400">
          <p className="text-xs font-medium">All pantry items have safe shelf-life!</p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-64 overflow-y-auto">
          {urgentItems.map((item) => (
            <div
              key={item.id}
              className="p-2.5 rounded-xl bg-red-50/50 border border-red-100 flex items-center justify-between hover:bg-red-50 transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-gray-900">{item.name}</div>
                <div className="text-[10px] text-red-600 font-semibold">
                  {item.daysLeft <= 1 ? "Expires in ~24h" : `Expires in ~${item.daysLeft * 24}h`} ({item.quantity})
                </div>
              </div>
              <button
                onClick={() => handleRescueItem(item.name.split(" ")[0])}
                className="text-[10px] font-bold bg-white text-red-600 hover:bg-red-600 hover:text-white px-2 py-1 rounded-md border border-red-200 transition-colors"
              >
                Rescue →
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="pt-3 mt-3 border-t border-gray-100 text-center">
        <button
          onClick={() => {
            setActiveTab("inventory");
            setIsNotificationOpen(false);
          }}
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
        >
          Manage All Pantry Inventory →
        </button>
      </div>
    </div>
  );
}
