"use client";

import React, { useState } from "react";
import { ChatRecipeData } from "./RecipeChatCard";
import { useApp } from "@/context/AppContext";

interface RecipeDetailsModalProps {
  recipe: ChatRecipeData;
  onClose: () => void;
}

export default function RecipeDetailsModal({ recipe, onClose }: RecipeDetailsModalProps) {
  const { cookRecipe } = useApp();
  const [isCooking, setIsCooking] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const { userProfile } = useApp();

  const handleCook = async () => {
    setIsCooking(true);
    // Convert ChatRecipeData to Recipe format for AppContext cookRecipe
    const fullRecipe = {
      id: recipe.id || `chat-rec-${Date.now()}`,
      title: recipe.title,
      desc: recipe.desc || "",
      imageBg: "bg-emerald-800",
      score: recipe.score || 95,
      wasteSaved: 3.50, // mock
      co2Saved: recipe.co2Saved || 1.10,
      ecoScore: recipe.eco_score || 85,
      difficulty: recipe.difficulty || "Medium",
      prepTime: recipe.prep_time || 10,
      cookTime: recipe.cook_time || 10,
      timeMinutes: recipe.timeMinutes || 20,
      servings: recipe.servings || 2,
      cals: recipe.cals || 380,
      protein: recipe.protein || "0g",
      carbs: recipe.carbs || "0g",
      fat: recipe.fat || "0g",
      fiber: recipe.fiber || "0g",
      sugar: recipe.sugar || "0g",
      sodium: recipe.sodium || "0mg",
      isVeg: recipe.isVeg !== undefined ? recipe.isVeg : true,
      ingredients: recipe.ingredients.map(i => ({
        name: i.name,
        quantity: i.quantity || "1 portion",
        inPantry: i.inPantry !== undefined ? i.inPantry : true
      })),
      instructions: recipe.instructions
    };
    
    await cookRecipe(fullRecipe);
    setIsCooking(false);
    setIsDone(true);
  };

  const toggleStep = (idx: number) => {
    setCheckedSteps(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  // Helper to calculate ingredient usage frequency
  const getIngredientUsageCount = (ingName: string): number => {
    if (!ingName) return 1;
    const nameLower = ingName.toLowerCase().trim();

    // 1. Check array duplicates
    const inArrayCount = recipe.ingredients.filter(
      (i) => i.name.toLowerCase().trim() === nameLower
    ).length;

    // 2. Check mentions in instruction steps
    const ignoreWords = [
      "fresh", "block", "cloves", "clove", "ripe", "cooked", "steamed",
      "diced", "chopped", "sliced", "minced", "crumbled", "pureed", "cubed",
      "medium", "small", "large", "tbsp", "tsp", "cup", "portion", "raw", "pcs"
    ];
    const words = nameLower.split(/\s+/).filter((w) => !ignoreWords.includes(w) && w.length > 2);
    const searchWord = words.length > 0 ? words[0] : nameLower;

    let stepMentions = 0;
    (recipe.instructions || []).forEach((step) => {
      if (step.toLowerCase().includes(searchWord)) {
        stepMentions++;
      }
    });

    return Math.max(inArrayCount, stepMentions);
  };

  // Helper numerical values for Nutrition Chart visual bars
  const parseNum = (strVal?: string | number): number => {
    if (typeof strVal === "number") return strVal;
    if (!strVal) return 0;
    const match = strVal.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  };

  const proteinNum = parseNum(recipe.protein);
  const carbsNum = parseNum(recipe.carbs);
  const fatNum = parseNum(recipe.fat);
  const fiberNum = parseNum(recipe.fiber);
  const sodiumNum = parseNum(recipe.sodium);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl relative">
        
        {/* Sticky Header with Close */}
        <div className="sticky top-0 right-0 z-10 flex justify-end p-4 pointer-events-none">
          <button 
            onClick={onClose}
            className="w-10 h-10 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-full flex items-center justify-center text-gray-500 hover:text-gray-900 dark:hover:text-white shadow-sm pointer-events-auto transition-transform hover:scale-105"
          >
            ✕
          </button>
        </div>

        {/* Hero Image Section */}
        <div className="-mt-16 h-48 sm:h-64 bg-gradient-to-br from-emerald-600 to-teal-800 relative flex items-end">
          <div className="absolute inset-0 bg-black/20" />
          <div className="p-6 relative z-10 w-full text-white">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-bold bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/30">
                {recipe.score || 95}% Rescue Score
              </span>
              {recipe.isVeg && (
                <span className="text-xs font-bold bg-green-500/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-green-400/50 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  <span>Vegetarian</span>
                </span>
              )}
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{recipe.title}</h2>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 leading-relaxed">
            {recipe.desc}
          </p>

          {/* Quick Stats Grid (Total Time, Servings, Calories) */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3.5 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold">Total Time</span>
              <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">{recipe.timeMinutes || 20} min</span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3.5 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold">Servings</span>
              <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">{recipe.servings || 2}</span>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800/50 p-3.5 sm:p-4 rounded-2xl flex flex-col items-center justify-center text-center">
              <svg className="w-5 h-5 text-amber-500 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
              <span className="text-[10px] sm:text-xs text-gray-500 uppercase font-bold">Calories</span>
              <span className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">{recipe.cals || 380} kcal</span>
            </div>
          </div>

          {/* NUTRITION CHART (Placed BEFORE Recipe Steps and Ingredients) */}
          <div className="bg-gradient-to-br from-emerald-50/60 to-teal-50/40 dark:from-gray-800/80 dark:to-gray-800/40 border border-emerald-100 dark:border-gray-700/80 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">Nutrition Chart</h3>
              </div>
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100/70 dark:bg-emerald-900/40 px-2.5 py-0.5 rounded-full">
                Per Serving ({recipe.cals || 380} kcal)
              </span>
            </div>

            {/* Macro Visual Progress Bars */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {/* Protein */}
              <div className="bg-white dark:bg-gray-900/70 p-3 rounded-xl border border-emerald-100 dark:border-gray-700 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Protein</span>
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">{recipe.protein || "0g"}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (proteinNum / 50) * 100 || 45)}%` }} />
                </div>
              </div>

              {/* Carbs */}
              <div className="bg-white dark:bg-gray-900/70 p-3 rounded-xl border border-amber-100 dark:border-gray-700 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Carbs</span>
                  <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">{recipe.carbs || "0g"}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, (carbsNum / 100) * 100 || 55)}%` }} />
                </div>
              </div>

              {/* Fat */}
              <div className="bg-white dark:bg-gray-900/70 p-3 rounded-xl border border-rose-100 dark:border-gray-700 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Fat</span>
                  <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400">{recipe.fat || "0g"}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, (fatNum / 60) * 100 || 30)}%` }} />
                </div>
              </div>

              {/* Fiber */}
              <div className="bg-white dark:bg-gray-900/70 p-3 rounded-xl border border-purple-100 dark:border-gray-700 flex flex-col justify-between">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Fiber</span>
                  <span className="text-xs font-extrabold text-purple-600 dark:text-purple-400">{recipe.fiber || "0g"}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.min(100, (fiberNum / 30) * 100 || 40)}%` }} />
                </div>
              </div>

              {/* Sodium */}
              <div className="bg-white dark:bg-gray-900/70 p-3 rounded-xl border border-blue-100 dark:border-gray-700 flex flex-col justify-between col-span-2 sm:col-span-1">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[11px] font-bold text-gray-500 uppercase">Sodium</span>
                  <span className="text-xs font-extrabold text-blue-600 dark:text-blue-400">{recipe.sodium || "0mg"}</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (sodiumNum / 2300) * 100 || 25)}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid: Ingredients & Cooking Instructions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            
            {/* Ingredients Side (Aligned, Compact & Space Efficient) */}
            <div className="md:col-span-1 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
                  </svg>
                  <span>Ingredients</span>
                </h3>
                <span className="text-xs text-gray-400 font-medium">({recipe.ingredients.length} items)</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {recipe.ingredients.map((ing, idx) => {
                  const usageCount = getIngredientUsageCount(ing.name);
                  return (
                    <div 
                      key={idx} 
                      className="flex items-center justify-between p-2.5 px-3 bg-gray-50 dark:bg-gray-800/60 hover:bg-gray-100/80 dark:hover:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700/60 transition-colors"
                    >
                      <div className="flex items-center space-x-1.5 min-w-0 pr-2">
                        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {ing.name}
                        </span>
                        
                        {/* Number mentioned beside ingredient name if used multiple times */}
                        {usageCount > 1 && (
                          <span 
                            title={`Used ${usageCount} times in recipe`}
                            className="shrink-0 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300/60 dark:border-emerald-700 px-1.5 py-0.2 rounded-md"
                          >
                            {usageCount}x
                          </span>
                        )}

                        {ing.quantity && (
                          <span className="text-[11px] text-gray-400 truncate shrink-0">
                            • {ing.quantity}
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] shrink-0">
                        {ing.inPantry 
                          ? <span className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md font-bold">✓ Have</span> 
                          : <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md font-bold">
                              <svg className="w-3 h-3 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                              </svg>
                              Buy
                            </span>
                        }
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Instructions Side */}
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                  <span>Cooking Instructions</span>
                </h3>
                <span className="text-xs text-gray-400 font-medium">Click step when completed</span>
              </div>

              <div className="space-y-2.5">
                {recipe.instructions.map((step, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => toggleStep(idx)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex gap-3.5 ${
                      checkedSteps.includes(idx) 
                        ? "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 opacity-60" 
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-2xs"
                    }`}
                  >
                    <div className="shrink-0 pt-0.5">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${
                        checkedSteps.includes(idx) ? "bg-emerald-500 border-emerald-500 text-white" : "border-gray-300 dark:border-gray-600 text-gray-500"
                      }`}>
                        {checkedSteps.includes(idx) ? "✓" : idx + 1}
                      </div>
                    </div>
                    <p className={`text-xs sm:text-sm leading-relaxed ${checkedSteps.includes(idx) ? "text-gray-500 dark:text-gray-400 line-through" : "text-gray-800 dark:text-gray-200"}`}>
                      {step}
                    </p>
                  </div>
                ))}
              </div>

              {/* Progress Indicator */}
              <div className="mt-4 flex items-center gap-3 pt-2">
                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300" 
                    style={{ width: `${(checkedSteps.length / (recipe.instructions.length || 1)) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-gray-500">
                  {checkedSteps.length} of {recipe.instructions.length} Steps
                </span>
              </div>
            </div>
          </div>

          {/* User Feedback & Rating Section */}
          <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl p-5 mt-6 border border-gray-100 dark:border-gray-700/50">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Rate this Recipe</h3>
            {reviewSubmitted ? (
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Thank you! Your feedback helps us improve future suggestions.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110 focus:outline-none"
                    >
                      <svg
                        className={`w-8 h-8 ${
                          (hoverRating || rating) >= star
                            ? "text-amber-400 fill-amber-400"
                            : "text-gray-300 dark:text-gray-600"
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </button>
                  ))}
                </div>
                
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Optional: What did you think? What could be improved?"
                  className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-emerald-500/50 outline-none resize-none"
                  rows={2}
                />
                
                <button
                  disabled={rating === 0 || isSubmittingReview}
                  onClick={async () => {
                    setIsSubmittingReview(true);
                    try {
                      const uid = userProfile?.id || (typeof window !== "undefined" ? localStorage.getItem("guest_user_id") : null) || "00000000-0000-0000-0000-000000000001";
                      await fetch("/api/reviews", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          userId: uid,
                          recipeId: recipe.id || recipe.title,
                          recipeTitle: recipe.title,
                          rating,
                          reviewText
                        })
                      });
                      setReviewSubmitted(true);
                    } catch (e) {
                      console.error("Failed to submit review", e);
                    } finally {
                      setIsSubmittingReview(false);
                    }
                  }}
                  className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:hover:bg-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {isSubmittingReview ? "Submitting..." : "Submit Feedback"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 p-4 sm:p-5 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 flex justify-end">
          <button
            onClick={isDone ? undefined : handleCook}
            disabled={isCooking || isDone}
            className={`px-8 py-3 rounded-2xl font-bold text-sm shadow-lg transition-all ${
              isDone 
                ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 cursor-default" 
                : "bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-0.5 text-white shadow-emerald-600/30 active:scale-95"
            }`}
          >
            {isCooking ? "Adding..." : isDone ? "✓ Added to Cooking" : "Cook This Recipe"}
          </button>
        </div>

      </div>
    </div>
  );
}

