"use client";

import React, { useState, useRef, useEffect } from "react";
import { useApp, Recipe } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
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

export default function AIChatModal() {
  const {
    isChatOpen,
    setIsChatOpen,
    showToast,
    allergies,
    dietaryPreference,
    maxCookingTime,
    inventory,
    userProfile,
    addScannedFridgeRecipes,
    setIsProfileModalOpen,
  } = useApp();
  const INITIAL_MESSAGES: ChatMessage[] = [
    {
      id: "msg-welcome",
      role: "assistant",
      content: "Hello! I'm your Food Rescue AI assistant. How can I help you with your fridge items, recipe ideas, or zero-waste cooking tips today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ];

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
      console.warn("Could not read chat history in AIChatModal", e);
    }
    return INITIAL_MESSAGES;
  });

  // Sync / Load last 5 chat history from Supabase storage when modal opens
  useEffect(() => {
    if (!isChatOpen) return;
    const userId = userProfile?.id || (typeof window !== "undefined" ? localStorage.getItem("guest_user_id") : null) || "00000000-0000-0000-0000-000000000001";
    
    fetch(`/api/chat-history?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.history) && data.history.length > 0) {
          setMessages((prev) => {
            if (prev.length <= 1) {
              return data.history;
            }
            return prev;
          });
        }
      })
      .catch((err) => console.warn("Could not load chat history from Supabase storage:", err));
  }, [isChatOpen, userProfile?.id]);

  // Save messages to localStorage and Supabase Storage (last 5 chats)
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
      console.warn("Could not save chat history in AIChatModal", e);
    }
  }, [messages, userProfile?.id]);

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isChatOpen) {
      scrollToBottom();
    }
  }, [messages, isChatOpen]);

  if (!isChatOpen) return null;

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

  const removeAttachment = (id: string) => {
    setDraftAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSendMessage = async (customText?: string, customAtts?: AttachmentFile[]) => {
    const messageText = (customText !== undefined ? customText : inputValue).trim();
    const attsToSend = customAtts !== undefined ? customAtts : draftAttachments;

    if ((!messageText && attsToSend.length === 0) || isLoading) return;

    setActiveError(null);

    const userMsgId = `msg-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: messageText,
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

        const scanRes = await fetch("http://localhost:8000/api/v1/scan-fridge", {
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
            content: `📸 I've analyzed your fridge photo! Here are the detected ingredients in card format:`,
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

      // 2. Fallback to standard chat completions API
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
          userMessage: messageText,
          attachments: formattedAttachments,
          userConstraints: {
            dietaryPreference,
            allergies,
            maxCookingTime,
            inventory: inventory.map((i) => i.name),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server returned error status ${response.status}`);
      }

      const assistantText =
        data.choices?.[0]?.message?.content ||
        data.message ||
        "I'm sorry, I couldn't generate a response right now.";

      const parsedRecipe = parseRecipeFromMessage(assistantText);

      // If recipes were generated in response to scanned ingredients or fridge photo, save to Scanned Fridge Recipes
      const isScanTrigger = Boolean(
        imageAttachment ||
        messageText.toLowerCase().includes("scanned") ||
        messageText.toLowerCase().includes("fridge") ||
        messageText.toLowerCase().includes("photo")
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
        id: `msg-assistant-${Date.now()}`,
        role: "assistant",
        content: assistantText,
        recipeCards: parsedRecipe || undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error("Chat error:", err);
      const errorMsg = err?.message || "Failed to communicate with AI server";
      setActiveError(errorMsg);

      const errorAssistantMsg: ChatMessage = {
        id: `msg-err-${Date.now()}`,
        role: "assistant",
        content: `Error: ${errorMsg}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        isError: true,
        canRetry: true,
        failedUserMessage: messageText,
        failedAttachments: attsToSend,
      };

      setMessages((prev) => [...prev, errorAssistantMsg]);
      showToast("Chat request failed. Click retry to try again.", "error");
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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsChatOpen(false)}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        />

        {/* Drawer Content */}
        <motion.div
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="relative w-full max-w-md bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800 shadow-2xl flex flex-col h-full z-10"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col gap-2.5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900 dark:text-gray-100 tracking-tight">
                    Food Rescue Assistant
                  </h3>
                  <div className="flex items-center space-x-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Photo Scan & AI Engine Active</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsChatOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Close chat"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* User Constraints Badges */}
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
                <svg className="w-3 h-3 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Type: {dietaryPreference}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-800 dark:text-red-300 bg-red-50 dark:bg-red-950/60 px-2 py-0.5 rounded-full border border-red-200/50 dark:border-red-800/50">
                <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
                Avoid: {allergies.length > 0 ? allergies.join(", ") : "None"}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-800/50">
                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Max: {maxCookingTime} min
              </span>
              <button
                onClick={() => setIsProfileModalOpen(true)}
                className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline ml-0.5"
              >
                <span>Edit</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>

          {/* Active Error Banner */}
          {activeError && (
            <div className="bg-red-50 dark:bg-red-950/50 border-b border-red-100 dark:border-red-900/50 p-3 px-4 flex items-start justify-between text-xs text-red-700 dark:text-red-300">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{activeError}</span>
              </div>
              <button
                onClick={() => setActiveError(null)}
                className="text-red-400 hover:text-red-600 p-0.5 ml-2"
                title="Dismiss error"
              >
                ✕
              </button>
            </div>
          )}

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 chat-scrollbar">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              const isEditingThis = isUser && editingMsgId === msg.id;
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isEditingThis ? "w-full my-2 items-stretch" : isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-2xs transition-all ${
                      isEditingThis
                        ? "w-full max-w-full bg-white dark:bg-gray-800 border-2 border-emerald-500/50 dark:border-emerald-600/60 text-gray-900 dark:text-white shadow-lg"
                        : isUser
                        ? "max-w-[90%] bg-emerald-600 text-white rounded-br-2xs"
                        : msg.isError
                        ? "max-w-[90%] bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-900/50 rounded-bl-2xs"
                        : "max-w-[90%] bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-2xs"
                    }`}
                  >
                    {/* Attachments inside user message bubble */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="mb-2.5 flex flex-wrap gap-1.5">
                        {msg.attachments.map((att) => (
                          <div key={att.id} className="relative group rounded-lg overflow-hidden border border-white/20">
                            {att.isImage && att.dataUrl ? (
                              <img src={att.dataUrl} alt={att.name} className="w-16 h-16 object-cover rounded-lg" />
                            ) : (
                              <div className="p-1.5 bg-emerald-700/50 text-white text-[10px] font-semibold flex items-center space-x-1 rounded-lg">
                                <svg className="w-3.5 h-3.5 text-white shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                </svg>
                                <span className="truncate max-w-[90px]">{att.name}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Message Content & Inline Edit */}
                    {isEditingThis ? (
                      <div className="w-full space-y-2.5">
                        <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-gray-700">
                          <div className="flex items-center space-x-1.5">
                            <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="font-bold text-xs text-gray-900 dark:text-white">Edit Recipe Prompt</span>
                          </div>
                          <span className="text-[10px] text-gray-400">{editPromptText.length} chars</span>
                        </div>

                        <textarea
                          value={editPromptText}
                          onChange={(e) => setEditPromptText(e.target.value)}
                          className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y min-h-[85px] sm:min-h-[110px]"
                          placeholder="Edit your prompt..."
                          autoFocus
                        />

                        <div className="flex items-center justify-end space-x-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            className="px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveAndResubmitEdit(msg)}
                            disabled={isLoading || !editPromptText.trim()}
                            className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-lg transition-all shadow-xs flex items-center space-x-1 disabled:opacity-50"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            <span>Save & Regenerate</span>
                          </button>
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
                          <div className="mt-1.5 pt-1.5 border-t border-white/15 flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => handleCopyPrompt(msg.id, msg.content)}
                              className="inline-flex items-center space-x-1 text-[10px] font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-md transition-colors"
                              title="Copy prompt to clipboard"
                            >
                              {copiedMsgId === msg.id ? (
                                <>
                                  <svg className="w-3 h-3 text-emerald-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-3 h-3 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleStartEdit(msg)}
                              className="inline-flex items-center space-x-1 text-[10px] font-semibold text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-md transition-colors"
                              title="Edit prompt and re-generate"
                            >
                              <svg className="w-3 h-3 text-white/80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                      <div className="mt-2.5">
                        <RecipeCarousel recipes={msg.recipeCards} />
                      </div>
                    )}

                    {/* Render Fridge Scan Card format if scan results exist */}
                    {msg.scanResults && (
                      <div className="mt-2.5">
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
                        className="mt-2.5 inline-flex items-center space-x-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span>Retry Message</span>
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-400 mt-1 px-1">{msg.timestamp}</span>
                </div>
              );
            })}

            {/* Loading Indicator State */}
            {isLoading && (
              <div className="flex items-start">
                <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-2xs p-3.5 flex items-center space-x-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1 font-medium">Scanning photo...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Draft Attachments Preview Bar */}
          {draftAttachments.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-100 dark:border-gray-800 flex items-center space-x-2 overflow-x-auto">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0">Attached ({draftAttachments.length}):</span>
              {draftAttachments.map((att) => (
                <div key={att.id} className="relative group shrink-0 flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-0.5 pr-6 text-xs shadow-2xs">
                  {att.isImage && att.dataUrl ? (
                    <img src={att.dataUrl} alt={att.name} className="w-5 h-5 object-cover rounded-sm mr-1" />
                  ) : (
                    <span className="mr-1">📄</span>
                  )}
                  <span className="truncate max-w-[80px] font-medium text-gray-700 dark:text-gray-300 text-[11px]">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="absolute right-1 text-gray-400 hover:text-red-500 p-0.5 rounded-sm transition-colors"
                    title="Remove file"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Footer Input Form */}
          <div className="p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
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

              {/* Attachment Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="p-2 text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors shrink-0"
                title="Upload file or photo"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>

              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask recipe questions or upload photo..."
                disabled={isLoading}
                className="flex-1 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 transition-shadow"
              />
              <button
                type="submit"
                disabled={isLoading || (!inputValue.trim() && draftAttachments.length === 0)}
                className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition-all shrink-0 shadow-xs active:scale-95 group relative"
                title="Cook / Generate Recipe"
              >
                <span className="text-lg transition-transform duration-200 group-hover:scale-110 group-hover:hidden select-none">🥣</span>
                <span className="text-lg transition-transform duration-200 group-hover:scale-110 hidden group-hover:inline-block select-none">🍲</span>
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
