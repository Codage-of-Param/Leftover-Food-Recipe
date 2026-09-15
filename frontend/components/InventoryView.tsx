"use client";

import React, { useState, useRef } from "react";
import { useApp, InventoryItem } from "@/context/AppContext";

export default function InventoryView() {
  const {
    inventory,
    removeInventoryItem,
    toggleUrgent,
    setIsAddModalOpen,
    setScannerImage,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    showToast,
    setIsGenerateModalOpen
  } = useApp();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleScanClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) {
      showToast("File is too large! Maximum allowed size is 1MB.", "alert");
      e.target.value = '';
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setScannerImage({ url: imageUrl, file });
    e.target.value = '';
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;

    if (file.size > 1024 * 1024) {
      showToast("File is too large! Maximum allowed size is 1MB.", "alert");
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setScannerImage({ url: imageUrl, file });
  };

  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  const categories = ["All", "Produce", "Dairy", "Grains", "Pantry", "Proteins"];

  const filteredItems = inventory.filter((item) => {
    if (categoryFilter !== "All" && item.category !== categoryFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
    }
    return true;
  });

  const urgentCount = inventory.filter((i) => i.isUrgent || i.daysLeft <= 2).length;

  return (
    <div 
      className={`p-8 max-w-7xl mx-auto w-full transition-colors ${
        isDragging ? "bg-emerald-50/50 dark:bg-emerald-900/10 ring-4 ring-inset ring-emerald-500/50 rounded-3xl" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-emerald-900/20 backdrop-blur-sm pointer-events-none transition-all">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-2xl flex flex-col items-center animate-bounce">
            <svg className="w-16 h-16 text-emerald-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Drop Photo to Scan Fridge</h2>
          </div>
        </div>
      )}

      {/* View Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full w-fit mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Real-time Kitchen Pantry State</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory & Scanner</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Track shelf life, manage active stock, or scan your fridge with AI to update ingredients automatically.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <input 
            type="file" 
            accept="image/*" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            className="hidden" 
          />
          <button
            onClick={handleScanClick}
            className="flex items-center space-x-2 px-4 py-2.5 bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-sm font-semibold rounded-xl shadow-xs transition-all disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Scan Fridge / Receipt</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md transition-colors"
          >
            <span>+ Add Ingredient</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total In Stock</div>
            <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">{inventory.length} items</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Across {categories.length - 1} categories</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-red-100 dark:border-red-900/50 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-red-500 dark:text-red-400 uppercase tracking-wider">Perishables At Risk</div>
            <div className="text-2xl font-extrabold text-red-600 dark:text-red-500 mt-1">{urgentCount} items</div>
            <div className="text-xs text-red-500/80 dark:text-red-400/80 mt-0.5">Expiring within 48 hours</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500 dark:text-red-400 font-bold text-lg">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Rescue Ready</div>
            <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-500 mt-1">100% Match</div>
            <button
              onClick={() => setActiveTab("recipes")}
              className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold hover:underline mt-0.5 block text-left"
            >
              <span>Cook recommended meals</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center space-x-2 mb-6 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 ${
              categoryFilter === cat
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Ingredients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item, index) => (
          <div
            key={`${item.id}-${index}`}
            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
              item.isUrgent
                ? "bg-red-50/40 dark:bg-red-900/10 border-red-200 dark:border-red-900/50 shadow-xs"
                : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-xs hover:border-gray-200 dark:hover:border-gray-600"
            }`}
          >
            <div>
              <div className="flex items-start justify-between mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider ingredient-chip px-2 py-0.5 rounded-md">
                  {item.category}
                </span>
                <button
                  onClick={() => toggleUrgent(item.id)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1 transition-colors ${
                    item.isUrgent
                      ? "bg-red-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                  }`}
                  title="Click to toggle urgent rescue flag"
                >
                  {item.isUrgent ? (
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-3 h-3 text-white fill-current" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Urgent
                    </span>
                  ) : (
                    <span>Normal</span>
                  )}
                </button>
              </div>

              <h3 className="text-base font-bold text-gray-900 dark:text-white">{item.name}</h3>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Quantity: <span className="font-semibold text-gray-700 dark:text-gray-300">{item.quantity}</span></div>
            </div>

            <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div className="text-xs">
                <span className={`font-semibold ${item.daysLeft <= 2 ? "text-red-600 dark:text-red-500" : "text-gray-600 dark:text-gray-300"}`}>
                  {item.daysLeft <= 1 ? "Expires in 24h" : `Expires in ${item.daysLeft} days`}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setIsGenerateModalOpen(true);
                  }}
                  className="text-xs text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                >
                  Find Recipes
                </button>
                <button
                  onClick={() => removeInventoryItem(item.id)}
                  className="text-gray-400 hover:text-red-500 p-1 transition-colors"
                  title="Remove from pantry"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
