"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface InventoryItem {
  id: string;
  name: string;
  quantity: string;
  category: "Produce" | "Dairy" | "Grains" | "Pantry" | "Proteins";
  daysLeft: number;
  isUrgent: boolean;
}

export interface RecipeIngredient {
  name: string;
  quantity: string;
  inPantry: boolean;
  isUrgent?: boolean;
  substitution?: string;
}

export interface Recipe {
  id: string;
  title: string;
  desc: string;
  imageBg: string;
  score: number;
  wasteSaved: number;
  co2Saved: number;
  waterSaved?: number;
  ecoScore?: number;
  difficulty?: string;
  prepTime?: number;
  cookTime?: number;
  timeMinutes: number;
  servings: number;
  cals: number;
  protein: string;
  carbs?: string;
  fat?: string;
  fiber?: string;
  sugar?: string;
  sodium?: string;
  isVeg: boolean;
  ingredients: RecipeIngredient[];
  instructions: string[];
  isBuyOneOrTwo?: boolean;
  missingIngredients?: string[];
  isFromFridgeScan?: boolean;
  scannedAt?: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  recipeTitle?: string;
  isChecked: boolean;
}

export interface CookedMeal {
  id: string;
  recipeTitle: string;
  wasteSaved: number;
  co2Saved: number;
  rescuedItems: string[];
  date: string;
}

export interface ToastInfo {
  id: number;
  message: string;
  type: "success" | "info" | "alert" | "error";
}

export interface UserProfile {
  id?: string;
  name: string;
  email: string;
  level: number;
}

interface AppContextType {
  activeTab: "recipes" | "inventory" | "saved" | "dashboard" | "chat-generator";
  setActiveTab: (tab: "recipes" | "inventory" | "saved" | "dashboard" | "chat-generator") => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSearching: boolean;
  activeFilter: "all" | "under30" | "highScore" | "veg";
  setActiveFilter: (f: "all" | "under30" | "highScore" | "veg") => void;
  sortBy: "score" | "time" | "cals";
  setSortBy: (s: "score" | "time" | "cals") => void;
  inventory: InventoryItem[];
  addInventoryItem: (name: string, quantity: string, category: InventoryItem["category"], daysLeft: number, isUrgent: boolean) => void;
  removeInventoryItem: (id: string) => void;
  toggleUrgent: (id: string) => void;
  updateQuantity: (id: string, newQty: string) => void;
  scannerImage: { url: string; file: File } | null;
  setScannerImage: (data: { url: string; file: File } | null) => void;
  recipes: Recipe[];
  setRecipes: (recipes: Recipe[]) => void;
  scannedFridgeRecipes: Recipe[];
  setScannedFridgeRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  addScannedFridgeRecipes: (recipes: Recipe | Recipe[]) => void;
  clearScannedFridgeRecipes: () => void;
  savedRecipeIds: string[];
  toggleSaveRecipe: (id: string, recipeData?: Recipe | any) => void;
  isRecipeSaved: (id: string) => boolean;
  selectedRecipe: Recipe | null;
  openRecipeModal: (recipe: Recipe) => void;
  closeRecipeModal: () => void;
  cookRecipe: (recipe: Recipe) => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  isNotificationOpen: boolean;
  setIsNotificationOpen: (open: boolean) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  allergies: string[];
  setAllergies: (allergies: string[]) => void;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;
  hasCompletedOnboarding: boolean;
  dietaryPreference: string;
  setDietaryPreference: (pref: string) => void;
  stapleBaselines: string[];
  setStapleBaselines: (staples: string[]) => void;
  maxCookingTime: number;
  setMaxCookingTime: (time: number) => void;
  isProfileModalOpen: boolean;
  setIsProfileModalOpen: (open: boolean) => void;
  isGenerateModalOpen: boolean;
  setIsGenerateModalOpen: (open: boolean) => void;
  syncStatus: "idle" | "syncing" | "synced";
  triggerSync: () => void;
  cookedHistory: CookedMeal[];
  addCookedMeal: (recipeTitle: string, rescuedItems: string[]) => void;
  toast: ToastInfo | null;
  showToast: (message: string, type?: "success" | "info" | "alert" | "error") => void;
  filteredRecipes: Recipe[];
  urgentItemsCount: number;
  isAuthenticated: boolean;
  setIsAuthenticated: (auth: boolean) => void;
  userProfile: UserProfile | null;
  logout: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  isChatOpen: boolean;
  setIsChatOpen: (open: boolean) => void;
}

