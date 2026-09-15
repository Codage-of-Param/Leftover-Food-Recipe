"use client";

import React, { useRef, useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import RecipeCard from "@/components/RecipeCard";
import { supabase } from "@/lib/supabase";

export default function DashboardView() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const {
    inventory,
    recipes,
    scannedFridgeRecipes,
    setActiveTab,
    setIsAddModalOpen,
    openRecipeModal,
    setSearchQuery,
    setScannerImage,
    showToast,
    cookedHistory,
    userProfile
  } = useApp();

  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (!userProfile?.id) return;
    const fetchReviews = async () => {
      const { data } = await supabase
        .from("recipe_reviews")
        .select("*")
        .eq("user_id", userProfile.id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (data) setReviews(data);
    };
    fetchReviews();
  }, [userProfile?.id]);

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

  const urgentItems = inventory.filter((i) => i.isUrgent || i.daysLeft <= 2);
  const topRecipe = recipes[0];

  // Combine cooked history and reviews into a single activity feed
  const combinedActivity = [
    ...cookedHistory.map(c => ({
      type: "cooked",
      id: c.id,
      title: c.recipeTitle,
      date: new Date(c.date),
      meta: c.rescuedItems.join(", ")
    })),
    ...reviews.map(r => ({
      type: "rated",
      id: r.id,
      title: r.recipe_title,
      date: new Date(r.created_at),
      meta: `${r.rating}/5 Stars`
    }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 5);

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

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full w-fit mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Live Kitchen Command Center</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Real-time salvage allocation to exhaust expiring perishable assets before shelf-stable dry goods.
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
            className={`flex items-center space-x-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800/50 text-sm font-semibold rounded-xl shadow-xs transition-colors hover:bg-emerald-100 dark:hover:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300`}
          >
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Scan Fridge</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors"
          >
            <span>+ Add Leftovers</span>
          </button>
        </div>
      </div>

      {/* Perishable Urgent Alert Card */}
      {mounted && urgentItems.length > 0 && (
        <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-red-100 dark:border-red-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 flex items-center justify-center shrink-0">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                <path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 16h2v2h-2zm0-6h2v4h-2z" />
              </svg>
            </div>
            <div>
              <div className="text-[11px] font-bold text-red-500 dark:text-red-400 uppercase tracking-wider">
                Urgent Perishable Assets Detected
              </div>
              <div className="text-base font-bold text-gray-900 dark:text-gray-100 mt-0.5">
                {urgentItems.map((u) => u.name).join(" & ")} expire in &lt; 36 hours
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Rescue recipes ready to absorb 100% of these ingredients without extra shopping.
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => {
                setSearchQuery(urgentItems[0]?.name?.split(" ")[0] || "");
                setActiveTab("recipes");
              }}
              className="px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center space-x-1.5"
            >
              <span>View Priority Matches</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Scanned Fridge Generated Recipes Showcase */}
      {mounted && scannedFridgeRecipes.length > 0 && (
        <div className="mb-8 bg-gradient-to-br from-emerald-950/15 via-emerald-900/5 to-transparent dark:from-emerald-950/40 dark:via-emerald-900/20 dark:to-transparent p-6 rounded-3xl border border-emerald-500/30 dark:border-emerald-500/30 shadow-sm">
          <div className="flex items-center justify-between mb-5 pb-3 border-b border-emerald-200/40 dark:border-emerald-800/40">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-white">
                    Scanned Fridge Recipes
                  </h3>
                  <span className="text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/70 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    AI Vision
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {scannedFridgeRecipes.length} {scannedFridgeRecipes.length === 1 ? "recipe" : "recipes"} created from your camera scans
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab("recipes")}
              className="inline-flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400 font-bold hover:underline"
            >
              <span>View All Scanned ({scannedFridgeRecipes.length})</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {scannedFridgeRecipes.slice(0, 3).map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        </div>
      )}

      {/* Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Left Column: Top Match Highlight */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-emerald-700 font-bold uppercase text-xs tracking-wider">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Top Immediate Rescue Opportunity</span>
            </div>
            <button
              onClick={() => setActiveTab("recipes")}
              className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold hover:underline"
            >
              <span>See all recipes</span>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>

          {topRecipe && (
            <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex flex-col md:flex-row gap-6">
              <div className={`w-full md:w-56 h-48 rounded-2xl ${topRecipe.imageBg} p-4 flex flex-col justify-between text-white shrink-0`}>
                <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md text-gray-900 dark:text-white text-xs font-bold px-2.5 py-1 rounded-lg w-fit">
                  {topRecipe.score}/100 Match
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>100% In-Pantry Ingredients</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{topRecipe.title}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-4">{topRecipe.desc}</p>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {topRecipe.ingredients.map((ing, i) => (
                      <span 
                        key={i} 
                        className={`text-[11px] px-2.5 py-0.5 rounded-md font-medium border ${
                          ing.isUrgent 
                            ? "ingredient-chip-urgent border-red-200 dark:border-red-900/50" 
                            : "ingredient-chip border-green-200/60 dark:border-green-800/60"
                        }`}
                      >
                        {ing.isUrgent && <span className="mr-1 font-bold">•</span>}
                        {ing.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-0.5">
                      <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {topRecipe.timeMinutes} min
                    </span>
                    <span>·</span>
                    <span className="flex items-center gap-0.5">
                      <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      </svg>
                      {topRecipe.cals} kcal
                    </span>
                  </div>
                  <button
                    onClick={() => openRecipeModal(topRecipe)}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-all"
                  >
                    <span>Cook Now</span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Pantry Health */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Kitchen Pantry Balance
              </h3>
              <button
                onClick={() => setActiveTab("inventory")}
                className="text-xs text-emerald-700 font-semibold hover:underline"
              >
                Manage Inventory →
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl text-center">
                <div className="text-lg font-extrabold text-gray-800 dark:text-gray-200">{inventory.length}</div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Total Items</div>
              </div>
              <div className="p-3 bg-red-50/60 dark:bg-red-900/20 rounded-2xl text-center">
                <div className="text-lg font-extrabold text-red-600 dark:text-red-400">{urgentItems.length}</div>
                <div className="text-[11px] text-red-600 dark:text-red-400 font-medium">Urgent (&lt; 36h)</div>
              </div>
              <div className="p-3 bg-emerald-50/60 dark:bg-emerald-900/20 rounded-2xl text-center">
                <div className="text-lg font-extrabold text-emerald-700 dark:text-emerald-400">3</div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Ready Meals</div>
              </div>
              <div className="p-3 bg-amber-50/60 dark:bg-amber-900/20 rounded-2xl text-center">
                <div className="text-lg font-extrabold text-amber-700 dark:text-amber-400">1</div>
                <div className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">AI Substitute</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2 text-gray-900 dark:text-white font-bold uppercase text-xs tracking-wider">
            <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Recent Activity</span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
            {combinedActivity.length === 0 ? (
              <div className="text-center text-gray-500 py-6 text-sm">
                No recent activity. Start cooking or rating recipes!
              </div>
            ) : (
              <div className="space-y-5">
                {combinedActivity.map((activity) => (
                  <div key={activity.id} className="flex gap-4 items-start">
                    <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      activity.type === "cooked" 
                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" 
                        : "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
                    }`}>
                      {activity.type === "cooked" ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-0.5">
                        {activity.title}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {activity.type === "cooked" ? "Cooked using " : "Rated "}<span className="font-medium text-gray-700 dark:text-gray-300">{activity.meta}</span>
                      </p>
                      <span className="text-[10px] text-gray-400 mt-1 block">
                        {mounted ? activity.date.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
