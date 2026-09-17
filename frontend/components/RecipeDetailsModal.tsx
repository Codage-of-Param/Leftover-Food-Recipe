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
  const [checkedIngredients, setCheckedIngredients] = useState<number[]>([]);
  const [activeMacro, setActiveMacro] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const { userProfile } = useApp();

  const handleCook = async () => {
    setIsCooking(true);
    const fullRecipe = {
      id: recipe.id || `chat-rec-${Date.now()}`,
      title: recipe.title,
      desc: recipe.desc || "",
      imageBg: "bg-emerald-800",
      score: recipe.score || 95,
      wasteSaved: 3.50,
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

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients(prev => 
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const getIngredientUsageCount = (ingName: string): number => {
    if (!ingName) return 1;
    const nameLower = ingName.toLowerCase().trim();
    const ignoreWords = [
      "fresh", "block", "cloves", "clove", "ripe", "cooked", "steamed",
      "diced", "chopped", "sliced", "minced", "crumbled", "pureed", "cubed",
      "medium", "small", "large", "tbsp", "tsp", "cup", "portion", "raw", "pcs"
    ];
    const words = nameLower.split(/\s+/).filter((w) => !ignoreWords.includes(w) && w.length > 2);
    const searchWord = words.length > 0 ? words[0] : nameLower;
    let stepMentions = 0;
    (recipe.instructions || []).forEach((step) => {
      if (step.toLowerCase().includes(searchWord)) stepMentions++;
    });
    return Math.max(1, stepMentions);
  };

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

  const totalMacros = (proteinNum + carbsNum + fatNum + fiberNum) || 100;
  const proteinPct = Math.round((proteinNum / totalMacros) * 100);
  const carbsPct = Math.round((carbsNum / totalMacros) * 100);
  const fatPct = Math.round((fatNum / totalMacros) * 100);
  const fiberPct = Math.round((fiberNum / totalMacros) * 100);

  const c = 2 * Math.PI * 50;
  const getOffset = (pctOffset: number) => - (pctOffset / 100) * c;

  const totalIngredients = recipe.ingredients.length;
  const availableIngredients = recipe.ingredients.filter(i => i.inPantry !== false).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200 p-4 sm:p-6">
      <div className="bg-[#1C1815] rounded-[2rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col relative border border-[#3A332C]">
        
        {/* Scrollable Content */}
        <div className="overflow-y-auto flex-1 chat-scrollbar">
          
          {/* Header Section */}
          <div className="bg-[#0B4A3A] p-6 sm:p-8 relative">
            <div className="flex justify-between items-start mb-6">
              <span className="inline-flex items-center gap-2 bg-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full border border-white/20">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                {recipe.score || 97}/100 Rescue Match
              </span>
              <div className="flex gap-2">
                <button className="w-10 h-10 bg-white/10 hover:bg-white/20 transition-colors rounded-full flex items-center justify-center text-white/80 hover:text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
                <button onClick={onClose} className="w-10 h-10 bg-white/10 hover:bg-white/20 transition-colors rounded-full flex items-center justify-center text-white/80 hover:text-white">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">{recipe.title}</h1>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed mb-6 max-w-3xl">
              {recipe.desc || `A vibrant zero-waste skillet meal formulated directly from your scanned fridge ingredients: ${recipe.ingredients.map(i => i.name).join(", ")}.`}
            </p>

            <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-white/90 text-sm font-semibold">
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {recipe.timeMinutes || 20} mins
              </div>
              <span className="text-white/40">•</span>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {recipe.servings || 2} servings
              </div>
              <span className="text-white/40">•</span>
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                </svg>
                {recipe.cals || 380} kcal
              </div>
              <span className="text-white/40">•</span>
              <div className="flex items-center gap-1.5 font-bold text-white">
                {recipe.protein || "0g"} Protein
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 bg-[#1C1815]">
            
            {/* Nutrition Breakdown */}
            <div className="bg-[#241F1C] border border-[#3A332C] rounded-3xl p-6 mb-10">
              <div className="flex items-start justify-between mb-8">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-[#0B4A3A] flex items-center justify-center text-emerald-400 shrink-0">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Nutrition Breakdown</h3>
                    <p className="text-sm text-gray-400">Hover or tap slices to inspect macro distribution</p>
                  </div>
                </div>
                <div className="bg-[#1B3527] text-[#4FBE7F] px-3 py-1 rounded-full text-xs font-bold shrink-0">
                  {recipe.cals || 380} kcal / serv
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Donut Chart SVG */}
                <div className="relative w-48 h-48 shrink-0 group">
                  <svg className="w-full h-full -rotate-90 overflow-visible" viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="50" fill="transparent" stroke="#2A231F" strokeWidth="12" />
                    
                    <circle 
                      cx="60" cy="60" r="50" fill="transparent" stroke="#F0803F" 
                      strokeWidth={activeMacro === 'protein' ? "16" : "12"} 
                      strokeDasharray={`${(proteinPct/100)*c} ${c}`} 
                      strokeDashoffset={getOffset(0)} 
                      onMouseEnter={() => setActiveMacro('protein')}
                      onMouseLeave={() => setActiveMacro(null)}
                      onClick={() => setActiveMacro('protein')}
                      className={`transition-all duration-300 cursor-pointer ${activeMacro && activeMacro !== 'protein' ? 'opacity-30' : 'opacity-100 hover:drop-shadow-[0_0_8px_rgba(240,128,63,0.5)]'}`} 
                    />
                    <circle 
                      cx="60" cy="60" r="50" fill="transparent" stroke="#F4A736" 
                      strokeWidth={activeMacro === 'carbs' ? "16" : "12"} 
                      strokeDasharray={`${(carbsPct/100)*c} ${c}`} 
                      strokeDashoffset={getOffset(proteinPct)} 
                      onMouseEnter={() => setActiveMacro('carbs')}
                      onMouseLeave={() => setActiveMacro(null)}
                      onClick={() => setActiveMacro('carbs')}
                      className={`transition-all duration-300 cursor-pointer ${activeMacro && activeMacro !== 'carbs' ? 'opacity-30' : 'opacity-100 hover:drop-shadow-[0_0_8px_rgba(244,167,54,0.5)]'}`} 
                    />
                    <circle 
                      cx="60" cy="60" r="50" fill="transparent" stroke="#E56A6A" 
                      strokeWidth={activeMacro === 'fat' ? "16" : "12"} 
                      strokeDasharray={`${(fatPct/100)*c} ${c}`} 
                      strokeDashoffset={getOffset(proteinPct + carbsPct)} 
                      onMouseEnter={() => setActiveMacro('fat')}
                      onMouseLeave={() => setActiveMacro(null)}
                      onClick={() => setActiveMacro('fat')}
                      className={`transition-all duration-300 cursor-pointer ${activeMacro && activeMacro !== 'fat' ? 'opacity-30' : 'opacity-100 hover:drop-shadow-[0_0_8px_rgba(229,106,106,0.5)]'}`} 
                    />
                    <circle 
                      cx="60" cy="60" r="50" fill="transparent" stroke="#A855F7" 
                      strokeWidth={activeMacro === 'fiber' ? "16" : "12"} 
                      strokeDasharray={`${(fiberPct/100)*c} ${c}`} 
                      strokeDashoffset={getOffset(proteinPct + carbsPct + fatPct)} 
                      onMouseEnter={() => setActiveMacro('fiber')}
                      onMouseLeave={() => setActiveMacro(null)}
                      onClick={() => setActiveMacro('fiber')}
                      className={`transition-all duration-300 cursor-pointer ${activeMacro && activeMacro !== 'fiber' ? 'opacity-30' : 'opacity-100 hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]'}`} 
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none transition-colors duration-300">
                    {activeMacro === 'protein' ? (
                      <>
                        <span className="text-2xl font-black text-[#F0803F]">{recipe.protein || "0g"}</span>
                        <span className="text-[10px] text-[#F0803F] font-bold uppercase mt-0.5">Protein</span>
                      </>
                    ) : activeMacro === 'carbs' ? (
                      <>
                        <span className="text-2xl font-black text-[#F4A736]">{recipe.carbs || "0g"}</span>
                        <span className="text-[10px] text-[#F4A736] font-bold uppercase mt-0.5">Carbs</span>
                      </>
                    ) : activeMacro === 'fat' ? (
                      <>
                        <span className="text-2xl font-black text-[#E56A6A]">{recipe.fat || "0g"}</span>
                        <span className="text-[10px] text-[#E56A6A] font-bold uppercase mt-0.5">Fat</span>
                      </>
                    ) : activeMacro === 'fiber' ? (
                      <>
                        <span className="text-2xl font-black text-[#A855F7]">{recipe.fiber || "0g"}</span>
                        <span className="text-[10px] text-[#A855F7] font-bold uppercase mt-0.5">Fiber</span>
                      </>
                    ) : (
                      <>
                        <span className="text-2xl font-black text-white">{recipe.cals || 380}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">kcal total</span>
                        <span className="text-[10px] text-emerald-500 font-bold mt-1">Tap slice</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Macro Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  {/* Protein */}
                  <div 
                    onMouseEnter={() => setActiveMacro('protein')}
                    onMouseLeave={() => setActiveMacro(null)}
                    className={`bg-[#1e2029] border rounded-2xl p-4 flex flex-col justify-between h-24 transition-all duration-300 cursor-default ${activeMacro === 'protein' ? 'border-[#F0803F]/50 bg-[#1e2029]/80 shadow-[0_0_15px_rgba(240,128,63,0.1)]' : 'border-[#2b2d39]'}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F0803F]"></span>
                        <span className="text-sm font-semibold text-gray-300">Protein</span>
                      </div>
                      <span className="text-base font-bold text-[#F0803F]">{recipe.protein || "0g"}</span>
                    </div>
                    <div>
                      <div className="w-full h-1.5 bg-[#2b2d39] rounded-full overflow-hidden mb-1.5">
                        <div className="h-full bg-[#F0803F] rounded-full transition-all duration-1000" style={{ width: `${proteinPct}%` }}></div>
                      </div>
                      <p className="text-[10px] text-gray-500 text-right">{proteinPct}% of total macros</p>
                    </div>
                  </div>

                  {/* Carbs */}
                  <div 
                    onMouseEnter={() => setActiveMacro('carbs')}
                    onMouseLeave={() => setActiveMacro(null)}
                    className={`bg-[#1e2029] border rounded-2xl p-4 flex flex-col justify-between h-24 transition-all duration-300 cursor-default ${activeMacro === 'carbs' ? 'border-[#F4A736]/50 bg-[#1e2029]/80 shadow-[0_0_15px_rgba(244,167,54,0.1)]' : 'border-[#2b2d39]'}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#F4A736]"></span>
                        <span className="text-sm font-semibold text-gray-300">Carbs</span>
                      </div>
                      <span className="text-base font-bold text-[#F4A736]">{recipe.carbs || "0g"}</span>
                    </div>
                    <div>
                      <div className="w-full h-1.5 bg-[#2b2d39] rounded-full overflow-hidden mb-1.5">
                        <div className="h-full bg-[#F4A736] rounded-full transition-all duration-1000" style={{ width: `${carbsPct}%` }}></div>
                      </div>
                      <p className="text-[10px] text-gray-500 text-right">{carbsPct}% of total macros</p>
                    </div>
                  </div>

                  {/* Fat */}
                  <div 
                    onMouseEnter={() => setActiveMacro('fat')}
                    onMouseLeave={() => setActiveMacro(null)}
                    className={`bg-[#1e2029] border rounded-2xl p-4 flex flex-col justify-between h-24 transition-all duration-300 cursor-default ${activeMacro === 'fat' ? 'border-[#E56A6A]/50 bg-[#1e2029]/80 shadow-[0_0_15px_rgba(229,106,106,0.1)]' : 'border-[#2b2d39]'}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#E56A6A]"></span>
                        <span className="text-sm font-semibold text-gray-300">Fat</span>
                      </div>
                      <span className="text-base font-bold text-[#E56A6A]">{recipe.fat || "0g"}</span>
                    </div>
                    <div>
                      <div className="w-full h-1.5 bg-[#2b2d39] rounded-full overflow-hidden mb-1.5">
                        <div className="h-full bg-[#E56A6A] rounded-full transition-all duration-1000" style={{ width: `${fatPct}%` }}></div>
                      </div>
                      <p className="text-[10px] text-gray-500 text-right">{fatPct}% of total macros</p>
                    </div>
                  </div>

                  {/* Fiber */}
                  <div 
                    onMouseEnter={() => setActiveMacro('fiber')}
                    onMouseLeave={() => setActiveMacro(null)}
                    className={`bg-[#1e2029] border rounded-2xl p-4 flex flex-col justify-between h-24 transition-all duration-300 cursor-default ${activeMacro === 'fiber' ? 'border-[#A855F7]/50 bg-[#1e2029]/80 shadow-[0_0_15px_rgba(168,85,247,0.1)]' : 'border-[#2b2d39]'}`}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7]"></span>
                        <span className="text-sm font-semibold text-gray-300">Fiber</span>
                      </div>
                      <span className="text-base font-bold text-[#A855F7]">{recipe.fiber || "0g"}</span>
                    </div>
                    <div>
                      <div className="w-full h-1.5 bg-[#2b2d39] rounded-full overflow-hidden mb-1.5">
                        <div className="h-full bg-[#A855F7] rounded-full transition-all duration-1000" style={{ width: `${fiberPct}%` }}></div>
                      </div>
                      <p className="text-[10px] text-gray-500 text-right">{fiberPct}% of total macros</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ingredients Checklist */}
            <div className="mb-10">
              <div className="flex justify-between items-end mb-4 border-b border-[#3A332C] pb-3">
                <h3 className="text-lg font-bold text-white uppercase tracking-wide">
                  Ingredients Checklist <span className="text-gray-500 font-normal normal-case text-sm ml-2">({checkedIngredients.length}/{recipe.ingredients.length} prepped)</span>
                </h3>
                <span className="text-xs text-gray-500">Click to check off</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {recipe.ingredients.map((ing, idx) => {
                  const usageCount = getIngredientUsageCount(ing.name);
                  const isChecked = checkedIngredients.includes(idx);
                  return (
                    <div 
                      key={idx} 
                      onClick={() => toggleIngredient(idx)}
                      className={`flex items-center p-4 border rounded-xl cursor-pointer transition-colors ${
                        isChecked ? 'bg-[#2A231F] border-[#4A433C] opacity-60' : 'bg-[#241F1C] border-[#3A332C] hover:border-[#F0803F]/50'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded flex items-center justify-center mr-4 border transition-colors shrink-0 ${
                        isChecked ? 'bg-white border-white text-[#241F1C]' : 'border-gray-500 bg-transparent'
                      }`}>
                        {isChecked && (
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex flex-col">
                        <div className={`text-sm font-bold flex items-center gap-2 ${isChecked ? 'text-gray-400 line-through' : 'text-white'}`}>
                          {ing.name}
                          {usageCount > 1 && (
                            <span className="bg-[#1B3527] text-[#4FBE7F] text-[10px] px-1.5 py-0.5 rounded font-extrabold no-underline">
                              {usageCount}x
                            </span>
                          )}
                        </div>
                        <div className="text-gray-500 text-xs mt-0.5">{ing.quantity}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Cooking Instructions */}
            <div className="mb-10">
              <div className="flex justify-between items-end mb-4 border-b border-[#3A332C] pb-3">
                <h3 className="text-lg font-bold text-white uppercase tracking-wide">
                  Step-by-Step Instructions
                </h3>
                <span className="text-xs text-gray-500">{checkedSteps.length}/{recipe.instructions.length} done</span>
              </div>

              <div className="space-y-3">
                {recipe.instructions.map((step, idx) => {
                  const isChecked = checkedSteps.includes(idx);
                  return (
                    <div 
                      key={idx} 
                      onClick={() => toggleStep(idx)}
                      className={`flex gap-4 p-5 rounded-2xl border transition-colors cursor-pointer ${
                        isChecked 
                          ? 'bg-[#1B3527]/20 border-[#1B3527] opacity-60' 
                          : 'bg-[#241F1C] border-[#3A332C] hover:border-[#F0803F]/30'
                      }`}
                    >
                      <div className="shrink-0 pt-0.5">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                          isChecked ? 'bg-emerald-500 text-white' : 'bg-[#3A332C] text-gray-400'
                        }`}>
                          {isChecked ? '✓' : idx + 1}
                        </div>
                      </div>
                      <p className={`text-sm leading-relaxed ${isChecked ? 'text-gray-500 line-through' : 'text-gray-300'}`}>
                        {step}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Rating */}
            <div className="bg-[#241F1C] border border-[#3A332C] rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Rate this Recipe</h3>
              {reviewSubmitted ? (
                <div className="flex items-center gap-2 text-emerald-400 font-medium">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Thank you! Your feedback helps us improve.
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
                              ? "text-[#F4A736] fill-[#F4A736]"
                              : "text-[#3A332C]"
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
                    className="w-full bg-[#1C1815] border border-[#3A332C] rounded-xl p-4 text-sm text-white focus:ring-2 focus:ring-[#F0803F]/50 focus:border-[#F0803F]/50 outline-none resize-none"
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
                    className="px-6 py-2.5 bg-[#F0803F] hover:bg-[#F29255] text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    {isSubmittingReview ? "Submitting..." : "Submit Feedback"}
                  </button>
                </div>
              )}
            </div>
            
          </div>
        </div>

        {/* Action Footer */}
        <div className="bg-[#181512] border-t border-[#3A332C] p-4 sm:px-8 sm:py-5 flex items-center justify-between z-20 shrink-0">
          <div className="text-gray-400 text-sm hidden sm:block">
            Rescues <span className="text-[#F0803F] font-bold">{availableIngredients} pantry items</span>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
            <button onClick={onClose} className="text-gray-400 font-bold hover:text-white px-2">Close</button>
            <button
              onClick={isDone ? undefined : handleCook}
              disabled={isCooking || isDone}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                isDone 
                  ? "bg-[#1B3527] text-[#4FBE7F] cursor-default" 
                  : "bg-[#F0803F] hover:bg-[#F29255] text-white shadow-lg shadow-[#F0803F]/20 active:scale-95"
              }`}
            >
              {isDone ? (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Cooked
                </>
              ) : (
                <>
                  {isCooking ? "Adding..." : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      I Cooked This (Rescue & Deduct)
                    </>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