const INITIAL_INVENTORY: InventoryItem[] = [
  { id: "inv-1", name: "Fresh Spinach", quantity: "250g", category: "Produce", daysLeft: 1, isUrgent: true },
  { id: "inv-2", name: "Paneer Block", quantity: "300g", category: "Dairy", daysLeft: 2, isUrgent: true },
  { id: "inv-3", name: "Ripe Tomatoes", quantity: "4 pcs", category: "Produce", daysLeft: 3, isUrgent: false },
  { id: "inv-4", name: "Basmati Rice", quantity: "1.5 kg", category: "Grains", daysLeft: 120, isUrgent: false },
  { id: "inv-5", name: "Garlic Cloves", quantity: "1 bulb", category: "Produce", daysLeft: 14, isUrgent: false },
  { id: "inv-6", name: "Olive Oil", quantity: "500 ml", category: "Pantry", daysLeft: 180, isUrgent: false },
  { id: "inv-7", name: "Whole Milk", quantity: "400 ml", category: "Dairy", daysLeft: 3, isUrgent: false },
  { id: "inv-8", name: "Butter", quantity: "100g", category: "Dairy", daysLeft: 15, isUrgent: false },
];

const INITIAL_RECIPES: Recipe[] = [
  {
    id: "rec-1",
    title: "Paneer Palak Bhurji",
    desc: "Spiced scrambled paneer folded through quickly wilted fresh spinach, toasted cumin, and caramelized garlic.",
    imageBg: "bg-emerald-800",
    score: 96,
    wasteSaved: 4.20,
    co2Saved: 1.20,
    timeMinutes: 15,
    servings: 2,
    cals: 380,
    protein: "22g Protein",
    isVeg: true,
    ingredients: [
      { name: "Fresh Spinach", quantity: "200g", inPantry: true, isUrgent: true },
      { name: "Paneer Block", quantity: "200g (crumbled)", inPantry: true, isUrgent: true },
      { name: "Garlic Cloves", quantity: "3 cloves (minced)", inPantry: true, isUrgent: false },
      { name: "Olive Oil", quantity: "1 tbsp", inPantry: true, isUrgent: false }
    ],
    instructions: [
      "Heat 1 tbsp olive oil in a non-stick pan over medium flame. Add minced garlic and sauté until golden and fragrant (about 1 minute).",
      "Add washed and chopped fresh spinach leaves. Sauté for 2-3 minutes until wilted and moisture evaporates.",
      "Crumble the fresh paneer directly into the skillet with a pinch of turmeric, salt, and cumin powder.",
      "Toss gently over medium heat for 2-3 minutes to absorb aromatic spices without letting the paneer turn rubbery.",
      "Garnish with a dash of black pepper and serve hot with toasted roti or warm rice."
    ]
  },
  {
    id: "rec-2",
    title: "Garlic Tomato Rice Bowl",
    desc: "Fragrant basmati gently toasted with caramelized garlic slivers, crushed ripe tomatoes, and aromatic herbs.",
    imageBg: "bg-rose-800",
    score: 91,
    wasteSaved: 3.10,
    co2Saved: 0.85,
    timeMinutes: 20,
    servings: 2,
    cals: 410,
    protein: "9g Protein",
    isVeg: true,
    ingredients: [
      { name: "Ripe Tomatoes", quantity: "3 medium (diced)", inPantry: true, isUrgent: false },
      { name: "Basmati Rice", quantity: "1 cup (cooked)", inPantry: true, isUrgent: false },
      { name: "Garlic Cloves", quantity: "4 cloves (sliced thin)", inPantry: true, isUrgent: false },
      { name: "Olive Oil", quantity: "1.5 tbsp", inPantry: true, isUrgent: false }
    ],
    instructions: [
      "In a wide skillet, warm olive oil over gentle medium heat. Add thinly sliced garlic and fry until pale golden.",
      "Add the ripe diced tomatoes with a pinch of salt. Cook down for 5-6 minutes until soft and saucy.",
      "Fold in the cooked basmati rice gently to coat each grain with the rich garlic-tomato emulsion.",
      "Cover and steam on low for 2 minutes to meld flavors, then serve warm."
    ]
  },
  {
    id: "rec-3",
    title: "Crispy Garlic Paneer Stir-Fry",
    desc: "High-heat skillet seared paneer cubes coated in browned garlic crisps, coarse pepper, and olive glaze.",
    imageBg: "bg-amber-900",
    score: 90,
    wasteSaved: 3.80,
    co2Saved: 0.95,
    timeMinutes: 12,
    servings: 2,
    cals: 340,
    protein: "19g Protein",
    isVeg: true,
    ingredients: [
      { name: "Paneer Block", quantity: "250g (cubed)", inPantry: true, isUrgent: true },
      { name: "Garlic Cloves", quantity: "4 cloves (crushed)", inPantry: true, isUrgent: false },
      { name: "Olive Oil", quantity: "1 tbsp", inPantry: true, isUrgent: false }
    ],
    instructions: [
      "Pat paneer cubes dry with paper towels to achieve a crispy golden crust.",
      "Heat olive oil in a heavy skillet on medium-high until shimmering.",
      "Drop in paneer cubes in a single layer. Sear for 2 minutes per side until deeply golden.",
      "Toss in crushed garlic in the final 60 seconds so it toasts without burning. Season with flaky salt."
    ]
  },
  {
    id: "rec-4",
    title: "Paneer Makhani Rice",
    desc: "Rich spiced tomato gravy simmered with cottage cheese, infused with butter and mild garam masala over steamed rice.",
    imageBg: "bg-orange-800",
    score: 88,
    wasteSaved: 5.40,
    co2Saved: 1.45,
    timeMinutes: 25,
    servings: 2,
    cals: 460,
    protein: "24g Protein",
    isVeg: true,
    isBuyOneOrTwo: true,
    missingIngredients: ["Heavy Cream (2 tbsp)"],
    ingredients: [
      { name: "Paneer Block", quantity: "200g (cubed)", inPantry: true, isUrgent: true },
      { name: "Ripe Tomatoes", quantity: "3 ripe (pureed)", inPantry: true, isUrgent: false },
      { name: "Basmati Rice", quantity: "1 cup (steamed)", inPantry: true, isUrgent: false },
      { name: "Butter", quantity: "1 tbsp", inPantry: true, isUrgent: false },
      { name: "Heavy Cream", quantity: "2 tbsp", inPantry: false, substitution: "Whole Milk + 1 tsp Butter (AI Pantry Match)" }
    ],
    instructions: [
      "Melt butter in a saucepan over medium heat. Add pureed ripe tomatoes and simmer for 8 minutes until thickened.",
      "Stir in your pantry substitution (warm milk + knob of butter) or heavy cream to create a silky, rich makhani base.",
      "Add paneer cubes and let them gently simmer on low for 4-5 minutes so they absorb the savory sauce.",
      "Ladle generous servings of makhani gravy and paneer over hot basmati rice."
    ]
  }
];

