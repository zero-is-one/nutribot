const API_KEY_STORAGE_KEY = "nutribot_gemini_api_key";

class SettingsStorageService {
  getApiKey(): string {
    if (typeof window === "undefined") {
      return "";
    }

    try {
      return localStorage.getItem(API_KEY_STORAGE_KEY) || "";
    } catch (error) {
      console.error("Error reading API key from localStorage:", error);
      return "";
    }
  }

  saveApiKey(apiKey: string): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.setItem(API_KEY_STORAGE_KEY, apiKey.trim());
    } catch (error) {
      console.error("Error writing API key to localStorage:", error);
      throw new Error("Failed to save API key");
    }
  }

  clearApiKey(): void {
    if (typeof window === "undefined") {
      return;
    }

    try {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    } catch (error) {
      console.error("Error clearing API key from localStorage:", error);
      throw new Error("Failed to clear API key");
    }
  }
}

export const settingsStorageService = new SettingsStorageService();
