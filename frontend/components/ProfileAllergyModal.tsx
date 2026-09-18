"use client";

import React, { useState, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";

const ALLERGY_OPTIONS = [
  { id: "peanuts", label: "Peanuts", emoji: "🥜" },
  { id: "dairy", label: "Dairy", emoji: "🥛" },
  { id: "gluten", label: "Gluten", emoji: "🌾" },
  { id: "sugar", label: "Sugar", emoji: "🍬" },
  { id: "staples", label: "Staples", hasSpecifics: true, emoji: "🧂" },
  { id: "eggs", label: "Eggs", emoji: "🥚" },
  { id: "treenuts", label: "Tree Nuts", hasSpecifics: true, emoji: "🌰" },
];

const ALLERGY_EMOJI_MAP: Record<string, string> = {
  peanuts: "🥜",
  peanut: "🥜",
  dairy: "🥛",
  milk: "🥛",
  gluten: "🌾",
  wheat: "🌾",
  sugar: "🍬",
  staples: "🧂",
  eggs: "🥚",
  egg: "🥚",
  treenuts: "🌰",
  nuts: "🌰",
  nut: "🌰",
  shellfish: "🦐",
  shrimp: "🦐",
  fish: "🐟",
  seafood: "🐟",
  soy: "🫘",
  soya: "🫘",
  sesame: "🌱",
  mustard: "🌿"
};

const DIETARY_OPTIONS = ["Any", "Vegetarian", "Vegan"];
const STAPLE_OPTIONS = ["Salt", "Pepper", "Olive Oil", "Garlic", "Onion", "Butter", "Rice", "Pasta", "Flour", "Sugar"];

export default function ProfileAllergyModal() {
  const { 
    hasCompletedOnboarding, 
    onboardingStep,
    setOnboardingStep,
    isProfileModalOpen, 
    setIsProfileModalOpen,
    allergies,
    setAllergies,
    dietaryPreference,
    setDietaryPreference,
    stapleBaselines,
    setStapleBaselines,
    maxCookingTime,
    setMaxCookingTime,
    userProfile,
    logout,
    showToast,
    theme,
    toggleTheme
  } = useApp();

  // Local state for Allergies
  const [localAllergies, setLocalAllergies] = useState<string[]>([]);
  const [specifics, setSpecifics] = useState<Record<string, string>>({});
  const [otherAllergy, setOtherAllergy] = useState("");

  // Local state for Preferences
  const [localDietary, setLocalDietary] = useState("Any");
  const [localStaples, setLocalStaples] = useState<string[]>([]);
  const [localTime, setLocalTime] = useState(45);

  // Profile Tab state
  const [activeTab, setActiveTab] = useState<"info" | "allergies" | "preferences">("info");

  // Sync state when modal opens
  useEffect(() => {
    if (!hasCompletedOnboarding || isProfileModalOpen) {
      // Allergies
      const baseAllergies: string[] = [];
      const loadedSpecifics: Record<string, string> = {};
      
      allergies.forEach(a => {
        if (a.includes(":")) {
          const [base, spec] = a.split(":");
          baseAllergies.push(base);
          loadedSpecifics[base] = spec;
        } else {
          baseAllergies.push(a);
        }
      });
      
      setLocalAllergies(baseAllergies);
      setSpecifics(loadedSpecifics);
      setOtherAllergy("");

      // Preferences
      setLocalDietary(dietaryPreference);
      setLocalStaples([...stapleBaselines]);
      setLocalTime(maxCookingTime);

      // Default tab based on onboarding status
      if (hasCompletedOnboarding) {
        setActiveTab("info");
      }
    }
  }, [hasCompletedOnboarding, isProfileModalOpen, allergies, dietaryPreference, stapleBaselines, maxCookingTime]);

  const isVisible = !hasCompletedOnboarding || isProfileModalOpen;
  if (!isVisible) return null;

  const toggleAllergy = (id: string) => {
    setLocalAllergies((prev) => 
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const toggleStaple = (item: string) => {
    setLocalStaples((prev) => 
      prev.includes(item) ? prev.filter((s) => s !== item) : [...prev, item]
    );
  };

  const saveAllergies = () => {
    let finalAllergies: string[] = [];
    localAllergies.forEach(id => {
      if (specifics[id] && specifics[id].trim() !== "") {
        finalAllergies.push(`${id}:${specifics[id].trim()}`);
      } else {
        finalAllergies.push(id);
      }
    });

    if (otherAllergy.trim()) {
      const cleanedOther = otherAllergy.trim().toLowerCase();
      if (!finalAllergies.includes(cleanedOther)) {
        finalAllergies.push(cleanedOther);
      }
    }
    
    setAllergies(finalAllergies);
  };

  const savePreferences = () => {
    setDietaryPreference(localDietary);
    setStapleBaselines(localStaples);
    setMaxCookingTime(localTime);
  };

  const handleNextFromAllergies = () => {
    saveAllergies();
    if (!hasCompletedOnboarding) {
      setOnboardingStep(1); // Go to preferences
    } else {
      showToast("Allergies updated", "success");
    }
  };

  const handleNextFromPreferences = () => {
    savePreferences();
    if (!hasCompletedOnboarding) {
      setOnboardingStep(2); // Done
      setIsProfileModalOpen(false);
      showToast("Profile set up completely!", "success");
    } else {
      showToast("Preferences updated", "success");
    }
  };

  const closeProfile = () => {
    saveAllergies();
    savePreferences();
    setIsProfileModalOpen(false);
  };

  // Determine what content to show
  let currentView = "allergies"; // default for onboarding step 0
  if (!hasCompletedOnboarding) {
    currentView = onboardingStep === 0 ? "allergies" : "preferences";
  } else {
    currentView = activeTab;
  }

  const isAllergiesSelected = localAllergies.length > 0 || otherAllergy.trim() !== "";
  const isPreferencesSelected = localDietary !== "Any" || localStaples.length > 0;
  const canSubmit = hasCompletedOnboarding ? true : (onboardingStep === 0 ? isAllergiesSelected : isPreferencesSelected);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.3 }}
        className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 relative overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {!hasCompletedOnboarding 
                ? (onboardingStep === 0 ? "Allergens" : "Preferences") 
                : "Profile & Settings"}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {!hasCompletedOnboarding 
                ? (onboardingStep === 0 ? "Any food allergies we should avoid?" : "Tailor your kitchen experience.") 
                : "Manage your account and app settings."}
            </p>
          </div>
          {hasCompletedOnboarding && (
            <button
              onClick={closeProfile}
              className="p-2 rounded-full text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors self-start shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {hasCompletedOnboarding && (
          <div className="flex space-x-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl mb-6 shrink-0">
            {["info", "allergies", "preferences"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === tab ? "bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-y-auto flex-1 pr-2 pb-2 custom-scrollbar">
          
          {/* TAB: INFO */}
          {currentView === "info" && userProfile && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6 p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-14 h-14 rounded-full bg-emerald-700 dark:bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-sm">
                    {userProfile.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">{userProfile.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{userProfile.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <button 
                    onClick={logout}
                    className="hidden sm:block text-sm font-bold text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors ml-auto bg-red-50 dark:bg-red-900/20 px-3 py-1 rounded-lg"
                  >
                    Sign Out
                  </button>
                </div>
              </div>

              {/* Theme Switcher */}
              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Appearance</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Switch between Light and Dark mode.</p>
                </div>
                <button
                  onClick={toggleTheme}
                  className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
                    theme === "dark" ? "bg-emerald-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                      theme === "dark" ? "translate-x-8" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Mobile-only Sign Out Button */}
              <button 
                onClick={logout}
                className="block sm:hidden w-full mt-2 text-sm font-bold text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-2xl"
              >
                Sign Out
              </button>
            </motion.div>
          )}

          {/* TAB/STEP: ALLERGIES */}
          {currentView === "allergies" && (
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
                  Allergic Issues
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {ALLERGY_OPTIONS.map((option) => {
                    const isSelected = localAllergies.includes(option.id);
                    return (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        key={option.id}
                        onClick={() => toggleAllergy(option.id)}
                        className={`flex flex-col items-center justify-center p-4 rounded-3xl border-2 transition-all relative overflow-hidden ${
                          isSelected 
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 shadow-md" 
                            : "border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-sm"
                        }`}
                      >
                        <div className="w-12 h-12 mb-2 rounded-2xl bg-emerald-100/60 dark:bg-emerald-900/40 text-2xl flex items-center justify-center select-none shadow-2xs">
                          <span>{option.emoji}</span>
                        </div>
                        <span className="text-sm font-semibold">{option.label}</span>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </motion.button>
                    );
                  })}
                </div>

                {localAllergies.filter(id => ALLERGY_OPTIONS.find(o => o.id === id)?.hasSpecifics).map(id => {
                  const opt = ALLERGY_OPTIONS.find(o => o.id === id);
                  return (
                    <div key={`spec-${id}`} className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700 animate-fade-in">
                      <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center space-x-1 mb-1.5">
                        <span className="text-base">{opt?.emoji}</span>
                        <span>Specify {opt?.label} (Optional)</span>
                      </label>
                      <input
                        type="text"
                        placeholder={`e.g. which ${opt?.label.toLowerCase()}...`}
                        value={specifics[id] || ""}
                        onChange={(e) => setSpecifics({ ...specifics, [id]: e.target.value })}
                        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-800 dark:text-white"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Active custom/other allergies pills */}
              {localAllergies.filter(id => !ALLERGY_OPTIONS.some(o => o.id === id)).length > 0 && (
                <div className="mb-4">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2">
                    Active Custom Allergens
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {localAllergies.filter(id => !ALLERGY_OPTIONS.some(o => o.id === id)).map((custom) => (
                      <span
                        key={custom}
                        onClick={() => toggleAllergy(custom)}
                        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-500/40 cursor-pointer hover:bg-red-50 hover:text-red-600 hover:border-red-400 dark:hover:bg-red-950/60 transition-colors shadow-2xs"
                        title="Click to remove"
                      >
                        <span className="text-sm">{ALLERGY_EMOJI_MAP[custom.toLowerCase()] || "⚠️"}</span>
                        <span className="capitalize">{custom}</span>
                        <span className="text-[10px] ml-1">✕</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">
                  Other Allergies (Optional)
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Type allergy (e.g. Shellfish, Sesame) and press Enter..."
                    value={otherAllergy}
                    onChange={(e) => setOtherAllergy(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && otherAllergy.trim()) {
                        toggleAllergy(otherAllergy.trim().toLowerCase());
                        setOtherAllergy("");
                      }
                    }}
                    className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:text-white"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB/STEP: PREFERENCES */}
          {currentView === "preferences" && (
            <motion.div 
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-8 pb-4"
            >
              
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
                  Food Type
                </label>
                <div className="flex flex-wrap gap-3">
                  {DIETARY_OPTIONS.map((opt) => (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      key={opt}
                      onClick={() => setLocalDietary(opt)}
                      className={`px-5 py-3 rounded-2xl text-sm font-semibold transition-all border-2 ${
                        localDietary === opt
                          ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 shadow-md"
                          : "border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-200 dark:hover:border-gray-600 hover:shadow-sm"
                      }`}
                    >
                      {opt}
                    </motion.button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-1">
                  Pantry Staples
                </label>
                <p className="text-xs text-gray-500 mb-3">Items you always have stocked. We won't add these to your shopping list.</p>
                <div className="flex flex-wrap gap-3">
                  {STAPLE_OPTIONS.map((opt) => {
                    const isSelected = localStaples.includes(opt);
                    return (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        key={opt}
                        onClick={() => toggleStaple(opt)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2 ${
                          isSelected
                            ? "border-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 shadow-sm"
                            : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-sm"
                        }`}
                      >
                        {isSelected && <span className="mr-1">✓</span>}
                        {opt}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-3">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                    Max Cooking Time
                  </label>
                  <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                    {localTime === 120 ? "Any time" : `Under ${localTime} mins`}
                  </span>
                </div>
                
                <div className="relative pt-2">
                  <input
                    type="range"
                    min="15"
                    max="120"
                    step="15"
                    value={localTime}
                    onChange={(e) => setLocalTime(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-2 px-1">
                    <span>15m</span>
                    <span>30m</span>
                    <span>60m</span>
                    <span>120m+</span>
                  </div>
                </div>
              </div>

            </motion.div>
          )}

        </div>

        {/* BOTTOM ACTION BAR (ONLY FOR ONBOARDING) */}
        {!hasCompletedOnboarding && (
          <div className="pt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700 gap-4 mt-2 shrink-0">
            <button
              onClick={() => {
                if (onboardingStep === 0) {
                  setAllergies([]);
                  handleNextFromAllergies();
                } else {
                  setDietaryPreference("Any");
                  handleNextFromPreferences();
                }
              }}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 text-sm font-bold rounded-xl transition-all"
            >
              Skip
            </button>
            <button
              disabled={!canSubmit}
              onClick={onboardingStep === 0 ? handleNextFromAllergies : handleNextFromPreferences}
              className={`flex-1 px-8 py-3 text-white text-sm font-bold rounded-xl shadow-md transition-all transform active:scale-95 text-center ${
                canSubmit 
                  ? "bg-emerald-600 hover:bg-emerald-700 cursor-pointer" 
                  : "bg-emerald-300 dark:bg-emerald-800 cursor-not-allowed active:scale-100 shadow-none text-emerald-100 dark:text-emerald-300"
              }`}
            >
              {onboardingStep === 0 ? "Save & Continue" : "Complete Profile"}
            </button>
          </div>
        )}

      </motion.div>
    </div>
  );
}