const INITIAL_COOKED: CookedMeal[] = [
  { id: "cm1", recipeTitle: "Roasted Tomato Soup", wasteSaved: 0, co2Saved: 0, rescuedItems: ["Soft Tomatoes", "Wilted Basil"], date: new Date(Date.now() - 86400000).toISOString() },
];

import { supabase } from "@/lib/supabase";

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [activeTab, setActiveTab] = useState<"recipes" | "inventory" | "saved" | "dashboard" | "chat-generator">("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"all" | "under30" | "highScore" | "veg">("all");
  const [sortBy, setSortBy] = useState<"score" | "time" | "cals">("score");

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timeout = setTimeout(() => {
      setIsSearching(false);
    }, 400); // 400ms loading effect
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
  const [recipes, setRecipes] = useState<Recipe[]>(INITIAL_RECIPES);
  
  // Scanned Fridge AI Recipes
  const [scannedFridgeRecipes, setScannedFridgeRecipes] = useState<Recipe[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("foodrescue_scanned_fridge_recipes");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.warn("Could not read scanned fridge recipes from localStorage", e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem("foodrescue_scanned_fridge_recipes", JSON.stringify(scannedFridgeRecipes));
    } catch (e) {
      console.warn("Could not save scanned fridge recipes to localStorage", e);
    }
  }, [scannedFridgeRecipes]);

  const addScannedFridgeRecipes = (newRecipes: Recipe | Recipe[]) => {
    const list = Array.isArray(newRecipes) ? newRecipes : [newRecipes];
    const tagged = list.map((r, idx) => ({
      ...r,
      id: r.id || `fridge-scan-rec-${Date.now()}-${idx}`,
      isFromFridgeScan: true,
      scannedAt: r.scannedAt || new Date().toISOString()
    }));

    setScannedFridgeRecipes((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const existingTitles = new Set(prev.map((p) => p.title.toLowerCase().trim()));
      const filteredNew = tagged.filter(
        (r) => !existingIds.has(r.id) && !existingTitles.has(r.title.toLowerCase().trim())
      );
      return [...filteredNew, ...prev];
    });

    setRecipes((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const existingTitles = new Set(prev.map((p) => p.title.toLowerCase().trim()));
      const filteredNew = tagged.filter(
        (r) => !existingIds.has(r.id) && !existingTitles.has(r.title.toLowerCase().trim())
      );
      return [...filteredNew, ...prev];
    });
  };

  const clearScannedFridgeRecipes = () => {
    setScannedFridgeRecipes([]);
    try {
      localStorage.removeItem("foodrescue_scanned_fridge_recipes");
      showToast("Cleared scanned fridge recipes history", "info");
    } catch (e) {
      console.warn(e);
    }
  };

  const [savedRecipeIds, setSavedRecipeIds] = useState<string[]>(["r1"]);
  const [cookedHistory, setCookedHistory] = useState<CookedMeal[]>(INITIAL_COOKED);

  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [onboardingStep, setOnboardingStep] = useState(0); // 0: Allergens, 1: Preferences, 2: Done
  const hasCompletedOnboarding = onboardingStep === 2;
  const [dietaryPreference, setDietaryPreference] = useState("Any");
  const [stapleBaselines, setStapleBaselines] = useState<string[]>(["Salt", "Pepper", "Olive Oil"]);
  const [maxCookingTime, setMaxCookingTime] = useState(45);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced">("synced");
  const [scannerImage, setScannerImage] = useState<{ url: string; file: File } | null>(null);
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isChatOpen, setIsChatOpen] = useState(false);

  const [toast, setToast] = useState<ToastInfo | null>(null);

  useEffect(() => {
    // Check active session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsAuthenticated(true);
        fetchUserProfile(session.user);
      } else {
        ensureGuestSession();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setIsAuthenticated(true);
          fetchUserProfile(session.user);
        } else {
          setIsAuthenticated(false);
          ensureGuestSession();
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const ensureGuestSession = async (): Promise<string> => {
    const defaultGuestId = "00000000-0000-0000-0000-000000000001";
    try {
      let guestId = typeof window !== "undefined" ? localStorage.getItem("guest_user_id") : null;
      let isNewGuest = false;
      if (!guestId) {
        guestId = defaultGuestId;
        if (typeof window !== "undefined") {
          localStorage.setItem("guest_user_id", guestId);
        }
        isNewGuest = true;
      }

      // Upsert guest user profile in Supabase public.users table
      const { data } = await supabase.from("users").upsert([{
        id: guestId,
        display_name: "Guest Chef",
        email: "guest@foodrescue.app",
        level: 1
      }]).select().single();

      if (isNewGuest) {
        const randomRecipes = [...INITIAL_RECIPES].sort(() => 0.5 - Math.random()).slice(0, 2);
        const savedInserts = randomRecipes.map(r => ({
          user_id: guestId,
          recipe_id: r.id
        }));
        try {
          await supabase.from("saved_recipes").upsert(savedInserts, { onConflict: "user_id, recipe_id" });
        } catch (e) {}
      }

      const guestProfile = {
        id: guestId,
        name: data?.display_name || "Guest Chef",
        email: data?.email || "guest@foodrescue.app",
        level: data?.level || 1
      };

      setUserProfile(guestProfile);
      fetchUserData(guestId);
      return guestId;
    } catch (err) {
      console.error("Guest session init error:", err);
      return defaultGuestId;
    }
  };

  const fetchUserProfile = async (user: any) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();
      
      if (error && error.code !== "PGRST116") {
        console.error("Error fetching user profile:", error);
      }

      if (data) {
        setUserProfile({
          id: data.id,
          name: data.display_name || user.email?.split("@")[0] || "Chef",
          email: data.email,
          level: data.level || 1,
        });
        setAllergies(data.allergies || []);
        setDietaryPreference(data.dietary_preference || "Any");
        setStapleBaselines(data.staple_baselines || ["Salt", "Pepper", "Olive Oil"]);
        setMaxCookingTime(data.max_cooking_time || 45);
        if (data.has_completed_onboarding) {
          setOnboardingStep(2);
        }
        fetchUserData(data.id);
      } else {
        // User exists in auth but not in public.users yet
        const newProfile = {
          id: user.id,
          email: user.email,
          display_name: user.email?.split("@")[0] || "Chef",
          level: 1,
        };
        await supabase.from("users").insert([newProfile]);

        // Provide 2 random recipes for new signup
        const randomRecipes = [...INITIAL_RECIPES].sort(() => 0.5 - Math.random()).slice(0, 2);
        const savedInserts = randomRecipes.map(r => ({
          user_id: newProfile.id,
          recipe_id: r.id
        }));
        try {
          await supabase.from("saved_recipes").insert(savedInserts);
        } catch (e) {}

        setUserProfile({
          id: newProfile.id,
          name: newProfile.display_name,
          email: newProfile.email,
          level: newProfile.level,
        });
        fetchUserData(newProfile.id);
      }
    } catch (err) {
      console.error("Failed to load profile", err);
    }
  };

  const fetchUserData = async (userId: string) => {
    try {
      // Fetch inventory
      const { data: invData } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (invData && invData.length > 0) {
        setInventory(invData.map(d => ({
          id: d.id,
          name: d.ingredient_name,
          quantity: d.quantity || "1 portion",
          category: (d.category || "Produce") as any,
          daysLeft: d.days_left !== undefined ? d.days_left : 5,
          isUrgent: !!d.is_urgent
        })));
      }

      // Fetch saved recipes
      const { data: savedData } = await supabase
        .from("saved_recipes")
        .select("recipe_id")
        .eq("user_id", userId);
        
      if (savedData && savedData.length > 0) {
        setSavedRecipeIds(savedData.map(d => d.recipe_id));
      }

      // Fetch cooked history
      const { data: historyData } = await supabase
        .from("cooked_history")
        .select("*")
        .eq("user_id", userId)
        .order("cooked_at", { ascending: false });

      if (historyData && historyData.length > 0) {
        setCookedHistory(historyData.map(d => ({
          id: d.id,
          recipeTitle: d.recipe_title,
          wasteSaved: 0,
          co2Saved: 0,
          rescuedItems: d.rescued_ingredients || [],
          date: d.cooked_at
        })));
      }
    } catch (e) {
      console.error("Error fetching user data from Supabase:", e);
    }
  };

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === "light" ? "dark" : "light");
  };

  const showToast = (message: string, type: "success" | "info" | "alert" | "error" = "success") => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 3500);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUserProfile(null);
    setOnboardingStep(0);
    setIsProfileModalOpen(false);
    setAllergies([]);
    setDietaryPreference("Any");
    setStapleBaselines(["Salt", "Pepper", "Olive Oil"]);
    setMaxCookingTime(45);
    setInventory([]);
    setSavedRecipeIds([]);
    showToast("Signed out", "info");
  };

  const triggerSync = () => {
    setSyncStatus("syncing");
    setTimeout(() => {
      setSyncStatus("synced");
      showToast("Pantry synchronized with Supabase DB", "success");
    }, 900);
  };

  const addInventoryItem = async (
    name: string,
    quantity: string,
    category: InventoryItem["category"],
    daysLeft: number,
    isUrgent: boolean
  ) => {
    const newItem: InventoryItem = {
      id: `inv-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name: name.trim(),
      quantity: quantity.trim() || "1 portion",
      category,
      daysLeft,
      isUrgent
    };
    
    // Optimistic UI
    setInventory((prev) => [newItem, ...prev]);
    showToast(`Added "${newItem.name}" to kitchen pantry`, "success");

    let userId = userProfile?.id;
    if (!userId) {
      userId = await ensureGuestSession();
    }

    if (userId) {
      const { data, error } = await supabase.from("inventory_items").insert([{
        user_id: userId,
        ingredient_name: newItem.name,
        quantity: newItem.quantity,
        category: newItem.category,
        days_left: newItem.daysLeft,
        is_urgent: newItem.isUrgent,
        source: "manual"
      }]).select().single();

      if (error) {
        console.error("Supabase insert error for inventory_items:", error);
      } else if (data) {
        setInventory(prev => prev.map(i => i.id === newItem.id ? { ...i, id: data.id } : i));
      }
    }
  };

  const removeInventoryItem = async (id: string) => {
    const item = inventory.find((i) => i.id === id);
    // Optimistic UI
    setInventory((prev) => prev.filter((i) => i.id !== id));
    if (item) {
      showToast(`Removed "${item.name}" from inventory`, "info");
    }

    let userId = userProfile?.id;
    if (userId && !id.startsWith("inv-")) {
      const { error } = await supabase.from("inventory_items").delete().eq("id", id).eq("user_id", userId);
      if (error) console.error("Supabase delete error:", error);
    }
  };

  const toggleUrgent = async (id: string) => {
    let updatedUrgent = false;
    // Optimistic UI
    setInventory((prev) =>
      prev.map((i) => {
        if (i.id === id) {
          updatedUrgent = !i.isUrgent;
          showToast(
            `Marked "${i.name}" as ${updatedUrgent ? "Expiring Soon (Urgent)" : "Normal shelf-life"}`,
            updatedUrgent ? "alert" : "info"
          );
          return { ...i, isUrgent: updatedUrgent };
        }
        return i;
      })
    );

    let userId = userProfile?.id;
    if (userId && !id.startsWith("inv-")) {
      await supabase.from("inventory_items").update({ is_urgent: updatedUrgent }).eq("id", id).eq("user_id", userId);
    }
  };

  const updateQuantity = async (id: string, newQty: string) => {
    setInventory((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: newQty } : i))
    );

    let userId = userProfile?.id;
    if (userId && !id.startsWith("inv-")) {
      await supabase.from("inventory_items").update({ quantity: newQty }).eq("id", id).eq("user_id", userId);
    }
  };

  useEffect(() => {
    if (!userProfile?.id) return;

    const timeout = setTimeout(async () => {
      setSyncStatus("syncing");
      const { error } = await supabase.from("users").update({
        allergies,
        dietary_preference: dietaryPreference,
        staple_baselines: stapleBaselines,
        max_cooking_time: maxCookingTime,
        has_completed_onboarding: hasCompletedOnboarding
      }).eq("id", userProfile.id);
      if (error) console.error("Supabase user update error:", error);
      setSyncStatus("synced");
    }, 1500);

    return () => clearTimeout(timeout);
  }, [allergies, dietaryPreference, stapleBaselines, maxCookingTime, hasCompletedOnboarding, userProfile?.id]);

  const toggleSaveRecipe = async (id: string, recipeData?: Recipe | any) => {
    const isSaved = savedRecipeIds.includes(id);

    if (isSaved) {
      setSavedRecipeIds((prev) => prev.filter((item) => item !== id));
      const recipe = recipes.find((r) => r.id === id) || recipeData;
      showToast(`Removed "${recipe?.title || 'Recipe'}" from bookmarks`, "info");
      
      let userId = userProfile?.id;
      if (userId) {
        await supabase.from("saved_recipes").delete().eq("user_id", userId).eq("recipe_id", id);
      }
    } else {
      let targetRecipe = recipes.find((r) => r.id === id);

      // If recipeData is passed (e.g. from Chatbot) and not yet in recipes state, add it!
      if (recipeData && !targetRecipe) {
        targetRecipe = {
          id: id,
          title: recipeData.title,
          desc: recipeData.desc || "",
          imageBg: recipeData.imageBg || "bg-emerald-800",
          score: recipeData.score || 95,
          wasteSaved: recipeData.wasteSaved || 3.50,
          co2Saved: recipeData.co2Saved || 1.10,
          timeMinutes: recipeData.timeMinutes || (recipeData.prep_time || 10) + (recipeData.cook_time || 10),
          servings: recipeData.servings || 2,
          cals: recipeData.cals || 380,
          protein: recipeData.protein || "15g Protein",
          carbs: recipeData.carbs || "0g",
          fat: recipeData.fat || "0g",
          fiber: recipeData.fiber || "0g",
          sodium: recipeData.sodium || "0mg",
          isVeg: recipeData.isVeg !== undefined ? recipeData.isVeg : true,
          ingredients: (recipeData.ingredients || []).map((i: any) => ({
            name: typeof i === "string" ? i : i.name,
            quantity: typeof i === "object" ? i.quantity || "1 portion" : "1 portion",
            inPantry: typeof i === "object" && i.inPantry !== undefined ? i.inPantry : true
          })),
          instructions: Array.isArray(recipeData.instructions) ? recipeData.instructions : [],
          isFromFridgeScan: recipeData.isFromFridgeScan,
          isBuyOneOrTwo: recipeData.isBuyOneOrTwo
        };
        setRecipes((prev) => [targetRecipe!, ...prev]);
      }

      setSavedRecipeIds((prev) => [...prev, id]);
      const title = targetRecipe?.title || recipeData?.title || "Recipe";
      showToast(`Saved "${title}" to favorites!`, "success");
      
      let userId = userProfile?.id;
      if (!userId) {
        userId = await ensureGuestSession();
      }
      if (userId) {
        const { error } = await supabase.from("saved_recipes").insert([{ user_id: userId, recipe_id: id }]);
        if (error) console.error("Supabase saved_recipes insert error:", error);
      }
    }
  };

  const isRecipeSaved = (id: string) => savedRecipeIds.includes(id);

  const addCookedMeal = (recipeTitle: string, rescuedItems: string[]) => {
    const meal: CookedMeal = {
      id: Math.random().toString(36).substring(7),
      recipeTitle,
      wasteSaved: 0,
      co2Saved: 0,
      rescuedItems,
      date: new Date().toISOString()
    };
    setCookedHistory(prev => [meal, ...prev]);
  };

  const openRecipeModal = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  const closeRecipeModal = () => {
    setSelectedRecipe(null);
  };

  const cookRecipe = async (recipe: Recipe) => {
    // 1. Deduct matching inventory items
    const ingredientNames = recipe.ingredients.map((ing) => ing.name.toLowerCase());
    const rescued: string[] = [];

    setInventory((prev) =>
      prev.filter((invItem) => {
        const matches = ingredientNames.some((n) =>
          invItem.name.toLowerCase().includes(n) || n.includes(invItem.name.toLowerCase())
        );
        if (matches) {
          rescued.push(invItem.name);
          return false;
        }
        return true;
      })
    );

    // 2. Add to history
    const newMeal: CookedMeal = {
      id: `hist-${Date.now()}`,
      recipeTitle: recipe.title,
      date: new Date().toISOString(),
      wasteSaved: recipe.wasteSaved,
      co2Saved: recipe.co2Saved,
      rescuedItems: rescued.length > 0 ? rescued : recipe.ingredients.slice(0, 2).map((i) => i.name)
    };
    setCookedHistory((prev) => [newMeal, ...prev]);
    
    let userId = userProfile?.id;
    if (!userId) {
      userId = await ensureGuestSession();
    }
    if (userId) {
      const { error } = await supabase.from("cooked_history").insert([{
        user_id: userId,
        recipe_title: recipe.title,
        rescued_ingredients: newMeal.rescuedItems,
        recipe_id: recipe.id,
        ingredients_needed: recipe.ingredients.map(i => i.name),
        servings: recipe.servings,
        prep_time: recipe.prepTime || 10,
        cook_time: recipe.cookTime || 10,
        total_time: recipe.timeMinutes,
        difficulty: recipe.difficulty || "Medium",
        calories: recipe.cals,
        protein: recipe.protein,
        carbs: recipe.carbs || "0g",
        fat: recipe.fat || "0g",
        fiber: recipe.fiber || "0g",
        sugar: recipe.sugar || "0g",
        sodium: recipe.sodium || "0mg",
        eco_score: recipe.ecoScore || recipe.score,
        co2_saved: recipe.co2Saved,
        water_saved: recipe.waterSaved || 0,
        cooking_status: "selected"
      }]);
      if (error) console.error("Supabase cooked_history insert error:", error);
    }

    closeRecipeModal();
    showToast(
      `🎉 Rescued! Cooked "${recipe.title}". Saved $${recipe.wasteSaved.toFixed(2)} and avoided ${recipe.co2Saved.toFixed(1)}kg CO₂!`,
      "success"
    );
  };

  // Computations
  const urgentItemsCount = inventory.filter((i) => i.isUrgent || i.daysLeft <= 2).length;

  // Filter & Search
  const ALLERGEN_KEYWORDS_MAP: Record<string, string[]> = {
    peanuts: ["peanut", "peanuts", "groundnut"],
    dairy: ["milk", "dairy", "cheese", "butter", "paneer", "cream", "yogurt", "curd", "ghee"],
    gluten: ["gluten", "wheat", "flour", "bread", "pasta", "maida"],
    sugar: ["sugar", "honey", "syrup"],
    eggs: ["egg", "eggs", "mayo"],
    treenuts: ["nut", "nuts", "almond", "cashew", "walnut", "pecan", "pistachio"],
    shellfish: ["shrimp", "prawn", "crab", "lobster", "fish", "salmon"],
    soy: ["soy", "soya", "tofu", "tempeh"],
  };

  const activeAllergenKeywords: string[] = [];
  allergies.forEach((alg) => {
    const clean = alg.toLowerCase().trim();
    if (clean.includes(":")) {
      const [base, spec] = clean.split(":");
      if (ALLERGEN_KEYWORDS_MAP[base]) activeAllergenKeywords.push(...ALLERGEN_KEYWORDS_MAP[base]);
      if (spec) activeAllergenKeywords.push(spec.trim());
    } else if (ALLERGEN_KEYWORDS_MAP[clean]) {
      activeAllergenKeywords.push(...ALLERGEN_KEYWORDS_MAP[clean]);
    } else if (clean) {
      activeAllergenKeywords.push(clean);
    }
  });

  const filteredRecipes = recipes
    .filter((r) => {
      // 1. Strict Allergen Filtering
      if (activeAllergenKeywords.length > 0) {
        const recipeText = [
          r.title,
          r.desc,
          ...r.ingredients.map((i) => i.name),
          ...r.instructions
        ].join(" ").toLowerCase();

        const hasAllergen = activeAllergenKeywords.some((kw) => kw && recipeText.includes(kw));
        if (hasAllergen) return false;
      }

      // 2. Strict Dietary Preference Filtering
      if (dietaryPreference === "Vegetarian" && !r.isVeg) return false;
      if (dietaryPreference === "Vegan") {
        if (!r.isVeg) return false;
        const ingText = r.ingredients.map(i => i.name).join(" ").toLowerCase();
        if (/milk|cheese|paneer|butter|cream|yogurt|curd|ghee|egg|honey/i.test(ingText)) return false;
      }

      // 3. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = r.title.toLowerCase().includes(q);
        const matchesDesc = r.desc.toLowerCase().includes(q);
        const matchesIng = r.ingredients.some((ing) => ing.name.toLowerCase().includes(q));
        if (!matchesTitle && !matchesDesc && !matchesIng) return false;
      }

      // 4. Quick Filters
      if (activeFilter === "under30") return r.timeMinutes <= 30;
      if (activeFilter === "highScore") return r.score >= 90;
      if (activeFilter === "veg") return r.isVeg;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "time") return a.timeMinutes - b.timeMinutes;
      if (sortBy === "cals") return a.cals - b.cals;
      return 0;
    });

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        searchQuery,
        setSearchQuery,
        isSearching,
        activeFilter,
        setActiveFilter,
        sortBy,
        setSortBy,
        inventory,
        addInventoryItem,
        removeInventoryItem,
        toggleUrgent,
        updateQuantity,
        scannerImage,
        setScannerImage,
        recipes,
        setRecipes,
        scannedFridgeRecipes,
        setScannedFridgeRecipes,
        addScannedFridgeRecipes,
        clearScannedFridgeRecipes,
        savedRecipeIds,
        toggleSaveRecipe,
        isRecipeSaved,
        selectedRecipe,
        openRecipeModal,
        closeRecipeModal,
        cookRecipe,
        isAddModalOpen,
        setIsAddModalOpen,
        isNotificationOpen,
        setIsNotificationOpen,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        allergies,
        setAllergies,
        onboardingStep,
        setOnboardingStep,
        hasCompletedOnboarding,
        dietaryPreference,
        setDietaryPreference,
        stapleBaselines,
        setStapleBaselines,
        maxCookingTime,
        setMaxCookingTime,
        isProfileModalOpen,
        setIsProfileModalOpen,
        isGenerateModalOpen,
        setIsGenerateModalOpen,
        syncStatus,
        triggerSync,
        cookedHistory,
        addCookedMeal,
        toast,
        showToast,
        filteredRecipes,
        urgentItemsCount,
        isAuthenticated,
        setIsAuthenticated,
        userProfile,
        logout,
        theme,
        toggleTheme,
        isChatOpen,
        setIsChatOpen
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
