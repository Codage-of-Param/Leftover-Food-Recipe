"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import RecipeCard from "@/components/RecipeCard";
import DashboardView from "@/components/DashboardView";
import InventoryView from "@/components/InventoryView";
import SavedRecipesView from "@/components/SavedRecipesView";
import ChatGeneratorView from "@/components/ChatGeneratorView";

export default function Home() {
  const {
    activeTab,
    filteredRecipes,
    recipes,
    scannedFridgeRecipes,
    clearScannedFridgeRecipes,
    activeFilter,
    setActiveFilter,
    sortBy,
    setSortBy,
    searchQuery,
    setSearchQuery,
    isSearching,
    openRecipeModal,
    toggleSaveRecipe,
    isRecipeSaved,
    inventory
  } = useApp();

  const [sortOpen, setSortOpen] = useState(false);

  // Switch between navigation tabs
  if (activeTab === "dashboard") return <DashboardView />;
  if (activeTab === "inventory") return <InventoryView />;
  if (activeTab === "saved") return <SavedRecipesView />;
  if (activeTab === "chat-generator") return <ChatGeneratorView />;

  // 100% match recipes vs 1-2 missing
  const cookNowRecipes = filteredRecipes.filter((r) => !r.isBuyOneOrTwo);
  const buyOneOrTwoRecipe = recipes.find((r) => r.isBuyOneOrTwo);
  const urgentCount = inventory.filter((i) => i.isUrgent || i.daysLeft <= 2).length;

  // Filter and sort scanned fridge recipes
  const filteredScannedRecipes = scannedFridgeRecipes.filter((r) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = r.title.toLowerCase().includes(q);
      const matchesDesc = r.desc.toLowerCase().includes(q);
      const matchesIng = r.ingredients.some((ing) => ing.name.toLowerCase().includes(q));
      if (!matchesTitle && !matchesDesc && !matchesIng) return false;
    }
    if (activeFilter === "under30") return r.timeMinutes <= 30;
    if (activeFilter === "highScore") return r.score >= 90;
    if (activeFilter === "veg") return r.isVeg;
    return true;
  }).sort((a, b) => {
    if (sortBy === "score") return b.score - a.score;
    if (sortBy === "time") return a.timeMinutes - b.timeMinutes;
    if (sortBy === "cals") return a.cals - b.cals;
    return 0;
  });

  const isBuyRecipeSaved = buyOneOrTwoRecipe ? isRecipeSaved(buyOneOrTwoRecipe.id) : false;

  const sortLabels = {
    score: "Rescue Score (Highest first)",
    time: "Cook Time (Quickest first)",
    cals: "Calories (Lowest first)"
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <span className="flex items-center space-x-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Live Algorithmic Allocation</span>
            </span>
            <span className="text-xs text-gray-500">Updated just now</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Scanned recipes</h1>
          <p className="text-sm text-gray-600 max-w-2xl">
            Ranked purely by ingredient salvage priority. Meals are computed to exhaust expiring perishable assets before shelf-stable dry goods.
          </p>
        </div>

        {/* Perishable Alert Widget */}
        <div 
          onClick={() => setSearchQuery("spinach")}
          className="flex items-center bg-white p-3 pr-6 rounded-2xl shadow-xs border border-red-100 cursor-pointer hover:border-red-200 transition-all group shrink-0"
          title="Click to filter recipes using expiring Spinach & Paneer"
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center mr-4 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2zm0-6h2v4h-2z" />
            </svg>
          </div>
          <div>
            <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-0.5">
              Perishable Alert
            </div>
            <div className="text-sm font-semibold text-gray-900 group-hover:text-red-700 transition-colors">
              Spinach & Paneer expire in ~36h
            </div>
          </div>
          <div className="ml-8 text-right">
            <div className="text-sm font-bold text-emerald-600">
              {urgentCount > 0 ? `${urgentCount} Items` : "All Ready"}
            </div>
            <div className="text-[10px] text-gray-400">Zero prep blockers</div>
          </div>
        </div>
      </div>

      {/* Filter and Sort Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <FilterButton 
            label="All Feasible" 
            active={activeFilter === "all"} 
            onClick={() => setActiveFilter("all")} 
            badge={recipes.length}
          />
          <FilterButton 
            label="Under 30 min" 
            icon="time" 
            active={activeFilter === "under30"} 
            onClick={() => setActiveFilter("under30")} 
          />
          <FilterButton 
            label="High Rescue Score (90+)" 
            icon="lightning" 
            active={activeFilter === "highScore"} 
            onClick={() => setActiveFilter("highScore")} 
          />
          <FilterButton 
            label="Vegetarian Only" 
            active={activeFilter === "veg"} 
            onClick={() => setActiveFilter("veg")} 
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-red-600 hover:text-red-700 bg-red-50 px-3 py-1.5 rounded-full font-medium flex items-center space-x-1"
            >
              <span>Search: "{searchQuery}"</span>
              <span>✕</span>
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setSortOpen(!sortOpen)}
            className="flex items-center space-x-2 text-xs font-semibold text-gray-700 bg-white border border-gray-200 px-4 py-2 rounded-full shadow-xs hover:bg-gray-50 transition-colors"
          >
            <span className="text-gray-400 font-normal">Sort:</span>
            <span>{sortLabels[sortBy]}</span>
            <svg className="w-3.5 h-3.5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {sortOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-2 z-30 animate-fade-in">
              {(["score", "time", "cals"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    setSortBy(key);
                    setSortOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between ${
                    sortBy === key ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
                >
                  <span>{sortLabels[key]}</span>
                  {sortBy === key && <span>✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Scanned Fridge AI Recipes Section */}
      {scannedFridgeRecipes.length > 0 && (
        <div className="mb-12 bg-gradient-to-br from-emerald-950/15 via-emerald-900/5 to-transparent dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-transparent p-6 sm:p-7 rounded-3xl border-2 border-emerald-500/30 dark:border-emerald-500/30 shadow-md relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 border-b border-emerald-200/50 dark:border-emerald-800/60 pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                    Scanned Fridge Recipes
                  </h2>
                  <span className="text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                    AI Vision Generated
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
                  Exclusively synthesized from ingredients captured in your camera & fridge photo scans.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/60 dark:bg-emerald-950 px-3 py-1.5 rounded-xl border border-emerald-300/40 dark:border-emerald-800/60">
                {filteredScannedRecipes.length} {filteredScannedRecipes.length === 1 ? "Recipe" : "Recipes"} Ready
              </span>
              <button
                onClick={clearScannedFridgeRecipes}
                className="text-[11px] font-semibold text-gray-400 hover:text-red-600 dark:hover:text-red-400 px-2.5 py-1.5 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                title="Clear scanned recipes history"
              >
                Clear Section
              </button>
            </div>
          </div>

          {isSearching ? (
            <div className="flex justify-center items-center py-12">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Searching recipes...</p>
              </div>
            </div>
          ) : filteredScannedRecipes.length === 0 ? (
            <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-md rounded-2xl border border-emerald-100 dark:border-emerald-900/50 p-6 text-center text-gray-500 text-xs font-semibold">
              No scanned recipes match your active filter/search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredScannedRecipes.map((recipe) => (
                <RecipeCard key={recipe.id} recipe={recipe} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cook Now Section */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6 border-b border-gray-200/60 pb-3">
          <div className="flex items-center space-x-2 text-emerald-700 font-bold uppercase text-xs tracking-wider">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Cook Now · 100% Match</span>
          </div>
          <div className="flex items-center text-xs text-gray-500">
            Zero additional shopping needed. Uses expiring pantry stock first.
            <span className="ml-3 font-semibold text-gray-800">
              {cookNowRecipes.length} {cookNowRecipes.length === 1 ? "recipe" : "recipes"} ready
            </span>
          </div>
        </div>
        
        {isSearching ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-3xl p-5 h-[340px] animate-pulse">
                <div className="w-1/3 h-5 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="w-3/4 h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="w-full h-16 bg-gray-100 dark:bg-gray-700/50 rounded-2xl mb-4 mt-auto"></div>
                <div className="flex justify-between gap-2">
                  <div className="w-1/4 h-8 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                  <div className="w-1/4 h-8 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                  <div className="w-1/4 h-8 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                </div>
              </div>
            ))}
          </div>
        ) : cookNowRecipes.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-12 text-center">
            <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No perfect matches</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              We couldn't find recipes that use only your available ingredients based on the active filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cookNowRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FilterButton({ 
  label, 
  active = false, 
  icon, 
  badge,
  onClick
}: { 
  label: string; 
  active?: boolean; 
  icon?: string; 
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-full text-xs font-semibold transition-all border ${
        active 
          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs" 
          : "bg-white text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 shadow-2xs"
      }`}
    >
      {icon === "time" && (
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
      )}
      {icon === "lightning" && (
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
      )}
      {active && !icon && (
        <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )}
      <span>{label}</span>
      {badge !== undefined && (
        <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${active ? "bg-emerald-700 text-white" : "bg-gray-100 text-gray-600"}`}>
          {badge}
        </span>
      )}
    </button>
  );
}
