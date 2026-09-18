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
        className={`group bg-white dark:bg-gray-800 border rounded-2xl sm:rounded-3xl p-3 xs:p-4 sm:p-5 cursor-pointer transition-all duration-500 w-full flex flex-col h-full overflow-hidden
          ${isActive 
            ? 'border-emerald-300 dark:border-emerald-700 shadow-xl scale-[1.02]' 
            : 'border-emerald-50 dark:border-gray-700/50 hover:border-emerald-200 dark:hover:border-emerald-800 scale-95 opacity-80'}
        `}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2 sm:gap-4 mb-3">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200/50 flex items-center gap-1 shadow-sm">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {recipe.score || 95}% Rescue
              </span>
              {recipe.isVeg !== false && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-950/60 px-3 py-1 rounded-full border border-green-200/50 shadow-sm">
                  <svg className="w-3 h-3 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Veg
                </span>
              )}
            </div>
            <h4 className="text-lg sm:text-xl font-extrabold text-gray-900 dark:text-white tracking-tight line-clamp-2 leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {recipe.title}
            </h4>
            {recipe.desc && (
              <p className="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
                {recipe.desc}
              </p>
            )}
          </div>

          {/* Bookmark Button */}
          <button
            onClick={handleSave}
            className={`p-2.5 rounded-2xl border transition-all duration-300 shrink-0 shadow-sm active:scale-90 ${
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

        {/* Ingredients Summary */}
        <div className="mt-1 sm:mt-2 mb-3 sm:mb-4 bg-gray-50 dark:bg-gray-900/40 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-700/50 backdrop-blur-sm">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              Pantry Check
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400">
              {availableIngredients}/{totalIngredients} Available
            </span>
          </div>
          <div className="flex gap-1.5 overflow-hidden h-2 rounded-full bg-gray-200 dark:bg-gray-700 p-0.5 shadow-inner">
            {recipe.ingredients.map((ing, idx) => (
              <div 
                key={idx} 
                className={`flex-1 h-full rounded-full transition-all duration-700 ${ing.inPantry !== false ? 'bg-emerald-500 shadow-sm' : 'bg-amber-400'}`}
              />
            ))}
          </div>
          <p className="text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 mt-2 sm:mt-3 truncate font-medium">
            Uses: {recipe.ingredients.slice(0, 3).map(i => i.name).join(", ")}
            {recipe.ingredients.length > 3 && "..."}
          </p>
        </div>

        {/* Nutrition Bar */}
        <div className="flex items-center justify-between gap-1 xs:gap-2 py-2 px-2.5 xs:px-3 bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl text-[10px] xs:text-xs font-bold text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-700 mt-auto shadow-sm">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {recipe.timeMinutes || 20}m
          </div>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700"></div>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            </svg>
            {recipe.cals || 380} cal
          </div>
          <div className="w-px h-4 bg-gray-200 dark:bg-gray-700"></div>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {recipe.protein || "0g"}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-700/50 flex flex-col gap-2 sm:gap-3">
          <button 
            className="group/btn relative w-full bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] sm:text-sm font-bold py-2.5 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl transition-all duration-300 shadow-md active:scale-95 flex items-center justify-center gap-2 overflow-hidden"
          >
            <span className="relative z-10">Cook This Recipe</span>
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 relative z-10 group-hover/btn:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300 ease-out z-0"></div>
          </button>
        </div>
      </div>

      {showModal && (
        <RecipeDetailsModal recipe={recipe} onClose={() => setShowModal(false)} />
      )}
    </>
  );
}
