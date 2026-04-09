"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  geminiService,
  type FoodImageInput,
  type ParsedFoodResponse,
  type RelevantPastFood,
  type WeeklyFoodContext,
} from "../services/gemini";
import { storageService, type StoredFoodItem } from "../services/storage";
import { aliasStorageService, type Alias } from "../services/aliasStorage";
import { exportService, type ExportData } from "../services/exportService";
import { settingsStorageService } from "../services/settingsStorage";

export interface DailyTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodLogContextType {
  // State
  todayFoods: StoredFoodItem[];
  allFoodHistory: StoredFoodItem[];
  aliases: Alias[];
  dailyTotals: DailyTotals;
  selectedDate: Date;
  apiKeyConfigured: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  addFood: (
    userText: string,
    imageInput?: FoodImageInput,
  ) => Promise<ParsedFoodResponse>;
  removeFood: (id: string) => void;
  addAlias: (nickname: string, expansion: string) => Alias;
  deleteAlias: (nickname: string) => void;
  exportHistory: () => ExportData;
  downloadHistory: (filename?: string) => void;
  saveApiKey: (apiKey: string) => void;
  clearApiKey: () => void;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  clearError: () => void;
}

const FoodLogContext = createContext<FoodLogContextType | undefined>(undefined);

export function FoodLogProvider({ children }: { children: React.ReactNode }) {
  const [todayFoods, setTodayFoods] = useState<StoredFoodItem[]>([]);
  const [allFoodHistory, setAllFoodHistory] = useState<StoredFoodItem[]>([]);
  const [aliases, setAliases] = useState<Alias[]>([]);
  const [selectedDate, setSelectedDate] = useState(() => {
    const initialDate = new Date();
    initialDate.setHours(0, 0, 0, 0);
    return initialDate;
  });
  const [dailyTotals, setDailyTotals] = useState<DailyTotals>({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFoodsForDate = (date: Date) => {
    const foodsForDate = storageService.getFoodItemsByDate(date);
    setTodayFoods(foodsForDate);
    setDailyTotals(storageService.calculateDailyTotals(foodsForDate));
  };

  // Load data on mount
  useEffect(() => {
    const loadData = () => {
      try {
        setIsLoading(true);
        const history = storageService.getAllFoodHistory();
        const loadedAliases = aliasStorageService.getAll();
        const storedApiKey = settingsStorageService.getApiKey();

        setAllFoodHistory(history);
        setAliases(loadedAliases);
        setApiKeyConfigured(Boolean(storedApiKey));
        loadFoodsForDate(selectedDate);

        setError(null);
      } catch (err) {
        console.error("Error loading data:", err);
        setError("Failed to load data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedDate]);

  const addFood = async (
    userText: string,
    imageInput?: FoodImageInput,
  ): Promise<ParsedFoodResponse> => {
    try {
      setError(null);
      setIsLoading(true);

      const relevantPastFoods: RelevantPastFood[] = storageService
        .getRelevantPastFoods(userText)
        .map((item) => ({
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          timestamp: new Date(item.timestamp).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
        }));

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentWeeklyItems = storageService
        .getAllFoodHistory()
        .filter((item) => {
          if (item.deletedAt) {
            return false;
          }

          const timestamp = new Date(item.timestamp);
          return timestamp >= sevenDaysAgo;
        });

      const dedupedWeeklyItems = new Map<
        string,
        (typeof recentWeeklyItems)[0]
      >();

      for (const item of recentWeeklyItems) {
        const key = [
          item.name.trim().toLowerCase(),
          item.calories,
          item.protein,
          item.carbs,
          item.fat,
        ].join("|");

        if (!dedupedWeeklyItems.has(key)) {
          dedupedWeeklyItems.set(key, item);
        }
      }

      const weeklyFoodContext: WeeklyFoodContext[] = [
        ...dedupedWeeklyItems.values(),
      ]
        .slice(0, 120)
        .map((item) => ({
          name: item.name,
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
          timestamp: new Date(item.timestamp).toLocaleString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
        }));

      const response = await geminiService.parseFoodInput(
        userText,
        aliases,
        relevantPastFoods,
        weeklyFoodContext,
        imageInput,
      );

      if (response.aliasOnly) {
        return response;
      }

      const parsedItems =
        response.foodItems && response.foodItems.length > 0
          ? response.foodItems
          : [response.foodItem];

      const now = new Date();
      const baseSelectedTimestamp = new Date(selectedDate);
      baseSelectedTimestamp.setHours(
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds(),
      );

      const parsedItemsForSelectedDate = parsedItems.map((item, index) => ({
        ...item,
        // Keep current time-of-day ordering while assigning the selected day.
        timestamp: new Date(baseSelectedTimestamp.getTime() + index),
      }));

      // Save one or more food items
      const storedItems = parsedItemsForSelectedDate.map((item) =>
        storageService.saveFoodItem(item),
      );

      // Update state
      const updatedHistory = storageService.getAllFoodHistory();

      setAllFoodHistory(updatedHistory);
      loadFoodsForDate(selectedDate);

      return {
        ...response,
        foodItem: storedItems[0],
        foodItems: storedItems,
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to parse food";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const removeFood = (id: string) => {
    try {
      storageService.deleteFoodItem(id);

      const updatedHistory = storageService.getAllFoodHistory();

      setAllFoodHistory(updatedHistory);
      loadFoodsForDate(selectedDate);

      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to remove food";
      setError(errorMessage);
    }
  };

  const addAlias = (nickname: string, expansion: string): Alias => {
    try {
      const alias = aliasStorageService.saveAlias(nickname, expansion);
      const updatedAliases = aliasStorageService.getAll();
      setAliases(updatedAliases);
      setError(null);
      return alias;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to save alias";
      setError(errorMessage);
      throw err;
    }
  };

  const deleteAlias = (nickname: string) => {
    try {
      aliasStorageService.deleteAlias(nickname);
      const updatedAliases = aliasStorageService.getAll();
      setAliases(updatedAliases);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to delete alias";
      setError(errorMessage);
    }
  };

  const exportHistory = (): ExportData => {
    return exportService.generateExportData(allFoodHistory, aliases);
  };

  const downloadHistory = (filename?: string) => {
    const data = exportHistory();
    exportService.downloadJSON(data, filename);
  };

  const saveApiKey = (apiKey: string) => {
    settingsStorageService.saveApiKey(apiKey);
    geminiService.resetModel();
    setApiKeyConfigured(Boolean(apiKey.trim()));
    setError(null);
  };

  const clearApiKey = () => {
    settingsStorageService.clearApiKey();
    geminiService.resetModel();
    setApiKeyConfigured(false);
    setError(null);
  };

  const goToPreviousDay = () => {
    setSelectedDate((currentDate) => {
      const previousDate = new Date(currentDate);
      previousDate.setDate(previousDate.getDate() - 1);
      previousDate.setHours(0, 0, 0, 0);
      return previousDate;
    });
  };

  const goToNextDay = () => {
    setSelectedDate((currentDate) => {
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + 1);
      nextDate.setHours(0, 0, 0, 0);
      return nextDate;
    });
  };

  const clearError = () => {
    setError(null);
  };

  const value: FoodLogContextType = {
    todayFoods,
    allFoodHistory,
    aliases,
    dailyTotals,
    selectedDate,
    apiKeyConfigured,
    isLoading,
    error,
    addFood,
    removeFood,
    addAlias,
    deleteAlias,
    exportHistory,
    downloadHistory,
    saveApiKey,
    clearApiKey,
    goToPreviousDay,
    goToNextDay,
    clearError,
  };

  return (
    <FoodLogContext.Provider value={value}>{children}</FoodLogContext.Provider>
  );
}

export function useFoodLog(): FoodLogContextType {
  const context = useContext(FoodLogContext);
  if (context === undefined) {
    throw new Error("useFoodLog must be used within FoodLogProvider");
  }
  return context;
}
