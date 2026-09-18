"use client";

import React, { useState } from "react";
import { useApp, InventoryItem } from "@/context/AppContext";

export default function AddIngredientModal() {
  const { isAddModalOpen, setIsAddModalOpen, addInventoryItem } = useApp();

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState<InventoryItem["category"]>("Produce");
  const [daysLeft, setDaysLeft] = useState<number>(3);
  const [isUrgent, setIsUrgent] = useState(false);

  if (!isAddModalOpen) return null;

  const quickPantryChips = [
    { name: "Ripe Bananas", cat: "Produce", days: 2, urgent: true },
    { name: "Greek Yogurt", cat: "Dairy", days: 4, urgent: false },
    { name: "Coriander / Cilantro", cat: "Produce", days: 1, urgent: true },
    { name: "Boiled Chickpeas", cat: "Proteins", days: 3, urgent: false },
    { name: "Bell Pepper", cat: "Produce", days: 3, urgent: false },
    { name: "Cheddar Cheese", cat: "Dairy", days: 7, urgent: false },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addInventoryItem(name, quantity || "1 portion", category, daysLeft, isUrgent || daysLeft <= 2);
    setName("");
    setQuantity("");
    setDaysLeft(3);
    setIsUrgent(false);
    setIsAddModalOpen(false);
  };

  const handleQuickAdd = (chip: typeof quickPantryChips[0]) => {
    setName(chip.name);
    setCategory(chip.cat as InventoryItem["category"]);
    setDaysLeft(chip.days);
    setIsUrgent(chip.urgent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div 
        className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Pantry Ingredient</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Track shelf-life to prioritize rescue recommendations.</p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(false)}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Quick Suggestion Chips */}
        <div className="mb-4">
          <label className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block mb-1.5">
            Quick Add Frequent Leftovers
          </label>
          <div className="flex flex-wrap gap-1.5">
            {quickPantryChips.map((chip, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleQuickAdd(chip)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
                  name === chip.name
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-800"
                }`}
              >
                + {chip.name}
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Ingredient Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Fresh Basil, Cooked Lentils, Tofu..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50/50 dark:bg-gray-800/50 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Quantity / Weight</label>
              <input
                type="text"
                placeholder="e.g. 200g, 2 cups, 3 pcs"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-gray-50/50 dark:bg-gray-800/50 dark:text-white"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as InventoryItem["category"])}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-800 dark:text-white"
              >
                <option value="Produce">Produce (Veggies / Fruits)</option>
                <option value="Dairy">Dairy & Cheese</option>
                <option value="Proteins">Proteins & Tofu</option>
                <option value="Grains">Grains & Bread</option>
                <option value="Pantry">Pantry Staples</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Days Until Spoilage</label>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${daysLeft <= 2 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}>
                {daysLeft} {daysLeft === 1 ? "day" : "days"} left
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="14"
              value={daysLeft}
              onChange={(e) => setDaysLeft(Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div className="flex items-center space-x-2 pt-1">
            <input
              type="checkbox"
              id="urgent"
              checked={isUrgent || daysLeft <= 2}
              onChange={(e) => setIsUrgent(e.target.checked)}
              disabled={daysLeft <= 2}
              className="w-4 h-4 text-emerald-600 rounded border-gray-300 dark:border-gray-600 focus:ring-emerald-500 disabled:opacity-50"
            />
            <label htmlFor="urgent" className="text-xs text-gray-600 dark:text-gray-300 font-medium">
              Mark as <span className="text-red-500 font-bold">Urgent Perishable</span> <span className="text-gray-400 dark:text-gray-500 font-normal hidden sm:inline">(Prioritize in rescue algorithms)</span>
            </label>
          </div>

          <div className="pt-3 flex items-center justify-end space-x-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all"
            >
              Add to Kitchen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
