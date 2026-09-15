"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import RecipeCard from "@/components/RecipeCard";

export default function SavedRecipesView() {
  const { recipes, savedRecipeIds, setActiveTab, searchQuery, isSearching } = useApp();

  const savedRecipes = recipes
    .filter((r) => savedRecipeIds.includes(r.id))
    .filter((r) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.title.toLowerCase().includes(q) ||
        r.desc.toLowerCase().includes(q) ||
        r.ingredients.some((ing) => ing.name.toLowerCase().includes(q))
      );
    });

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full w-fit mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Personal Bookmarks</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Saved Recipes</h1>
          <p className="text-sm text-gray-600 mt-1">
            Quickly access your favorite salvaged recipes whenever you're ready to cook.
          </p>
        </div>

        <div className="text-left md:text-right">
          <span className="text-sm font-semibold text-gray-700">
            {savedRecipes.length} {savedRecipes.length === 1 ? "recipe" : "recipes"} saved
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
      ) : savedRecipes.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center max-w-md mx-auto shadow-xs mt-12">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">No saved recipes match</h3>
          <p className="text-xs text-gray-500 mb-6">
            Bookmark recommended meals from your match list to save them for later meal prep.
          </p>
          <button
            onClick={() => setActiveTab("recipes")}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            Browse Scanned recipes →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savedRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      )}
    </div>
  );
}
