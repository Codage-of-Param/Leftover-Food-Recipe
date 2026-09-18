"use client";

import React, { useState, useRef, useEffect } from "react";
import { useApp, Recipe } from "@/context/AppContext";
import FridgeScanCard, { ScannedIngredient } from "@/components/FridgeScanCard";

import RecipeChatCard, { ChatRecipeData } from "@/components/RecipeChatCard";
import RecipeCarousel from "@/components/RecipeCarousel";
import { parseRecipeFromMessage } from "@/utils/recipeParser";

export interface AttachmentFile {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl?: string;
  rawFile?: File;
  textContent?: string;
  isImage: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: AttachmentFile[];
  scanResults?: {
    imageUrl?: string;
    ingredients: ScannedIngredient[];
  };
  recipeCards?: ChatRecipeData[];
  timestamp: string;
  isError?: boolean;
  canRetry?: boolean;
  failedUserMessage?: string;
  failedAttachments?: AttachmentFile[];
}

const getDynamicSuggestions = (dietaryPreference: string, maxCookingTime: number) => [
  { id: "camera", text: "Analyze ingredients from my fridge photo", prompt: "Analyze ingredients from my fridge photo" },
  { id: "zap", text: `Quick ${maxCookingTime}-min dinner with my ingredients`, prompt: `Quick ${maxCookingTime}-min dinner with my ingredients` },
  { id: "diet", text: `Suggest a ${dietaryPreference !== "Any" ? dietaryPreference : "delicious"} recipe`, prompt: `Suggest a ${dietaryPreference !== "Any" ? dietaryPreference : "delicious"} recipe` },
  { id: "file", text: "Extract recipes from my uploaded grocery list", prompt: "Extract recipes from my uploaded grocery list" }
];

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: "gen-welcome",
    role: "assistant",
    content: "Welcome to the AI Recipe Chat! Upload a photo of your fridge, attach a grocery file, or type your leftover ingredients to generate custom zero-waste recipes instantly.",
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  },
];

