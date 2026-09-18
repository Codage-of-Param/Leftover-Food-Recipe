"use client";

import React from "react";
import { useApp, Recipe } from "@/context/AppContext";

export default function RecipeCard({ recipe }: { recipe: Recipe }) {
  const { openRecipeModal, toggleSaveRecipe, isRecipeSaved, setSearchQuery, setActiveTab } = useApp();

  const isSaved = isRecipeSaved(recipe.id);

  const handleCardClick = () => {
    openRecipeModal(recipe);
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleSaveRecipe(recipe.id, recipe);
  };

  const handleIngredientClick = (e: React.MouseEvent, ingName: string) => {
    e.stopPropagation();
    setSearchQuery(ingName.split(" ")[0]);
    setActiveTab("recipes");
  };

  return (
    <div 
      onClick={handleCardClick}
      className="bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-xs border border-gray-100 dark:border-gray-700 flex flex-col hover:shadow-lg hover:border-emerald-100 dark:hover:border-emerald-900 transition-all cursor-pointer group transform hover:-translate-y-0.5"
    >
      {/* Image Area */}
      <div className={`h-48 ${recipe.imageBg} relative p-4 flex flex-col justify-between items-start text-white`}>
        <div className="flex items-center space-x-2">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md text-xs font-bold text-gray-900 dark:text-gray-100 px-2.5 py-1 rounded-lg flex items-center space-x-1 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{recipe.score} <span className="opacity-60 font-normal">/100</span></span>
          </div>

          {recipe.isFromFridgeScan && (
            <div className="bg-emerald-700/90 text-white backdrop-blur-md text-[11px] font-bold px-2.5 py-1 rounded-lg flex items-center space-x-1.5 shadow-xs border border-emerald-400/40">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>From Fridge Scan</span>
            </div>
          )}
        </div>

        <button
          onClick={handleBookmark}
          className="absolute top-4 right-4 bg-white/70 dark:bg-gray-900/70 hover:bg-white dark:hover:bg-gray-900 backdrop-blur-md p-2 rounded-full transition-all shadow-xs"
          title={isSaved ? "Remove from saved" : "Save recipe"}
        >
          <svg 
            className={`w-4 h-4 transition-colors ${isSaved ? "text-amber-500 fill-current" : "text-gray-700 dark:text-gray-300"}`} 
            viewBox="0 0 20 20"
            fill={isSaved ? "currentColor" : "none"}
            stroke="currentColor"
          >
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
          </svg>
        </button>

      </div>
      
      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center text-emerald-700 dark:text-emerald-400 text-xs font-semibold space-x-1.5 mb-2">
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span>Uses {recipe.ingredients.filter(i => i.inPantry).length}/{recipe.ingredients.length} pantry items</span>
        </div>
        
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1.5 group-hover:text-emerald-800 dark:group-hover:text-emerald-400 transition-colors">
          {recipe.title}
        </h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
          {recipe.desc}
        </p>
        
        {/* Ingredient Chips */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {recipe.ingredients.map((ing, i) => (
            <span 
              key={i}
              onClick={(e) => handleIngredientClick(e, ing.name)}
              className={`text-[11px] px-2.5 py-0.5 rounded-md font-medium border transition-all hover:opacity-85 active:scale-95 cursor-pointer ${
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
        
        <div className="mt-auto">
          <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400 mb-4">
            <span className="flex items-center space-x-1">
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span>{recipe.timeMinutes}m</span>
            </span>
            <span className="flex items-center space-x-1">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>{recipe.servings} serv</span>
            </span>
            <span className="flex items-center space-x-1">
              <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
              <span>{recipe.cals} kcal</span>
            </span>
            <span className="font-semibold text-gray-800 dark:text-gray-200">{recipe.protein}</span>
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              openRecipeModal(recipe);
            }}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-xs group-hover:shadow-md active:scale-98 text-xs"
          >
            <span>Cook Now</span>
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
