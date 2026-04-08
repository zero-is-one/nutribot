import type { FoodItem } from "./gemini";

const STORAGE_KEY = "nutribot_food_items";

export interface StoredFoodItem extends FoodItem {
  id: string;
  deletedAt?: string;
}

interface ScoredFoodItem {
  item: StoredFoodItem;
  score: number;
}

class StorageService {
  private normalizeDate(date: Date): Date {
    const normalizedDate = new Date(date);
    normalizedDate.setHours(0, 0, 0, 0);
    return normalizedDate;
  }

  private normalizeFoodText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=_`~()]/g, " ")
      .replace(/\b(a|an|the|some|about|approx|approximately)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private getTokenSet(text: string): Set<string> {
    return new Set(
      this.normalizeFoodText(text)
        .split(" ")
        .filter(
          (token) => token.length > 1 && token !== "of" && token !== "and",
        ),
    );
  }

  private scoreFoodMatch(
    query: string,
    itemName: string,
    timestamp: Date,
  ): number {
    const normalizedQuery = this.normalizeFoodText(query);
    const normalizedItemName = this.normalizeFoodText(itemName);

    if (!normalizedQuery || !normalizedItemName) {
      return 0;
    }

    let score = 0;

    if (normalizedQuery === normalizedItemName) {
      score += 100;
    }

    if (
      normalizedItemName.includes(normalizedQuery) ||
      normalizedQuery.includes(normalizedItemName)
    ) {
      score += 45;
    }

    const queryTokens = this.getTokenSet(query);
    const itemTokens = this.getTokenSet(itemName);
    const matchingTokenCount = [...queryTokens].filter((token) =>
      itemTokens.has(token),
    ).length;
    const maxTokenCount = Math.max(queryTokens.size, itemTokens.size, 1);
    score += (matchingTokenCount / maxTokenCount) * 40;

    const daysOld = Math.max(
      0,
      Math.floor(
        (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
    score += Math.max(0, 10 - Math.min(daysOld / 7, 10));

    return score;
  }

  private getFoodItems(): StoredFoodItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("Error reading from localStorage:", error);
      return [];
    }
  }

  private saveFoodItems(items: StoredFoodItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Error writing to localStorage:", error);
      // Fallback: try to clear old data and save again
      try {
        localStorage.clear();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      } catch (e) {
        console.error("Failed to save to localStorage even after clearing:", e);
      }
    }
  }

  saveFoodItem(foodItem: FoodItem): StoredFoodItem {
    const items = this.getFoodItems();
    const storedItem: StoredFoodItem = {
      ...foodItem,
      id: `${Date.now()}_${Math.random()}`,
      timestamp: new Date(foodItem.timestamp),
    };
    items.unshift(storedItem);
    this.saveFoodItems(items);
    return storedItem;
  }

  getFoodItemsByDate(date: Date): StoredFoodItem[] {
    const items = this.getFoodItems();
    const targetDate = this.normalizeDate(date);

    return items.filter((item) => {
      if (item.deletedAt) return false;
      const itemDate = this.normalizeDate(new Date(item.timestamp));
      return itemDate.getTime() === targetDate.getTime();
    });
  }

  getTodayFoodItems(): StoredFoodItem[] {
    return this.getFoodItemsByDate(new Date());
  }

  getAllFoodHistory(): StoredFoodItem[] {
    return this.getFoodItems();
  }

  getRelevantPastFoods(query: string, limit = 3): StoredFoodItem[] {
    const items = this.getFoodItems().filter((item) => !item.deletedAt);
    const bestMatchByName = new Map<string, ScoredFoodItem>();

    for (const item of items) {
      const score = this.scoreFoodMatch(
        query,
        item.name,
        new Date(item.timestamp),
      );
      if (score <= 0) {
        continue;
      }

      const normalizedName = this.normalizeFoodText(item.name);
      const existing = bestMatchByName.get(normalizedName);
      if (!existing || existing.score < score) {
        bestMatchByName.set(normalizedName, { item, score });
      }
    }

    return [...bestMatchByName.values()]
      .sort((left, right) => right.score - left.score)
      .slice(0, limit)
      .map(({ item }) => item);
  }

  deleteFoodItem(id: string): void {
    const items = this.getFoodItems();
    const item = items.find((i) => i.id === id);
    if (item) {
      item.deletedAt = new Date().toISOString();
    }
    this.saveFoodItems(items);
  }

  calculateDailyTotals(items: StoredFoodItem[]): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } {
    const totals = items.reduce(
      (acc, item) => ({
        calories: acc.calories + item.calories,
        protein: acc.protein + item.protein,
        carbs: acc.carbs + item.carbs,
        fat: acc.fat + item.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 },
    );

    return {
      calories: Math.round(totals.calories),
      protein: Math.round(totals.protein * 10) / 10,
      carbs: Math.round(totals.carbs * 10) / 10,
      fat: Math.round(totals.fat * 10) / 10,
    };
  }

  clearAll(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export const storageService = new StorageService();