export default function ChatGeneratorView() {
  const { showToast, inventory, allergies, dietaryPreference, maxCookingTime, userProfile, addScannedFridgeRecipes, setIsProfileModalOpen, setIsMobileSidebarOpen } = useApp();
  
  // Persistent Chat History
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window === "undefined") return INITIAL_MESSAGES;
    try {
      const saved = localStorage.getItem("foodrescue_chat_history");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Could not read chat history from localStorage", e);
    }
    return INITIAL_MESSAGES;
  });

  const [inputValue, setInputValue] = useState("");
  const [draftAttachments, setDraftAttachments] = useState<AttachmentFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeError, setActiveError] = useState<string | null>(null);

  // Copy & Edit Prompt states
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editPromptText, setEditPromptText] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Sync / Load last 5 chat history from Supabase storage on mount
  useEffect(() => {
    const userId = userProfile?.id || (typeof window !== "undefined" ? localStorage.getItem("guest_user_id") : null) || "00000000-0000-0000-0000-000000000001";
    
    fetch(`/api/chat-history?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.history) && data.history.length > 0) {
          setMessages((prev) => {
            // If current messages are just initial welcome message, load from Supabase storage
            if (prev.length <= 1) {
              return data.history;
            }
            return prev;
          });
        }
      })
      .catch((err) => console.warn("Could not load chat history from Supabase storage:", err));
  }, [userProfile?.id]);

  // Save chat history to localStorage and Supabase Storage (last 5 chats)
  useEffect(() => {
    try {
      const cleanMessages = messages.map(msg => ({
        ...msg,
        attachments: msg.attachments?.map(att => ({
          id: att.id,
          name: att.name,
          type: att.type,
          size: att.size,
          dataUrl: att.dataUrl,
          textContent: att.textContent,
          isImage: att.isImage
        }))
      }));
      localStorage.setItem("foodrescue_chat_history", JSON.stringify(cleanMessages));

      // Sync last 5 chats to Supabase Storage
      const userId = userProfile?.id || (typeof window !== "undefined" ? localStorage.getItem("guest_user_id") : null) || "00000000-0000-0000-0000-000000000001";
      if (cleanMessages.length > 1) {
        fetch("/api/chat-history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            messages: cleanMessages,
          }),
        }).catch((err) => console.warn("Failed to sync chat history to Supabase storage:", err));
      }
    } catch (e) {
      console.warn("Could not save chat history", e);
    }
  }, [messages, userProfile?.id]);

  const clearChatHistory = () => {
    setMessages(INITIAL_MESSAGES);
    try {
      localStorage.removeItem("foodrescue_chat_history");
      showToast("Chat history cleared", "info");
    } catch (e) {
      console.warn("Failed to clear chat history", e);
    }
  };

  const handleCopyPrompt = (msgId: string, text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedMsgId(msgId);
    showToast("Prompt copied to clipboard!", "success");
    setTimeout(() => {
      setCopiedMsgId(null);
    }, 2000);
  };

  const handleStartEdit = (msg: ChatMessage) => {
    setEditingMsgId(msg.id);
    setEditPromptText(msg.content);
  };

  const handleCancelEdit = () => {
    setEditingMsgId(null);
    setEditPromptText("");
  };

  const handleSaveAndResubmitEdit = (msg: ChatMessage) => {
    const updated = editPromptText.trim();
    if (!updated) return;
    setEditingMsgId(null);
    // Update message content in state and resend request
    setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, content: updated } : m)));
    handleSendMessage(updated, msg.attachments);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isImageOnly = false) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const reader = new FileReader();

      if (isImage) {
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          const att: AttachmentFile = {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl,
            rawFile: file,
            isImage: true,
          };
          setDraftAttachments((prev) => [...prev, att]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (event) => {
          const textContent = event.target?.result as string;
          const att: AttachmentFile = {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            type: file.type,
            size: file.size,
            rawFile: file,
            textContent,
            isImage: false,
          };
          setDraftAttachments((prev) => [...prev, att]);
        };
        reader.readAsText(file);
      }
    });

    if (e.target) e.target.value = "";
  };

  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const isImage = file.type.startsWith("image/");
      const reader = new FileReader();

      if (isImage) {
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          const att: AttachmentFile = {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl,
            rawFile: file,
            isImage: true,
          };
          setDraftAttachments((prev) => [...prev, att]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (event) => {
          const textContent = event.target?.result as string;
          const att: AttachmentFile = {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: file.name,
            type: file.type,
            size: file.size,
            rawFile: file,
            textContent,
            isImage: false,
          };
          setDraftAttachments((prev) => [...prev, att]);
        };
        reader.readAsText(file);
      }
    });
  };

  const removeAttachment = (id: string) => {
    setDraftAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSendMessage = async (customText?: string, customAtts?: AttachmentFile[]) => {
    const textToSend = (customText !== undefined ? customText : inputValue).trim();
    const attsToSend = customAtts !== undefined ? customAtts : draftAttachments;

    if ((!textToSend && attsToSend.length === 0) || isLoading) return;

    setActiveError(null);

    const userMsgId = `msg-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: textToSend,
      attachments: attsToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (customText === undefined) setInputValue("");
    if (customAtts === undefined) setDraftAttachments([]);
    setIsLoading(true);

    const imageAttachment = attsToSend.find((att) => att.isImage && att.rawFile);

    try {
      // 1. If user uploaded an image, trigger the Scan Fridge workflow (POST /api/v1/scan-fridge)
      if (imageAttachment && imageAttachment.rawFile) {
        const formData = new FormData();
        formData.append("image", imageAttachment.rawFile);

        const scanRes = await fetch("/api/scan-fridge", {
          method: "POST",
          body: formData,
        });

        if (scanRes.ok) {
          const scanData = await scanRes.json();
          const parsedIngredients: ScannedIngredient[] = (scanData.ingredients || []).map((ing: any) => ({
            id: ing.id || `sc-${Math.random()}`,
            name: ing.name,
            confidence: ing.confidence,
            tier: ing.tier || (ing.confidence >= 90 ? "high" : ing.confidence >= 60 ? "medium" : "low"),
          }));

          const assistantMsg: ChatMessage = {
            id: `msg-scan-${Date.now()}`,
            role: "assistant",
            content: `📸 I've analyzed your uploaded photo with our Fridge Scanner model! Here are the detected ingredients:`,
            scanResults: {
              imageUrl: imageAttachment.dataUrl,
              ingredients: parsedIngredients,
            },
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          };

          setMessages((prev) => [...prev, assistantMsg]);
          setIsLoading(false);
          return;
        }
      }

      // 2. Fallback to standard chat completions API if no image or scan failed
      const formattedAttachments = attsToSend.map((att) => ({
        name: att.name,
        type: att.type,
        isImage: att.isImage,
        content: att.isImage ? undefined : att.textContent,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userMessage: textToSend,
          attachments: formattedAttachments,
          userConstraints: {
            dietaryPreference,
            allergies,
            maxCookingTime,
            inventory: inventory.map((i) => i.name),
          },
          userId: userProfile?.id || (typeof window !== "undefined" ? localStorage.getItem("guest_user_id") : null) || "00000000-0000-0000-0000-000000000001",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server returned error status ${response.status}`);
      }

      const assistantText =
        data.choices?.[0]?.message?.content ||
        data.message ||
        "Here is your custom zero-waste recipe based on your input!";

      const parsedRecipe = parseRecipeFromMessage(assistantText);

      // If recipes were generated in response to scanned ingredients or fridge photo, save to Scanned Fridge Recipes
      const isScanTrigger = Boolean(
        imageAttachment ||
        textToSend.toLowerCase().includes("scanned") ||
        textToSend.toLowerCase().includes("fridge") ||
        textToSend.toLowerCase().includes("photo")
      );

      if (parsedRecipe && parsedRecipe.length > 0 && isScanTrigger) {
        const fullRecipes: Recipe[] = parsedRecipe.map((pr, idx) => ({
          id: pr.id || `fridge-scan-${Date.now()}-${idx}`,
          title: pr.title,
          desc: pr.desc || "Zero-waste recipe created from your scanned fridge ingredients.",
          imageBg: ["bg-emerald-800", "bg-teal-800", "bg-cyan-800", "bg-amber-800"][idx % 4],
          score: pr.score || 96,
          wasteSaved: 4.50,
          co2Saved: pr.co2Saved || 1.30,
          timeMinutes: pr.timeMinutes || (pr.prep_time || 10) + (pr.cook_time || 10) || 20,
          servings: pr.servings || 2,
          cals: pr.cals || 380,
          protein: pr.protein || "18g Protein",
          carbs: pr.carbs || "30g",
          fat: pr.fat || "10g",
          fiber: pr.fiber || "5g",
          sodium: pr.sodium || "120mg",
          isVeg: pr.isVeg !== undefined ? pr.isVeg : true,
          ingredients: pr.ingredients.map((i) => ({
            name: i.name,
            quantity: i.quantity || "1 portion",
            inPantry: i.inPantry !== undefined ? i.inPantry : true,
          })),
          instructions: pr.instructions || [],
          isFromFridgeScan: true,
          scannedAt: new Date().toISOString(),
        }));
        addScannedFridgeRecipes(fullRecipes);
        showToast("Recipes saved to Scanned Fridge section!", "success");
      }

      const assistantMsg: ChatMessage = {
        id: `msg-ast-${Date.now()}`,
        role: "assistant",
        content: assistantText,
        recipeCards: parsedRecipe || undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("Recipe Chat error:", err);
      const errorMsg = err?.message || "Failed to generate response";
      setActiveError(errorMsg);

      const errorMsgObj: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: "assistant",
        content: `⚠️ Error: ${errorMsg}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
        canRetry: true,
        failedUserMessage: textToSend,
        failedAttachments: attsToSend,
      };

      setMessages((prev) => [...prev, errorMsgObj]);
      showToast("Generation failed. Click retry to try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = (msg: ChatMessage) => {
    if (msg.failedUserMessage !== undefined || msg.failedAttachments !== undefined) {
      setMessages((prev) => prev.filter((m) => m.id !== msg.id));
      handleSendMessage(msg.failedUserMessage, msg.failedAttachments);
    }
  };

  return (
    <div 
      className={`h-full flex flex-col p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full transition-colors ${
        isDragging ? "bg-emerald-50/50 dark:bg-emerald-900/10 ring-4 ring-inset ring-emerald-500/50 rounded-3xl" : ""
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-emerald-900/20 backdrop-blur-sm pointer-events-none transition-all">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-2xl flex flex-col items-center animate-bounce border border-emerald-100 dark:border-emerald-800">
            <svg className="w-16 h-16 text-emerald-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center">Drop file here to upload</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Images, lists, and receipts are supported.</p>
          </div>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="mb-3 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Open Menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Interactive AI Culinary Engine</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
            Chat-Based Recipe Generator
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Upload fridge photos or recipe notes, or ask the AI to craft zero-waste dishes tailored to your pantry.
          </p>

          {/* User Constraints Badges */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
              <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Type: {dietaryPreference}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-950/60 px-2.5 py-1 rounded-full border border-red-200/50 dark:border-red-800/50">
              <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
              Avoid: {allergies.length > 0 ? allergies.join(", ") : "None"}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200/50 dark:border-amber-800/50">
              <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Max: {maxCookingTime} min
            </span>
          </div>
        </div>

        {/* Pantry Quick Counter & Clear History Button */}
        <div className="flex items-center space-x-3 shrink-0">
          {messages.length > 1 && (
            <button
              onClick={clearChatHistory}
              className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-950/50 text-gray-500 hover:text-red-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-semibold transition-colors flex items-center space-x-1.5"
              title="Clear Saved Chat History"
            >
              <svg className="w-3.5 h-3.5 text-gray-500 hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Clear History</span>
            </button>
          )}

          <div className="bg-white dark:bg-gray-800 p-3 px-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-2xs flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center font-bold text-sm">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Active Pantry</div>
              <div className="text-xs font-bold text-gray-900 dark:text-gray-100">{inventory.length} ingredients ready</div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Error Banner */}
      {activeError && (
        <div className="mb-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 p-3 rounded-2xl flex items-center justify-between text-xs text-red-700 dark:text-red-300 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="font-bold">Error:</span>
            <span>{activeError}</span>
          </div>
          <button onClick={() => setActiveError(null)} className="text-red-400 hover:text-red-600 p-1">
            ✕
          </button>
        </div>
      )}

      {/* Chat Messages Container */}
      <div className="flex-1 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden flex flex-col min-h-0">
        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 chat-scrollbar">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            const isEditingThis = isUser && editingMsgId === msg.id;
            return (
              <div key={msg.id} className={`flex flex-col ${isEditingThis ? "w-full my-2 items-stretch" : isUser ? "items-end" : "items-start"}`}>
                <div
                  className={`rounded-3xl p-4 text-xs sm:text-sm leading-relaxed shadow-2xs transition-all ${
                    isEditingThis
                      ? "w-full max-w-full bg-white dark:bg-gray-800 border-2 border-emerald-500/50 dark:border-emerald-600/60 text-gray-900 dark:text-white shadow-xl"
                      : isUser
                      ? "max-w-[92%] sm:max-w-[85%] bg-emerald-600 text-white rounded-br-xs"
                      : msg.isError
                      ? "max-w-[92%] sm:max-w-[85%] bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-900/50 rounded-bl-xs"
                      : (msg.recipeCards && msg.recipeCards.length > 0) || msg.scanResults
                      ? "w-[96%] max-w-[96%] sm:max-w-[90%] bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-xs"
                      : "max-w-[92%] sm:max-w-[85%] bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-100 rounded-bl-xs"
                  }`}
                >
                  {/* Attachments inside user message bubble */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {msg.attachments.map((att) => (
                        <div key={att.id} className="relative group rounded-xl overflow-hidden border border-white/20">
                          {att.isImage && att.dataUrl ? (
                            <img src={att.dataUrl} alt={att.name} className="w-24 h-24 object-cover rounded-xl" />
                          ) : (
                            <div className="p-2 bg-emerald-700/50 text-white text-[11px] font-semibold flex items-center space-x-1.5 rounded-xl">
                              <svg className="w-4 h-4 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <span className="truncate max-w-[120px]">{att.name}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Message Content & Inline Edit */}
                  {isEditingThis ? (
                    <div className="w-full space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700/80">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </div>
                          <div>
                            <h5 className="font-bold text-xs sm:text-sm text-gray-900 dark:text-white">Edit Recipe Prompt</h5>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400 hidden sm:block">Edit your leftover ingredients or dietary requirements below</p>
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-gray-400">
                          {editPromptText.length} chars
                        </span>
                      </div>

                      <textarea
                        value={editPromptText}
                        onChange={(e) => setEditPromptText(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 border border-gray-200 dark:border-gray-700 rounded-2xl p-3 sm:p-4 text-xs sm:text-sm md:text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y min-h-[90px] sm:min-h-[120px] md:min-h-[140px]"
                        placeholder="Edit your prompt..."
                        autoFocus
                      />

                      <div className="flex items-center justify-between pt-1">
                        <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 hidden sm:flex items-center space-x-1">
                          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>Submitting will regenerate zero-waste recipes with updated constraints</span>
                        </p>
                        <div className="flex items-center space-x-2 ml-auto">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-3.5 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveAndResubmitEdit(msg)}
                            disabled={isLoading || !editPromptText.trim()}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm flex items-center space-x-1.5 disabled:opacity-50"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Save & Regenerate</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap">{
                        msg.recipeCards && msg.recipeCards.length > 0
                          ? msg.content
                              .replace(/```json[\s\S]*?```/g, "")
                              .replace(/\[[\s\S]*?"title"[\s\S]*?\]/g, "")
                              .trim() || `I found ${msg.recipeCards.length} recipes you can make with your available ingredients!`
                          : msg.content
                      }</p>

                      {/* User Prompt Action Toolbar (Copy & Edit) */}
                      {isUser && msg.content && (
                        <div className="mt-2 pt-2 border-t border-white/15 flex items-center justify-end space-x-2">
                          <button
                            type="button"
                            onClick={() => handleCopyPrompt(msg.id, msg.content)}
                            className="inline-flex items-center space-x-1 text-[11px] font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors"
                            title="Copy prompt to clipboard"
                          >
                            {copiedMsgId === msg.id ? (
                              <>
                                <svg className="w-3.5 h-3.5 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-3.5 h-3.5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                                <span>Copy</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEdit(msg)}
                            className="inline-flex items-center space-x-1 text-[11px] font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors"
                            title="Edit prompt and re-generate"
                          >
                            <svg className="w-3.5 h-3.5 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span>Edit</span>
                          </button>
                        </div>
                      )}


                    </>
                  )}

                  {/* Render Recipe Card Format if parsed recipe exists */}
                  {msg.recipeCards && msg.recipeCards.length > 0 && (
                    <RecipeCarousel recipes={msg.recipeCards} />
                  )}

                  {/* Render Fridge Scan Card format if scan results exist */}
                  {msg.scanResults && (
                    <div className="mt-3">
                      <FridgeScanCard
                        imageUrl={msg.scanResults.imageUrl}
                        ingredients={msg.scanResults.ingredients}
                        onGenerateRecipes={(ingredientNames) => {
                          handleSendMessage(
                            `Generate creative zero-waste recipes using these scanned ingredients: ${ingredientNames.join(", ")}`
                          );
                        }}
                      />
                    </div>
                  )}

                  {/* Retry Button State */}
                  {msg.canRetry && (
                    <button
                      onClick={() => handleRetry(msg)}
                      disabled={isLoading}
                      className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Retry Request</span>
                    </button>
                  )}
                </div>
                <span className="text-[10px] text-gray-400 mt-1 px-2">{msg.timestamp}</span>
              </div>
            );
          })}

          {/* Loading Indicator State */}
          {isLoading && (
            <div className="flex items-start">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-3xl rounded-bl-xs p-4 flex items-center space-x-2">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold ml-2">Analyzing image & crafting recipe...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompt Chips (Positioned directly above the textfield for laptop and tablet users) */}
        <div className="px-3 sm:px-4 py-2 bg-gray-50/90 dark:bg-gray-800/90 border-t border-gray-100 dark:border-gray-800 flex items-center space-x-2 overflow-x-auto scrollbar-none shrink-0">
          {getDynamicSuggestions(dietaryPreference, maxCookingTime).map((chip) => (
            <button
              key={chip.id}
              onClick={() => {
                if (chip.id === "camera") {
                  handleSendMessage(chip.prompt);
                } else {
                  setInputValue(chip.prompt);
                  setTimeout(() => textInputRef.current?.focus(), 10);
                }
              }}
              disabled={isLoading}
              className="inline-flex items-center text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 hover:text-emerald-700 dark:hover:text-emerald-300 border border-gray-200 dark:border-gray-700 rounded-full px-3.5 py-1.5 transition-all shrink-0 active:scale-95 shadow-2xs"
            >
              {chip.id === "camera" && (
                <svg className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
              {chip.id === "zap" && (
                <svg className="w-3.5 h-3.5 mr-1.5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              )}
              {chip.id === "soup" && (
                <svg className="w-3.5 h-3.5 mr-1.5 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              )}
              {chip.id === "file" && (
                <svg className="w-3.5 h-3.5 mr-1.5 text-blue-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              )}
              <span>{chip.text}</span>
            </button>
          ))}
        </div>

        {/* Draft Attachments Preview Bar */}
        {draftAttachments.length > 0 && (
          <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-800 flex items-center space-x-2 overflow-x-auto chat-scrollbar">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Attached ({draftAttachments.length}):</span>
            {draftAttachments.map((att) => (
              <div key={att.id} className="relative group shrink-0 flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-2 py-1 pr-7 text-xs shadow-2xs">
                {att.isImage && att.dataUrl ? (
                  <img src={att.dataUrl} alt={att.name} className="w-6 h-6 object-cover rounded-md mr-1.5" />
                ) : (
                  <svg className="w-4 h-4 text-gray-500 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
                <span className="truncate max-w-[100px] font-medium text-gray-700 dark:text-gray-300">{att.name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(att.id)}
                  className="absolute right-1 text-gray-400 hover:text-red-500 p-0.5 rounded-md transition-colors"
                  title="Remove file"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Bar Form */}
        <div className="p-3 sm:p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center space-x-2"
          >
            {/* Hidden File Inputs */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => handleFileUpload(e, false)}
              multiple
              accept="image/*,.txt,.json,.csv,.pdf"
              className="hidden"
            />
            <input
              type="file"
              ref={imageInputRef}
              onChange={(e) => handleFileUpload(e, true)}
              multiple
              accept="image/*"
              className="hidden"
            />



            {/* Image Photo Button */}
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              disabled={isLoading}
              className="p-2.5 text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors shrink-0"
              title="Upload fridge photo to scan ingredients"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>

            {/* Text Input */}
            <input
              ref={textInputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask for recipe ideas or upload fridge photo..."
              disabled={isLoading}
              className="flex-1 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs sm:text-sm rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 transition-shadow"
            />

            {/* Cook Bowl Send Button (flamed cook bowl on hover) */}
            <button
              type="submit"
              disabled={isLoading || (!inputValue.trim() && draftAttachments.length === 0)}
              className="w-11 h-11 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-2xl flex items-center justify-center transition-all shrink-0 shadow-xs active:scale-95 group relative"
              title="Cook / Generate Recipe"
            >
              {/* Normal Cook Bowl SVG */}
              <svg className="w-5 h-5 transition-transform duration-200 group-hover:scale-110 group-hover:hidden fill-current" viewBox="0 0 24 24">
                <path d="M21 12A9 9 0 013 12h18zM5 14a7 7 0 0014 0H5zm3 3a1 1 0 001 1h6a1 1 0 001-1v-1H8v1z" />
              </svg>
              {/* Steaming/Flamed Cook Bowl SVG (Hover) */}
              <svg className="w-5 h-5 transition-transform duration-200 group-hover:scale-110 hidden group-hover:inline-block fill-current" viewBox="0 0 24 24">
                <path d="M12 2a1 1 0 011 1v2a1 1 0 11-2 0V3a1 1 0 011-1zm-4 2a1 1 0 011 1v2a1 1 0 11-2 0V5a1 1 0 011-1zm8 0a1 1 0 011 1v2a1 1 0 11-2 0V5a1 1 0 011-1zM21 12A9 9 0 013 12h18zM5 14a7 7 0 0014 0H5zm3 3a1 1 0 001 1h6a1 1 0 001-1v-1H8v1z" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
