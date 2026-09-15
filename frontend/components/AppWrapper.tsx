"use client";

import React from "react";
import { AppProvider } from "@/context/AppContext";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import RecipeCookingModal from "@/components/RecipeCookingModal";
import AddIngredientModal from "@/components/AddIngredientModal";
import Toast from "@/components/Toast";
import ProfileAllergyModal from "@/components/ProfileAllergyModal";
import SignInView from "@/components/SignInView";
import ScannerModal from "@/components/ScannerModal";
import GenerateRecipeModal from "@/components/GenerateRecipeModal";
import AIChatModal from "@/components/AIChatModal";

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <div className="flex h-screen w-screen bg-gray-50 dark:bg-gray-900 overflow-hidden text-gray-900 dark:text-gray-100 transition-colors">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto custom-scrollbar">
            {children}
          </main>
        </div>
      </div>

      {/* Global Interactive Overlays */}
      <RecipeCookingModal />
      <AddIngredientModal />
      <ProfileAllergyModal />
      <ScannerModal />
      <GenerateRecipeModal />
      <AIChatModal />
      <Toast />
      <SignInView />
    </AppProvider>
  );
}
