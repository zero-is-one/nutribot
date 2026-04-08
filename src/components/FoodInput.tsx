"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, AlertCircle, Camera, CheckCircle2, X } from "lucide-react";
import { useFoodLog } from "../context/FoodLogContext";
import type { FoodImageInput } from "../services/gemini";

interface AliasConfirmationState {
  isOpen: boolean;
  nickname: string;
  expansion: string;
}

export function FoodInput() {
  const [input, setInput] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<{
    fileName: string;
    previewUrl: string;
    mimeType: string;
    base64Data: string;
  } | null>(null);
  const [aliasConfirmation, setAliasConfirmation] =
    useState<AliasConfirmationState>({
      isOpen: false,
      nickname: "",
      expansion: "",
    });
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { addFood, addAlias, dailyTotals, isLoading, error, clearError } =
    useFoodLog();

  const handleCameraSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(",")[1] || "";
      setSelectedImage({
        fileName: file.name,
        previewUrl: result,
        mimeType: file.type || "image/jpeg",
        base64Data,
      });
    };
    reader.readAsDataURL(file);
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    if (cameraInputRef.current) {
      cameraInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !selectedImage) || isLoading) return;

    try {
      clearError();
      setSuccessMessage("");
      const imagePayload: FoodImageInput | undefined = selectedImage
        ? {
            mimeType: selectedImage.mimeType,
            data: selectedImage.base64Data,
          }
        : undefined;

      const response = await addFood(input, imagePayload);

      // If an alias was detected, show confirmation dialog
      if (response.detectedAlias) {
        setAliasConfirmation({
          isOpen: true,
          nickname: response.detectedAlias.nickname,
          expansion: response.detectedAlias.expansion,
        });
      }

      // Clear input after successful submission
      setInput("");
      setSelectedImage(null);
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
      if (inputRef.current) {
        inputRef.current.focus();
      }
    } catch (err) {
      console.error("Error adding food:", err);
    }
  };

  const handleConfirmAlias = () => {
    try {
      addAlias(aliasConfirmation.nickname, aliasConfirmation.expansion);
      setSuccessMessage(
        `Saved alias: "${aliasConfirmation.nickname}" = "${aliasConfirmation.expansion}"`,
      );
      setAliasConfirmation({ isOpen: false, nickname: "", expansion: "" });
      setInput("");
      setSelectedImage(null);
      if (cameraInputRef.current) {
        cameraInputRef.current.value = "";
      }
    } catch (err) {
      console.error("Error saving alias:", err);
    }
  };

  const handleCancelAlias = () => {
    setAliasConfirmation({ isOpen: false, nickname: "", expansion: "" });
  };

  useEffect(() => {
    if (aliasConfirmation.isOpen) {
      return; // Don't focus input while dialog is open
    }
  }, [aliasConfirmation.isOpen]);

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 z-10 bg-white dark:bg-slate-900 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-slate-200 dark:border-slate-700"
      >
        <div className="mb-3 flex items-end justify-center gap-6">
          <div className="flex flex-col items-center">
            <div className="text-xl font-bold text-sea-ink dark:text-foam">
              {dailyTotals.calories.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              calories
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xl font-bold text-sea-ink dark:text-foam">
              {dailyTotals.protein}g
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              protein
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xl font-bold text-sea-ink dark:text-foam">
              {dailyTotals.carbs}g
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              carbs
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-gap-2 gap-2">
            <AlertCircle
              size={18}
              className="text-red-600 dark:text-red-400 flex-shrink-0"
            />
            <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-gap-2 gap-2">
            <CheckCircle2
              size={18}
              className="text-emerald-600 dark:text-emerald-400 flex-shrink-0"
            />
            <p className="text-sm text-emerald-700 dark:text-emerald-200">
              {successMessage}
            </p>
          </div>
        )}

        {selectedImage && (
          <div className="mb-3 flex items-center gap-3 rounded-lg border border-slate-200 dark:border-slate-700 p-2">
            <img
              src={selectedImage.previewUrl}
              alt="Selected food"
              className="h-12 w-12 rounded object-cover"
            />
            <div className="flex-1 min-w-0 text-sm text-slate-600 dark:text-slate-300 truncate">
              {selectedImage.fileName}
            </div>
            <button
              type="button"
              onClick={removeSelectedImage}
              disabled={isLoading}
              className="p-1 rounded text-slate-500 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800"
              aria-label="Remove photo"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="flex gap-3 items-center">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraSelect}
            className="hidden"
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isLoading}
            className="p-3 border border-slate-300 dark:border-slate-600 rounded-lg text-sea-ink dark:text-foam active:bg-slate-100 dark:active:bg-slate-800 disabled:opacity-50"
            title="Take photo"
            aria-label="Take food photo"
          >
            <Camera size={20} />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter your food and amounts"
            disabled={isLoading}
            className="flex-1 px-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-palm dark:focus:ring-palm bg-white dark:bg-slate-800 text-sea-ink dark:text-foam placeholder-slate-400 dark:placeholder-slate-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={(!input.trim() && !selectedImage) || isLoading}
            className="p-3 bg-[var(--palm)] active:opacity-90 disabled:bg-slate-300 dark:disabled:bg-slate-600 rounded-lg transition-colors text-white flex items-center justify-center min-w-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lagoon)]"
            title="Add food"
            aria-label="Add food entry"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowRight size={20} />
            )}
          </button>
        </div>
      </form>

      {/* Alias Confirmation Dialog */}
      {aliasConfirmation.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 dark:bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4 text-sea-ink dark:text-foam">
              Save Food Alias?
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">
              Save{" "}
              <span className="font-semibold text-sea-ink dark:text-foam">
                "{aliasConfirmation.nickname}"
              </span>{" "}
              as an alias for{" "}
              <span className="font-semibold text-sea-ink dark:text-foam">
                "{aliasConfirmation.expansion}"
              </span>
              ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleCancelAlias}
                className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 active:bg-slate-50 dark:active:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAlias}
                className="flex-1 px-4 py-2 bg-[var(--palm)] active:opacity-90 rounded-lg text-white transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
