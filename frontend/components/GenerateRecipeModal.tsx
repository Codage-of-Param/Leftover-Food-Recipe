"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";

export default function GenerateRecipeModal() {
  const { 
    isGenerateModalOpen, 
    setIsGenerateModalOpen, 
    dietaryPreference,
    allergies,
    maxCookingTime,
    inventory,
    setRecipes,
    setActiveTab,
    showToast
  } = useApp();

  const [localDiet, setLocalDiet] = useState(dietaryPreference);
  const [localAllergies, setLocalAllergies] = useState(allergies.join(", "));
  const [localTime, setLocalTime] = useState(maxCookingTime);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync defaults when opened
  React.useEffect(() => {
    if (isGenerateModalOpen) {
      setLocalDiet(dietaryPreference);
      setLocalAllergies(allergies.join(", "));
      setLocalTime(maxCookingTime);
      setErrorMessage(null);
    }
  }, [isGenerateModalOpen, dietaryPreference, allergies, maxCookingTime]);

  if (!isGenerateModalOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMessage(null);
    try {
      const allergyList = localAllergies.split(",").map(a => a.trim()).filter(Boolean);
      
      const payload = {
        inventory: inventory,
        preferences: localDiet,
        allergies: allergyList,
        maxCookingTime: localTime
      };

      console.log("Sending request to http://localhost:8000/api/v1/generate with payload:", payload);
      const res = await fetch("http://localhost:8000/api/v1/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      console.log("Response status:", res.status, res.statusText);

      if (!res.ok) {
        const errText = await res.text();
        console.error("Backend Error Response:", errText);
        const msg = `Failed to generate recipes (${res.status}): ${errText}`;
        setErrorMessage(msg);
        showToast(msg, "error");
        return;
      }

      const data = await res.json();
      
      // Update Context with the AI generated recipes
      setRecipes(data.recipes);
      showToast("Recipes generated successfully!", "success");
      setIsGenerateModalOpen(false);
      setActiveTab("recipes");
    } catch (error: any) {
      console.error("Failed to generate recipes:", error);
      const msg = error?.message === "Failed to fetch"
        ? "Unable to connect to server at http://localhost:8000. Please check if the backend API is running."
        : `Error generating recipes: ${error?.message || error}`;
      setErrorMessage(msg);
      showToast(msg, "error");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex flex-col justify-end sm:justify-center items-center bg-gray-900/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Recipes
          </h2>
          <button 
            onClick={() => setIsGenerateModalOpen(false)}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-sm flex items-start gap-3 relative z-10 animate-fade-in shadow-sm">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-semibold text-xs uppercase tracking-wider text-red-600 dark:text-red-400 mb-0.5">Connection Alert</p>
                <p className="text-sm leading-relaxed">{errorMessage}</p>
              </div>
              <button 
                onClick={() => setErrorMessage(null)} 
                className="text-red-400 hover:text-red-600 dark:hover:text-red-200 p-1 transition-colors"
                title="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <p className="text-sm text-gray-600 dark:text-gray-300">
            Customize the AI generator settings for this specific meal, or leave as your default profile settings.
          </p>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Dietary Preference
            </label>
            <select
              value={localDiet}
              onChange={(e) => setLocalDiet(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="Any">Any / No Restriction</option>
              <option value="Vegetarian">Vegetarian</option>
              <option value="Vegan">Vegan</option>
              <option value="Pescatarian">Pescatarian</option>
              <option value="Keto">Keto</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Allergies / Ingredients to Avoid
            </label>
            <input
              type="text"
              value={localAllergies}
              onChange={(e) => setLocalAllergies(e.target.value)}
              placeholder="e.g. Peanuts, Dairy, Gluten"
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Max Cooking Time ({localTime} mins)
            </label>
            <input
              type="range"
              min="5"
              max="120"
              step="5"
              value={localTime}
              onChange={(e) => setLocalTime(parseInt(e.target.value))}
              className="w-full accent-emerald-500"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || inventory.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                AI is Cooking...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                Generate {inventory.length === 0 ? "(Pantry Empty)" : ""}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
