"use client";

import React, { useState, useEffect } from "react";
import { useApp, Recipe } from "@/context/AppContext";

export default function RecipeCookingModal() {
  const { selectedRecipe, closeRecipeModal, cookRecipe, toggleSaveRecipe, isRecipeSaved, userProfile } = useApp();

  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [checkedIngredients, setCheckedIngredients] = useState<string[]>([]);
  const [activeMacro, setActiveMacro] = useState<"protein" | "carbs" | "fat" | "fiber" | null>(null);

  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    if (selectedRecipe) {
      setCompletedSteps([]);
      setCheckedIngredients([]);
      setActiveMacro(null);
      setRating(0);
      setHoverRating(0);
      setReviewText("");
      setIsSubmittingReview(false);
      setReviewSubmitted(false);
    }
  }, [selectedRecipe]);

  if (!selectedRecipe) return null;

  const toggleStep = (idx: number) => {
    setCompletedSteps((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const toggleIngredient = (name: string) => {
    setCheckedIngredients((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const isSaved = isRecipeSaved(selectedRecipe.id);

  // Nutrition Macro Calculations for Interactive Pie Chart
  const proteinNum = parseFloat(selectedRecipe.protein?.replace(/[^0-9.]/g, "") || "18") || 18;
  const carbsNum = parseFloat(selectedRecipe.carbs?.replace(/[^0-9.]/g, "") || "45") || 45;
  const fatNum = parseFloat(selectedRecipe.fat?.replace(/[^0-9.]/g, "") || "12") || 12;
  const fiberNum = parseFloat(selectedRecipe.fiber?.replace(/[^0-9.]/g, "") || "6") || 6;

  const totalMacros = proteinNum + carbsNum + fatNum + fiberNum || 1;
  const circumference = 238.76; // 2 * pi * 38

  const proteinRatio = proteinNum / totalMacros;
  const carbsRatio = carbsNum / totalMacros;
  const fatRatio = fatNum / totalMacros;
  const fiberRatio = fiberNum / totalMacros;

  const proteinPct = Math.round(proteinRatio * 100);
  const carbsPct = Math.round(carbsRatio * 100);
  const fatPct = Math.round(fatRatio * 100);
  const fiberPct = Math.round(fiberRatio * 100);

  const proteinStroke = proteinRatio * circumference;
  const carbsStroke = carbsRatio * circumference;
  const fatStroke = fatRatio * circumference;
  const fiberStroke = fiberRatio * circumference;

  const proteinOffset = 0;
  const carbsOffset = proteinStroke;
  const fatOffset = proteinStroke + carbsStroke;
  const fiberOffset = proteinStroke + carbsStroke + fatStroke;

  const getIngredientUsageCount = (ingName: string): number => {
    if (!ingName || !selectedRecipe) return 1;
    const nameLower = ingName.toLowerCase().trim();
    const inArrayCount = selectedRecipe.ingredients.filter(
      (i) => i.name.toLowerCase().trim() === nameLower
    ).length;

    const ignoreWords = [
      "fresh", "block", "cloves", "clove", "ripe", "cooked", "steamed",
      "diced", "chopped", "sliced", "minced", "crumbled", "pureed", "cubed",
      "medium", "small", "large", "tbsp", "tsp", "cup", "portion", "raw", "pcs"
    ];
    const words = nameLower.split(/\s+/).filter((w) => !ignoreWords.includes(w) && w.length > 2);
    const searchWord = words.length > 0 ? words[0] : nameLower;

    let stepMentions = 0;
    (selectedRecipe.instructions || []).forEach((step) => {
      if (step.toLowerCase().includes(searchWord)) {
        stepMentions++;
      }
    });

    return Math.max(inArrayCount, stepMentions);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div 
        className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] shadow-2xl border border-gray-100 flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className={`p-6 text-white ${selectedRecipe.imageBg} relative shrink-0`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className="bg-white/20 backdrop-blur-md text-xs font-bold px-3 py-1 rounded-full flex items-center space-x-1.5 border border-white/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>{selectedRecipe.score}/100 Rescue Match</span>
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => toggleSaveRecipe(selectedRecipe.id)}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md transition-colors"
                title={isSaved ? "Saved to favorites" : "Save to favorites"}
              >
                <svg
                  className={`w-5 h-5 ${isSaved ? "text-amber-300 fill-current" : "text-white"}`}
                  viewBox="0 0 20 20"
                  fill={isSaved ? "currentColor" : "none"}
                  stroke="currentColor"
                >
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
              </button>
              <button
                onClick={closeRecipeModal}
                className="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md transition-colors text-white"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <h2 className="text-2xl font-bold mb-1 text-white">{selectedRecipe.title}</h2>
          <p className="text-xs text-white/80 line-clamp-2 max-w-xl">{selectedRecipe.desc}</p>

          <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-white/90">
            <span className="flex items-center space-x-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{selectedRecipe.timeMinutes} mins</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <svg className="w-4 h-4 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>{selectedRecipe.servings} servings</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-1">
              <svg className="w-4 h-4 text-amber-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
              <span>{selectedRecipe.cals} kcal</span>
            </span>
            <span>•</span>
            <span className="font-semibold text-emerald-200">{selectedRecipe.protein}</span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white dark:bg-gray-800 custom-scrollbar">
          {/* NUTRITION PIE CHART */}
          <div className="border border-gray-100 dark:border-gray-700/80 rounded-3xl p-5 transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-gray-900 dark:text-white tracking-tight">
                    Nutrition Breakdown
                  </h3>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Hover or tap slices to inspect macro distribution
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/40 px-3 py-1 rounded-full shrink-0">
                {selectedRecipe.cals || 410} kcal / serv
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
              {/* SVG Interactive Donut / Pie Chart (col-span-5) */}
              <div className="md:col-span-5 flex flex-col items-center justify-center">
                <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90 drop-shadow-xs" viewBox="0 0 100 100">
                    {/* Background Track Circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      className="stroke-gray-200/80 dark:stroke-gray-700/50 fill-none"
                      strokeWidth="9"
                    />

                    {/* Protein Slice (Emerald) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      className={`fill-none cursor-pointer transition-all duration-300 ${
                        activeMacro && activeMacro !== "protein" ? "opacity-30" : "opacity-100"
                      }`}
                      stroke="#10B981"
                      strokeWidth={activeMacro === "protein" ? 13 : 9}
                      strokeDasharray={`${proteinStroke} ${circumference - proteinStroke}`}
                      strokeDashoffset={-proteinOffset}
                      strokeLinecap="round"
                      onMouseEnter={() => setActiveMacro("protein")}
                      onMouseLeave={() => setActiveMacro(null)}
                      onClick={() => setActiveMacro(activeMacro === "protein" ? null : "protein")}
                    />

                    {/* Carbs Slice (Amber) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      className={`fill-none cursor-pointer transition-all duration-300 ${
                        activeMacro && activeMacro !== "carbs" ? "opacity-30" : "opacity-100"
                      }`}
                      stroke="#F59E0B"
                      strokeWidth={activeMacro === "carbs" ? 13 : 9}
                      strokeDasharray={`${carbsStroke} ${circumference - carbsStroke}`}
                      strokeDashoffset={-carbsOffset}
                      strokeLinecap="round"
                      onMouseEnter={() => setActiveMacro("carbs")}
                      onMouseLeave={() => setActiveMacro(null)}
                      onClick={() => setActiveMacro(activeMacro === "carbs" ? null : "carbs")}
                    />

                    {/* Fat Slice (Rose) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      className={`fill-none cursor-pointer transition-all duration-300 ${
                        activeMacro && activeMacro !== "fat" ? "opacity-30" : "opacity-100"
                      }`}
                      stroke="#F43F5E"
                      strokeWidth={activeMacro === "fat" ? 13 : 9}
                      strokeDasharray={`${fatStroke} ${circumference - fatStroke}`}
                      strokeDashoffset={-fatOffset}
                      strokeLinecap="round"
                      onMouseEnter={() => setActiveMacro("fat")}
                      onMouseLeave={() => setActiveMacro(null)}
                      onClick={() => setActiveMacro(activeMacro === "fat" ? null : "fat")}
                    />

                    {/* Fiber Slice (Purple) */}
                    <circle
                      cx="50"
                      cy="50"
                      r="38"
                      className={`fill-none cursor-pointer transition-all duration-300 ${
                        activeMacro && activeMacro !== "fiber" ? "opacity-30" : "opacity-100"
                      }`}
                      stroke="#8B5CF6"
                      strokeWidth={activeMacro === "fiber" ? 13 : 9}
                      strokeDasharray={`${fiberStroke} ${circumference - fiberStroke}`}
                      strokeDashoffset={-fiberOffset}
                      strokeLinecap="round"
                      onMouseEnter={() => setActiveMacro("fiber")}
                      onMouseLeave={() => setActiveMacro(null)}
                      onClick={() => setActiveMacro(activeMacro === "fiber" ? null : "fiber")}
                    />
                  </svg>

                  {/* Interactive Dynamic Center Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none px-2 transition-all">
                    {activeMacro === "protein" && (
                      <>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Protein</span>
                        <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-tight">{proteinNum}g</span>
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">{proteinPct}% share</span>
                      </>
                    )}
                    {activeMacro === "carbs" && (
                      <>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">Carbs</span>
                        <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-tight">{carbsNum}g</span>
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">{carbsPct}% share</span>
                      </>
                    )}
                    {activeMacro === "fat" && (
                      <>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-600 dark:text-rose-400">Fat</span>
                        <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-tight">{fatNum}g</span>
                        <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400">{fatPct}% share</span>
                      </>
                    )}
                    {activeMacro === "fiber" && (
                      <>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-400">Fiber</span>
                        <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-tight">{fiberNum}g</span>
                        <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400">{fiberPct}% share</span>
                      </>
                    )}
                    {!activeMacro && (
                      <>
                        <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-none">
                          {selectedRecipe.cals || 410}
                        </span>
                        <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 tracking-tight mt-0.5">
                          kcal total
                        </span>
                        <span className="text-[8px] font-medium text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                          Tap slice
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Interactive Macro Breakdown Cards (col-span-7) */}
              <div className="md:col-span-7 grid grid-cols-2 gap-3">
                {/* Protein Card */}
                <div
                  onMouseEnter={() => setActiveMacro("protein")}
                  onMouseLeave={() => setActiveMacro(null)}
                  onClick={() => setActiveMacro(activeMacro === "protein" ? null : "protein")}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                    activeMacro === "protein"
                      ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 dark:border-emerald-600 shadow-sm scale-102"
                      : "bg-white/90 dark:bg-gray-800/90 border-gray-100 dark:border-gray-700/80 hover:border-emerald-200 dark:hover:border-emerald-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Protein</span>
                    </div>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{selectedRecipe.protein || `${proteinNum}g`}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${proteinPct}%` }} />
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-1 text-right">{proteinPct}% of total macros</div>
                </div>

                {/* Carbs Card */}
                <div
                  onMouseEnter={() => setActiveMacro("carbs")}
                  onMouseLeave={() => setActiveMacro(null)}
                  onClick={() => setActiveMacro(activeMacro === "carbs" ? null : "carbs")}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                    activeMacro === "carbs"
                      ? "bg-amber-50 dark:bg-amber-950/60 border-amber-400 dark:border-amber-600 shadow-sm scale-102"
                      : "bg-white/90 dark:bg-gray-800/90 border-gray-100 dark:border-gray-700/80 hover:border-amber-200 dark:hover:border-amber-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
                      <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Carbs</span>
                    </div>
                    <span className="text-xs font-black text-amber-600 dark:text-amber-400">{selectedRecipe.carbs || `${carbsNum}g`}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${carbsPct}%` }} />
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-1 text-right">{carbsPct}% of total macros</div>
                </div>

                {/* Fat Card */}
                <div
                  onMouseEnter={() => setActiveMacro("fat")}
                  onMouseLeave={() => setActiveMacro(null)}
                  onClick={() => setActiveMacro(activeMacro === "fat" ? null : "fat")}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                    activeMacro === "fat"
                      ? "bg-rose-50 dark:bg-rose-950/60 border-rose-400 dark:border-rose-600 shadow-sm scale-102"
                      : "bg-white/90 dark:bg-gray-800/90 border-gray-100 dark:border-gray-700/80 hover:border-rose-200 dark:hover:border-rose-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0"></span>
                      <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Fat</span>
                    </div>
                    <span className="text-xs font-black text-rose-600 dark:text-rose-400">{selectedRecipe.fat || `${fatNum}g`}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full transition-all duration-300" style={{ width: `${fatPct}%` }} />
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-1 text-right">{fatPct}% of total macros</div>
                </div>

                {/* Fiber Card */}
                <div
                  onMouseEnter={() => setActiveMacro("fiber")}
                  onMouseLeave={() => setActiveMacro(null)}
                  onClick={() => setActiveMacro(activeMacro === "fiber" ? null : "fiber")}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer select-none ${
                    activeMacro === "fiber"
                      ? "bg-purple-50 dark:bg-purple-950/60 border-purple-400 dark:border-purple-600 shadow-sm scale-102"
                      : "bg-white/90 dark:bg-gray-800/90 border-gray-100 dark:border-gray-700/80 hover:border-purple-200 dark:hover:border-purple-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"></span>
                      <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300">Fiber</span>
                    </div>
                    <span className="text-xs font-black text-purple-600 dark:text-purple-400">{selectedRecipe.fiber || `${fiberNum}g`}</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full transition-all duration-300" style={{ width: `${fiberPct}%` }} />
                  </div>
                  <div className="text-[10px] text-gray-400 dark:text-gray-500 font-semibold mt-1 text-right">{fiberPct}% of total macros</div>
                </div>
              </div>
            </div>
          </div>

          {/* Ingredients Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center space-x-2">
                <span>Ingredients Checklist</span>
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 lowercase">
                  ({checkedIngredients.length}/{selectedRecipe.ingredients.length} prepped)
                </span>
              </h3>
              <span className="text-xs text-gray-400 dark:text-gray-500">Click to check off</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {selectedRecipe.ingredients.map((ing, idx) => {
                const isChecked = checkedIngredients.includes(ing.name);
                const usageCount = getIngredientUsageCount(ing.name);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleIngredient(ing.name)}
                    className={`flex items-start justify-between p-3 rounded-xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? "bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-700 opacity-60"
                        : "bg-white dark:bg-gray-900/60 border-gray-100 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-700 shadow-xs"
                    }`}
                  >
                    <div className="flex items-start space-x-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 dark:bg-gray-800 dark:border-gray-700 cursor-pointer"
                      />
                      <div>
                        <div className={`text-sm font-medium flex items-center gap-1.5 ${isChecked ? "line-through text-gray-400 dark:text-gray-500" : "text-gray-800 dark:text-gray-200"}`}>
                          <span>{ing.name}</span>
                          {usageCount > 1 && (
                            <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300/60 dark:border-emerald-700 px-1.5 py-0.2 rounded-md">
                              {usageCount}x
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{ing.quantity}</div>
                        {ing.substitution && (
                          <div className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded mt-1 border border-amber-100 dark:border-amber-900/50">
                            <svg className="w-3.5 h-3.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                            <span>{ing.substitution}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {ing.isUrgent && (
                        <span className="text-[10px] bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 font-bold px-1.5 py-0.5 rounded uppercase border border-red-100 dark:border-red-900/50">
                          Expiring
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cooking Instructions */}
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-3">
              Step-by-Step Instructions
            </h3>
            <div className="space-y-3">
              {selectedRecipe.instructions.map((step, idx) => {
                const isDone = completedSteps.includes(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => toggleStep(idx)}
                    className={`flex items-start space-x-3.5 p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isDone
                        ? "bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50"
                        : "bg-white dark:bg-gray-900/60 border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600 shadow-xs"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        isDone ? "bg-emerald-600 text-white dark:bg-emerald-500" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {isDone ? "✓" : idx + 1}
                    </div>
                    <p className={`text-sm leading-relaxed flex-1 ${isDone ? "text-gray-500 dark:text-gray-400 line-through" : "text-gray-700 dark:text-gray-200"}`}>
                      {step}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* User Feedback & Rating Section */}
          <div className="bg-gray-50 dark:bg-gray-800/40 rounded-2xl p-5 mt-8 border border-gray-100 dark:border-gray-700/50">
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
                          recipeId: selectedRecipe.id || selectedRecipe.title,
                          recipeTitle: selectedRecipe.title,
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

        {/* Modal Sticky Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Rescues <strong className="text-emerald-700 dark:text-emerald-400 font-semibold">{selectedRecipe.ingredients.filter(i => i.inPantry).length} pantry items</strong>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={closeRecipeModal}
              className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              Close
            </button>
            <button
              onClick={() => cookRecipe(selectedRecipe)}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md flex items-center space-x-2 transition-all transform active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>I Cooked This (Rescue & Deduct)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
