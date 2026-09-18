"use client";

import React, { useState, useEffect, useRef } from "react";
import { useApp, Recipe } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";

interface DetectedItem {
  id: string;
  name: string;
  confidence: number;
  box: { top: number; left: number; width: number; height: number }; // percentages
  status: "confirmed" | "suggested" | "uncertain";
  isEditing: boolean;
  tempName: string;
}

export default function ScannerModal() {
  const { scannerImage, setScannerImage, addInventoryItem, addScannedFridgeRecipes, setActiveTab, showToast, setIsGenerateModalOpen, isScannerModalOpen, setIsScannerModalOpen } = useApp();
  const [isScanning, setIsScanning] = useState(true);
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scannerImage) {
      setIsScanning(true);
      setScanError(null);
      
      const formData = new FormData();
      formData.append("image", scannerImage.file);

      fetch("/api/scan-fridge", {
        method: "POST",
        body: formData,
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            const errorMsg = data.detail || data.error || `Scanner API returned status ${res.status}`;
            throw new Error(errorMsg);
          }
          return data;
        })
        .then((data) => {
          if (data.ingredients) {
            const mapped = data.ingredients.map((ing: any) => ({
              id: ing.id,
              name: ing.name,
              confidence: ing.confidence,
              box: ing.bounding_box
                ? {
                    top: ing.bounding_box.y * 100,
                    left: ing.bounding_box.x * 100,
                    width: ing.bounding_box.width * 100,
                    height: ing.bounding_box.height * 100,
                  }
                : { top: 0, left: 0, width: 0, height: 0 },
              status: ing.tier === "high" ? "confirmed" : ing.tier === "medium" ? "suggested" : "uncertain",
              isEditing: false,
              tempName: ing.name,
            }));
            setItems(mapped);
          }
        })
        .catch((err) => {
          console.error("Scanning error:", err);
          const errMsg = err?.message === "Failed to fetch" 
            ? "Unable to reach scanner service at http://localhost:8000. Ensure backend is active."
            : (err?.message || "Failed to analyze image with AI");
          setScanError(errMsg);
          showToast(errMsg, "error");
        })
        .finally(() => {
          setIsScanning(false);
        });
    } else {
      setItems([]);
      setScanError(null);
    }
  }, [scannerImage]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera when modal closes or unmounts
  useEffect(() => {
    return () => stopCamera();
  }, [isScannerModalOpen]);

  // Attach stream to video element when it mounts
  useEffect(() => {
    if (isLiveCameraOpen && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [isLiveCameraOpen]);

  const startCamera = async () => {
    setIsLiveCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      showToast("Unable to access camera.", "error");
      setIsLiveCameraOpen(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsLiveCameraOpen(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
            const imageUrl = URL.createObjectURL(file);
            setScannerImage({ url: imageUrl, file });
            stopCamera();
          }
        }, "image/jpeg");
      }
    }
  };


  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      showToast("File is too large! Maximum allowed size is 1MB.", "alert");
      e.target.value = '';
      return;
    }
    const imageUrl = URL.createObjectURL(file);
    setScannerImage({ url: imageUrl, file });
    e.target.value = '';
  };

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
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    if (file.size > 1024 * 1024) {
      showToast("File is too large! Maximum allowed size is 1MB.", "alert");
      return;
    }
    const imageUrl = URL.createObjectURL(file);
    setScannerImage({ url: imageUrl, file });
  };

  const handleClose = () => {
    setScannerImage(null);
    setIsScannerModalOpen(false);
  };

  if (!isScannerModalOpen) return null;

  if (!scannerImage) {
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl overflow-hidden flex flex-col shadow-2xl relative"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 z-10 shrink-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <span className="text-emerald-600 dark:text-emerald-400">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </span>
                <span>Scan Your Fridge</span>
              </h2>
              <button
                onClick={() => {
                  stopCamera();
                  setIsScannerModalOpen(false);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 items-center text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Upload a photo of your fridge, and our AI will detect your ingredients instantly!
              </p>

              {isLiveCameraOpen ? (
                <div className="w-full h-64 sm:h-72 bg-black rounded-2xl overflow-hidden relative flex flex-col">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                    <button
                      onClick={capturePhoto}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-full shadow-lg transition-transform active:scale-95"
                      title="Take Photo"
                    >
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                    <button
                      onClick={stopCamera}
                      className="bg-gray-800/70 hover:bg-gray-900 text-white p-3 rounded-full shadow-lg transition-transform active:scale-95"
                      title="Cancel Camera"
                    >
                      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full h-48 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all ${isDragging ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                >
                  <svg className="w-10 h-10 text-emerald-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="font-semibold text-gray-700 dark:text-gray-300">Drag & Drop Image</span>
                  <span className="text-xs text-gray-500 mt-1">or click to browse (Max 1MB)</span>
                </div>
              )}

              {!isLiveCameraOpen && (
                <div className="flex w-full flex-col sm:flex-row gap-4">
                  <button onClick={startCamera} className="flex-1 py-3 px-4 flex items-center justify-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    Camera
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-3 px-4 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 font-semibold text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Gallery
                  </button>
                </div>
              )}
              
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
    );
  }

  const confirmSuggestion = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: "confirmed" as const } : item))
    );
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const enableEditing = (id: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isEditing: true } : item))
    );
  };

  const saveEdit = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          return {
            ...item,
            name: item.tempName || "Unknown",
            status: "confirmed" as const,
            isEditing: false,
            confidence: 100 // Manual override gives 100% confidence
          };
        }
        return item;
      })
    );
  };

  const handleTempNameChange = (id: string, newName: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, tempName: newName } : item))
    );
  };

  const handleManualAdd = () => {
    const newItem: DetectedItem = {
      id: `det-new-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: "",
      confidence: 100,
      box: { top: 40, left: 40, width: 20, height: 20 },
      status: "uncertain",
      isEditing: true,
      tempName: ""
    };
    setItems((prev) => [...prev, newItem]);
  };

  const finalizeAndSaveMock = () => {
    const itemsToAdd = items.filter(i => i.status === "confirmed" || i.status === "suggested");
    
    if (itemsToAdd.length === 0) {
      showToast("No ingredients confirmed!", "alert");
      return;
    }

    itemsToAdd.forEach((item) => {
      // Pick a random category for mock purposes, but normally AI gives this
      const cats = ["Produce", "Dairy", "Pantry", "Proteins", "Grains"] as const;
      const cat = cats[Math.floor(Math.random() * cats.length)];
      addInventoryItem(item.name, "1 unit", cat, 5, false);
    });

    const ingredientNames = itemsToAdd.map((i) => i.name);
    const mainNames = itemsToAdd.slice(0, 2).map((i) => i.name).join(" & ");
    const scannedRec: Recipe = {
      id: `scan-rec-${Date.now()}`,
      title: `${mainNames} Sauté Bowl`,
      desc: `A vibrant zero-waste skillet meal formulated directly from your scanned fridge ingredients: ${ingredientNames.join(", ")}.`,
      imageBg: "bg-emerald-800",
      score: 97,
      wasteSaved: 4.80,
      co2Saved: 1.40,
      timeMinutes: 18,
      servings: 2,
      cals: 360,
      protein: "16g",
      carbs: "35g",
      fat: "14g",
      fiber: "8g",
      isVeg: true,
      ingredients: itemsToAdd.map((i) => ({
        name: i.name,
        quantity: "1 portion",
        inPantry: true
      })),
      instructions: [
        `Prep and rinse the fresh ${itemsToAdd[0]?.name || "ingredients"}, then slice into even bite-sized portions.`,
        `Heat 1 tbsp olive oil or butter in a wide skillet over medium-high flame until fragrant.`,
        `Toss in ${ingredientNames.slice(0, 3).join(", ")} and sauté for 4-5 minutes until tender and caramelized.`,
        `Season generously with salt, cracked black pepper, and chili flakes, then serve hot.`
      ],
      isFromFridgeScan: true,
      scannedAt: new Date().toISOString()
    };

    addScannedFridgeRecipes([scannedRec]);
    showToast(`Added ${itemsToAdd.length} items to pantry & saved recipe to Scanned Fridge section!`, "success");
    setScannerImage(null);
    setActiveTab("recipes");
  };

  const finalizeAndOpenAI = () => {
    const itemsToAdd = items.filter(i => i.status === "confirmed" || i.status === "suggested");
    
    if (itemsToAdd.length === 0) {
      showToast("No ingredients confirmed!", "alert");
      return;
    }

    itemsToAdd.forEach((item) => {
      const cats = ["Produce", "Dairy", "Pantry", "Proteins", "Grains"] as const;
      const cat = cats[Math.floor(Math.random() * cats.length)];
      addInventoryItem(item.name, "1 unit", cat, 5, false);
    });

    showToast(`Added ${itemsToAdd.length} items to pantry. Launching AI generator...`, "success");
    setScannerImage(null);
    setActiveTab("recipes");
    setTimeout(() => setIsGenerateModalOpen(true), 300); // slight delay for smooth transition
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 md:p-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-gray-900 w-full max-w-5xl h-full max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl relative"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 z-10 shrink-0">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center space-x-2">
              <span className="text-emerald-600 dark:text-emerald-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </span>
              <span>AI Fridge Analysis</span>
            </h2>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {scanError && (
            <div className="mx-6 mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-700 dark:text-red-300 text-sm flex items-start gap-3 relative z-20 animate-fade-in shadow-sm">
              <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1 font-medium">{scanError}</div>
              <button onClick={() => setScanError(null)} className="text-red-400 hover:text-red-600 dark:hover:text-red-200">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950">
            {/* Image Preview Area */}
            <div className="w-full md:w-3/5 bg-black relative min-h-[200px] md:min-h-[300px] flex items-center justify-center p-4 border-r border-gray-100 dark:border-gray-800">
              <div className="relative inline-block max-w-full max-h-full" ref={containerRef}>
                <img
                  src={scannerImage.url}
                  alt="Scanned Fridge"
                  className="max-w-full max-h-[40vh] md:max-h-[80vh] object-contain rounded-lg shadow-lg"
                />

                {isScanning && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center rounded-lg backdrop-blur-sm z-20">
                    <svg className="animate-spin h-10 w-10 text-emerald-500 mb-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <div className="text-white font-bold text-lg tracking-wider">ANALYZING INGREDIENTS...</div>
                    <div className="text-emerald-400 text-sm mt-2">Running object detection models</div>
                  </div>
                )}

                {!isScanning &&
                  items.filter(item => item.box.width > 0).map((item) => (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      key={item.id}
                      className={`absolute border-2 transition-all ${
                        item.status === "confirmed" || item.confidence >= 90
                          ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                          : item.status === "suggested"
                          ? "border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                          : "border-red-500 border-dashed shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                      }`}
                      style={{
                        top: `${item.box.top}%`,
                        left: `${item.box.left}%`,
                        width: `${item.box.width}%`,
                        height: `${item.box.height}%`,
                      }}
                    >
                      <div
                        className={`absolute -top-7 left-0 whitespace-nowrap px-2 py-1 text-xs font-bold rounded-t-md text-white ${
                          item.status === "confirmed" || item.confidence >= 90
                            ? "bg-emerald-600"
                            : item.status === "suggested"
                            ? "bg-amber-500"
                            : "bg-gradient-to-r from-red-600 to-orange-500"
                        }`}
                      >
                        {item.status === "confirmed" && `${item.name} (${item.confidence}%)`}
                        {item.status === "suggested" && `Possible: ${item.name} (${item.confidence}%)`}
                        {item.status === "uncertain" && `Uncertain (${item.confidence}%)`}
                      </div>
                    </motion.div>
                  ))}
              </div>
            </div>

            {/* List & Controls Area */}
            <div className="w-full md:w-2/5 flex flex-col h-full max-h-full overflow-hidden bg-white dark:bg-gray-900">
              <div className="p-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Review Detected Items</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Please confirm uncertain items before generating recipes.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                {isScanning ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse flex items-center space-x-4 p-4 border border-gray-100 dark:border-gray-800 rounded-xl">
                        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-lg"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <AnimatePresence>
                      {items.map((item) => (
                        <motion.div
                          key={item.id}
                          layout
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className={`p-4 rounded-xl border flex flex-col gap-3 transition-all ${
                            item.status === "confirmed" || item.confidence >= 90
                              ? "bg-gradient-to-r from-emerald-900/35 via-emerald-800/15 to-transparent dark:from-emerald-950/90 dark:via-emerald-900/50 dark:to-transparent border-emerald-600/40 dark:border-emerald-700/60 text-gray-900 dark:text-white"
                              : item.status === "uncertain" || item.confidence < 60
                              ? "bg-gradient-to-r from-red-900/35 via-orange-800/20 to-transparent dark:from-red-950/90 dark:via-orange-950/60 dark:to-transparent border-red-500/40 dark:border-rose-700/60 text-gray-900 dark:text-white"
                              : "bg-gradient-to-r from-amber-900/25 via-amber-800/10 to-transparent dark:from-amber-950/70 dark:via-amber-900/35 dark:to-transparent border-amber-500/40 dark:border-amber-700/60 text-gray-900 dark:text-white"
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              {item.isEditing ? (
                                <input
                                  type="text"
                                  value={item.tempName}
                                  onChange={(e) => handleTempNameChange(item.id, e.target.value)}
                                  className="w-full px-3 py-1.5 text-sm border border-emerald-300 dark:border-emerald-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-800 dark:text-white"
                                  placeholder="Ingredient name..."
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEdit(item.id);
                                  }}
                                />
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    {item.status === "uncertain" ? "Unknown Item" : item.name}
                                  </span>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                                    item.confidence >= 90 || item.status === "confirmed"
                                      ? "bg-emerald-900/25 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-300 border-emerald-600/40"
                                      : item.confidence < 60 || item.status === "uncertain"
                                      ? "bg-gradient-to-r from-red-500/25 to-orange-500/25 text-red-900 dark:text-orange-300 border-red-500/40"
                                      : "bg-amber-200/50 dark:bg-amber-950 text-amber-900 dark:text-amber-300 border-amber-500/40"
                                  }`}>
                                    {item.confidence}% match
                                  </span>
                                </div>
                              )}

                              {!item.isEditing && (
                                <div className="text-xs mt-1">
                                  {(item.status === "confirmed" || item.confidence >= 90) && (
                                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">Auto-confirmed (High Confidence)</span>
                                  )}
                                  {item.status === "suggested" && item.confidence >= 60 && item.confidence < 90 && (
                                    <span className="text-amber-600 dark:text-amber-400 font-medium">Please review this suggestion</span>
                                  )}
                                  {(item.status === "uncertain" || item.confidence < 60) && (
                                    <span className="text-red-600 dark:text-orange-400 font-semibold">Needs review (Low Confidence)</span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <div className="flex space-x-1 shrink-0 ml-2">
                              {item.isEditing ? (
                                <button onClick={() => saveEdit(item.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-md transition-colors" title="Save">
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                </button>
                              ) : (
                                <button onClick={() => enableEditing(item.id)} className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors" title="Edit">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                              )}
                              <button onClick={() => removeItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors" title="Remove">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {item.status === "suggested" && !item.isEditing && (
                            <div className="flex space-x-2 mt-1">
                              <button onClick={() => confirmSuggestion(item.id)} className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center justify-center">
                                ✓ Confirm Correct
                              </button>
                            </div>
                          )}
                          {item.status === "uncertain" && !item.isEditing && (
                            <div className="flex space-x-2 mt-1">
                              <button onClick={() => enableEditing(item.id)} className="text-xs bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1.5 rounded-lg font-semibold transition-colors">
                                Identify Item
                              </button>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    <button
                      onClick={handleManualAdd}
                      className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors flex items-center justify-center space-x-2"
                    >
                      <span>+</span>
                      <span>Missed something? Add manually</span>
                    </button>
                  </>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-4 sm:p-5 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 shrink-0 flex gap-3">
                <button
                  onClick={finalizeAndSaveMock}
                  disabled={isScanning || items.length === 0}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3.5 rounded-xl shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save to Pantry
                </button>
                <button
                  onClick={finalizeAndOpenAI}
                  disabled={isScanning || items.length === 0}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Generate with AI</span>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
