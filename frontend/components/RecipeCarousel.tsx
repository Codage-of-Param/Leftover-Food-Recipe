"use client";

import React, { useRef, useState } from "react";
import RecipeChatCard, { ChatRecipeData } from "./RecipeChatCard";

interface RecipeCarouselProps {
  recipes: ChatRecipeData[];
}

export default function RecipeCarousel({ recipes }: RecipeCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    
    const scrollPosition = scrollRef.current.scrollLeft;
    const cardWidth = scrollRef.current.scrollWidth / recipes.length;
    
    const newIndex = Math.round(scrollPosition / cardWidth);
    
    if (newIndex !== activeIndex && newIndex >= 0 && newIndex < recipes.length) {
      setActiveIndex(newIndex);
    }
  };

  const scrollToIndex = (index: number) => {
    if (!scrollRef.current) return;
    const cardWidth = scrollRef.current.scrollWidth / recipes.length;
    scrollRef.current.scrollTo({
      left: index * cardWidth,
      behavior: "smooth"
    });
    setActiveIndex(index);
  };

  if (!recipes || recipes.length === 0) return null;

  // Single recipe — render full width, no carousel
  if (recipes.length === 1) {
    return (
      <div className="mt-3 w-full">
        <RecipeChatCard recipe={recipes[0]} isActive={true} />
      </div>
    );
  }

  return (
    <div className="mt-3 sm:mt-4 w-full flex flex-col relative">
      {/* Carousel Header Controls */}
      <div className="flex items-center justify-between mb-2 sm:mb-3 px-1">
        <div className="text-[10px] sm:text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Suggested Recipes
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-white dark:bg-gray-800 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm">
            {activeIndex + 1} / {recipes.length}
          </div>
          <div className="flex gap-1">
            <button 
              onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all shadow-sm text-xs sm:text-sm"
            >
              ←
            </button>
            <button 
              onClick={() => scrollToIndex(Math.min(recipes.length - 1, activeIndex + 1))}
              disabled={activeIndex === recipes.length - 1}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all shadow-sm text-xs sm:text-sm"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Horizontally scrollable container */}
      <div className="relative w-full overflow-hidden">
        {/* Gradient masks — hidden on small screens to avoid clipping */}
        <div className="absolute top-0 left-0 w-6 h-full bg-gradient-to-r from-white dark:from-[#0a0a0a] to-transparent z-10 pointer-events-none hidden sm:block" />
        <div className="absolute top-0 right-0 w-6 h-full bg-gradient-to-l from-white dark:from-[#0a0a0a] to-transparent z-10 pointer-events-none hidden sm:block" />

        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-3 sm:gap-5 overflow-x-auto snap-x snap-mandatory py-2 sm:py-4 px-1 sm:px-6 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {recipes.map((recipe, idx) => (
            <div key={idx} className="snap-center shrink-0 w-[calc(100%-8px)] sm:w-[340px] md:w-[360px] flex items-stretch">
              <RecipeChatCard recipe={recipe} isActive={idx === activeIndex} />
            </div>
          ))}
        </div>
      </div>
      
      {/* Pagination Dots */}
      <div className="flex justify-center gap-1.5 sm:gap-2 mt-1 sm:mt-2">
        {recipes.map((_, idx) => (
          <button
            key={idx}
            onClick={() => scrollToIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === activeIndex 
                ? "w-5 sm:w-6 bg-emerald-500" 
                : "w-1.5 sm:w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
