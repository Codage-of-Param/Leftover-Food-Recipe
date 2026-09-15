"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import RecipeDetailsModal from "./RecipeDetailsModal";

export interface ChatRecipeData {
  id?: string;
  title: string;
  desc?: string;
  score?: number;
  difficulty?: "Easy" | "Medium" | "Hard" | string;
  prep_time?: number;
  cook_time?: number;
  timeMinutes?: number; // fallback
  cals?: number;
  protein?: string;
  carbs?: string;
  fat?: string;
  fiber?: string;
  sugar?: string;
  sodium?: string;
  servings?: number;
  isVeg?: boolean;
  eco_score?: number;
  co2Saved?: number;
  ingredients: Array<{ name: string; quantity?: string; inPantry?: boolean }>;
  instructions: string[];
}

interface RecipeChatCardProps {
  recipe: ChatRecipeData;
  isActive?: boolean;
}

export default function RecipeChatCard({ recipe, isActive = true }: RecipeChatCardProps) {
  const { toggleSaveRecipe, isRecipeSaved } = useApp();
  const [showModal, setShowModal] = useState(false);

  const recipeId = recipe.id || `chat-rec-${recipe.title.replace(/\s+/g, "-").toLowerCase()}`;
  const isSaved = isRecipeSaved(recipeId);

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSaveRecipe(recipeId, recipe);
  };

  const totalIngredients = recipe.ingredients.length;
  const availableIngredients = recipe.ingredients.filter(i => i.inPantry !== false).length;

  return (
    <>
      <div 
        onClick={() => setShowModal(true)}
        className={`bg-white dark:bg-gray-800 border rounded-3xl p-5 shadow-md cursor-pointer transition-all duration-300 w-full sm:min-w-[340px] max-w-sm flex flex-col h-full overflow-hidden shrink-0 snap-center
          ${isActive ? 'border-emerald-300 dark:border-emerald-700 shadow-xl scale-[1.02]' : 'border-emerald-50 dark:border-gray-700/50 hover:border-emerald-200 dark:hover:border-emerald-800 scale-95 opacity-80'}
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200/50">
                {recipe.score || 95}% Rescue
              </span>
              {recipe.isVeg !== false && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/60 px-2 py-0.5 rounded-full border border-green-200/50">
                  <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  Veg
                </span>
              )}
            </div>
            <h4 className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight line-clamp-1">
              {recipe.title}
            </h4>
            {recipe.desc && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-1 leading-relaxed">
                {recipe.desc}
              </p>
            )}
          </div>

          {/* Bookmark Button */}
          <button
            onClick={handleSave}
            className={`p-2 rounded-xl border transition-colors shrink-0 ${
              isSaved
                ? "bg-emerald-50 dark:bg-emerald-900/40 border-emerald-300 text-emerald-600"
                : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-400 hover:text-emerald-600 hover:bg-gray-100"
            }`}
            title={isSaved ? "Saved to Bookmarks" : "Save Recipe"}
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3.5 7 3.5V5c0-1.1-.9-2-2-2z" />
            </svg>
          </button>
        </div>

        {/* Ingredients Summary (Compact) */}
        <div className="mt-2 mb-4 bg-gray-50 dark:bg-gray-900/40 p-3 rounded-2xl border border-gray-100 dark:border-gray-700/50">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pantry Check</span>
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              {availableIngredients}/{totalIngredients} Available
            </span>
          </div>
          <div className="flex gap-1 overflow-hidden h-2 rounded-full bg-gray-200 dark:bg-gray-700">
            {recipe.ingredients.map((ing, idx) => (
              <div 
                key={idx} 
                className={`flex-1 h-full rounded-full ${ing.inPantry !== false ? 'bg-emerald-500' : 'bg-amber-400'}`}
              />
            ))}
          </div>
          <p className="text-[10px] text-gray-500 mt-2 truncate">
            Uses: {recipe.ingredients.slice(0, 3).map(i => i.name).join(", ")}
            {recipe.ingredients.length > 3 && "..."}
          </p>
        </div>

        {/* Nutrition Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 bg-white dark:bg-gray-800 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700 shadow-sm mt-auto">
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {recipe.timeMinutes || 20}m
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            </svg>
            {recipe.cals || 380} cal
          </div>
          <div className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {recipe.protein || "0g"}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700/50 flex flex-col gap-2">
          <button 
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-3 rounded-2xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <span>Cook This Recipe</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          <div className="text-center">
            <span className="text-[10px] text-gray-400 font-semibold uppercase hover:text-gray-600 transition-colors">View Full Recipe Details</span>
          </div>
        </div>
      </div>

      {showModal && (
        <RecipeDetailsModal recipe={recipe} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
