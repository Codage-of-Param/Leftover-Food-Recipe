"use client";

import React, { useRef, useState, useEffect } from "react";
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
    
    // Calculate which card is most visible
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

  // If there's only 1 recipe, just render it normally without carousel controls
  if (recipes.length === 1) {
    return (
      <div className="mt-3">
        <RecipeChatCard recipe={recipes[0]} isActive={true} />
      </div>
    );
  }

  return (
    <div className="mt-4 w-full flex flex-col relative">
      {/* Carousel Header Controls */}
      <div className="flex items-center justify-between mb-3 px-2">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Suggested Recipes
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-gray-800 px-3 py-1 rounded-full text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 shadow-sm">
            {activeIndex + 1} / {recipes.length}
          </div>
          <div className="flex gap-1.5">
            <button 
              onClick={() => scrollToIndex(Math.max(0, activeIndex - 1))}
              disabled={activeIndex === 0}
              className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all shadow-sm"
            >
              ←
            </button>
            <button 
              onClick={() => scrollToIndex(Math.min(recipes.length - 1, activeIndex + 1))}
              disabled={activeIndex === recipes.length - 1}
              className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 hover:scale-105 active:scale-95 transition-all shadow-sm"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Horizontally scrollable container */}
      <div className="relative w-full overflow-hidden">
        {/* Left and Right Gradient Masks for smooth scroll edge fading */}
        <div className="absolute top-0 left-0 w-8 h-full bg-gradient-to-r from-white dark:from-[#0a0a0a] to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-white dark:from-[#0a0a0a] to-transparent z-10 pointer-events-none" />

        <div 
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory py-4 px-4 xs:px-8 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {recipes.map((recipe, idx) => (
            <div key={idx} className="snap-center shrink-0 w-[280px] xs:w-[320px] sm:w-[360px] h-full flex items-stretch">
              <RecipeChatCard recipe={recipe} isActive={idx === activeIndex} />
            </div>
          ))}
        </div>
      </div>
      
      {/* Pagination Dots */}
      <div className="flex justify-center gap-2 mt-2">
        {recipes.map((_, idx) => (
          <button
            key={idx}
            onClick={() => scrollToIndex(idx)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              idx === activeIndex 
                ? "w-6 bg-emerald-500" 
                : "w-2 bg-gray-300 dark:bg-gray-700 hover:bg-gray-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
