"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";

export interface ScannedIngredient {
  id: string;
  name: string;
  confidence: number;
  tier: "high" | "medium" | "low";
}

export interface FridgeScanCardProps {
  imageUrl?: string;
  ingredients: ScannedIngredient[];
  onGenerateRecipes?: (ingredientNames: string[]) => void;
}

export default function FridgeScanCard({
  imageUrl,
  ingredients,
  onGenerateRecipes,
}: FridgeScanCardProps) {
  const { addInventoryItem, showToast } = useApp();
  const [addedItems, setAddedItems] = useState<Record<string, boolean>>({});
  const [allAdded, setAllAdded] = useState(false);

  // Group duplicate ingredients by base name and sum counts
  const consolidatedIngredients = React.useMemo(() => {
    const grouped: Record<string, { id: string; baseName: string; count: number; maxConfidence: number; tier: "high" | "medium" | "low" }> = {};

    ingredients.forEach((ing) => {
      let base = ing.name.trim();
      let count = 1;

      const match = base.match(/^(.+?)\s*\((?:x|qty:\s*)(\d+)\)$/i);
      if (match) {
        base = match[1].trim();
        count = parseInt(match[2], 10) || 1;
      }

      const key = base.toLowerCase();
      if (!grouped[key]) {
        grouped[key] = {
          id: ing.id,
          baseName: base,
          count: count,
          maxConfidence: ing.confidence,
          tier: ing.tier,
        };
      } else {
        grouped[key].count += count;
        grouped[key].maxConfidence = Math.max(grouped[key].maxConfidence, ing.confidence);
        if (ing.tier === "high" || (ing.tier === "medium" && grouped[key].tier === "low")) {
          grouped[key].tier = ing.tier;
        }
      }
    });

    return Object.values(grouped).map((g) => ({
      id: g.id,
      name: g.count > 1 ? `${g.baseName.charAt(0).toUpperCase() + g.baseName.slice(1)} (x${g.count})` : `${g.baseName.charAt(0).toUpperCase() + g.baseName.slice(1)}`,
      baseName: g.baseName,
      count: g.count,
      confidence: g.maxConfidence,
      tier: g.tier,
    }));
  }, [ingredients]);

  const handleAddAllToPantry = () => {
    if (consolidatedIngredients.length === 0) return;

    const cats = ["Produce", "Dairy", "Pantry", "Proteins", "Grains"] as const;
    
    consolidatedIngredients.forEach((ing) => {
      const randomCat = cats[Math.floor(Math.random() * cats.length)];
      const qtyStr = ing.count > 1 ? `${ing.count} units` : "1 unit";
      addInventoryItem(ing.baseName, qtyStr, randomCat, 5, ing.tier === "high");
    });

    const newAddedState: Record<string, boolean> = {};
    consolidatedIngredients.forEach((ing) => (newAddedState[ing.id] = true));
    setAddedItems(newAddedState);
    setAllAdded(true);

    showToast(`Added ${consolidatedIngredients.length} ingredients to kitchen pantry!`, "success");
  };

  const handleAddSingleItem = (ing: any) => {
    const cats = ["Produce", "Dairy", "Pantry", "Proteins", "Grains"] as const;
    const randomCat = cats[Math.floor(Math.random() * cats.length)];
    const qtyStr = ing.count > 1 ? `${ing.count} units` : "1 unit";
    addInventoryItem(ing.baseName || ing.name, qtyStr, randomCat, 5, ing.tier === "high");

    setAddedItems((prev) => ({ ...prev, [ing.id]: true }));
    showToast(`Added "${ing.name}" to pantry!`, "success");
  };

  const handleTriggerRecipeGen = () => {
    const ingredientNames = consolidatedIngredients.map((i) => i.name);
    if (onGenerateRecipes) {
      onGenerateRecipes(ingredientNames);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl p-4 shadow-sm my-2 text-gray-900 dark:text-gray-100 max-w-full">
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-3 mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-extrabold text-sm text-gray-900 dark:text-white tracking-tight">
              Fridge Photo Scan Results
            </h4>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
              Detected {consolidatedIngredients.length} edible food items
            </span>
          </div>
        </div>
        <span className="text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full uppercase tracking-wider">
          AI Vision
        </span>
      </div>

      {/* Image Preview & Bounding Box Section if available */}
      {imageUrl && (
        <div className="mb-3 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 max-h-48 relative">
          <img src={imageUrl} alt="Scanned fridge" className="w-full h-48 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-2">
            <span className="text-[10px] text-white/90 font-medium">Original upload analyzed by Gemini Vision AI</span>
          </div>
        </div>
      )}

      {/* Ingredients List */}
      <div className="space-y-2 mb-4">
        {consolidatedIngredients.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">No food items detected in photo.</p>
        ) : (
          consolidatedIngredients.map((ing) => {
            const isAdded = addedItems[ing.id] || allAdded;
            return (
              <div
                key={ing.id}
                className={`flex items-center justify-between p-2.5 px-3.5 rounded-xl border text-xs shadow-2xs transition-all ${
                  ing.tier === "high" || ing.confidence >= 90
                    ? "bg-gradient-to-r from-emerald-900/35 via-emerald-800/15 to-transparent dark:from-emerald-950/90 dark:via-emerald-900/50 dark:to-transparent border-emerald-600/40 dark:border-emerald-700/60 text-gray-900 dark:text-white"
                    : ing.tier === "low" || ing.confidence < 60
                    ? "bg-gradient-to-r from-red-900/35 via-orange-800/20 to-transparent dark:from-red-950/90 dark:via-orange-950/60 dark:to-transparent border-red-500/40 dark:border-rose-700/60 text-gray-900 dark:text-white"
                    : "bg-gradient-to-r from-amber-900/25 via-amber-800/10 to-transparent dark:from-amber-950/70 dark:via-amber-900/35 dark:to-transparent border-amber-500/40 dark:border-amber-700/60 text-gray-900 dark:text-white"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <span className="font-extrabold text-sm capitalize text-gray-900 dark:text-white tracking-wide">
                    {ing.name}
                  </span>

                  {/* Confidence Tier Badge */}
                  {(ing.tier === "high" || ing.confidence >= 90) && (
                    <span className="text-[10px] font-bold bg-emerald-900/25 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border border-emerald-600/40 px-2 py-0.5 rounded-md flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                      <span>{ing.confidence}% High</span>
                    </span>
                  )}
                  {ing.tier === "medium" && ing.confidence >= 60 && ing.confidence < 90 && (
                    <span className="text-[10px] font-bold bg-amber-200/50 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded-md flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block"></span>
                      <span>{ing.confidence}% Medium</span>
                    </span>
                  )}
                  {(ing.tier === "low" || ing.confidence < 60) && (
                    <span className="text-[10px] font-bold bg-gradient-to-r from-red-500/25 to-orange-500/25 text-red-900 dark:text-orange-300 border border-red-500/40 px-2 py-0.5 rounded-md flex items-center space-x-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block"></span>
                      <span>{ing.confidence}% Low</span>
                    </span>
                  )}
                </div>

                <button
                  onClick={() => handleAddSingleItem(ing)}
                  disabled={isAdded}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                    isAdded
                      ? "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-default"
                      : "bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 active:scale-95"
                  }`}
                >
                  {isAdded ? "✓ Added" : "+ Add"}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Card Action Buttons */}
      {ingredients.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={handleAddAllToPantry}
            disabled={allAdded}
            className={`w-full sm:w-1/2 py-2 px-3 text-xs font-bold rounded-xl flex items-center justify-center space-x-1.5 transition-all shadow-xs active:scale-95 ${
              allAdded
                ? "bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-default"
                : "bg-emerald-600 hover:bg-emerald-700 text-white"
            }`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>{allAdded ? "All Added to Pantry" : "Add All to Pantry"}</span>
          </button>

          <button
            onClick={handleTriggerRecipeGen}
            className="w-full sm:w-1/2 py-2 px-3 text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60 rounded-xl flex items-center justify-center space-x-1.5 transition-all active:scale-95"
          >
            <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>Generate Recipes</span>
          </button>
        </div>
      )}
    </div>
  );
}
