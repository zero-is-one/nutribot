import type { StoredFoodItem } from "./storage";
import type { Alias } from "./aliasStorage";

export interface ExportData {
  exportDate: string;
  totalItems: number;
  allFoodItems: StoredFoodItem[];
  allAliases: Alias[];
  stats: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    averageDailyCalories: number;
    uniqueDays: number;
  };
}

class ExportService {
  generateExportData(
    foodItems: StoredFoodItem[],
    aliases: Alias[],
  ): ExportData {
    // Calculate stats
    const totalCalories = foodItems.reduce(
      (sum, item) => sum + item.calories,
      0,
    );
    const totalProtein = foodItems.reduce((sum, item) => sum + item.protein, 0);
    const totalCarbs = foodItems.reduce((sum, item) => sum + item.carbs, 0);
    const totalFat = foodItems.reduce((sum, item) => sum + item.fat, 0);

    // Get unique days
    const uniqueDays = new Set(
      foodItems.map((item) => {
        const date = new Date(item.timestamp);
        return date.toDateString();
      }),
    ).size;

    const averageDailyCalories = Math.round(
      totalCalories / Math.max(uniqueDays, 1),
    );

    return {
      exportDate: new Date().toISOString(),
      totalItems: foodItems.length,
      allFoodItems: foodItems,
      allAliases: aliases,
      stats: {
        totalCalories: Math.round(totalCalories),
        totalProtein: Math.round(totalProtein * 10) / 10,
        totalCarbs: Math.round(totalCarbs * 10) / 10,
        totalFat: Math.round(totalFat * 10) / 10,
        averageDailyCalories,
        uniqueDays,
      },
    };
  }

  downloadJSON(data: ExportData, filename?: string): void {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download =
      filename ||
      `nutrition-history-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  generateFilename(): string {
    return `nutrition-history-${new Date().toISOString().split("T")[0]}.json`;
  }
}

export const exportService = new ExportService();
